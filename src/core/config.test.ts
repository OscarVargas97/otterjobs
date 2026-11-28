import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { enlaceGmail } from './gmail.ts'

// DIR_CONFIG se fija al importar: la carpeta va antes del import dinámico.
const home = mkdtempSync(join(tmpdir(), 'otterjobs-config-'))
process.env.OTTERJOBS_HOME = home
delete process.env.GMAIL_USER
delete process.env.GMAIL_APP_PASSWORD
const { cuentasGmail, guardarCuentaGmail, quitarCuentaGmail } = await import('./config.ts')

test('gmail: varias cuentas, la del .env sin duplicar, y quitar', () => {
  writeFileSync(join(home, '.env'), 'OTRA=1\nGMAIL_USER=uno@ejemplo.com\nGMAIL_APP_PASSWORD=aaaa bbbb cccc dddd\n')
  assert.deepEqual(cuentasGmail(), [{ user: 'uno@ejemplo.com', pass: 'aaaabbbbccccdddd' }])
  guardarCuentaGmail({ user: 'dos@ejemplo.com', pass: 'x'.repeat(16) })
  guardarCuentaGmail({ user: 'uno@ejemplo.com', pass: 'y'.repeat(16) }) // la de gmail.json manda sobre la del .env
  assert.deepEqual(cuentasGmail().map((c) => [c.user, c.pass[0]]), [['dos@ejemplo.com', 'x'], ['uno@ejemplo.com', 'y']])
  quitarCuentaGmail('uno@ejemplo.com')
  assert.deepEqual(cuentasGmail().map((c) => c.user), ['dos@ejemplo.com'])
  assert.equal(readFileSync(join(home, '.env'), 'utf8'), 'OTRA=1\n')
})

test('gmail: el enlace abre la cuenta donde llegó el correo', () => {
  assert.match(enlaceGmail('<a@b>', 'dos@ejemplo.com'), /mail\/\?authuser=dos%40ejemplo\.com#search\/rfc822msgid%3Aa%40b$/)
  assert.match(enlaceGmail('<a@b>'), /mail\/u\/0\/#search\//)
})
