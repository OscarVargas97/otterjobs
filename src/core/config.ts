// Configuración y credenciales en ~/.otterjobs (fuera de los repos), compartidas por la app y la CLI.
// Los datos viven en su propia carpeta (repo privado, otterjobs/datos); el código, en otterjobs.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Credenciales } from './gmail.ts'

export const DIR_CONFIG = process.env.OTTERJOBS_HOME ?? join(homedir(), '.otterjobs')
const CONFIG = join(DIR_CONFIG, 'config.json')
const ENV = join(DIR_CONFIG, '.env')

type Config = { datos?: string }
const leerConfig = (): Config => (existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, 'utf8')) : {})

export function guardarCarpetaDatos(datos: string): void {
  // tracker.csv sirve solo para poder elegir la carpeta antes de `otterjobs migrar`
  if (!existsSync(join(datos, 'otterjobs.db')) && !existsSync(join(datos, 'postulaciones', 'tracker.csv'))) throw new Error(`${datos} no tiene otterjobs.db`)
  mkdirSync(DIR_CONFIG, { recursive: true })
  writeFileSync(CONFIG, JSON.stringify({ ...leerConfig(), datos }, null, 2))
}

/** La carpeta de datos: OTTERJOBS_DATOS o config.json. null si no está configurada. */
export function carpetaDatos(): string | null {
  return process.env.OTTERJOBS_DATOS ?? leerConfig().datos ?? null
}

export function rutas(datos: string) {
  return {
    datos,
    db: join(datos, 'otterjobs.db'),
    // los correos quedan en fuentes/ (no se versiona); la base sí se versiona
    inbox: join(datos, 'fuentes', 'gmail', 'inbox.json')
  }
}

const GMAIL = join(DIR_CONFIG, 'gmail.json')
const leerGmail = (): Credenciales[] => (existsSync(GMAIL) ? JSON.parse(readFileSync(GMAIL, 'utf8')) : [])

/** Las cuentas de Gmail: las de gmail.json y, si hay, la de GMAIL_USER/GMAIL_APP_PASSWORD (.env o variables). */
export function cuentasGmail(): Credenciales[] {
  const env: Record<string, string> = {}
  if (existsSync(ENV))
    for (const l of readFileSync(ENV, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(l)
      if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, '$1')
    }
  const user = process.env.GMAIL_USER ?? env.GMAIL_USER
  const pass = (process.env.GMAIL_APP_PASSWORD ?? env.GMAIL_APP_PASSWORD)?.replace(/\s/g, '')
  const cuentas = leerGmail()
  return user && pass && !cuentas.some((c) => c.user === user) ? [...cuentas, { user, pass }] : cuentas
}

/** Agrega la cuenta (o cambia su contraseña) en ~/.otterjobs/gmail.json, legible solo por el usuario. */
export function guardarCuentaGmail(cred: Credenciales): void {
  mkdirSync(DIR_CONFIG, { recursive: true })
  writeFileSync(GMAIL, JSON.stringify([...leerGmail().filter((c) => c.user !== cred.user), cred], null, 2), { mode: 0o600 })
}

/** Quita la cuenta de gmail.json y, si era la del .env, sus dos líneas. */
export function quitarCuentaGmail(user: string): void {
  if (existsSync(GMAIL)) writeFileSync(GMAIL, JSON.stringify(leerGmail().filter((c) => c.user !== user), null, 2), { mode: 0o600 })
  if (!existsSync(ENV)) return
  const lineas = readFileSync(ENV, 'utf8').split(/\r?\n/)
  const delEnv = lineas.some((l) => /^\s*GMAIL_USER\s*=/.test(l) && l.split('=')[1].trim().replace(/^"(.*)"$/, '$1') === user)
  if (delEnv) writeFileSync(ENV, lineas.filter((l) => !/^\s*GMAIL_(USER|APP_PASSWORD)\s*=/.test(l)).join('\n'), { mode: 0o600 })
}

export const RUTA_GMAIL = GMAIL
