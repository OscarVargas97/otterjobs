// LinkedIn: los posts y el banco de ideas son archivos de la carpeta de datos (linkedin/), legibles a mano y por Claude (/semana).
// - linkedin/posts/AAAA-MM-DD-slug/post.md: frontmatter (estado, pilar, fecha, imagen y, ya publicado, enlace y metricas) y el texto bajo «## Post».
// - linkedin/ideas.md: una tabla | Fecha | Idea | Fuente | Pilar | Estado |.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const ESTADOS_POST = ['borrador', 'aprobado', 'publicado'] as const
export const ESTADOS_IDEA = ['sin usar', 'en borrador', 'aprobado', 'publicado', 'descartada'] as const
export type Post = { slug: string; estado: string; pilar: string; fecha: string; imagen: string; enlace: string; metricas: string; texto: string; archivos: string[] }
export type Idea = { fecha: string; idea: string; fuente: string; pilar: string; estado: string }

const CAMPOS_POST = ['estado', 'pilar', 'fecha', 'imagen', 'enlace', 'metricas'] as const
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
      return { slug: x.name, estado: meta.estado || 'borrador', pilar: meta.pilar ?? '', fecha: meta.fecha || x.name.slice(0, 10), imagen: meta.imagen ?? '', enlace: meta.enlace ?? '', metricas: meta.metricas ?? '', texto: textoPost(cuerpo), archivos }
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

// La voz (linkedin/voz.md) se arma con la persona: sus propios textos y lo que corrige. Cada campo es una sección «## »;
// una sección se reconoce por su título, y las que no calzan con ningún campo se conservan tal cual.
export const CAMPOS_VOZ = [
  { id: 'textos', titulo: 'Textos que escribí yo', ayuda: 'Pega 2 o 3 textos tuyos sin pasar por una IA: un mensaje, el «Acerca de» de LinkedIn, una respuesta larga. Es la base de todo lo demás.', re: /textos|muestras|ejemplos/i },
  { id: 'como', titulo: 'Cómo escribo', ayuda: 'Largo de las frases, tono, cuánto opinas, cómo cierras.', re: /c[oó]mo escrib|ya se sabe|tono/i },
  { id: 'palabras', titulo: 'Palabras y giros que uso', ayuda: 'Expresiones tuyas, modismos de tu país, cómo saludas o te despides.', re: /palabras|giros/i },
  { id: 'evito', titulo: 'Lo que evito', ayuda: 'Lo que no suena a ti. Claude anota aquí lo que le corriges en cada borrador.', re: /evit/i }
] as const
const archivoVoz = (datos: string) => join(datos, 'linkedin', 'voz.md')

function seccionesVoz(datos: string) {
  const md = existsSync(archivoVoz(datos)) ? readFileSync(archivoVoz(datos), 'utf8').replace(/\r\n/g, '\n') : ''
  const [intro, ...partes] = md.split(/^## /m)
  const valores: Record<string, string> = {}
  const otras: string[] = []
  for (const p of partes) {
    const [titulo, ...resto] = p.split('\n')
    const texto = resto.join('\n').trim().replace(/^-\s*$/gm, '').trim() // «- » vacío de la plantilla
    const c = CAMPOS_VOZ.find((c) => c.re.test(titulo) && !(c.id in valores))
    if (c) valores[c.id] = texto
    else otras.push(`## ${p.trim()}`)
  }
  return { intro: intro.trim(), valores, otras }
}

export const leerVoz = (datos: string): Record<string, string> => seccionesVoz(datos).valores

export function guardarVoz(datos: string, v: unknown): void {
  if (typeof v !== 'object' || !v) throw new Error('dato inválido')
  const c = v as Record<string, unknown>
  const { intro, valores, otras } = seccionesVoz(datos)
  for (const k of CAMPOS_VOZ) if (k.id in c) {
    if (typeof c[k.id] !== 'string' || (c[k.id] as string).length > 20000) throw new Error('dato inválido')
    valores[k.id] = (c[k.id] as string).trim()
  }
  const cabeza = intro || '# Mi voz\n\nCómo escribo, para que los posts suenen a mí y no a una IA.'
  mkdirSync(join(datos, 'linkedin'), { recursive: true })
  writeFileSync(archivoVoz(datos), [cabeza, ...CAMPOS_VOZ.map((k) => `## ${k.titulo}\n\n${valores[k.id] ?? ''}`.trim()), ...otras].join('\n\n') + '\n')
}
