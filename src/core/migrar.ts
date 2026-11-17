// Migración de una sola vez: postulaciones/tracker.csv y tareas.md → otterjobs.db.
// No borra los archivos de origen: eso se hace a mano tras comprobar los conteos.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { transaccion, type Db } from './db.ts'
import { agregarPendiente } from './pendientes.ts'
import { CAMPOS, insertar, reordenar, validar, type Campo } from './tracker.ts'

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

export function leerCsv(ruta: string): Record<Campo, string>[] {
  const [cab, ...resto] = parseCsv(readFileSync(ruta, 'utf8').replace(/^﻿/, ''))
  return resto.map((r, n) => {
    // Una fila con más columnas que la cabecera es un `;` sin escapar: se rechaza en vez de perder datos.
    if (r.length > cab.length) throw new Error(`tracker.csv fila ${n + 2}: ${r.length} columnas (cabecera ${cab.length}). Hay un ; sin comillas.`)
    const f = Object.fromEntries(CAMPOS.map((c) => [c, ''])) as Record<Campo, string>
    cab.forEach((c, i) => {
      if ((CAMPOS as readonly string[]).includes(c)) f[c as Campo] = r[i] ?? ''
    })
    return f
  })
}

export function migrar(db: Db, datos: string): { postulaciones: number; pendientes: number } {
  const csv = join(datos, 'postulaciones', 'tracker.csv')
  const md = join(datos, 'tareas.md')
  return transaccion(db, () => {
    if (db.prepare('SELECT count(*) n FROM postulaciones').get()!.n) throw new Error('otterjobs.db ya tiene postulaciones: no se migra dos veces')
    const filas = existsSync(csv) ? leerCsv(csv) : []
    for (const f of filas) validar(f), insertar(db, f)
    reordenar(db)
    let pendientes = 0
    if (existsSync(md))
      for (const l of readFileSync(md, 'utf8').split(/\r?\n/)) {
        const m = /^- \[( |x)\] (.*)$/.exec(l)
        if (m) agregarPendiente(db, m[2], m[1] === 'x'), pendientes++
      }
    return { postulaciones: filas.length, pendientes }
  })
}
