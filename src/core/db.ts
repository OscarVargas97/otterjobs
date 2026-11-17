// La base de datos de otterjobs: <datos>/otterjobs.db (SQLite de Node, sin dependencias).
// Modo de journal por defecto (no WAL): todo queda en un solo archivo, que se versiona en el repo privado de datos.
import { DatabaseSync } from 'node:sqlite'

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS postulaciones (
  id INTEGER PRIMARY KEY,
  orden INTEGER NOT NULL DEFAULT 0,
  prob TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL,
  empresa TEXT NOT NULL,
  cargo TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  sueldo TEXT NOT NULL DEFAULT '',
  modalidad TEXT NOT NULL DEFAULT '',
  publicada TEXT NOT NULL DEFAULT '',
  proximo_paso TEXT NOT NULL DEFAULT '',
  vence TEXT NOT NULL DEFAULT '',
  ficha TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT ''
);
-- Historial: cada cambio de un campo de una postulación, con su fecha.
CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY,
  postulacion_id INTEGER NOT NULL REFERENCES postulaciones(id) ON DELETE CASCADE,
  fecha TEXT NOT NULL,
  campo TEXT NOT NULL,
  antes TEXT NOT NULL,
  despues TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS eventos_postulacion ON eventos(postulacion_id);
-- Tareas que no son de una oferta (antes tareas.md).
CREATE TABLE IF NOT EXISTS pendientes (
  id INTEGER PRIMARY KEY,
  texto TEXT NOT NULL,
  hecha INTEGER NOT NULL DEFAULT 0,
  creada TEXT NOT NULL
);`

export type Db = DatabaseSync

export function abrir(ruta: string): Db {
  const db = new DatabaseSync(ruta)
  db.exec('PRAGMA busy_timeout = 3000; PRAGMA foreign_keys = ON;' + ESQUEMA) // la app y la CLI pueden escribir a la vez
  return db
}

/** Abre, ejecuta y cierra: así ningún proceso deja la base tomada (ni para git). */
export function usar<T>(ruta: string, fn: (db: Db) => T): T {
  const db = abrir(ruta)
  try {
    return fn(db)
  } finally {
    db.close()
  }
}

export function transaccion<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const r = fn()
    db.exec('COMMIT')
    return r
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

export const ahora = () => new Date().toLocaleString('sv-SE').slice(0, 16) // AAAA-MM-DD HH:MM en hora local
