// Crea una carpeta de datos desde plantilla/ (sin datos de nadie). La usan la CLI (`otterjobs nuevo`) y, más adelante, la app.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { usar } from './db.ts'

/** `plantilla`: la carpeta plantilla/ (repo o app empaquetada). `cli`: cómo invocar la CLI, queda escrito en AGENTS.md. */
export function crearDatos(destino: string, plantilla: string, cli: string): void {
  if (existsSync(destino) && readdirSync(destino).length) throw new Error(`${destino} no está vacía`)
  cpSync(plantilla, destino, { recursive: true })
  const agents = join(destino, 'AGENTS.md')
  writeFileSync(agents, readFileSync(agents, 'utf8').replace('{{CLI}}', cli))
  mkdirSync(join(destino, 'fuentes'))
  usar(join(destino, 'otterjobs.db'), () => {}) // abrir crea el esquema
}
