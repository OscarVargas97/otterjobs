// Las postulaciones, en la tabla `postulaciones` de otterjobs.db.
// Todo cambio pasa por aquí: valida, registra el historial en `eventos` y reordena (regla 7 del método), en una transacción.
import { ahora, transaccion, type Db } from './db.ts'

export const ESTADOS = ['Oferta', 'Entrevista', 'Postulado', 'Por postular', 'Descartada', 'Rechazada'] as const
export const ACTIVOS = new Set(['Oferta', 'Entrevista', 'Postulado'])
export const PROBS = ['Alta', 'Media-alta', 'Media', 'Media-baja', 'Baja', '—'] as const
export const CAMPOS = ['orden', 'prob', 'estado', 'empresa', 'cargo', 'url', 'sueldo', 'modalidad', 'publicada', 'proximo_paso', 'vence', 'ficha', 'notas'] as const

export type Campo = (typeof CAMPOS)[number]
export type Fila = Record<Campo, string> & { id: number }
export type Evento = { fecha: string; campo: string; antes: string; despues: string }

export function leer(db: Db): Fila[] {
  return db
    .prepare('SELECT * FROM postulaciones ORDER BY orden, id')
    .all()
    .map((r) => ({ ...(r as unknown as Fila), orden: String(r.orden) }))
}

const rango = (lista: readonly string[], v: string) => (lista.includes(v) ? lista.indexOf(v) : lista.length)

export function ordenar<T extends Pick<Fila, 'estado' | 'prob' | 'orden'>>(filas: T[]): T[] {
  // sort estable: dentro del mismo estado y probabilidad se respeta el orden anterior
  filas.sort((a, b) => rango(ESTADOS, a.estado) - rango(ESTADOS, b.estado) || rango(PROBS, a.prob) - rango(PROBS, b.prob))
  filas.forEach((f, i) => (f.orden = String(i + 1)))
  return filas
}

export function validar(f: Record<Campo, string>): void {
  if (!(ESTADOS as readonly string[]).includes(f.estado)) throw new Error(`estado inválido: "${f.estado}". Usa: ${ESTADOS.join(', ')}`)
  if (f.prob && !(PROBS as readonly string[]).includes(f.prob)) throw new Error(`prob inválida: "${f.prob}". Usa: ${PROBS.join(', ')}`)
  if (f.vence && !/^\d{4}-\d{2}-\d{2}$/.test(f.vence)) throw new Error(`vence debe ser AAAA-MM-DD: "${f.vence}"`)
  if (!f.empresa || !f.cargo) throw new Error('empresa y cargo son obligatorios')
}

export function limpiarCambios(cambios: Record<string, unknown>): Partial<Record<Campo, string>> {
  const out: Partial<Record<Campo, string>> = {}
  for (const [k, v] of Object.entries(cambios)) {
    if (!(CAMPOS as readonly string[]).includes(k) || k === 'orden') throw new Error(`campo desconocido: ${k}`)
    if (typeof v !== 'string') throw new Error(`${k} debe ser texto`)
    out[k as Campo] = v
  }
  return out
}

export function reordenar(db: Db): void {
  const set = db.prepare('UPDATE postulaciones SET orden = ? WHERE id = ?')
  for (const f of ordenar(leer(db))) set.run(Number(f.orden), f.id)
}

export const EDITABLES = CAMPOS.filter((c) => c !== 'orden')

function registrar(db: Db, id: number, antes: Partial<Record<Campo, string>>, despues: Record<Campo, string>): void {
  const ev = db.prepare('INSERT INTO eventos (postulacion_id, fecha, campo, antes, despues) VALUES (?, ?, ?, ?, ?)')
  const t = ahora()
  for (const c of EDITABLES) if ((antes[c] ?? '') !== despues[c]) ev.run(id, t, c, antes[c] ?? '', despues[c])
}

/** Inserta sin validar ni registrar historial: para `agregar` y para importar el CSV antiguo. */
export function insertar(db: Db, f: Record<Campo, string>): number {
  const orden = Number(f.orden) || 1e9 // sin orden queda al final hasta reordenar
  const r = db.prepare(`INSERT INTO postulaciones (orden, ${EDITABLES.join(', ')}) VALUES (?, ${EDITABLES.map(() => '?').join(', ')})`).run(orden, ...EDITABLES.map((c) => f[c]))
  return Number(r.lastInsertRowid)
}

/** Cambia una postulación por su orden. Devuelve la fila ya reordenada. */
export function actualizar(db: Db, orden: string, cambios: Record<string, unknown>): Fila {
  return transaccion(db, () => {
    const f = leer(db).find((x) => x.orden === orden)
    if (!f) throw new Error(`no existe la fila ${orden}`)
    const nueva = { ...f, ...limpiarCambios(cambios) }
    validar(nueva)
    const cambiados = EDITABLES.filter((c) => nueva[c] !== f[c])
    if (cambiados.length) {
      // los nombres de columna salen de CAMPOS, nunca de la entrada
      db.prepare(`UPDATE postulaciones SET ${cambiados.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(...cambiados.map((c) => nueva[c]), f.id)
      registrar(db, f.id, f, nueva)
      reordenar(db)
    }
    return leer(db).find((x) => x.id === f.id)!
  })
}

export function agregar(db: Db, datos: Record<string, unknown>, hoy = isoHoy()): Fila {
  return transaccion(db, () => {
    const f = { ...(Object.fromEntries(CAMPOS.map((c) => [c, ''])) as Record<Campo, string>), estado: 'Por postular', publicada: hoy, ...limpiarCambios(datos) }
    validar(f)
    const dup = f.url && leer(db).find((x) => x.url === f.url)
    if (dup) throw new Error(`ya existe con esa url: #${dup.orden} ${dup.empresa}`)
    const id = insertar(db, f)
    registrar(db, id, {}, f)
    reordenar(db)
    return leer(db).find((x) => x.id === id)!
  })
}

export function historial(db: Db, orden: string): Evento[] {
  return db
    .prepare('SELECT e.fecha, e.campo, e.antes, e.despues FROM eventos e JOIN postulaciones p ON p.id = e.postulacion_id WHERE p.orden = ? ORDER BY e.id')
    .all(Number(orden)) as unknown as Evento[]
}

export const isoHoy = () => new Date().toLocaleDateString('sv-SE') // AAAA-MM-DD en hora local

export type Tarea = { orden: string; empresa: string; estado: string; paso: string; vence: string; vencida: boolean }

export function tareas(filas: Fila[], hoy = isoHoy()): Tarea[] {
  return filas
    .filter((f) => ACTIVOS.has(f.estado) && f.proximo_paso)
    .map((f) => ({ orden: f.orden, empresa: f.empresa, estado: f.estado, paso: f.proximo_paso, vence: f.vence, vencida: !!f.vence && f.vence < hoy }))
    .sort((a, b) => (a.vence || '9999').localeCompare(b.vence || '9999') || Number(a.orden) - Number(b.orden))
}
