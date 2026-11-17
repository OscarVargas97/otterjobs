import { useEffect, useState, type ReactNode } from 'react'
import { Bot, CalendarClock, ExternalLink, FolderOpen, Inbox, KanbanSquare, Mail, Plus, RefreshCw, X } from 'lucide-react'
import type { Correo } from '../../core/gmail.ts'
import type { TareaMd } from '../../core/tareas-md.ts'
import type { Fila, Tarea } from '../../core/tracker.ts'
import type { Pedido } from '../../core/claude.ts'

type Estado = {
  datos: string | null
  filas?: Fila[]
  tareas?: Tarea[]
  tareasMd?: TareaMd[]
  inbox?: (Correo & { enlace: string })[]
  gmail?: boolean
  rutaEnv?: string
  version?: string
}
type Api = {
  [k in 'cargar' | 'elegirDatos' | 'actualizar' | 'agregar' | 'tareaMd' | 'nuevaTareaMd' | 'escanear' | 'revisado' | 'claude']: (...a: unknown[]) => Promise<Estado>
} & { abrir: (url: string) => void; alCambiar: (cb: (e: Estado) => void) => () => void }
const api = (window as unknown as { api: Api }).api

const COLUMNAS = ['Por postular', 'Postulado', 'Entrevista', 'Oferta', 'Cerradas'] as const
const columnaDe = (e: string) => (e === 'Descartada' || e === 'Rechazada' ? 'Cerradas' : e)
const ESTADOS = ['Oferta', 'Entrevista', 'Postulado', 'Por postular', 'Descartada', 'Rechazada']
const PROBS = ['Alta', 'Media-alta', 'Media', 'Media-baja', 'Baja', '—']
const COLOR_PROB: Record<string, string> = { Alta: 'bg-ok/20 text-ok', 'Media-alta': 'bg-ok/10 text-ok', Media: 'bg-muted text-foreground', 'Media-baja': 'bg-muted text-muted-foreground', Baja: 'bg-muted text-muted-foreground' }

export function App() {
  const [s, setS] = useState<Estado | null>(null)
  const [vista, setVista] = useState<'hoy' | 'tablero' | 'bandeja'>('hoy')
  const [abierta, setAbierta] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    void api.cargar().then(setS, (e: Error) => setError(e.message))
    return api.alCambiar(setS)
  }, [])

  /** Toda acción: llama a main, toma el estado nuevo o muestra el error. */
  const hacer = (fn: () => Promise<Estado>) => {
    setError('')
    setOcupado(true)
    fn()
      .then(setS, (e: Error) => setError(e.message.replace(/^Error invoking remote method '\w+': (Error: )?/, '')))
      .finally(() => setOcupado(false))
  }

  if (!s) return <div className="p-6 text-muted-foreground">Cargando…</div>
  if (!s.datos)
    return (
      <div className="grid h-full place-items-center">
        <div className="max-w-sm space-y-3 text-center">
          <h1 className="text-xl font-semibold">otterjobs</h1>
          <p className="text-sm text-muted-foreground">Elige la carpeta de datos (la que tiene postulaciones/tracker.csv).</p>
          <Boton onClick={() => hacer(api.elegirDatos)}>
            <FolderOpen /> Elegir carpeta
          </Boton>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    )

  const filas = s.filas ?? []
  const pendientes = (s.inbox ?? []).filter((c) => !c.revisado).length
  const vencidas = (s.tareas ?? []).filter((t) => t.vencida).length
  const fila = filas.find((f) => f.orden === abierta)

  return (
    <div className="flex h-full">
      <nav className="flex w-52 shrink-0 flex-col gap-1 border-r border-border bg-sidebar p-3">
        <div className="mb-3 px-2 text-lg font-semibold">otterjobs</div>
        <Nav activo={vista === 'hoy'} onClick={() => setVista('hoy')} icono={<CalendarClock />} texto="Hoy" n={vencidas || undefined} alerta />
        <Nav activo={vista === 'tablero'} onClick={() => setVista('tablero')} icono={<KanbanSquare />} texto="Tablero" n={filas.length} />
        <Nav activo={vista === 'bandeja'} onClick={() => setVista('bandeja')} icono={<Inbox />} texto="Bandeja" n={pendientes || undefined} alerta />
        <div className="mt-auto space-y-1 px-2 text-2xs text-muted-foreground">
          <div className="truncate" title={s.datos}>{s.datos}</div>
          <div>v{s.version}</div>
        </div>
      </nav>

      <main className="min-w-0 flex-1 overflow-auto p-5">
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')}><X className="size-4" /></button>
          </div>
        )}
        {vista === 'hoy' && <Hoy s={s} abrir={setAbierta} hacer={hacer} />}
        {vista === 'tablero' && <Tablero filas={filas} abrir={setAbierta} hacer={hacer} />}
        {vista === 'bandeja' && <Bandeja s={s} abrir={setAbierta} hacer={hacer} ocupado={ocupado} />}
      </main>

      {fila && <Detalle key={fila.empresa + fila.cargo} fila={fila} cerrar={() => setAbierta(null)} hacer={hacer} />}
    </div>
  )
}

type Hacer = (fn: () => Promise<Estado>) => void

function Hoy({ s, abrir, hacer }: { s: Estado; abrir: (o: string) => void; hacer: Hacer }) {
  const [nueva, setNueva] = useState('')
  const hoy = new Date().toLocaleDateString('sv-SE')
  return (
    <div className="max-w-4xl space-y-6">
      <Titulo>Próximos pasos</Titulo>
      <div className="space-y-2">
        {(s.tareas ?? []).map((t) => (
          <button key={t.orden} onClick={() => abrir(t.orden)} className={`block w-full rounded-lg border bg-card p-3 text-left hover:border-muted-foreground/40 ${t.vencida ? 'border-destructive/60' : t.vence === hoy ? 'border-warn/60' : 'border-border'}`}>
            <div className="mb-1 flex items-center gap-2 text-xs">
              <span className={t.vencida ? 'font-semibold text-destructive' : t.vence === hoy ? 'font-semibold text-warn' : 'text-muted-foreground'}>{t.vencida ? `Vencida · ${t.vence}` : t.vence === hoy ? 'Hoy' : t.vence || 'Sin fecha'}</span>
              <span className="text-muted-foreground">·</span>
              <span className="font-medium">#{t.orden} {t.empresa}</span>
              <span className="rounded bg-muted px-1.5 text-2xs text-muted-foreground">{t.estado}</span>
            </div>
            <div className="line-clamp-2 text-sm text-muted-foreground">{t.paso}</div>
          </button>
        ))}
      </div>

      <Titulo>Otras tareas</Titulo>
      <div className="space-y-1">
        {(s.tareasMd ?? []).map((t) => (
          <label key={t.linea} className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent ${t.hecha ? 'text-muted-foreground line-through' : ''}`}>
            <input type="checkbox" className="mt-1" checked={t.hecha} onChange={(e) => hacer(() => api.tareaMd(t.linea, t.texto, e.target.checked))} />
            {t.texto}
          </label>
        ))}
        <form
          className="flex gap-2 pt-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (nueva.trim()) hacer(() => api.nuevaTareaMd(nueva)), setNueva('')
          }}>
          <input value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Nueva tarea…" className="campo flex-1" />
          <Boton type="submit" variante="outline"><Plus /> Agregar</Boton>
        </form>
      </div>
    </div>
  )
}

function Tablero({ filas, abrir, hacer }: { filas: Fila[]; abrir: (o: string) => void; hacer: Hacer }) {
  const [q, setQ] = useState('')
  const [nueva, setNueva] = useState(false)
  const [sobre, setSobre] = useState<string | null>(null)
  const visibles = filas.filter((f) => !q || Object.values(f).join(' ').toLowerCase().includes(q.toLowerCase()))
  const soltar = (col: string, orden: string) => {
    const f = filas.find((x) => x.orden === orden)
    if (!f || columnaDe(f.estado) === col) return
    hacer(() => api.actualizar(orden, { estado: col === 'Cerradas' ? 'Descartada' : col }))
  }
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar empresa, stack, sueldo…" className="campo flex-1" />
        <Boton onClick={() => setNueva(true)}><Plus /> Nueva oferta</Boton>
      </div>
      {nueva && <NuevaOferta cerrar={() => setNueva(false)} hacer={hacer} />}
      <div className="grid min-h-0 flex-1 grid-cols-5 gap-3">
        {COLUMNAS.map((col) => {
          const tarjetas = visibles.filter((f) => columnaDe(f.estado) === col)
          return (
            <section
              key={col}
              onDragOver={(e) => (e.preventDefault(), setSobre(col))}
              onDragLeave={() => setSobre(null)}
              onDrop={(e) => (setSobre(null), soltar(col, e.dataTransfer.getData('text/plain')))}
              className={`flex min-h-0 flex-col rounded-lg border bg-sidebar ${sobre === col ? 'border-primary' : 'border-border'}`}>
              <h3 className="flex justify-between px-3 py-2 text-xs font-semibold text-muted-foreground">
                {col} <span>{tarjetas.length}</span>
              </h3>
              <div className="min-h-0 flex-1 space-y-2 overflow-auto px-2 pb-2">
                {tarjetas.map((f) => (
                  <article
                    key={f.orden}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', f.orden)}
                    onClick={() => abrir(f.orden)}
                    className="cursor-pointer rounded-md border border-border bg-card p-2.5 hover:border-muted-foreground/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium leading-tight">{f.empresa}</div>
                      {f.prob && f.prob !== '—' && <span className={`shrink-0 rounded px-1.5 text-2xs ${COLOR_PROB[f.prob] ?? ''}`}>{f.prob}</span>}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{f.cargo}</div>
                    {f.sueldo && <div className="mt-1 truncate text-2xs text-muted-foreground">{f.sueldo}</div>}
                    {col === 'Cerradas' && <div className="mt-1 text-2xs text-muted-foreground">{f.estado}</div>}
                    {f.vence && <div className="mt-1 text-2xs text-warn">vence {f.vence}</div>}
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function NuevaOferta({ cerrar, hacer }: { cerrar: () => void; hacer: Hacer }) {
  const [d, setD] = useState<Record<string, string>>({ prob: 'Media' })
  const campo = (k: string, ph: string) => <input placeholder={ph} value={d[k] ?? ''} onChange={(e) => setD({ ...d, [k]: e.target.value })} className="campo" />
  return (
    <form
      className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-card p-3"
      onSubmit={(e) => (e.preventDefault(), hacer(() => api.agregar(d)), cerrar())}>
      {campo('empresa', 'Empresa *')}
      {campo('cargo', 'Cargo *')}
      {campo('url', 'URL de la oferta')}
      {campo('sueldo', 'Sueldo')}
      {campo('modalidad', 'Modalidad')}
      <select value={d.prob} onChange={(e) => setD({ ...d, prob: e.target.value })} className="campo">
        {PROBS.map((p) => <option key={p}>{p}</option>)}
      </select>
      <div className="col-span-3 flex justify-end gap-2">
        <Boton type="button" variante="ghost" onClick={cerrar}>Cancelar</Boton>
        <Boton type="submit" disabled={!d.empresa || !d.cargo}>Agregar</Boton>
      </div>
    </form>
  )
}

function Bandeja({ s, abrir, hacer, ocupado }: { s: Estado; abrir: (o: string) => void; hacer: Hacer; ocupado: boolean }) {
  const [todos, setTodos] = useState(false)
  const correos = (s.inbox ?? []).filter((c) => todos || !c.revisado)
  return (
    <div className="max-w-4xl space-y-3">
      <div className="flex items-center gap-2">
        <Titulo>Bandeja de Gmail</Titulo>
        <div className="flex-1" />
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} /> Ver revisados
        </label>
        <Boton variante="outline" disabled={ocupado || !s.gmail} onClick={() => hacer(() => api.escanear(7))}>
          <RefreshCw className={ocupado ? 'animate-spin' : ''} /> Escanear 7 días
        </Boton>
        <Boton variante="outline" onClick={() => hacer(() => api.claude('correo'))}><Bot /> Revisar con Claude</Boton>
        <Boton variante="ghost" onClick={() => hacer(() => api.revisado('todos'))}>Marcar todo revisado</Boton>
      </div>
      {!s.gmail && (
        <div className="rounded-md border border-warn/40 bg-warn/10 p-3 text-sm">
          Para escanear, crea <code>{s.rutaEnv}</code> con <code>GMAIL_USER=…</code> y <code>GMAIL_APP_PASSWORD=…</code> (una{' '}
          <a className="underline" onClick={() => api.abrir('https://myaccount.google.com/apppasswords')}>contraseña de aplicación</a>) y reinicia la app.
        </div>
      )}
      {correos.length === 0 && <p className="text-sm text-muted-foreground">Nada pendiente.</p>}
      {correos.map((c) => (
        <div key={c.id} className={`rounded-lg border border-border bg-card p-3 ${c.revisado ? 'opacity-60' : ''}`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{c.fecha}</span>
            {c.orden ? (
              <button className="rounded bg-primary/15 px-1.5 text-primary" onClick={() => abrir(c.orden)}>#{c.orden} {c.empresa}</button>
            ) : (
              <span className="rounded bg-muted px-1.5">sin empresa</span>
            )}
            <span className="truncate">{c.de}</span>
          </div>
          <div className="mt-1 text-sm font-medium">{c.asunto}</div>
          <div className="mt-1 line-clamp-3 text-xs text-muted-foreground">{c.extracto}</div>
          <div className="mt-2 flex gap-2">
            <Boton tam="xs" variante="outline" onClick={() => api.abrir(c.enlace)}><Mail /> Abrir en Gmail</Boton>
            {!c.revisado && <Boton tam="xs" variante="ghost" onClick={() => hacer(() => api.revisado([c.id]))}>Revisado</Boton>}
          </div>
        </div>
      ))}
    </div>
  )
}

const PEDIDOS: [Pedido, string][] = [
  ['preparar', 'Preparar entrevista'],
  ['mensaje', 'Redactar mensaje'],
  ['evaluar', 'Evaluar oferta'],
  ['postular', 'Preparar postulación']
]

function Detalle({ fila, cerrar, hacer }: { fila: Fila; cerrar: () => void; hacer: Hacer }) {
  const [d, setD] = useState<Fila>(fila)
  const cambios = Object.fromEntries(Object.entries(d).filter(([k, v]) => k !== 'orden' && v !== fila[k as keyof Fila]))
  const sucio = Object.keys(cambios).length > 0
  const set = (k: keyof Fila) => (e: { target: { value: string } }) => setD({ ...d, [k]: e.target.value })
  return (
    <aside className="flex w-[440px] shrink-0 flex-col border-l border-border bg-sidebar">
      <header className="flex items-start gap-2 border-b border-border p-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">#{fila.orden} · publicada {fila.publicada || '—'}</div>
          <h2 className="text-base font-semibold">{fila.empresa}</h2>
          <div className="text-sm text-muted-foreground">{fila.cargo}</div>
        </div>
        <button onClick={cerrar} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
      </header>
      <div className="flex-1 space-y-3 overflow-auto p-4">
        <div className="flex flex-wrap gap-1.5">
          {PEDIDOS.map(([p, t]) => (
            <Boton key={p} tam="xs" variante="outline" onClick={() => hacer(() => api.claude(p, fila.orden))}><Bot /> {t}</Boton>
          ))}
          {/^https:\/\//.test(fila.url) && <Boton tam="xs" variante="ghost" onClick={() => api.abrir(fila.url)}><ExternalLink /> Oferta</Boton>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Campo t="Estado"><select className="campo" value={d.estado} onChange={set('estado')}>{ESTADOS.map((e) => <option key={e}>{e}</option>)}</select></Campo>
          <Campo t="Probabilidad"><select className="campo" value={d.prob} onChange={set('prob')}>{['', ...PROBS].map((p) => <option key={p}>{p}</option>)}</select></Campo>
          <Campo t="Vence"><input type="date" className="campo" value={d.vence} onChange={set('vence')} /></Campo>
          <Campo t="Sueldo"><input className="campo" value={d.sueldo} onChange={set('sueldo')} /></Campo>
        </div>
        <Campo t="Modalidad"><input className="campo" value={d.modalidad} onChange={set('modalidad')} /></Campo>
        <Campo t="Próximo paso"><textarea rows={6} className="campo" value={d.proximo_paso} onChange={set('proximo_paso')} /></Campo>
        <Campo t="Notas"><textarea rows={6} className="campo" value={d.notas} onChange={set('notas')} /></Campo>
        <Campo t="Ficha"><input className="campo" value={d.ficha} onChange={set('ficha')} /></Campo>
      </div>
      <footer className="flex justify-end gap-2 border-t border-border p-3">
        <Boton variante="ghost" disabled={!sucio} onClick={() => setD(fila)}>Descartar</Boton>
        <Boton disabled={!sucio} onClick={() => hacer(() => api.actualizar(fila.orden, cambios))}>Guardar</Boton>
      </footer>
    </aside>
  )
}

const Titulo = ({ children }: { children: ReactNode }) => <h2 className="text-sm font-semibold">{children}</h2>
const Campo = ({ t, children }: { t: string; children: ReactNode }) => (
  <label className="block space-y-1">
    <span className="text-2xs font-medium text-muted-foreground">{t}</span>
    {children}
  </label>
)

function Nav({ activo, onClick, icono, texto, n, alerta }: { activo: boolean; onClick: () => void; icono: ReactNode; texto: string; n?: number; alerta?: boolean }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm [&_svg]:size-4 ${activo ? 'bg-sidebar-accent text-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/60'}`}>
      {icono}
      <span className="flex-1 text-left">{texto}</span>
      {n !== undefined && <span className={`rounded-full px-1.5 text-2xs ${alerta ? 'bg-destructive text-white' : 'bg-muted'}`}>{n}</span>}
    </button>
  )
}

const VARIANTES = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  outline: 'border border-border bg-background hover:bg-accent',
  ghost: 'hover:bg-accent'
}
function Boton({ variante = 'default', tam = 'sm', className = '', ...p }: React.ComponentProps<'button'> & { variante?: keyof typeof VARIANTES; tam?: 'sm' | 'xs' }) {
  const t = tam === 'xs' ? 'h-6 gap-1 px-2 text-xs [&_svg]:size-3' : 'h-8 gap-1.5 px-3 text-sm [&_svg]:size-4'
  return <button className={`inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 ${t} ${VARIANTES[variante]} ${className}`} {...p} />
}
