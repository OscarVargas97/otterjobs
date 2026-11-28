// CLI de otterjobs: lo mismo que la app, para Claude Code y la terminal.
//   pnpm otterjobs ver [--estado Postulado] [--q texto] | stats | tareas | historial ORDEN
//   pnpm otterjobs set ORDEN campo=valor ... | add empresa=X cargo=Y ...
//   pnpm otterjobs pendiente "texto" | hecha ID
//   pnpm otterjobs gmail [--dias 7] | gmail --pendientes | gmail --revisado
//   pnpm otterjobs perfil [--json]   (etapas del perfil: qué está listo y qué sigue)
//   pnpm otterjobs pdf <archivo.html> [salida.pdf]   (CV a PDF con Edge o Chrome)
//   pnpm otterjobs nuevo [carpeta] | datos <carpeta> | migrar
import { join, resolve } from 'node:path'
import { carpetaDatos, cuentasGmail, guardarCarpetaDatos, RUTA_GMAIL, rutas } from './core/config.ts'
import { usar } from './core/db.ts'
import { escanear, leerInbox, marcarRevisado } from './core/gmail.ts'
import { migrar } from './core/migrar.ts'
import { aPdf } from './core/pdf.ts'
import { estadoPerfil } from './core/perfil.ts'
import { crearDatos } from './core/plantilla.ts'
import { agregarPendiente, leerPendientes, marcarPendiente } from './core/pendientes.ts'
import { actualizar, agregar, ESTADOS, historial, isoHoy, leer, tareas, type Fila } from './core/tracker.ts'

const ayuda = `uso: otterjobs ver [--estado X] [--q texto] | stats | tareas | historial ORDEN | set ORDEN campo=valor ... | add campo=valor ... | pendiente "texto" | hecha ID | gmail [--dias N | --pendientes | --revisado] | perfil [--json] | pdf <html> [pdf] | nuevo [carpeta] | datos <carpeta> | migrar`
const corto = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1) + '…').padEnd(n)
const opcion = (a: string[], k: string) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined)

function pares(args: string[]): Record<string, string> {
  return Object.fromEntries(
    args.map((a) => {
      const i = a.indexOf('=')
      if (i < 1) throw new Error(`esperaba campo=valor, recibí "${a}"`)
      return [a.slice(0, i), a.slice(i + 1)]
    })
  )
}

const linea = (f: Fila) => `${f.orden.padStart(3)} ${corto(f.prob, 10)} ${corto(f.estado, 12)} ${corto(f.empresa, 28)} ${corto(f.cargo, 40)} ${corto(f.sueldo, 26)} ${f.modalidad}`

async function main(a: string[]) {
  const [cmd, ...resto] = a
  if (cmd === 'nuevo') {
    const raiz = resolve(import.meta.dirname, '..')
    const destino = resto[0] ?? join(raiz, 'datos') // por defecto otterjobs/datos: ignorada por git, va en su propio repo privado
    crearDatos(destino, join(raiz, 'plantilla'))
    guardarCarpetaDatos(destino)
    const metodo = join(raiz, 'metodo').replace(/\\/g, '/')
    return console.log(`Carpeta de datos creada en ${destino}. Deja tu material en fuentes/, abre ahí \`claude --plugin-dir ${metodo} --settings ${metodo}/settings.json\` y escribe /otterjobs:perfil.`)
  }
  if (cmd === 'pdf') {
    if (!resto[0]) throw new Error('uso: pdf <archivo.html> [salida.pdf]')
    // pnpm --dir cambia el cwd: las rutas relativas son desde donde se llamó (INIT_CWD)
    const desde = (f?: string) => f && resolve(process.env.INIT_CWD ?? '.', f)
    return console.log(aPdf(desde(resto[0])!, desde(resto[1])))
  }
  if (cmd === 'datos') {
    guardarCarpetaDatos(resto[0])
    return console.log(`Datos: ${resto[0]}`)
  }
  const datos = carpetaDatos()
  if (!datos) throw new Error('Falta la carpeta de datos: otterjobs datos <carpeta>')
  const r = rutas(datos)
  if (cmd === 'perfil') {
    const e = estadoPerfil(datos)
    if (resto.includes('--json')) return console.log(JSON.stringify(e, null, 2))
    console.log(`fuentes/: ${e.fuentes} archivos${e.fuentes ? '' : ' (deja ahí tu material antes de empezar)'}`)
    for (const x of e.etapas) console.log(`${x.listo ? '✓' : '·'} ${x.id.padEnd(13)} ${x.archivo.padEnd(30)} ${x.que}`)
    if (e.porConfirmar.length) console.log(`\nPor confirmar (perfil.md):\n${e.porConfirmar.map((p) => `  - ${p}`).join('\n')}`)
    return console.log(e.siguiente ? `\nSigue: /perfil ${e.siguiente}` : '\nPerfil completo. Mantenlo con /revisar, /buscar y /semana.')
  }
  if (cmd === 'gmail' && !resto.includes('--revisado') && !resto.includes('--pendientes')) {
    const cuentas = cuentasGmail()
    if (!cuentas.length) throw new Error(`Sin cuentas de Gmail: conéctalas desde la Bandeja de la app (quedan en ${RUTA_GMAIL})`)
    const filas = usar(r.db, leer) // la base no queda abierta durante el escaneo
    const { nuevos, pendientes, errores } = await escanear(cuentas, filas, r.inbox, Number(opcion(resto, '--dias') ?? 7))
    for (const e of errores) console.error(`No se pudo leer ${e}`)
    return console.log(`${nuevos} correos nuevos de postulaciones en ${cuentas.length - errores.length} de ${cuentas.length} cuenta(s). Pendientes: ${pendientes}.`)
  }

  usar(r.db, (db) => {
    switch (cmd) {
      case 'migrar': {
        const n = migrar(db, datos)
        return console.log(`Migradas ${n.postulaciones} postulaciones y ${n.pendientes} tareas a ${r.db}. Comprueba con «ver» y «tareas» antes de borrar tracker.csv y tareas.md.`)
      }
      case 'ver': {
        const estado = opcion(resto, '--estado')
        const q = opcion(resto, '--q')?.toLowerCase()
        return leer(db)
          .filter((f) => (!estado || f.estado === estado) && (!q || Object.values(f).join(' ').toLowerCase().includes(q)))
          .forEach((f) => console.log(linea(f)))
      }
      case 'stats': {
        const filas = leer(db)
        for (const e of ESTADOS) console.log(`${e.padEnd(13)} ${filas.filter((f) => f.estado === e).length}`)
        return console.log(`${'Total'.padEnd(13)} ${filas.length}`)
      }
      case 'tareas': {
        for (const t of tareas(leer(db))) console.log(`[${t.vence || 'sin fecha'}] ${t.vencida ? 'VENCIDA ' : ''}#${t.orden} ${t.empresa}: ${t.paso.slice(0, 160)}`)
        const otras = leerPendientes(db).filter((t) => !t.hecha)
        if (otras.length) console.log('\nOtras tareas:\n' + otras.map((t) => `  [${t.id}] ${t.texto}`).join('\n'))
        return
      }
      case 'historial': {
        if (!resto[0]) throw new Error('uso: historial ORDEN')
        for (const e of historial(db, resto[0])) console.log(`${e.fecha}  ${e.campo}: ${corto(e.antes || '∅', 40)} → ${e.despues}`)
        return
      }
      case 'set': {
        if (!resto[0] || resto.length < 2) throw new Error('uso: set ORDEN campo=valor ...')
        const f = actualizar(db, resto[0], pares(resto.slice(1)))
        return console.log(`Actualizada: ${f.empresa} → #${f.orden} (${f.estado})`)
      }
      case 'add': {
        const f = agregar(db, pares(resto))
        return console.log(`Agregada: ${f.empresa} → #${f.orden}`)
      }
      case 'pendiente':
        agregarPendiente(db, resto.join(' '))
        return console.log('Tarea agregada.')
      case 'hecha':
        marcarPendiente(db, Number(resto[0]), true)
        return console.log(`Tarea ${resto[0]} hecha.`)
      case 'gmail': {
        if (resto.includes('--revisado')) return marcarRevisado(r.inbox, 'todos', isoHoy()), console.log('Todo marcado como revisado.')
        for (const c of leerInbox(r.inbox).filter((c) => !c.revisado))
          console.log(`[${c.fecha}] ${c.empresa || '¿?'} (#${c.orden || '-'}) | ${c.de}${c.cuenta ? ` → ${c.cuenta}` : ''}\n  ${c.asunto}\n  ${c.extracto.slice(0, 300)}\n`)
        return
      }
      default:
        console.log(ayuda)
    }
  })
}

main(process.argv.slice(2)).catch((e: Error) => {
  console.error(e.message)
  process.exit(1)
})
