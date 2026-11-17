// tareas.md de la carpeta de datos: pendientes que no son de una oferta, como checklist markdown.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

export type TareaMd = { linea: number; texto: string; hecha: boolean }

export function leerTareasMd(ruta: string): TareaMd[] {
  if (!existsSync(ruta)) return []
  return readFileSync(ruta, 'utf8')
    .split('\n')
    .flatMap((l, i) => {
      const m = /^- \[( |x)\] (.*)$/.exec(l.replace(/\r$/, ''))
      return m ? [{ linea: i, texto: m[2], hecha: m[1] === 'x' }] : []
    })
}

/** Marca o desmarca por número de línea; comprueba el texto para no tocar otra línea si el archivo cambió. */
export function marcarTareaMd(ruta: string, linea: number, texto: string, hecha: boolean): void {
  const lineas = readFileSync(ruta, 'utf8').split('\n')
  const actual = lineas[linea]?.replace(/\r$/, '') ?? ''
  if (actual.slice(6) !== texto || !/^- \[( |x)\] /.test(actual)) throw new Error('tareas.md cambió; recarga')
  lineas[linea] = `- [${hecha ? 'x' : ' '}] ${texto}` + (lineas[linea].endsWith('\r') ? '\r' : '')
  writeFileSync(ruta, lineas.join('\n'))
}

export function agregarTareaMd(ruta: string, texto: string): void {
  const limpio = texto.replace(/[\r\n]+/g, ' ').trim()
  if (!limpio) throw new Error('tarea vacía')
  const actual = existsSync(ruta) ? readFileSync(ruta, 'utf8') : '# Tareas fuera del tracker\n\n'
  writeFileSync(ruta, actual.replace(/\n*$/, '\n') + `- [ ] ${limpio}\n`)
}
