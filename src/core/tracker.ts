// El tracker de la carpeta de datos (postulaciones/tracker.csv): UTF-8 con BOM, separador `;`, para que Excel lo abra.
// Todo cambio pasa por aquí: valida, ordena (AGENTS.md regla 8) y escribe de forma atómica.
import { readFileSync, renameSync, writeFileSync } from 'node:fs'

export const ESTADOS = ['Oferta', 'Entrevista', 'Postulado', 'Por postular', 'Descartada', 'Rechazada'] as const
export const ACTIVOS = new Set(['Oferta', 'Entrevista', 'Postulado'])
export const PROBS = ['Alta', 'Media-alta', 'Media', 'Media-baja', 'Baja', '—'] as const
export const CAMPOS = ['orden', 'prob', 'estado', 'empresa', 'cargo', 'url', 'sueldo', 'modalidad', 'publicada', 'proximo_paso', 'vence', 'ficha', 'notas'] as const

export type Campo = (typeof CAMPOS)[number]
export type Fila = Record<Campo, string>

const BOM = '﻿'

export function parseCsv(texto: string, sep = ';'): string[][] {
  const filas: string[][] = []
  let fila: string[] = []
  let campo = ''
  let comillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') (campo += '"'), i++
      else if (c === '"') comillas = false
      else campo += c
    } else if (c === '"') comillas = true
    else if (c === sep) fila.push(campo), (campo = '')
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fila.push(campo), filas.push(fila), (fila = []), (campo = '')
    } else campo += c
  }
  if (campo || fila.length) fila.push(campo), filas.push(fila)
  return filas
}

const celda = (v: string, sep: string) => (/["\n\r]/.test(v) || v.includes(sep) ? `"${v.replace(/"/g, '""')}"` : v)
export const toCsv = (filas: string[][], sep = ';') => filas.map((f) => f.map((v) => celda(v, sep)).join(sep)).join('\n') + '\n'

export function leer(ruta: string): Fila[] {
  const [cab, ...resto] = parseCsv(readFileSync(ruta, 'utf8').replace(/^﻿/, ''))
  return resto.map((r, n) => {
    // Una fila con más columnas que la cabecera es un `;` sin escapar: se rechaza en vez de perder datos.
    if (r.length > cab.length) throw new Error(`tracker.csv fila ${n + 2}: ${r.length} columnas (cabecera ${cab.length}). Hay un ; sin comillas.`)
    const f = Object.fromEntries(CAMPOS.map((c) => [c, ''])) as Fila
    cab.forEach((c, i) => {
      if ((CAMPOS as readonly string[]).includes(c)) f[c as Campo] = r[i] ?? ''
    })
    return f
  })
}

const rango = (lista: readonly string[], v: string) => (lista.includes(v) ? lista.indexOf(v) : lista.length)

export function ordenar(filas: Fila[]): Fila[] {
  // sort estable: dentro del mismo estado y probabilidad se respeta el orden anterior
  filas.sort((a, b) => rango(ESTADOS, a.estado) - rango(ESTADOS, b.estado) || rango(PROBS, a.prob) - rango(PROBS, b.prob))
  filas.forEach((f, i) => (f.orden = String(i + 1)))
  return filas
}

export function validar(f: Fila): void {
  if (!(ESTADOS as readonly string[]).includes(f.estado)) throw new Error(`estado inválido: "${f.estado}". Usa: ${ESTADOS.join(', ')}`)
  if (f.prob && !(PROBS as readonly string[]).includes(f.prob)) throw new Error(`prob inválida: "${f.prob}". Usa: ${PROBS.join(', ')}`)
  if (f.vence && !/^\d{4}-\d{2}-\d{2}$/.test(f.vence)) throw new Error(`vence debe ser AAAA-MM-DD: "${f.vence}"`)
  if (!f.empresa || !f.cargo) throw new Error('empresa y cargo son obligatorios')
}

export function escribir(ruta: string, filas: Fila[]): void {
  filas.forEach(validar)
  ordenar(filas)
  const tmp = `${ruta}.tmp`
  writeFileSync(tmp, BOM + toCsv([[...CAMPOS], ...filas.map((f) => CAMPOS.map((c) => f[c]))]))
  renameSync(tmp, ruta) // atómico: si algo falla, el CSV original queda intacto
}

export function limpiarCambios(cambios: Record<string, unknown>): Partial<Fila> {
  const out: Partial<Fila> = {}
  for (const [k, v] of Object.entries(cambios)) {
    if (!(CAMPOS as readonly string[]).includes(k) || k === 'orden') throw new Error(`campo desconocido: ${k}`)
    if (typeof v !== 'string') throw new Error(`${k} debe ser texto`)
    out[k as Campo] = v
  }
  return out
}

/** Cambia una fila por su orden. Devuelve la fila ya reordenada. */
export function actualizar(ruta: string, orden: string, cambios: Record<string, unknown>): Fila {
  const filas = leer(ruta)
  const f = filas.find((x) => x.orden === orden)
  if (!f) throw new Error(`no existe la fila ${orden}`)
  Object.assign(f, limpiarCambios(cambios))
  escribir(ruta, filas)
  return f
}

export function agregar(ruta: string, datos: Record<string, unknown>, hoy = isoHoy()): Fila {
  const filas = leer(ruta)
  const f = { ...(Object.fromEntries(CAMPOS.map((c) => [c, ''])) as Fila), estado: 'Por postular', publicada: hoy, ...limpiarCambios(datos) }
  const dup = f.url && filas.find((x) => x.url === f.url)
  if (dup) throw new Error(`ya existe con esa url: #${dup.orden} ${dup.empresa}`)
  filas.push(f)
  escribir(ruta, filas)
  return f
}

export const isoHoy = () => new Date().toLocaleDateString('sv-SE') // AAAA-MM-DD en hora local

export type Tarea = { orden: string; empresa: string; estado: string; paso: string; vence: string; vencida: boolean }

export function tareas(filas: Fila[], hoy = isoHoy()): Tarea[] {
  return filas
    .filter((f) => ACTIVOS.has(f.estado) && f.proximo_paso)
    .map((f) => ({ orden: f.orden, empresa: f.empresa, estado: f.estado, paso: f.proximo_paso, vence: f.vence, vencida: !!f.vence && f.vence < hoy }))
    .sort((a, b) => (a.vence || '9999').localeCompare(b.vence || '9999') || Number(a.orden) - Number(b.orden))
}
