// «Preguntarle a Claude»: abre Claude Code interactivo (suscripción, no API ni `claude -p`) en la carpeta de datos,
// con el plugin metodo/ (reglas y comandos). La app solo arma el pedido; el criterio y la redacción quedan en Claude.
import { spawn } from 'node:child_process'
import type { Fila } from './tracker.ts'

// Cada pedido es un comando de metodo/commands: el método vive en el plugin, no en el código ni en los datos.
export const PEDIDOS = {
  preparar: '/otterjobs:entrevista',
  mensaje: '/otterjobs:mensaje',
  evaluar: '/otterjobs:evaluar',
  postular: '/otterjobs:postular',
  correo: '/otterjobs:correo',
  perfil: '/otterjobs:perfil',
  buscar: '/otterjobs:buscar',
  revisar: '/otterjobs:revisar'
} as const
export type Pedido = keyof typeof PEDIDOS

/** El texto que recibe Claude. Sin `;` porque Windows Terminal lo usa para separar comandos. */
export function armarPedido(pedido: Pedido, fila?: Pick<Fila, 'orden' | 'empresa' | 'cargo'>): string {
  if (!fila) return PEDIDOS[pedido]
  return `${PEDIDOS[pedido]} #${fila.orden} ${fila.empresa}, ${fila.cargo}`.replace(/;/g, ',').replace(/[\r\n"]+/g, ' ')
}

/** `metodo`: la carpeta del plugin (en la app empaquetada, fuera del asar para que Claude Code la lea). */
export function abrirClaude(cwd: string, metodo: string, texto: string): void {
  const claude = ['claude', '--plugin-dir', metodo, texto]
  const [cmd, args] =
    process.platform === 'win32'
      ? ['wt.exe', ['-d', cwd, '--title', 'otterjobs · Claude', ...claude]]
      : ['x-terminal-emulator', ['-e', ...claude]]
  spawn(cmd, args, { cwd, detached: true, stdio: 'ignore' }).unref()
}
