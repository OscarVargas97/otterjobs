// Fuentes del perfil, sin IA: todo queda en fuentes/ de la carpeta de datos (no se versiona) y Claude lo lee con /perfil.
// - fuentes/cv/: CV antiguos y documentos (PDF, Word).
// - fuentes/linkedin/: solo los CSV de la exportación de LinkedIn que hablan de la persona (nada de mensajes ni contactos).
// - fuentes/git/: un resumen por repo local y por cuenta de GitHub/GitLab, con tus commits y PRs.
// - fuentes/notas/: texto pegado (otro portal, una evaluación, apuntes). Los .md sueltos en fuentes/ cuentan como notas.
// Las cuentas de git (con su token) y las identidades van en ~/.otterjobs/git.json, fuera de los datos.
import { execFile, execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join } from 'node:path'
import { promisify } from 'node:util'
import { DIR_CONFIG } from './config.ts'
import { parseCsv } from './migrar.ts'

const run = promisify(execFile)
export const TIPOS = ['cv', 'linkedin', 'git', 'notas', 'otros'] as const
export type Tipo = (typeof TIPOS)[number]
const dir = (datos: string, t: Tipo) => join(datos, 'fuentes', t)

export type Cuenta = { tipo: 'github' | 'gitlab'; host: string; usuario: string; token: string }
export type ConfigGit = { identidades: string[]; carpetas: string[]; cuentas: Cuenta[] }
const RUTA_GIT = join(DIR_CONFIG, 'git.json')

export function leerGit(): ConfigGit {
  const c = existsSync(RUTA_GIT) ? JSON.parse(readFileSync(RUTA_GIT, 'utf8')) : {}
  return { identidades: c.identidades ?? [], carpetas: c.carpetas ?? [], cuentas: c.cuentas ?? [] }
}
export function guardarGit(c: ConfigGit): void {
  mkdirSync(DIR_CONFIG, { recursive: true })
  writeFileSync(RUTA_GIT, JSON.stringify(c, null, 2), { mode: 0o600 })
}

/** Lo que hay en cada fuente, para la vista Fuentes. Las cuentas van sin token. */
export function estadoFuentes(datos: string) {
  const archivos = (t: Tipo) => (existsSync(dir(datos, t)) ? readdirSync(dir(datos, t)).filter((f) => statSync(join(dir(datos, t), f)).isFile()) : [])
  const raiz = join(datos, 'fuentes')
  const sueltas = existsSync(raiz) ? readdirSync(raiz).filter((f) => /\.(md|txt)$/i.test(f) && statSync(join(raiz, f)).isFile()) : []
  const li = archivos('linkedin')
  const g = leerGit()
  return {
    cv: archivos('cv').map((f) => `fuentes/cv/${f}`),
    linkedin: Object.fromEntries(li.map((f) => [f.replace(/\.csv$/i, ''), filasCsv(join(dir(datos, 'linkedin'), f))])),
    git: archivos('git').filter((f) => f.endsWith('.md')).map((f) => `fuentes/git/${f}`),
    notas: [...archivos('notas').map((f) => `fuentes/notas/${f}`), ...sueltas.map((f) => `fuentes/${f}`)],
    otros: archivos('otros').map((f) => `fuentes/otros/${f}`),
    identidades: g.identidades,
    carpetas: g.carpetas,
    cuentas: g.cuentas.map(({ tipo, host, usuario }) => ({ tipo, host, usuario }))
  }
}
const filasCsv = (f: string) => Math.max(0, parseCsv(readFileSync(f, 'utf8').replace(/^\uFEFF/, ''), ',').length - 1)

/** Copia archivos elegidos por la persona a fuentes/<tipo>/ y devuelve cuántos. */
export function copiarArchivos(datos: string, tipo: Tipo, rutas: string[]): number {
  mkdirSync(dir(datos, tipo), { recursive: true })
  for (const r of rutas) copyFileSync(r, join(dir(datos, tipo), basename(r)))
  return rutas.length
}

/** Guarda texto pegado como fuentes/notas/<slug>.md. */
export function guardarNota(datos: string, titulo: unknown, texto: unknown): string {
  if (typeof titulo !== 'string' || typeof texto !== 'string' || !titulo.trim() || titulo.length > 120 || texto.length > 200_000) throw new Error('dato inválido')
  const slug = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'nota'
  mkdirSync(dir(datos, 'notas'), { recursive: true })
  writeFileSync(join(dir(datos, 'notas'), `${slug}.md`), `# ${titulo.trim()}\n\n${texto.trim()}\n`)
  return `fuentes/notas/${slug}.md`
}

// --- LinkedIn ---

// Lo que la exportación dice de la persona. Quedan fuera mensajes, contactos, invitaciones y anuncios: son datos de otros.
const CSV_LINKEDIN = ['Profile', 'Positions', 'Education', 'Skills', 'Certifications', 'Languages', 'Projects', 'Courses', 'Honors', 'Publications', 'Recommendations_Received', 'Endorsement_Received_Info', 'Shares']

/** Importa la exportación de LinkedIn (el ZIP o sus CSV) y deja en fuentes/linkedin/ solo los CSV de CSV_LINKEDIN. */
export function importarLinkedin(datos: string, rutas: string[]): string[] {
  const tmp = mkdtempSync(join(tmpdir(), 'otterjobs-li-'))
  try {
    for (const r of rutas) {
      if (/\.zip$/i.test(r)) descomprimir(r, tmp)
      else if (/\.csv$/i.test(r)) copyFileSync(r, join(tmp, basename(r)))
    }
    const csvs = (readdirSync(tmp, { recursive: true }) as string[]).filter((f) => CSV_LINKEDIN.includes(basename(f, extname(f))) && /\.csv$/i.test(f))
    if (!csvs.length) throw new Error('No encontré los CSV de LinkedIn (Positions.csv, Profile.csv…). Elige el ZIP de «Obtener una copia de tus datos».')
    mkdirSync(dir(datos, 'linkedin'), { recursive: true })
    for (const f of csvs) copyFileSync(join(tmp, f), join(dir(datos, 'linkedin'), basename(f)))
    return csvs.map((f) => basename(f, extname(f)))
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

// shortcut: usa el tar del sistema (bsdtar en Windows 10+ y macOS) o unzip en Linux; si falta, la persona elige los CSV sueltos.
function descomprimir(zip: string, destino: string) {
  if (process.platform === 'win32') execFileSync(join(process.env.SystemRoot ?? 'C:/Windows', 'System32', 'tar.exe'), ['-xf', zip, '-C', destino], { stdio: 'ignore' })
  else if (process.platform === 'darwin') execFileSync('tar', ['-xf', zip, '-C', destino], { stdio: 'ignore' })
  else execFileSync('unzip', ['-oq', zip, '-d', destino], { stdio: 'ignore' })
}

// --- git local ---

/** Repos (carpetas con .git) dentro de `carpeta`, hasta 3 niveles, sin entrar a node_modules ni carpetas ocultas. */
export function buscarRepos(carpeta: string, nivel = 0): string[] {
  if (existsSync(join(carpeta, '.git'))) return [carpeta]
  if (nivel >= 3) return []
  let hijos: string[] = []
  try {
    hijos = readdirSync(carpeta, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules').map((d) => join(carpeta, d.name))
  } catch {
    return []
  }
  return hijos.flatMap((h) => buscarRepos(h, nivel + 1))
}

/** Los autores que aparecen en los repos, con su cantidad de commits: para elegir cuáles son de la persona. */
export async function autores(carpetas: string[]): Promise<{ autor: string; commits: number }[]> {
  const n = new Map<string, number>()
  for (const repo of carpetas.flatMap((c) => buscarRepos(c))) {
    const { stdout } = await run('git', ['-C', repo, 'log', '--all', '--format=%ae'], { maxBuffer: 1 << 28 }).catch(() => ({ stdout: '' }))
    for (const e of stdout.split('\n').filter(Boolean)) n.set(e.toLowerCase(), (n.get(e.toLowerCase()) ?? 0) + 1)
  }
  return [...n].map(([autor, commits]) => ({ autor, commits })).sort((a, b) => b.commits - a.commits).slice(0, 30)
}

/** Quita usuario y token de una URL de remoto (https://user:token@host/…). */
export const sinCredenciales = (url: string) => url.trim().replace(/^(\w+:\/\/)[^@/]+@/, '$1')

const escapar = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Resumen de los commits de la persona en un repo: periodo, volumen, lenguajes, por mes y los mensajes. Null si no tiene commits. */
export async function resumenRepo(repo: string, identidades: string[]): Promise<string | null> {
  if (!identidades.length) throw new Error('Agrega primero tus correos o nombres de git')
  const autor = identidades.map((i) => `--author=${escapar(i)}`)
  const { stdout } = await run('git', ['-C', repo, 'log', '--all', '--no-merges', '-i', ...autor, '--format=\x1e%aI\x1f%s', '--numstat'], { maxBuffer: 1 << 28 })
  const commits = stdout.split('\x1e').filter((b) => b.trim()).map((b) => {
    const [cab, ...resto] = b.split('\n')
    const [fecha, asunto] = cab.split('\x1f')
    const archivos = resto.filter(Boolean).map((l) => l.split('\t')).filter((p) => p.length === 3).map(([a, d, f]) => ({ a: Number(a) || 0, d: Number(d) || 0, f }))
    return { fecha: fecha.slice(0, 10), asunto, archivos }
  })
  if (!commits.length) return null
  const ext = new Map<string, number>()
  const mes = new Map<string, number>()
  let mas = 0
  let menos = 0
  for (const c of commits) {
    mes.set(c.fecha.slice(0, 7), (mes.get(c.fecha.slice(0, 7)) ?? 0) + 1)
    for (const x of c.archivos) {
      mas += x.a
      menos += x.d
      const e = extname(x.f.replace(/[{}]/g, '')).toLowerCase() || basename(x.f)
      ext.set(e, (ext.get(e) ?? 0) + x.a + x.d)
    }
  }
  const total = [...ext.values()].reduce((a, b) => a + b, 0) || 1
  const remoto = await run('git', ['-C', repo, 'remote', 'get-url', 'origin']).then((r) => sinCredenciales(r.stdout), () => '')
  const docs = ['README.md', 'AGENTS.md', 'CLAUDE.md', 'CHANGELOG.md', 'docs'].filter((f) => existsSync(join(repo, f)))
  const fechas = commits.map((c) => c.fecha).sort()
  return [
    `# Repo local: ${basename(repo)}`,
    '',
    `- Ruta: ${repo}`,
    ...(remoto ? [`- Remoto: ${remoto}`] : []),
    `- Tus commits: ${commits.length}, de ${fechas[0]} a ${fechas.at(-1)} (+${mas} / −${menos} líneas)`,
    `- Lenguajes (por líneas tocadas): ${[...ext].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([e, n]) => `${e} ${Math.round((n / total) * 100)} %`).join(' · ')}`,
    `- Por mes: ${[...mes].sort().map(([m, n]) => `${m}: ${n}`).join(' · ')}`,
    ...(docs.length ? [`- Para leer en el repo: ${docs.join(', ')}`] : []),
    '',
    `## Commits (los ${Math.min(400, commits.length)} más recientes)`,
    '',
    ...commits.slice(0, 400).map((c) => `- ${c.fecha} ${c.asunto}`),
    ''
  ].join('\n')
}

const nombreArchivo = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

/** Lee todos los repos de las carpetas configuradas y escribe fuentes/git/local-<repo>.md. Devuelve cuántos tenían commits tuyos. */
export async function leerReposLocales(datos: string): Promise<number> {
  const g = leerGit()
  mkdirSync(dir(datos, 'git'), { recursive: true })
  let n = 0
  for (const repo of g.carpetas.flatMap((c) => buscarRepos(c))) {
    const md = await resumenRepo(repo, g.identidades)
    if (!md) continue
    writeFileSync(join(dir(datos, 'git'), `local-${nombreArchivo(`${basename(dirname(repo))}-${basename(repo)}`)}.md`), md)
    n++
  }
  return n
}

// --- GitHub y GitLab (solo lectura) ---

async function pedir(c: Cuenta, ruta: string): Promise<unknown> {
  const gh = c.tipo === 'github'
  const base = gh ? 'https://api.github.com' : `${c.host.replace(/\/$/, '')}/api/v4`
  const r = await fetch(base + ruta, { headers: gh ? { Authorization: `Bearer ${c.token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'otterjobs' } : { 'PRIVATE-TOKEN': c.token } })
  if (!r.ok) throw new Error(`${c.tipo} respondió ${r.status} en ${ruta.split('?')[0]}${r.status === 401 ? ': revisa el token' : ''}`)
  return r.json()
}

/** Todas las páginas de un listado (hasta `max` páginas de 100). */
async function paginas<T>(c: Cuenta, ruta: string, max = 10, campo?: string): Promise<T[]> {
  const xs: T[] = []
  for (let p = 1; p <= max; p++) {
    const r = (await pedir(c, `${ruta}${ruta.includes('?') ? '&' : '?'}per_page=100&page=${p}`)) as Record<string, unknown>
    const pag = (campo ? r[campo] : r) as T[]
    xs.push(...pag)
    if (pag.length < 100) break
  }
  return xs
}

/** Prueba el token y devuelve el usuario. */
export async function probarCuenta(c: Omit<Cuenta, 'usuario'>): Promise<string> {
  const u = (await pedir({ ...c, usuario: '' }, '/user')) as { login?: string; username?: string }
  return (u.login ?? u.username)!
}

const corto = (x: string | null | undefined, n: number) => (x ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\s+/g, ' ').trim().slice(0, n)

/** Repos, PRs/MRs y commits de la cuenta, en fuentes/git/<tipo>-<usuario>.md. */
export async function leerCuenta(datos: string, c: Cuenta): Promise<string> {
  const lineas = c.tipo === 'github' ? await github(c) : await gitlab(c)
  mkdirSync(dir(datos, 'git'), { recursive: true })
  const f = `${c.tipo}-${nombreArchivo(c.usuario)}.md`
  writeFileSync(join(dir(datos, 'git'), f), lineas.join('\n') + '\n')
  return `fuentes/git/${f}`
}

type RepoGh = { full_name: string; private: boolean; fork: boolean; language: string | null; description: string | null; created_at: string; pushed_at: string }
type IssueGh = { title: string; body: string | null; repository_url: string; created_at: string; state: string; pull_request?: { merged_at: string | null } }
type CommitGh = { commit: { message: string; author: { date: string } }; repository: { full_name: string } }

async function github(c: Cuenta): Promise<string[]> {
  const repos = await paginas<RepoGh>(c, '/user/repos?affiliation=owner,collaborator,organization_member&sort=pushed')
  const prs = await paginas<IssueGh>(c, `/search/issues?q=${encodeURIComponent(`author:${c.usuario} type:pr`)}&sort=created`, 10, 'items')
  const commits = await paginas<CommitGh>(c, `/search/commits?q=${encodeURIComponent(`author:${c.usuario}`)}&sort=author-date`, 10, 'items')
  const repoDe = (u: string) => u.replace(/^.*\/repos\//, '')
  return [
    `# GitHub: ${c.usuario}`,
    '',
    `${repos.length} repos con acceso · ${prs.length} PRs tuyos · ${commits.length} commits tuyos en ramas principales (la búsqueda de GitHub llega a 1000)`,
    '',
    '## Repos',
    '',
    ...repos.map((r) => `- ${r.full_name}${r.private ? ' (privado)' : ''}${r.fork ? ' (fork)' : ''} · ${r.language ?? '—'} · ${r.created_at.slice(0, 7)} a ${r.pushed_at.slice(0, 7)}${r.description ? ` · ${corto(r.description, 200)}` : ''}`),
    '',
    '## Pull requests',
    '',
    ...prs.map((p) => `- ${p.created_at.slice(0, 10)} [${repoDe(p.repository_url)}] ${p.title} (${p.pull_request?.merged_at ? 'fusionado' : p.state})${p.body ? `\n  ${corto(p.body, 600)}` : ''}`),
    '',
    '## Commits',
    '',
    ...commits.map((x) => `- ${x.commit.author.date.slice(0, 10)} [${x.repository.full_name}] ${x.commit.message.split('\n')[0]}`)
  ]
}

type ProyectoGl = { id: number; path_with_namespace: string; visibility?: string; description: string | null; created_at: string; last_activity_at: string }
type MrGl = { title: string; description: string | null; references?: { full: string }; created_at: string; state: string }
type EventoGl = { created_at: string; project_id: number; push_data?: { commit_count: number; commit_title: string | null; ref: string } }

async function gitlab(c: Cuenta): Promise<string[]> {
  const yo = (await pedir(c, '/user')) as { id: number }
  const proyectos = await paginas<ProyectoGl>(c, '/projects?membership=true&order_by=last_activity_at')
  const mrs = await paginas<MrGl>(c, `/merge_requests?author_id=${yo.id}&scope=all`)
  const pushes = (await paginas<EventoGl>(c, `/users/${yo.id}/events?action=pushed`)).filter((e) => e.push_data)
  const nombre = new Map(proyectos.map((p) => [p.id, p.path_with_namespace]))
  return [
    `# GitLab (${c.host}): ${c.usuario}`,
    '',
    `${proyectos.length} proyectos con acceso · ${mrs.length} merge requests tuyos · ${pushes.length} pushes recientes`,
    '',
    '## Proyectos',
    '',
    ...proyectos.map((p) => `- ${p.path_with_namespace}${p.visibility === 'private' ? ' (privado)' : ''} · ${p.created_at.slice(0, 7)} a ${p.last_activity_at.slice(0, 7)}${p.description ? ` · ${corto(p.description, 200)}` : ''}`),
    '',
    '## Merge requests',
    '',
    ...mrs.map((m) => `- ${m.created_at.slice(0, 10)} [${m.references?.full.split('!')[0] ?? ''}] ${m.title} (${m.state})${m.description ? `\n  ${corto(m.description, 600)}` : ''}`),
    '',
    '## Pushes',
    '',
    ...pushes.map((e) => `- ${e.created_at.slice(0, 10)} [${nombre.get(e.project_id) ?? e.project_id}] ${e.push_data!.commit_count} commit(s) a ${e.push_data!.ref}: ${e.push_data!.commit_title ?? ''}`)
  ]
}
