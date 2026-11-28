// Terminales dentro de la app: Claude Code interactivo en un pseudoterminal (node-pty) que la interfaz muestra con xterm.
import { ipcMain, type WebContents } from 'electron'
import { spawn, type IPty } from 'node-pty'

const ptys = new Map<number, IPty>()
let ultimo = 0

export function abrirTerminal(web: WebContents, cwd: string, titulo: string, cmd: string, args: string[]): void {
  // En Windows pasa por cmd.exe para encontrar tanto claude.exe como el claude.cmd de npm.
  const [file, a] = process.platform === 'win32' ? [process.env.ComSpec ?? 'cmd.exe', ['/c', cmd, ...args]] : [cmd, args]
  const pty = spawn(file, a, { name: 'xterm-256color', cwd, cols: 120, rows: 30, env: process.env as Record<string, string> })
  const id = ++ultimo
  ptys.set(id, pty)
  const enviar = (canal: string, v: string | number) => !web.isDestroyed() && web.send(canal, id, v)
  enviar('pty:abierta', titulo)
  pty.onData((d) => enviar('pty:datos', d))
  pty.onExit(({ exitCode }) => (ptys.delete(id), enviar('pty:fin', exitCode)))
}

const entero = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0
ipcMain.on('pty:escribir', (_e, id, d) => typeof d === 'string' && ptys.get(id)?.write(d))
ipcMain.on('pty:tamano', (_e, id, cols, rows) => entero(cols) && entero(rows) && ptys.get(id)?.resize(cols, rows))
ipcMain.on('pty:cerrar', (_e, id) => ptys.get(id)?.kill())

export const cerrarTerminales = () => ptys.forEach((p) => p.kill())
