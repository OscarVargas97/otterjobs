// Las sesiones de Claude Code que abre la app, en pestañas. Cada xterm vive mientras la pestaña esté abierta.
import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { X } from 'lucide-react'

type Pty = {
  escribir: (id: number, d: string) => void
  tamano: (id: number, cols: number, rows: number) => void
  cerrar: (id: number) => void
  al: (canal: 'abierta' | 'datos' | 'fin', cb: (id: number, v: string | number) => void) => () => void
}
const pty = (window as unknown as { api: { terminal: Pty } }).api.terminal

type Sesion = { id: number; titulo: string; term: Terminal; fit: FitAddon; fin?: number }

function crear(id: number, titulo: string): Sesion {
  const term = new Terminal({ fontFamily: '"Cascadia Mono", Consolas, monospace', fontSize: 13, cursorBlink: true, theme: { background: '#141414' } })
  const fit = new FitAddon()
  term.loadAddon(fit)
  term.onData((d) => pty.escribir(id, d))
  term.onResize(({ cols, rows }) => pty.tamano(id, cols, rows))
  // Ctrl+C con selección copia (sin selección va a Claude); Ctrl+V lo pega el navegador.
  term.attachCustomKeyEventHandler((e) => {
    if (e.type !== 'keydown' || !e.ctrlKey || e.shiftKey || e.altKey) return true
    if (e.key === 'c' && term.hasSelection()) return void navigator.clipboard.writeText(term.getSelection()), false
    return e.key !== 'v'
  })
  return { id, titulo, term, fit }
}

export function Terminales({ visible, alAbrir, alCambiar }: { visible: boolean; alAbrir: () => void; alCambiar: (n: number) => void }) {
  const [sesiones, setSesiones] = useState<Sesion[]>([])
  const [activa, setActiva] = useState<number>()
  const mapa = useRef(new Map<number, Sesion>())
  const avisos = useRef({ alAbrir, alCambiar })
  avisos.current = { alAbrir, alCambiar }

  useEffect(() => avisos.current.alCambiar(sesiones.length), [sesiones.length])
  useEffect(() => {
    const quitar = [
      pty.al('abierta', (id, titulo) => {
        const s = crear(id, String(titulo))
        mapa.current.set(id, s)
        setSesiones((x) => [...x, s])
        setActiva(id)
        avisos.current.alAbrir()
      }),
      pty.al('datos', (id, d) => mapa.current.get(id)?.term.write(String(d))),
      pty.al('fin', (id, code) => {
        mapa.current.get(id)?.term.write(`\r\n\x1b[2m[La sesión terminó. Cierra la pestaña.]\x1b[0m\r\n`)
        setSesiones((x) => x.map((s) => (s.id === id ? { ...s, fin: Number(code) } : s)))
      })
    ]
    return () => quitar.forEach((q) => q())
  }, [])

  const cerrar = (s: Sesion) => {
    if (s.fin === undefined) pty.cerrar(s.id)
    s.term.dispose()
    mapa.current.delete(s.id)
    const resto = sesiones.filter((x) => x.id !== s.id)
    setSesiones(resto)
    if (activa === s.id) setActiva(resto.at(-1)?.id)
  }

  return (
    <section className={visible ? 'flex min-w-0 flex-1 flex-col bg-[#141414]' : 'hidden'}>
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-2 pt-2">
        {sesiones.map((s) => (
          <div key={s.id} className={`flex items-center gap-2 rounded-t-md px-3 py-1.5 text-sm ${s.id === activa ? 'bg-sidebar-accent' : 'text-muted-foreground hover:bg-sidebar-accent/60'}`}>
            <button onClick={() => setActiva(s.id)} className={s.fin !== undefined ? 'line-through' : ''}>{s.titulo}</button>
            <button onClick={() => cerrar(s)} title="Cerrar" className="hover:text-foreground"><X className="size-3.5" /></button>
          </div>
        ))}
      </div>
      {sesiones.length === 0 && <p className="p-5 text-sm text-muted-foreground">Los botones con Claude abren aquí una sesión de Claude Code.</p>}
      <div className="relative min-h-0 flex-1">
        {sesiones.map((s) => <Panel key={s.id} s={s} visible={visible && s.id === activa} />)}
      </div>
    </section>
  )
}

function Panel({ s, visible }: { s: Sesion; visible: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!s.term.element) s.term.open(ref.current!)
  }, [s])
  useEffect(() => {
    if (!visible) return
    const ajustar = () => s.fit.fit()
    ajustar()
    s.term.focus()
    const ro = new ResizeObserver(ajustar)
    ro.observe(ref.current!)
    return () => ro.disconnect()
  }, [visible, s])
  return <div ref={ref} className={`absolute inset-0 p-2 ${visible ? '' : 'invisible'}`} />
}
