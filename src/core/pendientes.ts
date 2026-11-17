// Tareas que no son de una oferta (tabla `pendientes`; antes tareas.md).
import { ahora, type Db } from './db.ts'

export type Pendiente = { id: number; texto: string; hecha: boolean; creada: string }

export function leerPendientes(db: Db): Pendiente[] {
  return db
    .prepare('SELECT * FROM pendientes ORDER BY hecha, id')
    .all()
    .map((r) => ({ ...(r as unknown as Pendiente), hecha: r.hecha === 1 }))
}

export function marcarPendiente(db: Db, id: number, hecha: boolean): void {
  if (!db.prepare('UPDATE pendientes SET hecha = ? WHERE id = ?').run(hecha ? 1 : 0, id).changes) throw new Error(`no existe la tarea ${id}`)
}

export function agregarPendiente(db: Db, texto: string, hecha = false): void {
  const limpio = texto.replace(/[\r\n]+/g, ' ').trim()
  if (!limpio) throw new Error('tarea vacía')
  db.prepare('INSERT INTO pendientes (texto, hecha, creada) VALUES (?, ?, ?)').run(limpio, hecha ? 1 : 0, ahora())
}
