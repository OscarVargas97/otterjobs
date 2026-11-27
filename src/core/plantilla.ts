// Crea una carpeta de datos desde plantilla/ (solo archivos de datos por llenar, sin instrucciones ni datos de nadie).
// La usan la CLI (`otterjobs nuevo`) y, más adelante, la app. Las instrucciones viven en metodo/.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { usar } from './db.ts'

/** `plantilla`: la carpeta plantilla/ (repo o app empaquetada). */
export function crearDatos(destino: string, plantilla: string): void {
  if (existsSync(destino) && readdirSync(destino).length) throw new Error(`${destino} no está vacía`)
  cpSync(plantilla, destino, { recursive: true })
  mkdirSync(join(destino, 'fuentes'))
  usar(join(destino, 'otterjobs.db'), () => {}) // abrir crea el esquema
}
