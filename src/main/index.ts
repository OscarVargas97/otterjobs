import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, watch, writeFileSync, type FSWatcher } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { VelopackApp } from 'velopack'
import { argsClaude, armarPedido, PEDIDOS, type Pedido } from '../core/claude.ts'
import { carpetaDatos, cuentasGmail, guardarCarpetaDatos, guardarCuentaGmail, quitarCuentaGmail, rutas } from '../core/config.ts'
import { enlaceGmail, escanear, leerInbox, marcarRevisado, probarGmail } from '../core/gmail.ts'
import { usar, type Db } from '../core/db.ts'
import { alertasSugeridas, etapasManuales, FORMULARIO, guardarEtapa, leerPerfilJson, registrarEvaluacion, revisarCv } from '../core/formulario.ts'
import { agregarIdea, CAMPOS_VOZ, estadoIdea, guardarPost, guardarVoz, leerIdeas, leerPosts, leerVoz, nuevoPost } from '../core/linkedin.ts'
import { autores, copiarArchivos, estadoFuentes, guardarGit, guardarNota, importarLinkedin, leerCuenta, leerGit, leerReposLocales, probarCuenta, TIPOS, type Cuenta } from '../core/fuentes.ts'
import { aPdf } from '../core/pdf.ts'
import { estadoPerfil, ETAPAS, type Etapa } from '../core/perfil.ts'
import { agregarPendiente, leerPendientes, marcarPendiente } from '../core/pendientes.ts'
import { actualizar, agregar, historial, isoHoy, leer, tareas, type Fila } from '../core/tracker.ts'
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
    perfil: perfil(datos, filas),
    linkedin: linkedin(datos),
    mercado: existsSync(join(datos, 'mercado')) ? readdirSync(join(datos, 'mercado')).filter((f) => f.endsWith('.md')).sort().reverse().map((f) => `mercado/${f}`) : [],
    fuentes: estadoFuentes(datos),
    version: app.getVersion()
  }
}

function perfil(datos: string, filas: Fila[]) {
  const { etapas } = leerPerfilJson(datos)
  const h = etapas.hechos ?? {}
  return {
    formulario: FORMULARIO,
    valores: etapas,
    manual: etapasManuales(datos),
    estado: estadoPerfil(datos),
    sugeridas: alertasSugeridas(h, isoHoy().slice(0, 7)),
    checks: revisarCv(h, etapas.cv ?? {}),
    pdf: existsSync(join(datos, 'cv', 'cv.pdf')),
    cvs: cvs(datos, filas)
  }
}

function linkedin(datos: string) {
  const posts = leerPosts(datos)
  const ideas = leerIdeas(datos)
  const marca = leerPerfilJson(datos).etapas.marca?.pilares
  // los pilares de la marca, más los que ya se usaron en posts e ideas
  const pilares = [...(typeof marca === 'string' ? marca.split(/\r?\n/).map((l) => l.replace(/^\s*[-*\d.]+\s*/, '').trim()) : []), ...posts.map((p) => p.pilar), ...ideas.map((i) => i.pilar)]
  return { posts, ideas, pilares: [...new Set(pilares.filter(Boolean))], voz: leerVoz(datos), camposVoz: CAMPOS_VOZ.map(({ id, titulo, ayuda }) => ({ id, titulo, ayuda })) }
}

/** Todos los CV: los base de cv/ y los adaptados en la carpeta de cada postulación, con su PDF si lo hay. */
function cvs(datos: string, filas: Fila[]) {
  const en = (rel: string) => (existsSync(join(datos, rel)) ? readdirSync(join(datos, rel)) : [])
  const carpeta = (rel: string, titulo: string, base: boolean) => {
    const fs = en(rel)
    const pdfs = fs.filter((f) => /\.pdf$/i.test(f)).map((f) => `${rel}/${f}`)
    return fs.filter((f) => /\.html?$/i.test(f) && (!base || !/\.anterior\./.test(f)) && (base || /^cv/i.test(f))).map((f) => ({ ruta: `${rel}/${f}`, titulo, archivo: f, pdfs }))
  }
  return [...carpeta('cv', 'CV base', true), ...filas.filter((f) => f.ficha).flatMap((f) => carpeta(f.ficha, `${f.empresa} · ${f.cargo}`, false))]
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
  for (const d of ['perfil', 'cv', 'mercado']) if (existsSync(join(r.datos, d))) vigia.push(watch(join(r.datos, d), avisar))
  // los posts y las ideas que escribe /semana
  for (const d of ['linkedin', 'fuentes']) if (existsSync(join(r.datos, d))) vigia.push(watch(join(r.datos, d), { recursive: true }, avisar))
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
  // /perfil recibe una etapa o «importar», y /semana un post o una idea, en vez de una postulación
  if (pedido === 'perfil' && orden !== undefined && orden !== 'importar' && orden !== 'aprendizajes' && !ETAPAS.some((e) => e.id === orden)) throw new Error('etapa inválida')
  const libre = pedido === 'perfil' || pedido === 'semana'
  const fila = orden && !libre ? usar(r.db, leer).find((f) => f.orden === orden) : undefined
  const metodo = join(app.getAppPath(), 'metodo').replace('app.asar', 'app.asar.unpacked')
  const titulo = fila ? `${pedido} · ${fila.empresa}` : pedido
  const extra = libre && orden ? ` ${texto(orden, 600).replace(/[\r\n"%;]+/g, ' ')}` : ''
  abrirTerminal(win!.webContents, r.datos, titulo + extra, 'claude', argsClaude(metodo, armarPedido(pedido as Pedido, fila) + extra))
})
manejar('guardarEtapa', (etapa, valores, lista) => {
  if (typeof etapa !== 'string' || !Object.hasOwn(FORMULARIO, etapa)) throw new Error('etapa inválida')
  const r = datosOk()
  if (etapa === 'revision') registrarEvaluacion(r.datos, valores)
  else guardarEtapa(r.datos, etapa as Etapa, valores, !!lista)
})
manejar('guardarPost', (slug, cambios) => guardarPost(datosOk().datos, slug, cambios))
manejar('nuevoPost', (titulo, pilar) => void nuevoPost(datosOk().datos, titulo, isoHoy(), typeof pilar === 'string' ? pilar : ''))
manejar('agregarIdea', (v) => agregarIdea(datosOk().datos, v, isoHoy()))
manejar('guardarVoz', (v) => guardarVoz(datosOk().datos, v))
manejar('estadoIdea', (i, estado) => estadoIdea(datosOk().datos, i, estado))
manejar('pdfCv', (idioma) => {
  const n = idioma === 'en' ? 'cv-en' : 'cv'
  const r = datosOk()
  if (!existsSync(join(r.datos, 'cv', `${n}.html`))) throw new Error(idioma === 'en' ? 'Primero llena el resumen en inglés y guarda la etapa CV' : 'Primero guarda la etapa CV')
  aPdf(join(r.datos, 'cv', `${n}.html`), join(r.datos, 'cv', `${n}.pdf`))
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
const ABRIBLES = /\.(pdf|html?|md|txt|csv|docx?|png|jpe?g)$/i
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
// La interfaz edita a mano los .md de mercado/ y de las postulaciones (ficha, entrevistas). El perfil no: sale de sus formularios.
ipcMain.handle('guardarArchivo', (_e, rel, contenido, nuevo) => {
  const f = enDatos(rel)
  if (!/^(mercado|postulaciones)[\\/][^]+\.md$/.test(relative(datosOk().datos, f))) throw new Error('Solo los .md de mercado/ y de las postulaciones')
  if (nuevo && existsSync(f)) throw new Error(`${rel} ya existe`)
  mkdirSync(dirname(f), { recursive: true })
  writeFileSync(f, texto(contenido, 500_000))
  enviar()
})

// --- fuentes ---
const elegir = async (title: string, filters?: Electron.FileFilter[], carpeta = false) => {
  const r = await dialog.showOpenDialog(win!, { title, filters, properties: carpeta ? ['openDirectory', 'multiSelections'] : ['openFile', 'multiSelections'] })
  return r.canceled ? [] : r.filePaths
}
manejar('agregarFuentes', async (tipo) => {
  if (!(TIPOS as readonly unknown[]).includes(tipo) || tipo === 'linkedin' || tipo === 'git') throw new Error('dato inválido')
  copiarArchivos(datosOk().datos, tipo as 'cv', await elegir(tipo === 'cv' ? 'CV y documentos' : 'Archivos para el perfil'))
})
manejar('importarLinkedin', async () => {
  const fs = await elegir('Exportación de LinkedIn (el .zip o sus .csv)', [{ name: 'LinkedIn', extensions: ['zip', 'csv'] }])
  if (fs.length) importarLinkedin(datosOk().datos, fs)
})
manejar('guardarNota', (titulo, txt) => void guardarNota(datosOk().datos, titulo, txt))
manejar('quitarFuente', (rel) => {
  const f = enDatos(rel)
  if (!/^fuentes[\\/](cv|linkedin|git|notas|otros)[\\/][^\\/]+$|^fuentes[\\/][^\\/]+\.(md|txt)$/.test(relative(datosOk().datos, f))) throw new Error('Solo archivos de fuentes/')
  return shell.trashItem(f) // a la papelera: se puede recuperar
})
const lista = (v: unknown) => {
  if (!Array.isArray(v) || v.length > 50 || !v.every((x) => typeof x === 'string' && x.length < 500)) throw new Error('dato inválido')
  return [...new Set((v as string[]).map((x) => x.trim()).filter(Boolean))]
}
manejar('identidadesGit', (ids) => guardarGit({ ...leerGit(), identidades: lista(ids) }))
manejar('carpetaGit', async (quitar) => {
  const g = leerGit()
  const carpetas = typeof quitar === 'string' ? g.carpetas.filter((c) => c !== quitar) : [...g.carpetas, ...(await elegir('Carpetas con tus repos', undefined, true))]
  guardarGit({ ...g, carpetas: lista(carpetas) })
})
ipcMain.handle('autoresGit', () => autores(leerGit().carpetas))
manejar('leerGitLocal', () => leerReposLocales(datosOk().datos))
manejar('conectarGit', async (tipo, host, token) => {
  if (tipo !== 'github' && tipo !== 'gitlab') throw new Error('dato inválido')
  const h = tipo === 'github' ? 'https://github.com' : texto(host, 200).trim().replace(/\/$/, '') || 'https://gitlab.com'
  if (!/^https:\/\//.test(h)) throw new Error('El servidor de GitLab va con https://')
  const c = { tipo, host: h, token: texto(token, 300).trim() } as Omit<Cuenta, 'usuario'>
  const usuario = await probarCuenta(c)
  const g = leerGit()
  const cuenta = { ...c, usuario }
  guardarGit({ ...g, cuentas: [...g.cuentas.filter((x) => !(x.tipo === tipo && x.host === h && x.usuario === usuario)), cuenta] })
  await leerCuenta(datosOk().datos, cuenta)
})
manejar('quitarGit', (tipo, usuario) => {
  const g = leerGit()
  guardarGit({ ...g, cuentas: g.cuentas.filter((x) => !(x.tipo === tipo && x.usuario === usuario)) })
})
manejar('leerCuentasGit', async () => {
  const d = datosOk().datos
  const errores: string[] = []
  for (const c of leerGit().cuentas) await leerCuenta(d, c).catch((e: Error) => errores.push(`${c.usuario}: ${e.message}`))
  if (errores.length) throw new Error(errores.join(' · '))
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
