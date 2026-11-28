import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { agregarIdea, estadoIdea, guardarPost, guardarVoz, leerIdeas, leerPosts, leerVoz, nuevoPost } from './linkedin.ts'

test('linkedin: guardar un post cambia frontmatter y texto, y conserva las otras secciones', () => {
  const d = mkdtempSync(join(tmpdir(), 'otterjobs-li-'))
  const dir = join(d, 'linkedin', 'posts', '2026-01-05-mi-post')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'post.md'), '---\nestado: borrador\npilar: Oficio\nfecha: 2026-01-05\nimagen: ninguna\n---\n\n## Post\n\nTexto viejo.\n\n## Notas\n\nDe dónde salió.\n')
  writeFileSync(join(dir, 'foto.png'), '')
  guardarPost(d, '2026-01-05-mi-post', { estado: 'aprobado', texto: 'Texto nuevo.\n\nSegundo párrafo.' })
  const [p] = leerPosts(d)
  assert.equal(p.estado, 'aprobado')
  assert.equal(p.pilar, 'Oficio')
  assert.equal(p.texto, 'Texto nuevo.\n\nSegundo párrafo.')
  assert.deepEqual(p.archivos, ['foto.png'])
  assert.match(readFileSync(join(dir, 'post.md'), 'utf8'), /## Notas\n\nDe dónde salió\./)
  assert.throws(() => guardarPost(d, '../x', { estado: 'aprobado' }), /post inválido/)
  assert.throws(() => guardarPost(d, '2026-01-05-mi-post', { estado: 'otro' }), /estado inválido/)
})

test('linkedin: post nuevo e ideas en la tabla', () => {
  const d = mkdtempSync(join(tmpdir(), 'otterjobs-li-'))
  const slug = nuevoPost(d, 'Lo que aprendí cerrando el año', '2026-02-01', 'Oficio')
  assert.equal(slug, '2026-02-01-lo-que-aprendi-cerrando-el-ano')
  assert.equal(nuevoPost(d, 'Lo que aprendí cerrando el año', '2026-02-01'), `${slug}-2`)
  assert.equal(leerPosts(d).find((p) => p.slug === slug)?.estado, 'borrador')
  agregarIdea(d, { idea: 'Cierre contable | en 4 días', fuente: 'Experiencia propia', pilar: 'Oficio' }, '2026-02-01')
  agregarIdea(d, { idea: 'Otra idea' }, '2026-02-02')
  estadoIdea(d, 0, 'en borrador')
  assert.deepEqual(leerIdeas(d), [
    { fecha: '2026-02-01', idea: 'Cierre contable | en 4 días', fuente: 'Experiencia propia', pilar: 'Oficio', estado: 'en borrador' },
    { fecha: '2026-02-02', idea: 'Otra idea', fuente: '', pilar: '', estado: 'sin usar' }
  ])
})

test('linkedin: la voz se guarda por campos y conserva las secciones que no son campos', () => {
  const d = mkdtempSync(join(tmpdir(), 'otterjobs-li-'))
  mkdirSync(join(d, 'linkedin'))
  writeFileSync(join(d, 'linkedin', 'voz.md'), '# Voz\n\nIntro.\n\n## Lo que evita\n\n- Emojis\n\n## Historial\n\nalgo\n')
  assert.deepEqual(leerVoz(d), { evito: '- Emojis' })
  guardarVoz(d, { textos: 'Hola, te escribo por…', evito: '- Emojis\n- Cierres motivacionales' })
  assert.deepEqual(leerVoz(d), { textos: 'Hola, te escribo por…', como: '', palabras: '', evito: '- Emojis\n- Cierres motivacionales' })
  const md = readFileSync(join(d, 'linkedin', 'voz.md'), 'utf8')
  assert.match(md, /^# Voz\n\nIntro\.\n\n## Textos que escribí yo/)
  assert.match(md, /## Historial\n\nalgo\n$/)
})
