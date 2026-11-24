import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { watch, type FSWatcher } from 'node:fs'
import { join } from 'node:path'
import { VelopackApp } from 'velopack'
import { abrirClaude, armarPedido, PEDIDOS, type Pedido } from '../core/claude.ts'
import { carpetaDatos, credencialesGmail, guardarCarpetaDatos, RUTA_ENV, rutas } from '../core/config.ts'
import { enlaceGmail, escanear, leerInbox, marcarRevisado } from '../core/gmail.ts'
import { usar, type Db } from '../core/db.ts'
import { agregarPendiente, leerPendientes, marcarPendiente } from '../core/pendientes.ts'
import { actualizar, agregar, historial, isoHoy, leer, tareas } from '../core/tracker.ts'

// Velopack: instalar, actualizar y desinstalar corren aquí antes que nada .
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
    inbox: leerInbox(r.inbox).map((c) => ({ ...c, enlace: enlaceGmail(c.id) })),
    gmail: !!credencialesGmail(),
    rutaEnv: RUTA_ENV,
    version: app.getVersion()
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
  const cred = credencialesGmail()
  if (!cred) throw new Error(`Faltan GMAIL_USER y GMAIL_APP_PASSWORD en ${RUTA_ENV}`)
  const r = datosOk()
  await escanear(cred, usar(r.db, leer), r.inbox, Number.isInteger(dias) ? (dias as number) : 7)
})
manejar('revisado', (ids) => {
  if (ids !== 'todos' && !(Array.isArray(ids) && ids.every((i) => typeof i === 'string'))) throw new Error('dato inválido')
  marcarRevisado(datosOk().inbox, ids as string[] | 'todos', isoHoy())
})
manejar('claude', (pedido, orden) => {
  if (typeof pedido !== 'string' || !Object.hasOwn(PEDIDOS, pedido)) throw new Error('pedido inválido')
  const r = datosOk()
  const fila = orden ? usar(r.db, leer).find((f) => f.orden === orden) : undefined
  abrirClaude(r.datos, armarPedido(pedido as Pedido, fila))
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
