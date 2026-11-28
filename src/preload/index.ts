// Puente entre la interfaz y main: lo único que la interfaz puede pedir.
import { contextBridge, ipcRenderer } from 'electron'

const llamar = (canal: string) => (...a: unknown[]) => ipcRenderer.invoke(canal, ...a)

const api = {
  cargar: llamar('cargar'),
  elegirDatos: llamar('elegirDatos'),
  actualizar: llamar('actualizar'),
  agregar: llamar('agregar'),
  marcarPendiente: llamar('marcarPendiente'),
  nuevoPendiente: llamar('nuevoPendiente'),
  historial: llamar('historial'),
  escanear: llamar('escanear'),
  configurarGmail: llamar('configurarGmail'),
  revisado: llamar('revisado'),
  claude: llamar('claude'),
  abrir: (url: string) => ipcRenderer.send('abrir', url),
  terminal: {
    escribir: (id: number, d: string) => ipcRenderer.send('pty:escribir', id, d),
    tamano: (id: number, cols: number, rows: number) => ipcRenderer.send('pty:tamano', id, cols, rows),
    cerrar: (id: number) => ipcRenderer.send('pty:cerrar', id),
    al: (canal: 'abierta' | 'datos' | 'fin', cb: (id: number, v: string | number) => void) => {
      const h = (_e: unknown, id: number, v: string | number) => cb(id, v)
      ipcRenderer.on(`pty:${canal}`, h)
      return () => ipcRenderer.off(`pty:${canal}`, h)
    }
  },
  alCambiar: (cb: (estado: unknown) => void) => {
    const h = (_e: unknown, s: unknown) => cb(s)
    ipcRenderer.on('estado', h)
    return () => ipcRenderer.off('estado', h)
  }
}

contextBridge.exposeInMainWorld('api', api)
export type Api = typeof api
