// HTML → PDF con el navegador sin cabeceras (Edge o Chrome), para el CV y sus variantes. Sin dependencias.
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const CANDIDATOS = [
  process.env.OTTERJOBS_NAVEGADOR,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/microsoft-edge'
]

export function navegador(): string {
  const n = CANDIDATOS.find((c) => c && existsSync(c))
  if (!n) throw new Error('No encontré Edge ni Chrome. Instala uno o indica la ruta en OTTERJOBS_NAVEGADOR.')
  return n
}

/** Escribe el PDF junto al HTML (mismo nombre) o en `salida`. Devuelve la ruta del PDF. */
export function aPdf(html: string, salida = html.replace(/\.html?$/i, '.pdf')): string {
  if (!existsSync(html)) throw new Error(`No existe ${html}`)
  const pdf = resolve(salida)
  execFileSync(navegador(), ['--headless', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, pathToFileURL(resolve(html)).href], { stdio: 'ignore', timeout: 60_000 })
  if (!existsSync(pdf)) throw new Error(`El navegador no generó ${pdf}`)
  return pdf
}
