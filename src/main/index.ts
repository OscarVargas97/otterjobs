import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { existsSync, readdirSync, readFileSync, statSync, watch, type FSWatcher } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { VelopackApp } from 'velopack'
import { argsClaude, armarPedido, PEDIDOS, type Pedido } from '../core/claude.ts'
import { carpetaDatos, cuentasGmail, guardarCarpetaDatos, guardarCuentaGmail, quitarCuentaGmail, rutas } from '../core/config.ts'
import { enlaceGmail, escanear, leerInbox, marcarRevisado, probarGmail } from '../core/gmail.ts'
import { usar, type Db } from '../core/db.ts'
import { alertasSugeridas, etapasManuales, FORMULARIO, guardarEtapa, leerPerfilJson, registrarEvaluacion, revisarCv } from '../core/formulario.ts'
import { aPdf } from '../core/pdf.ts'
import { estadoPerfil, ETAPAS, type Etapa } from '../core/perfil.ts'
import { agregarPendiente, leerPendientes, marcarPendiente } from '../core/pendientes.ts'
import { actualizar, agregar, historial, isoHoy, leer, tareas } from '../core/tracker.ts'
import { abrirTerminal, cerrarTerminales } from './terminal.ts'

// Velopack: instalar, actualizar y desinstalar corren aquí antes que nada.
VelopackApp.build().run()

let win: BrowserWindow | null = null
let vigia: FSWatcher[] = []

function estado() {
  const datos = carpetaDatos()
  if (!datos) return { datos: null }
  const r = rutas(datos)
  const [filas, pendientes] = usar(r.db, (db) => [leer(db), leerPendientes(db)] as const)
  return {
    datos,
    filas,
    tareas: tareas(filas),
    pendientes,
    inbox: leerInbox(r.inbox).map((c) => ({ ...c, enlace: enlaceGmail(c.id, c.cuenta) })),
    gmail: cuentasGmail().map((c) => c.user),
    perfil: perfil(datos),
    version: app.getVersion()
  }
}

function perfil(datos: string) {
  const { etapas } = leerPerfilJson(datos)
  const h = etapas.hechos ?? {}
  return {
    formulario: FORMULARIO,
    valores: etapas,
    manual: etapasManuales(datos),
    estado: estadoPerfil(datos),
    sugeridas: alertasSugeridas(h, isoHoy().slice(0, 7)),
    checks: revisarCv(h, etapas.cv ?? {}),
    pdf: existsSync(join(datos, 'cv', 'cv.pdf'))
  }
}

const enviar = () => {
  try {
    win?.webContents.send('estado', estado())
  } catch (e) {
    win?.webContents.send('error', (e as Error).message)
  }
}

/** Los cambios hechos desde el chat (Claude Code o la CLI) se ven solos en la app. */
function vigilar() {
  vigia.forEach((w) => w.close())
  const datos = carpetaDatos()
  if (!datos) return
  const r = rutas(datos)
  let t: NodeJS.Timeout | undefined
  const avisar = () => (clearTimeout(t), (t = setTimeout(enviar, 200)))
  vigia = [watch(r.datos, (_e, f) => f && /^otterjobs\.db$/.test(String(f)) && avisar())]
  // perfil.json y los archivos del perfil cambian cuando Claude refina con /perfil
  for (const d of ['perfil', 'cv']) if (existsSync(join(r.datos, d))) vigia.push(watch(join(r.datos, d), avisar))
}

const datosOk = () => {
  const d = carpetaDatos()
  if (!d) throw new Error('Elige primero la carpeta de datos')
  return rutas(d)
}
const conDb = <T>(fn: (db: Db) => T) => usar(datosOk().db, fn)
const texto = (v: unknown, n = 4000) => {
  if (typeof v !== 'string' || v.length > n) throw new Error('dato inválido')
  return v
}

// Cada handler devuelve el estado nuevo o lanza un error que la interfaz muestra.
const manejar = (canal: string, fn: (...a: unknown[]) => unknown) =>
  ipcMain.handle(canal, async (_e, ...a) => {
    await fn(...a)
    return estado()
  })

manejar('cargar', () => {})
manejar('elegirDatos', async () => {
  const r = await dialog.showOpenDialog(win!, { title: 'Carpeta de datos', properties: ['openDirectory'] })
  if (!r.canceled && r.filePaths[0]) guardarCarpetaDatos(r.filePaths[0]), vigilar()
})
manejar('actualizar', (orden, cambios) => {
  if (typeof cambios !== 'object' || !cambios) throw new Error('dato inválido')
  conDb((db) => actualizar(db, texto(orden, 5), cambios as Record<string, unknown>))
})
manejar('agregar', (datos) => {
  if (typeof datos !== 'object' || !datos) throw new Error('dato inválido')
  conDb((db) => agregar(db, datos as Record<string, unknown>))
})
manejar('marcarPendiente', (id, hecha) => {
  if (!Number.isInteger(id)) throw new Error('dato inválido')
  conDb((db) => marcarPendiente(db, id as number, !!hecha))
})
manejar('nuevoPendiente', (txt) => conDb((db) => agregarPendiente(db, texto(txt, 500))))
manejar('escanear', async (dias) => {
  const r = datosOk()
  const { errores } = await escanear(cuentasGmail(), usar(r.db, leer), r.inbox, Number.isInteger(dias) ? (dias as number) : 7)
  if (errores.length) throw new Error(`No se pudieron leer: ${errores.join(' · ')}`)
})
manejar('configurarGmail', async (user, pass) => {
  const cred = { user: texto(user, 200).trim(), pass: texto(pass, 100).replace(/\s/g, '') }
  if (!/^\S+@\S+$/.test(cred.user) || cred.pass.length !== 16) throw new Error('Revisa el correo y que la contraseña de aplicación tenga 16 letras')
  await probarGmail(cred)
  guardarCuentaGmail(cred)
  const r = datosOk()
  const { errores } = await escanear([cred], usar(r.db, leer), r.inbox, 30) // cuenta nueva: el último mes
  if (errores.length) throw new Error(errores[0])
})
manejar('quitarGmail', (user) => quitarCuentaGmail(texto(user, 200)))
manejar('revisado', (ids) => {
  if (ids !== 'todos' && !(Array.isArray(ids) && ids.every((i) => typeof i === 'string'))) throw new Error('dato inválido')
  marcarRevisado(datosOk().inbox, ids as string[] | 'todos', isoHoy())
})
manejar('claude', (pedido, orden) => {
  if (typeof pedido !== 'string' || !Object.hasOwn(PEDIDOS, pedido)) throw new Error('pedido inválido')
  const r = datosOk()
  // /perfil recibe una etapa o «importar» en vez de una postulación
  if (pedido === 'perfil' && orden !== undefined && orden !== 'importar' && !ETAPAS.some((e) => e.id === orden)) throw new Error('etapa inválida')
  const fila = orden && pedido !== 'perfil' ? usar(r.db, leer).find((f) => f.orden === orden) : undefined
  const metodo = join(app.getAppPath(), 'metodo').replace('app.asar', 'app.asar.unpacked')
  const titulo = fila ? `${pedido} · ${fila.empresa}` : pedido
  const extra = pedido === 'perfil' && orden ? ` ${orden}` : ''
  abrirTerminal(win!.webContents, r.datos, titulo + extra, 'claude', argsClaude(metodo, armarPedido(pedido as Pedido, fila) + extra))
})
manejar('guardarEtapa', (etapa, valores, lista) => {
  if (typeof etapa !== 'string' || !Object.hasOwn(FORMULARIO, etapa)) throw new Error('etapa inválida')
  const r = datosOk()
  if (etapa === 'revision') registrarEvaluacion(r.datos, valores)
  else guardarEtapa(r.datos, etapa as Etapa, valores, !!lista)
})
manejar('pdfCv', () => {
  const r = datosOk()
  if (!existsSync(join(r.datos, 'cv', 'cv.html'))) throw new Error('Primero guarda la etapa CV')
  aPdf(join(r.datos, 'cv', 'cv.html'), join(r.datos, 'cv', 'cv.pdf'))
})
/** Una ruta relativa de la interfaz, solo dentro de la carpeta de datos. */
function enDatos(rel: unknown): string {
  const d = datosOk().datos
  const f = resolve(d, texto(rel, 500))
  const r = relative(d, f)
  if (r.startsWith('..') || isAbsolute(r)) throw new Error('Ruta fuera de la carpeta de datos')
  return f
}
// Carpetas y documentos; nada ejecutable (.exe, .bat, .lnk…) aunque esté en los datos.
const ABRIBLES = /\.(pdf|html?|md|txt|docx?|png|jpe?g)$/i
manejar('abrirArchivo', async (rel) => {
  const f = enDatos(rel)
  if (!existsSync(f)) throw new Error(`No existe ${rel}`)
  if (!statSync(f).isDirectory() && !ABRIBLES.test(f)) throw new Error('Ese tipo de archivo no se abre desde la app')
  const error = await shell.openPath(f)
  if (error) throw new Error(error)
})
ipcMain.handle('archivos', (_e, rel) => {
  const f = enDatos(rel)
  return existsSync(f) && statSync(f).isDirectory() ? readdirSync(f, { withFileTypes: true }).filter((x) => x.isFile()).map((x) => x.name) : []
})
ipcMain.handle('leerArchivo', (_e, rel) => {
  const f = enDatos(rel)
  if (!/\.(md|html?|txt)$/i.test(f)) throw new Error('Solo texto, Markdown o HTML')
  return existsSync(f) ? readFileSync(f, 'utf8') : null
})
ipcMain.handle('historial', (_e, orden) => conDb((db) => historial(db, texto(orden, 5))))
ipcMain.on('abrir', (_e, url) => {
  // Solo enlaces web: nada de file:// ni protocolos raros desde el renderer.
  if (typeof url === 'string' && /^https:\/\//.test(url)) void shell.openExternal(url)
})

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'otterjobs',
    backgroundColor: '#141414',
    webPreferences: { preload: join(__dirname, '../preload/index.js'), sandbox: false, contextIsolation: true }
  })
  win.setMenuBarVisibility(false)
  win.webContents.setWindowOpenHandler(({ url }) => (/^https:\/\//.test(url) && void shell.openExternal(url), { action: 'deny' }))
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
  vigilar()
})

app.on('window-all-closed', () => app.quit())
app.on('before-quit', cerrarTerminales)
