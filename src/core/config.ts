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

export function credencialesGmail(): Credenciales | null {
  const env: Record<string, string> = {}
  if (existsSync(ENV))
    for (const l of readFileSync(ENV, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(l)
      if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, '$1')
    }
  const user = process.env.GMAIL_USER ?? env.GMAIL_USER
  const pass = (process.env.GMAIL_APP_PASSWORD ?? env.GMAIL_APP_PASSWORD)?.replace(/\s/g, '')
  return user && pass ? { user, pass } : null
}

/** Guarda las credenciales en ~/.otterjobs/.env, conservando las demás líneas. Solo legible por el usuario. */
export function guardarCredencialesGmail({ user, pass }: Credenciales): void {
  mkdirSync(DIR_CONFIG, { recursive: true })
  const resto = existsSync(ENV) ? readFileSync(ENV, 'utf8').split(/\r?\n/).filter((l) => l.trim() && !/^\s*GMAIL_(USER|APP_PASSWORD)\s*=/.test(l)) : []
  writeFileSync(ENV, [...resto, `GMAIL_USER=${user}`, `GMAIL_APP_PASSWORD=${pass}`, ''].join('\n'), { mode: 0o600 })
}

export const RUTA_ENV = ENV
