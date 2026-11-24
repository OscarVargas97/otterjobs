// `otterjobs nuevo <carpeta>`: crea una carpeta de datos para otra persona desde plantilla/ (sin datos de nadie).
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { usar } from './db.ts'

const RAIZ = resolve(import.meta.dirname, '..', '..')

export function crearDatos(destino: string, raiz = RAIZ): void {
  if (existsSync(destino) && readdirSync(destino).length) throw new Error(`${destino} no está vacía`)
  cpSync(join(raiz, 'plantilla'), destino, { recursive: true })
  // Los comandos de Claude llaman a la CLI con la ruta de este repo
  const dir = raiz.replace(/\\/g, '/')
  const reemplazar = (d: string): void => {
    for (const f of readdirSync(d)) {
      const p = join(d, f)
      if (statSync(p).isDirectory()) reemplazar(p)
      else if (p.endsWith('.md')) writeFileSync(p, readFileSync(p, 'utf8').replaceAll('{{OTTERJOBS}}', dir))
    }
  }
  reemplazar(destino)
  mkdirSync(join(destino, 'fuentes'), { recursive: true })
  usar(join(destino, 'otterjobs.db'), () => {}) // abrir crea el esquema
}
