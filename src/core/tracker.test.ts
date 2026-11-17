import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { actualizar, agregar, CAMPOS, leer, parseCsv, tareas, toCsv } from './tracker.ts'
import { agregarTareaMd, leerTareasMd, marcarTareaMd } from './tareas-md.ts'
import { clavesEmpresa, empresaDe, esReclutamiento } from './gmail.ts'
import { armarPedido } from './claude.ts'

const fila = (o: Record<string, string>) => CAMPOS.map((c) => o[c] ?? '')
function tracker(filas: Record<string, string>[]): string {
  const ruta = join(mkdtempSync(join(tmpdir(), 'oj-')), 'tracker.csv')
  writeFileSync(ruta, '﻿' + toCsv([[...CAMPOS], ...filas.map(fila)]))
  return ruta
}

test('csv: ida y vuelta con ; comillas y saltos de línea', () => {
  const datos = [['a;b', 'dijo "hola"', 'línea\nnueva', '']]
  assert.deepEqual(parseCsv(toCsv(datos)), datos)
})

test('leer rechaza una fila con ; sin escapar en vez de perder datos', () => {
  const ruta = tracker([])
  writeFileSync(ruta, readFileSync(ruta, 'utf8') + '1;Alta;Postulado;X;Y;;;;;paso; con punto y coma;;;\n')
  assert.throws(() => leer(ruta), /sin comillas/)
})

test('actualizar valida, reordena por estado y prob, y conserva el BOM', () => {
  const ruta = tracker([
    { orden: '1', prob: 'Baja', estado: 'Postulado', empresa: 'A', cargo: 'x' },
    { orden: '2', prob: 'Alta', estado: 'Por postular', empresa: 'B', cargo: 'y' }
  ])
  const f = actualizar(ruta, '2', { estado: 'Entrevista', proximo_paso: 'llamar; luego "algo"' })
  assert.equal(f.orden, '1')
  assert.ok(readFileSync(ruta, 'utf8').startsWith('﻿'))
  assert.equal(leer(ruta)[0].proximo_paso, 'llamar; luego "algo"')
  assert.throws(() => actualizar(ruta, '1', { estado: 'Inventado' }), /estado inválido/)
  assert.throws(() => actualizar(ruta, '1', { orden: '9' }), /campo desconocido/)
  assert.throws(() => actualizar(ruta, '1', { vence: 'mañana' }), /AAAA-MM-DD/)
})

test('agregar evita duplicados por url', () => {
  const ruta = tracker([{ orden: '1', prob: 'Media', estado: 'Postulado', empresa: 'A', cargo: 'x', url: 'https://a' }])
  assert.equal(agregar(ruta, { empresa: 'B', cargo: 'y' }, '2026-11-12').estado, 'Por postular')
  assert.throws(() => agregar(ruta, { empresa: 'C', cargo: 'z', url: 'https://a' }), /ya existe/)
})

test('tareas: solo activas con paso, vencidas marcadas, sin fecha al final', () => {
  const ruta = tracker([
    { estado: 'Entrevista', empresa: 'A', cargo: 'x', proximo_paso: 'p', vence: '2026-11-10' },
    { estado: 'Postulado', empresa: 'B', cargo: 'y', proximo_paso: 'q' },
    { estado: 'Por postular', empresa: 'C', cargo: 'z', proximo_paso: 'r', vence: '2026-11-01' }
  ])
  const t = tareas(leer(ruta), '2026-11-12')
  assert.deepEqual(t.map((x) => [x.empresa, x.vencida]), [['A', true], ['B', false]])
})

test('tareas.md: leer, marcar y agregar', () => {
  const ruta = join(mkdtempSync(join(tmpdir(), 'oj-')), 'tareas.md')
  writeFileSync(ruta, '# T\r\n\r\n- [ ] uno\r\n- [x] dos\r\n')
  const [uno] = leerTareasMd(ruta)
  marcarTareaMd(ruta, uno.linea, uno.texto, true)
  assert.throws(() => marcarTareaMd(ruta, uno.linea, 'otro', false), /cambió/)
  agregarTareaMd(ruta, 'tres')
  assert.deepEqual(leerTareasMd(ruta).map((t) => [t.texto, t.hecha]), [['uno', true], ['dos', true], ['tres', false]])
})

test('gmail: empresa por remitente o asunto, sin falsos positivos genéricos', () => {
  const filas = [
    { empresa: 'Andes Tech Group', orden: '1' },
    { empresa: 'Pudu Labs (cliente Retail SA)', orden: '2' },
    { empresa: 'KM Tecnología', orden: '3' },
    { empresa: 'Andes Seguros', orden: '4' }
  ]
  assert.equal(empresaDe('Ana <ana@andes.cl> Entrevista', filas)?.orden, '1')
  assert.equal(empresaDe('Luis <luis@pudulabs.com>', filas)?.orden, '2')
  assert.equal(empresaDe('Rosa Pérez - KM Tecnologia', filas)?.orden, '3')
  assert.equal(empresaDe('Cuprum AFP: estado de cuenta', filas), undefined)
  assert.ok(clavesEmpresa('KM Tecnología').includes('kmtecnologia'))
  assert.ok(esReclutamiento('Inicio de Postulación') && !esReclutamiento('Tu boleta de luz'))
})

test('pedido a Claude sin ; ni comillas', () => {
  const p = armarPedido('preparar', { orden: '2', empresa: 'A; "B"', cargo: 'Dev' })
  assert.ok(!p.includes(';') && !p.includes('"'))
  assert.equal(armarPedido('correo'), '/correo')
})
