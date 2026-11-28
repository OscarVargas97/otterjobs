// «Preguntarle a Claude»: abre Claude Code interactivo (suscripción, no API ni `claude -p`) en la carpeta de datos,
// en una terminal dentro de la app (src/main/terminal.ts),
// con el plugin metodo/ (reglas y comandos). La app solo arma el pedido; el criterio y la redacción quedan en Claude.
import { join } from 'node:path'
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

/** El texto que recibe Claude: un solo argumento, sin comillas ni `%` porque en Windows pasa por cmd.exe. */
export function armarPedido(pedido: Pedido, fila?: Pick<Fila, 'orden' | 'empresa' | 'cargo'>): string {
  if (!fila) return PEDIDOS[pedido]
  return `${PEDIDOS[pedido]} #${fila.orden} ${fila.empresa}, ${fila.cargo}`.replace(/;/g, ',').replace(/[\r\n"%]+/g, ' ')
}

/** Argumentos de `claude`. `metodo`: la carpeta del plugin (en la app empaquetada, fuera del asar para que Claude Code la lea).
 *  Su settings.json deja fuera el CLAUDE.md de desarrollo de otterjobs cuando los datos están en otterjobs/datos. */
export const argsClaude = (metodo: string, texto: string) => ['--plugin-dir', metodo, '--settings', join(metodo, 'settings.json'), texto]
