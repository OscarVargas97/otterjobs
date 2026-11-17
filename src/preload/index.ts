// Puente entre la interfaz y main: lo único que la interfaz puede pedir.
import { contextBridge, ipcRenderer } from 'electron'

const llamar = (canal: string) => (...a: unknown[]) => ipcRenderer.invoke(canal, ...a)

const api = {
  cargar: llamar('cargar'),
  elegirDatos: llamar('elegirDatos'),
  actualizar: llamar('actualizar'),
  agregar: llamar('agregar'),
  tareaMd: llamar('tareaMd'),
  nuevaTareaMd: llamar('nuevaTareaMd'),
  escanear: llamar('escanear'),
  revisado: llamar('revisado'),
  claude: llamar('claude'),
  abrir: (url: string) => ipcRenderer.send('abrir', url),
  alCambiar: (cb: (estado: unknown) => void) => {
    const h = (_e: unknown, s: unknown) => cb(s)
    ipcRenderer.on('estado', h)
    return () => ipcRenderer.off('estado', h)
  }
}

contextBridge.exposeInMainWorld('api', api)
export type Api = typeof api
