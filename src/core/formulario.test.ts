import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { alertasSugeridas, etapasManuales, guardarEtapa, leerPerfilJson, regenerar, registrarEvaluacion, revisarCv, seccion } from './formulario.ts'
import { crearDatos } from './plantilla.ts'
import { estadoPerfil } from './perfil.ts'

const hechos = {
  nombre: 'Ana Pérez',
  titular: 'Analista <de datos>',
  correo: 'ana@ejemplo.com',
  experiencia: [
    { cargo: 'Analista', empresa: 'Empresa Uno', desde: '2023-03', hasta: '', logros: 'Redujo el cierre mensual de 10 a 4 días\n- Automatizó 12 reportes' },
    { cargo: 'Asistente', empresa: 'Empresa Dos', desde: '2022-01', hasta: '2022-06', logros: 'Ordenó el archivo' }
  ]
}

function datos() {
  const d = mkdtempSync(join(tmpdir(), 'otterjobs-form-'))
  crearDatos(d, join(import.meta.dirname, '..', '..', 'plantilla'))
  return d
}

test('formulario: guarda hechos, escribe perfil.md y la etapa queda lista solo al marcarla', () => {
  const d = datos()
  guardarEtapa(d, 'hechos', hechos, false)
  const md = readFileSync(join(d, 'perfil', 'perfil.md'), 'utf8')
  assert.match(md, /### Analista — Empresa Uno · mar 2023 – actual/)
  assert.match(md, /- Automatizó 12 reportes/)
  assert.equal(estadoPerfil(d).etapas[0].listo, false)
  guardarEtapa(d, 'hechos', hechos, true)
  assert.equal(estadoPerfil(d).etapas[0].listo, true)
  assert.deepEqual(leerPerfilJson(d).listas, ['hechos'])
  assert.throws(() => guardarEtapa(d, 'hechos', { nombre: 1 }, false), /inválido/)
  assert.equal((leerPerfilJson(d).etapas.hechos as Record<string, unknown>).basura, undefined)
})

test('formulario: un archivo escrito a mano se respalda como .anterior antes de reemplazarlo', () => {
  const d = datos()
  writeFileSync(join(d, 'perfil', 'marca.md'), '# Mi marca escrita a mano\n')
  assert.ok(etapasManuales(d).includes('marca'))
  guardarEtapa(d, 'marca', { rol: 'Analista' }, false)
  assert.equal(readFileSync(join(d, 'perfil', 'marca.anterior.md'), 'utf8'), '# Mi marca escrita a mano\n')
  assert.ok(!etapasManuales(d).includes('marca'))
  guardarEtapa(d, 'marca', { rol: 'Otro' }, false) // ya es generado: no vuelve a respaldar
  assert.equal(readFileSync(join(d, 'perfil', 'marca.anterior.md'), 'utf8'), '# Mi marca escrita a mano\n')
})

test('formulario: mercado y alertas reemplazan su sección de criterios; §2 y el registro se conservan', () => {
  const d = datos()
  const f = join(d, 'perfil', 'criterios-revision.md')
  const antes = readFileSync(f, 'utf8')
  const s2 = antes.slice(antes.search(/^## 2\./m), antes.search(/^## 3\./m))
  guardarEtapa(d, 'mercado', { portales: [{ canal: 'Portal X', filtra: 'por cargo', implica: 'titular claro' }] }, true)
  guardarEtapa(d, 'alertas', { alertas: [{ senal: 'Vacío 2022', respuesta: 'Estudié' }] }, true)
  registrarEvaluacion(d, { fecha: '2026-01-01', herramienta: 'Revisión propia', puntaje: '80' })
  const t = readFileSync(f, 'utf8')
  assert.ok(t.includes(s2.trim()))
  assert.match(t, /\| Portal X \| por cargo \| titular claro \|/)
  assert.match(t, /\| Vacío 2022 \| Estudié \|/)
  assert.match(t, /\| 2026-01-01 \| Revisión propia \|  \| 80 \|/)
  const e = estadoPerfil(d).etapas
  assert.deepEqual(e.filter((x) => ['mercado', 'alertas', 'revision'].includes(x.id)).map((x) => x.listo), [true, true, true])
  assert.equal(seccion('# T\n\n## 1. A\nviejo\n\n---\n\n## 2. B\n', '## 1.', '## 1. A\nnuevo'), '# T\n\n## 1. A\nnuevo\n\n---\n\n## 2. B\n')
})

test('formulario: el CV sale de los hechos, escapado, y se rehace con regenerar', () => {
  const d = datos()
  guardarEtapa(d, 'hechos', hechos, true)
  guardarEtapa(d, 'cv', { resumen: 'Analista con foco en cierre contable' }, false)
  const cv = join(d, 'cv', 'cv.html')
  assert.match(readFileSync(cv, 'utf8'), /Analista &lt;de datos&gt;/)
  assert.match(readFileSync(cv, 'utf8'), /<!-- pendiente:cv/)
  const j = leerPerfilJson(d)
  ;(j.etapas.hechos as Record<string, unknown>).nombre = 'Ana P. Soto' // lo que haría Claude al refinar
  writeFileSync(join(d, 'perfil', 'perfil.json'), JSON.stringify(j))
  assert.deepEqual(regenerar(d), ['hechos', 'cv'])
  assert.match(readFileSync(cv, 'utf8'), /<h1>Ana P\. Soto<\/h1>/)
})

test('formulario: alertas por fechas y revisión medible del CV', () => {
  assert.deepEqual(alertasSugeridas(hechos, '2026-11'), ['Permanencia corta: 6 meses en Empresa Dos', 'Vacío de 8 meses entre Empresa Dos y Empresa Uno'])
  const r = revisarCv(hechos, { resumen: 'corto' })
  assert.equal(r.length, 7)
  assert.equal(r[0].ok, false)
  assert.equal(r[6].ok, true)
})
