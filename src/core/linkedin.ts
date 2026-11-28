// LinkedIn: los posts y el banco de ideas son archivos de la carpeta de datos (linkedin/), legibles a mano y por Claude (/semana).
// - linkedin/posts/AAAA-MM-DD-slug/post.md: frontmatter (estado, pilar, fecha, imagen) y el texto bajo «## Post».
// - linkedin/ideas.md: una tabla | Fecha | Idea | Fuente | Pilar | Estado |.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const ESTADOS_POST = ['borrador', 'aprobado', 'publicado'] as const
export const ESTADOS_IDEA = ['sin usar', 'en borrador', 'aprobado', 'publicado', 'descartada'] as const
export type Post = { slug: string; estado: string; pilar: string; fecha: string; imagen: string; texto: string; archivos: string[] }
export type Idea = { fecha: string; idea: string; fuente: string; pilar: string; estado: string }

const CAMPOS_POST = ['estado', 'pilar', 'fecha', 'imagen'] as const
const dirPosts = (datos: string) => join(datos, 'linkedin', 'posts')
const archivoIdeas = (datos: string) => join(datos, 'linkedin', 'ideas.md')
const CABECERA_IDEAS = '# Banco de ideas\n\n| Fecha | Idea | Fuente | Pilar | Estado |\n|---|---|---|---|---|\n'

function partir(md: string): { meta: Record<string, string>; cuerpo: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(md)
  const meta: Record<string, string> = {}
  for (const l of (m?.[1] ?? '').split(/\r?\n/)) {
    const i = l.indexOf(':')
    if (i > 0) meta[l.slice(0, i).trim()] = l.slice(i + 1).trim()
  }
  return { meta, cuerpo: m ? md.slice(m[0].length) : md }
}

/** El texto del post: lo que está bajo «## Post» hasta la siguiente sección «## » (o todo, si no hay encabezado). */
function textoPost(cuerpo: string): string {
  const i = cuerpo.search(/^## Post\s*$/m)
  if (i < 0) return cuerpo.trim()
  const resto = cuerpo.slice(i).replace(/^## Post\s*\r?\n/, '')
  const fin = resto.search(/^## /m)
  return (fin < 0 ? resto : resto.slice(0, fin)).trim()
}

export function leerPosts(datos: string): Post[] {
  const d = dirPosts(datos)
  if (!existsSync(d)) return []
  return readdirSync(d, { withFileTypes: true })
    .filter((x) => x.isDirectory() && existsSync(join(d, x.name, 'post.md')))
    .map((x) => {
      const { meta, cuerpo } = partir(readFileSync(join(d, x.name, 'post.md'), 'utf8'))
      const archivos = readdirSync(join(d, x.name)).filter((f) => f !== 'post.md')
      return { slug: x.name, estado: meta.estado || 'borrador', pilar: meta.pilar ?? '', fecha: meta.fecha || x.name.slice(0, 10), imagen: meta.imagen ?? '', texto: textoPost(cuerpo), archivos }
    })
    .sort((a, b) => b.slug.localeCompare(a.slug))
}

const slugOk = (slug: unknown): string => {
  if (typeof slug !== 'string' || !/^[\w-]{1,120}$/.test(slug)) throw new Error('post inválido')
  return slug
}
const una = (v: unknown, n: number) => {
  if (typeof v !== 'string' || v.length > n) throw new Error('dato inválido')
  return v.replace(/[\r\n]+/g, ' ').trim()
}

/** Cambia el frontmatter y el texto de un post; lo demás del archivo (notas, otras secciones) se conserva. */
export function guardarPost(datos: string, slug: unknown, cambios: unknown): void {
  const f = join(dirPosts(datos), slugOk(slug), 'post.md')
  if (!existsSync(f)) throw new Error('No existe ese post')
  if (typeof cambios !== 'object' || !cambios) throw new Error('dato inválido')
  const c = cambios as Record<string, unknown>
  const { meta, cuerpo } = partir(readFileSync(f, 'utf8'))
  for (const k of CAMPOS_POST) if (k in c) meta[k] = una(c[k], 300)
  if ('estado' in c && !(ESTADOS_POST as readonly string[]).includes(meta.estado)) throw new Error('estado inválido')
  let nuevo = cuerpo
  if ('texto' in c) {
    if (typeof c.texto !== 'string' || c.texto.length > 10000) throw new Error('dato inválido')
    const texto = c.texto.trim()
    const i = cuerpo.search(/^## Post\s*$/m)
    if (i < 0) nuevo = `## Post\n\n${texto}\n${cuerpo.trim() ? `\n${cuerpo.trim()}\n` : ''}`
    else {
      const resto = cuerpo.slice(i).replace(/^## Post\s*\r?\n/, '')
      const fin = resto.search(/^## /m)
      nuevo = `${cuerpo.slice(0, i)}## Post\n\n${texto}\n${fin < 0 ? '' : `\n${resto.slice(fin)}`}`
    }
  }
  const front = Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join('\n')
  writeFileSync(f, `---\n${front}\n---\n\n${nuevo.replace(/^\s+/, '')}`)
}

/** Crea linkedin/posts/AAAA-MM-DD-slug/post.md como borrador y devuelve el slug. */
export function nuevoPost(datos: string, titulo: unknown, hoy: string, pilar = ''): string {
  const base = una(titulo, 120).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'post'
  let slug = `${hoy}-${base}`
  for (let n = 2; existsSync(join(dirPosts(datos), slug)); n++) slug = `${hoy}-${base}-${n}`
  mkdirSync(join(dirPosts(datos), slug), { recursive: true })
  writeFileSync(join(dirPosts(datos), slug, 'post.md'), `---\nestado: borrador\npilar: ${una(pilar, 200)}\nfecha: ${hoy}\nimagen: ninguna\n---\n\n## Post\n\n`)
  return slug
}

const celdas = (l: string) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'))
const celda = (x: string) => x.replace(/\|/g, '\\|')

export function leerIdeas(datos: string): Idea[] {
  if (!existsSync(archivoIdeas(datos))) return []
  return readFileSync(archivoIdeas(datos), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.startsWith('|') && !/^\|[\s|:-]+\|$/.test(l.trim()))
    .slice(1) // la cabecera
    .map((l) => {
      const [fecha = '', idea = '', fuente = '', pilar = '', estado = ''] = celdas(l)
      return { fecha, idea, fuente, pilar, estado }
    })
}

/** Agrega una idea al final de la tabla (crea ideas.md si no existe). */
export function agregarIdea(datos: string, v: unknown, hoy: string): void {
  if (typeof v !== 'object' || !v) throw new Error('dato inválido')
  const c = v as Record<string, unknown>
  const idea = una(c.idea, 500)
  if (!idea) throw new Error('Escribe la idea')
  const f = archivoIdeas(datos)
  if (!existsSync(f)) mkdirSync(join(datos, 'linkedin'), { recursive: true }), writeFileSync(f, CABECERA_IDEAS)
  const t = readFileSync(f, 'utf8')
  const fila = `| ${[hoy, idea, una(c.fuente ?? '', 300), una(c.pilar ?? '', 200), 'sin usar'].map(celda).join(' | ')} |`
  // la fila va pegada a la última de la tabla, para que no quede una tabla nueva
  const ls = t.split(/\r?\n/)
  const ult = ls.reduce((u, l, i) => (l.startsWith('|') ? i : u), -1)
  ls.splice(ult + 1, 0, fila)
  writeFileSync(f, ls.join('\n'))
}

/** Cambia el estado de la idea número `i` (en el orden de leerIdeas). */
export function estadoIdea(datos: string, i: unknown, estado: unknown): void {
  if (!Number.isInteger(i) || !(ESTADOS_IDEA as readonly unknown[]).includes(estado)) throw new Error('dato inválido')
  const f = archivoIdeas(datos)
  const ls = readFileSync(f, 'utf8').split(/\r?\n/)
  const filas = ls.map((l, j) => [l, j] as const).filter(([l]) => l.startsWith('|') && !/^\|[\s|:-]+\|$/.test(l.trim())).slice(1)
  const fila = filas[i as number]
  if (!fila) throw new Error('No existe esa idea')
  const cs = celdas(fila[0])
  while (cs.length < 5) cs.push('')
  cs[4] = estado as string
  ls[fila[1]] = `| ${cs.map(celda).join(' | ')} |`
  writeFileSync(f, ls.join('\n'))
}
