// CLI de otterjobs: lo mismo que la app, para Claude Code y la terminal.
//   pnpm otterjobs ver [--estado Postulado] [--q texto] | stats | tareas
//   pnpm otterjobs set ORDEN campo=valor ... | add empresa=X cargo=Y ...
//   pnpm otterjobs gmail [--dias 7] | gmail --pendientes | gmail --revisado
//   pnpm otterjobs datos <carpeta de datos>
import { carpetaDatos, credencialesGmail, guardarCarpetaDatos, RUTA_ENV, rutas } from './core/config.ts'
import { escanear, leerInbox, marcarRevisado } from './core/gmail.ts'
import { leerTareasMd } from './core/tareas-md.ts'
import { actualizar, agregar, ESTADOS, isoHoy, leer, tareas, type Fila } from './core/tracker.ts'

const ayuda = `uso: otterjobs ver [--estado X] [--q texto] | stats | tareas | set ORDEN campo=valor ... | add campo=valor ... | gmail [--dias N | --pendientes | --revisado] | datos <carpeta>`
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
  if (cmd === 'datos') {
    guardarCarpetaDatos(resto[0])
    return console.log(`Datos: ${resto[0]}`)
  }
  const datos = carpetaDatos()
  if (!datos) throw new Error('Falta la carpeta de datos: otterjobs datos <carpeta>')
  const r = rutas(datos)

  switch (cmd) {
    case 'ver': {
      const estado = opcion(resto, '--estado')
      const q = opcion(resto, '--q')?.toLowerCase()
      return leer(r.tracker)
        .filter((f) => (!estado || f.estado === estado) && (!q || Object.values(f).join(' ').toLowerCase().includes(q)))
        .forEach((f) => console.log(linea(f)))
    }
    case 'stats': {
      const filas = leer(r.tracker)
      for (const e of ESTADOS) console.log(`${e.padEnd(13)} ${filas.filter((f) => f.estado === e).length}`)
      return console.log(`${'Total'.padEnd(13)} ${filas.length}`)
    }
    case 'tareas': {
      for (const t of tareas(leer(r.tracker))) console.log(`[${t.vence || 'sin fecha'}] ${t.vencida ? 'VENCIDA ' : ''}#${t.orden} ${t.empresa}: ${t.paso.slice(0, 160)}`)
      const otras = leerTareasMd(r.tareasMd).filter((t) => !t.hecha)
      if (otras.length) console.log('\nOtras (tareas.md):\n' + otras.map((t) => `  - ${t.texto}`).join('\n'))
      return
    }
    case 'set': {
      if (!resto[0] || resto.length < 2) throw new Error('uso: set ORDEN campo=valor ...')
      const f = actualizar(r.tracker, resto[0], pares(resto.slice(1)))
      return console.log(`Actualizada: ${f.empresa} → #${f.orden} (${f.estado})`)
    }
    case 'add': {
      const f = agregar(r.tracker, pares(resto))
      return console.log(`Agregada: ${f.empresa} → #${f.orden}`)
    }
    case 'gmail': {
      if (resto.includes('--revisado')) return marcarRevisado(r.inbox, 'todos', isoHoy()), console.log('Todo marcado como revisado.')
      if (resto.includes('--pendientes')) {
        for (const c of leerInbox(r.inbox).filter((c) => !c.revisado))
          console.log(`[${c.fecha}] ${c.empresa || '¿?'} (#${c.orden || '-'}) | ${c.de}\n  ${c.asunto}\n  ${c.extracto.slice(0, 300)}\n`)
        return
      }
      const cred = credencialesGmail()
      if (!cred) throw new Error(`Faltan GMAIL_USER y GMAIL_APP_PASSWORD en ${RUTA_ENV}`)
      const { nuevos, pendientes } = await escanear(cred, leer(r.tracker), r.inbox, Number(opcion(resto, '--dias') ?? 7))
      return console.log(`${nuevos} correos nuevos de postulaciones. Pendientes: ${pendientes}.`)
    }
    default:
      console.log(ayuda)
  }
}

main(process.argv.slice(2)).catch((e: Error) => {
  console.error(e.message)
  process.exit(1)
})
