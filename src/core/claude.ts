// «Preguntarle a Claude»: abre Claude Code interactivo (suscripción, no API ni `claude -p`) en la carpeta de datos,
// donde AGENTS.md ya le da las reglas. La app solo arma el pedido; el criterio y la redacción quedan en Claude.
import { spawn } from 'node:child_process'
import type { Fila } from './tracker.ts'

// Cada pedido es un comando de plantilla/.claude/commands: el método vive en la carpeta de datos, no aquí.
export const PEDIDOS = {
  preparar: '/entrevista',
  mensaje: '/mensaje',
  evaluar: '/evaluar',
  postular: '/postular',
  correo: '/correo',
  perfil: '/perfil',
  buscar: '/buscar',
  revisar: '/revisar'
} as const
export type Pedido = keyof typeof PEDIDOS

/** El texto que recibe Claude. Sin `;` porque Windows Terminal lo usa para separar comandos. */
export function armarPedido(pedido: Pedido, fila?: Pick<Fila, 'orden' | 'empresa' | 'cargo'>): string {
  if (!fila) return PEDIDOS[pedido]
  return `${PEDIDOS[pedido]} #${fila.orden} ${fila.empresa}, ${fila.cargo}`.replace(/;/g, ',').replace(/[\r\n"]+/g, ' ')
}

export function abrirClaude(cwd: string, texto: string): void {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['wt.exe', ['-d', cwd, '--title', 'otterjobs · Claude', 'claude', texto]]
      : ['x-terminal-emulator', ['-e', 'claude', texto]]
  spawn(cmd, args, { cwd, detached: true, stdio: 'ignore' }).unref()
}
