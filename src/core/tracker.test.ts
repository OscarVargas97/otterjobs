import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { abrir } from './db.ts'
import { migrar, parseCsv } from './migrar.ts'
import { agregarPendiente, leerPendientes, marcarPendiente } from './pendientes.ts'
import { actualizar, agregar, CAMPOS, historial, insertar, leer, tareas, type Campo } from './tracker.ts'
import { clavesEmpresa, empresaDe, esReclutamiento } from './gmail.ts'
import { armarPedido, PEDIDOS } from './claude.ts'
import { estadoPerfil } from './perfil.ts'
import { crearDatos } from './plantilla.ts'

const vacia = () => Object.fromEntries(CAMPOS.map((c) => [c, ''])) as Record<Campo, string>
function base(filas: Partial<Record<Campo, string>>[]) {
  const db = abrir(':memory:')
  filas.forEach((f, i) => insertar(db, { ...vacia(), orden: String(i + 1), ...f }))
  return db
}

/** Una carpeta de datos antigua: postulaciones/tracker.csv (con BOM) y tareas.md. */
function carpetaAntigua(csv: string, md = '') {
  const dir = mkdtempSync(join(tmpdir(), 'oj-'))
  mkdirSync(join(dir, 'postulaciones'))
  writeFileSync(join(dir, 'postulaciones', 'tracker.csv'), '﻿' + CAMPOS.join(';') + '\n' + csv)
  if (md) writeFileSync(join(dir, 'tareas.md'), md)
  return dir
}

test('actualizar valida, reordena por estado y prob, y registra el historial', () => {
  const db = base([
    { prob: 'Baja', estado: 'Postulado', empresa: 'A', cargo: 'x' },
    { prob: 'Alta', estado: 'Por postular', empresa: 'B', cargo: 'y' }
  ])
  const f = actualizar(db, '2', { estado: 'Entrevista', proximo_paso: 'llamar; luego "algo"' })
  assert.equal(f.orden, '1')
  assert.equal(leer(db)[0].proximo_paso, 'llamar; luego "algo"')
  assert.deepEqual(historial(db, '1').map((e) => [e.campo, e.antes, e.despues]), [['estado', 'Por postular', 'Entrevista'], ['proximo_paso', '', 'llamar; luego "algo"']])
  assert.throws(() => actualizar(db, '1', { estado: 'Inventado' }), /estado inválido/)
  assert.throws(() => actualizar(db, '1', { orden: '9' }), /campo desconocido/)
  assert.throws(() => actualizar(db, '1', { 'estado = 1; --': 'x' }), /campo desconocido/)
  assert.throws(() => actualizar(db, '1', { vence: 'mañana' }), /AAAA-MM-DD/)
  assert.equal(historial(db, '1').length, 2) // lo rechazado no deja rastro
})

test('agregar evita duplicados por url y queda ordenada', () => {
  const db = base([{ prob: 'Media', estado: 'Postulado', empresa: 'A', cargo: 'x', url: 'https://a' }])
  const b = agregar(db, { empresa: 'B', cargo: 'y' }, '2026-11-12')
  assert.deepEqual([b.estado, b.orden, b.publicada], ['Por postular', '2', '2026-11-12'])
  assert.throws(() => agregar(db, { empresa: 'C', cargo: 'z', url: 'https://a' }), /ya existe/)
  assert.equal(leer(db).length, 2)
})

test('tareas: solo activas con paso, vencidas marcadas, sin fecha al final', () => {
  const db = base([
    { estado: 'Entrevista', empresa: 'A', cargo: 'x', proximo_paso: 'p', vence: '2026-11-10' },
    { estado: 'Postulado', empresa: 'B', cargo: 'y', proximo_paso: 'q' },
    { estado: 'Por postular', empresa: 'C', cargo: 'z', proximo_paso: 'r', vence: '2026-11-01' }
  ])
  const t = tareas(leer(db), '2026-11-12')
  assert.deepEqual(t.map((x) => [x.empresa, x.vencida]), [['A', true], ['B', false]])
})

test('pendientes: agregar, marcar y las hechas al final', () => {
  const db = abrir(':memory:')
  agregarPendiente(db, 'uno\r\nlínea')
  agregarPendiente(db, 'dos')
  marcarPendiente(db, leerPendientes(db)[0].id, true)
  assert.deepEqual(leerPendientes(db).map((t) => [t.texto, t.hecha]), [['dos', false], ['uno línea', true]])
  assert.throws(() => agregarPendiente(db, '  '), /vacía/)
  assert.throws(() => marcarPendiente(db, 99, true), /no existe/)
})

test('migrar: csv con ; comillas, saltos y BOM, y tareas.md; no migra dos veces', () => {
  assert.deepEqual(parseCsv('a;"b;c";"d ""e"""\n'), [['a', 'b;c', 'd "e"']])
  const linea = (o: Record<string, string>) => CAMPOS.map((c) => o[c] ?? '').map((v) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(';')
  const dir = carpetaAntigua(
    linea({ orden: '1', estado: 'Postulado', empresa: 'A', cargo: 'x', notas: 'n; "c"\nl2' }) + '\n' + linea({ orden: '2', estado: 'Entrevista', empresa: 'B', cargo: 'y' }) + '\n',
    '# T\r\n\r\n- [ ] uno\r\n- [x] dos\r\n'
  )
  const db = abrir(':memory:')
  assert.deepEqual(migrar(db, dir), { postulaciones: 2, pendientes: 2 })
  assert.deepEqual(leer(db).map((f) => [f.orden, f.empresa]), [['1', 'B'], ['2', 'A']])
  assert.equal(leer(db)[1].notas, 'n; "c"\nl2')
  assert.deepEqual(leerPendientes(db).map((t) => [t.texto, t.hecha]), [['uno', false], ['dos', true]])
  assert.throws(() => migrar(db, dir), /dos veces/)
})

test('migrar rechaza una fila con ; sin escapar en vez de perder datos', () => {
  const dir = carpetaAntigua('1;Alta;Postulado;X;Y;;;;;paso; con punto y coma;;;\n')
  const db = abrir(':memory:')
  assert.throws(() => migrar(db, dir), /sin comillas/)
  assert.equal(leer(db).length, 0) // la transacción no deja nada a medias
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
  assert.equal(armarPedido('postular', { orden: '7', empresa: 'Pudu Labs', cargo: 'Dev' }), '/postular #7 Pudu Labs, Dev')
})

test('nuevo: crea la carpeta desde la plantilla, con la ruta de la CLI y la base vacía', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'oj-')), 'datos')
  crearDatos(dir, join(import.meta.dirname, '..', '..', 'plantilla'), 'pnpm otterjobs')
  const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8')
  assert.ok(agents.includes('**CLI de otterjobs:** `pnpm otterjobs`'))
  assert.ok(existsSync(join(dir, '.claude', 'commands', 'perfil.md')) && existsSync(join(dir, 'fuentes')))
  assert.equal(leer(abrir(join(dir, 'otterjobs.db'))).length, 0)
  assert.throws(() => crearDatos(dir, '', ''), /no está vacía/)
})

test('cada pedido de la app es un comando de la plantilla', () => {
  for (const c of Object.values(PEDIDOS)) assert.ok(existsSync(join(import.meta.dirname, '..', '..', 'plantilla', '.claude', 'commands', `${c.slice(1)}.md`)), c)
})

test('perfil: las etapas siguen las marcas pendiente de la plantilla', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'oj-')), 'datos')
  crearDatos(dir, join(import.meta.dirname, '..', '..', 'plantilla'), 'pnpm otterjobs')
  let e = estadoPerfil(dir)
  assert.equal(e.fuentes, 0)
  assert.ok(e.etapas.every((x) => !x.listo))
  assert.equal(e.siguiente, 'hechos')
  const perfil = join(dir, 'perfil', 'perfil.md')
  writeFileSync(perfil, readFileSync(perfil, 'utf8').replace(/<!-- pendiente:hechos[^>]*-->/, '') + '- ¿Jornada completa en 2023?\n')
  writeFileSync(join(dir, 'fuentes', 'cv.pdf'), '')
  e = estadoPerfil(dir)
  assert.equal(e.fuentes, 1)
  assert.equal(e.siguiente, 'preferencias')
  assert.deepEqual(e.porConfirmar, ['¿Jornada completa en 2023?'])
})
