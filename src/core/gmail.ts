// Escáner de Gmail por IMAP, en solo lectura: nunca marca nada como leído.
// Guarda en <datos>/fuentes/gmail/inbox.json (fuentes/ no se versiona) los correos que mencionan una empresa del
// tracker o palabras de reclutamiento. No toca el tracker: clasificar un correo requiere criterio (Claude o la persona).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import type { Fila } from './tracker.ts'

export type Correo = { id: string; fecha: string; de: string; asunto: string; empresa: string; orden: string; extracto: string; revisado: string }

const CLAVES = ['postulacion', 'entrevista', 'oferta laboral', 'carta oferta', 'proceso de seleccion', 'candidat', 'vacante', 'reclutamiento', 'talent', 'getonbrd', 'get on board', 'your application', 'tu postulacion', 'seleccion']
const GENERICAS = new Set(['afp', 'banco', 'caja', 'grupo', 'the', 'tech', 'chile', 'group', 'agency'])

export const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ')
const compacto = (s: string) => norm(s).replace(/[^a-z0-9]/g, '')
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function clavesEmpresa(nombre: string): string[] {
  const base = norm(nombre.replace(/\(.*?\)/g, '')).trim()
  const ks = new Set([compacto(base)])
  const primera = base.split(' ')[0] ?? ''
  if (primera.length >= 3 && !GENERICAS.has(primera)) ks.add(primera)
  return [...ks].filter((k) => k.length >= 3)
}

/** La primera fila del tracker (ya ordenado: en proceso primero) que aparece en el texto. */
export function empresaDe(texto: string, filas: Pick<Fila, 'empresa' | 'orden'>[]) {
  const t = norm(texto)
  const c = compacto(texto)
  return filas.find((f) => clavesEmpresa(f.empresa).some((k) => (k.length > 8 && c.includes(k)) || new RegExp(`\\b${escRe(k)}\\b`).test(t)))
}

export const esReclutamiento = (texto: string) => CLAVES.some((k) => norm(texto).includes(k))

export function leerInbox(ruta: string): Correo[] {
  return existsSync(ruta) ? JSON.parse(readFileSync(ruta, 'utf8')) : []
}

export function guardarInbox(ruta: string, correos: Correo[]): void {
  mkdirSync(dirname(ruta), { recursive: true })
  correos.sort((a, b) => b.fecha.localeCompare(a.fecha))
  writeFileSync(ruta, JSON.stringify(correos, null, 1))
}

export function marcarRevisado(ruta: string, ids: string[] | 'todos', hoy: string): void {
  const correos = leerInbox(ruta)
  for (const c of correos) if (!c.revisado && (ids === 'todos' || ids.includes(c.id))) c.revisado = hoy
  guardarInbox(ruta, correos)
}

export type Credenciales = { user: string; pass: string }

export async function escanear(cred: Credenciales, filas: Fila[], rutaInbox: string, dias = 7): Promise<{ nuevos: number; pendientes: number }> {
  const correos = leerInbox(rutaInbox)
  const vistos = new Set(correos.map((c) => c.id))
  const cliente = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: cred, logger: false })
  let nuevos = 0
  await cliente.connect()
  try {
    // «Todos»/«All Mail» cambia de nombre según el idioma de la cuenta: se busca por su uso especial.
    const todos = (await cliente.list()).find((b) => b.specialUse === '\\All')?.path ?? 'INBOX'
    const lock = await cliente.getMailboxLock(todos, { readOnly: true })
    try {
      const desde = new Date(Date.now() - dias * 86_400_000)
      const uids = (await cliente.search({ since: desde, gmraw: '-category:promotions -category:social -from:me' }, { uid: true })) || []
      for await (const m of cliente.fetch(uids, { source: true, envelope: true }, { uid: true })) {
        const id = m.envelope?.messageId || `${m.uid}`
        if (vistos.has(id) || !m.source) continue
        const p = await simpleParser(m.source)
        const de = p.from?.text ?? ''
        const asunto = p.subject ?? ''
        const cuerpo = (p.text || (typeof p.html === 'string' ? p.html.replace(/<[^>]+>/g, ' ') : '')).replace(/\s+/g, ' ').trim().slice(0, 3000)
        const fila = empresaDe(`${de} ${asunto}`, filas) ?? empresaDe(cuerpo, filas)
        if (!fila && !esReclutamiento(`${de} ${asunto} ${cuerpo}`)) continue
        correos.push({ id, fecha: (p.date ?? new Date()).toISOString().slice(0, 16).replace('T', ' '), de, asunto, empresa: fila?.empresa ?? '', orden: fila?.orden ?? '', extracto: cuerpo.slice(0, 600), revisado: '' })
        vistos.add(id)
        nuevos++
      }
    } finally {
      lock.release()
    }
  } finally {
    await cliente.logout()
  }
  guardarInbox(rutaInbox, correos)
  return { nuevos, pendientes: correos.filter((c) => !c.revisado).length }
}

/** Enlace que abre el correo en Gmail por su Message-ID. */
export const enlaceGmail = (id: string) => `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(`rfc822msgid:${id.replace(/^<|>$/g, '')}`)}`
