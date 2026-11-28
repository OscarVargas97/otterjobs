import { useEffect, useState, type ReactNode } from 'react'
import { ArrowLeft, Bot, CalendarClock, ChevronRight, ExternalLink, FolderOpen, Inbox, KanbanSquare, Mail, Plus, RefreshCw, SquareTerminal, X } from 'lucide-react'
import type { Correo } from '../../core/gmail.ts'
import type { Pendiente } from '../../core/pendientes.ts'
import type { Evento, Fila, Tarea } from '../../core/tracker.ts'
import type { Pedido } from '../../core/claude.ts'
import { Terminales } from './Terminales'

type Estado = {
  datos: string | null
  filas?: Fila[]
  tareas?: Tarea[]
  pendientes?: Pendiente[]
  inbox?: (Correo & { enlace: string })[]
  gmail?: string | null
  rutaEnv?: string
  version?: string
}
type Api = {
  [k in 'cargar' | 'elegirDatos' | 'actualizar' | 'agregar' | 'marcarPendiente' | 'nuevoPendiente' | 'escanear' | 'configurarGmail' | 'revisado' | 'claude']: (...a: unknown[]) => Promise<Estado>
} & { historial: (orden: string) => Promise<Evento[]>; abrir: (url: string) => void; alCambiar: (cb: (e: Estado) => void) => () => void }
const api = (window as unknown as { api: Api }).api

const COLUMNAS = ['Por postular', 'Postulado', 'Entrevista', 'Oferta', 'Cerradas'] as const
const columnaDe = (e: string) => (e === 'Descartada' || e === 'Rechazada' ? 'Cerradas' : e)
const ESTADOS = ['Oferta', 'Entrevista', 'Postulado', 'Por postular', 'Descartada', 'Rechazada']
const PROBS = ['Alta', 'Media-alta', 'Media', 'Media-baja', 'Baja', '—']
const COLOR_PROB: Record<string, string> = { Alta: 'bg-ok/20 text-ok', 'Media-alta': 'bg-ok/10 text-ok', Media: 'bg-muted text-foreground', 'Media-baja': 'bg-muted text-muted-foreground', Baja: 'bg-muted text-muted-foreground' }

export function App() {
  const [s, setS] = useState<Estado | null>(null)
  const [vista, setVista] = useState<'hoy' | 'tablero' | 'bandeja' | 'claude'>('hoy')
  const [abierta, setAbierta] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [sesiones, setSesiones] = useState(0)
  const ir = (v: typeof vista) => (setVista(v), setAbierta(null))

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
          <p className="text-sm text-muted-foreground">Elige la carpeta de datos (la que tiene otterjobs.db).</p>
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
        <Nav activo={vista === 'hoy' && !fila} onClick={() => ir('hoy')} icono={<CalendarClock />} texto="Hoy" n={vencidas || undefined} alerta />
        <Nav activo={vista === 'tablero' && !fila} onClick={() => ir('tablero')} icono={<KanbanSquare />} texto="Tablero" n={filas.length} />
        <Nav activo={vista === 'bandeja' && !fila} onClick={() => ir('bandeja')} icono={<Inbox />} texto="Bandeja" n={pendientes || undefined} alerta />
        <Nav activo={vista === 'claude'} onClick={() => setVista('claude')} icono={<SquareTerminal />} texto="Claude" n={sesiones || undefined} />
        <Boton variante="outline" tam="xs" className="mt-4" onClick={() => hacer(() => api.claude('perfil'))}><Bot /> Mi perfil con Claude</Boton>
        <div className="mt-auto space-y-1 px-2 text-2xs text-muted-foreground">
          <div className="truncate" title={s.datos}>{s.datos}</div>
          <div>v{s.version}</div>
        </div>
      </nav>

      <main className={`min-w-0 flex-1 overflow-auto p-5 ${vista === 'claude' ? 'hidden' : ''}`}>
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')}><X className="size-4" /></button>
          </div>
        )}
        {fila ? (
          <Detalle key={fila.empresa + fila.cargo} fila={fila} cerrar={() => setAbierta(null)} hacer={hacer} />
        ) : (
          <>
            {vista === 'hoy' && <Hoy s={s} abrir={setAbierta} hacer={hacer} />}
            {vista === 'tablero' && <Tablero filas={filas} abrir={setAbierta} hacer={hacer} />}
            {vista === 'bandeja' && <Bandeja s={s} abrir={setAbierta} hacer={hacer} ocupado={ocupado} />}
          </>
        )}
      </main>
      <Terminales visible={vista === 'claude'} alAbrir={() => setVista('claude')} alCambiar={setSesiones} />
    </div>
  )
}

type Hacer = (fn: () => Promise<Estado>) => void

function Hoy({ s, abrir, hacer }: { s: Estado; abrir: (o: string) => void; hacer: Hacer }) {
  const [nueva, setNueva] = useState('')
  const hoy = new Date().toLocaleDateString('sv-SE')
  const ts = s.tareas ?? []
  const grupos = [
    { t: 'Vencidas', color: 'text-destructive', lista: ts.filter((x) => x.vencida) },
    { t: 'Hoy', color: 'text-warn', lista: ts.filter((x) => x.vence === hoy) },
    { t: 'Próximas', color: '', lista: ts.filter((x) => x.vence > hoy) },
    { t: 'Sin fecha', color: '', lista: ts.filter((x) => !x.vence), cerrado: true }
  ]
  return (
    <div className="grid max-w-6xl gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <Titulo>Próximos pasos</Titulo>
        {grupos.map((g) => g.lista.length > 0 && (
          <details key={g.t} open={!g.cerrado} className="group">
            <summary className={`mb-2 flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold tracking-wide uppercase ${g.color || 'text-muted-foreground'}`}>
              <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" /> {g.t} <span className="font-normal">({g.lista.length})</span>
            </summary>
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {g.lista.map((t) => (
                <button key={t.orden} onClick={() => abrir(t.orden)} className="grid w-full grid-cols-[88px_minmax(0,220px)_minmax(0,1fr)] items-start gap-4 px-4 py-3 text-left hover:bg-accent">
                  <span className={`text-xs tabular-nums ${g.color || 'text-muted-foreground'}`}>{t.vence || '—'}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium" title={t.empresa}>{t.empresa}</span>
                    <span className="text-2xs text-muted-foreground">#{t.orden} · {t.estado}</span>
                  </span>
                  <span className="line-clamp-2 text-sm text-muted-foreground" title={t.paso}>{t.paso}</span>
                </button>
              ))}
            </div>
          </details>
        ))}
        {ts.length === 0 && <p className="text-sm text-muted-foreground">Sin próximos pasos.</p>}
      </div>

      <div className="space-y-3 xl:sticky xl:top-0 xl:self-start">
        <Titulo>Otras tareas</Titulo>
        <div className="space-y-1 rounded-lg border border-border bg-card p-2">
        {(s.pendientes ?? []).map((t) => (
          <label key={t.id} className={`flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent ${t.hecha ? 'text-muted-foreground line-through' : ''}`}>
            <input type="checkbox" className="mt-1" checked={t.hecha} onChange={(e) => hacer(() => api.marcarPendiente(t.id, e.target.checked))} />
            {t.texto}
          </label>
        ))}
        <form
          className="flex gap-2 pt-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (nueva.trim()) hacer(() => api.nuevoPendiente(nueva)), setNueva('')
          }}>
          <input value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Nueva tarea…" className="campo flex-1" />
          <Boton type="submit" variante="outline"><Plus /> Agregar</Boton>
        </form>
        </div>
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
        <Boton variante="outline" onClick={() => hacer(() => api.claude('buscar'))}><Bot /> Buscar ofertas</Boton>
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
  const [configurar, setConfigurar] = useState(false)
  const correos = (s.inbox ?? []).filter((c) => todos || !c.revisado)
  const pendientes = (s.inbox ?? []).filter((c) => !c.revisado).length
  if (!s.gmail || configurar) return <ConectarGmail s={s} hacer={hacer} ocupado={ocupado} listo={() => setConfigurar(false)} />
  return (
    <div className="max-w-4xl space-y-3">
      <div className="flex items-center gap-2">
        <Titulo>Bandeja de Gmail</Titulo>
        <div className="flex-1" />
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input type="checkbox" checked={todos} onChange={(e) => setTodos(e.target.checked)} /> Ver revisados
        </label>
        <Boton variante="outline" disabled={ocupado} onClick={() => hacer(() => api.escanear(7))}>
          <RefreshCw className={ocupado ? 'animate-spin' : ''} /> Buscar correos nuevos
        </Boton>
        <Boton variante={pendientes ? 'default' : 'outline'} disabled={!pendientes} onClick={() => hacer(() => api.claude('correo'))}><Bot /> Revisar {pendientes || ''} con Claude</Boton>
        <Boton variante="ghost" disabled={!pendientes} onClick={() => hacer(() => api.revisado('todos'))}>Marcar todo revisado</Boton>
      </div>
      <p className="text-xs text-muted-foreground">
        Conectado como {s.gmail} · solo lectura ·{' '}
        <button className="underline hover:text-foreground" onClick={() => setConfigurar(true)}>cambiar</button>
        {pendientes > 0 && <> · Siguiente paso: «Revisar con Claude» clasifica estos correos y actualiza tus postulaciones.</>}
      </p>
      {correos.length === 0 && <p className="text-sm text-muted-foreground">Nada pendiente. «Buscar correos nuevos» revisa los últimos 7 días.</p>}
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
  const [eventos, setEventos] = useState<Evento[]>([])
  useEffect(() => void api.historial(fila.orden).then((e) => setEventos(e.reverse()), () => setEventos([])), [fila])
  return (
    <div className="mx-auto flex max-w-5xl flex-col rounded-lg border border-border bg-card">
      <header className="flex items-start gap-3 border-b border-border p-5">
        <button onClick={cerrar} title="Volver" className="mt-1 text-muted-foreground hover:text-foreground"><ArrowLeft className="size-5" /></button>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">#{fila.orden} · publicada {fila.publicada || '—'}</div>
          <h2 className="text-xl font-semibold">{fila.empresa}</h2>
          <div className="text-sm text-muted-foreground">{fila.cargo}</div>
        </div>
      </header>
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap gap-1.5">
          {PEDIDOS.map(([p, t]) => (
            <Boton key={p} tam="xs" variante="outline" onClick={() => hacer(() => api.claude(p, fila.orden))}><Bot /> {t}</Boton>
          ))}
          {/^https:\/\//.test(fila.url) && <Boton tam="xs" variante="ghost" onClick={() => api.abrir(fila.url)}><ExternalLink /> Oferta</Boton>}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Campo t="Estado"><select className="campo" value={d.estado} onChange={set('estado')}>{ESTADOS.map((e) => <option key={e}>{e}</option>)}</select></Campo>
          <Campo t="Probabilidad"><select className="campo" value={d.prob} onChange={set('prob')}>{['', ...PROBS].map((p) => <option key={p}>{p}</option>)}</select></Campo>
          <Campo t="Vence"><input type="date" className="campo" value={d.vence} onChange={set('vence')} /></Campo>
          <Campo t="Sueldo"><input className="campo" value={d.sueldo} onChange={set('sueldo')} /></Campo>
          <Campo t="Modalidad"><input className="campo" value={d.modalidad} onChange={set('modalidad')} /></Campo>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Campo t="Próximo paso"><textarea rows={7} className="campo" value={d.proximo_paso} onChange={set('proximo_paso')} /></Campo>
          <Campo t="Notas"><textarea rows={7} className="campo" value={d.notas} onChange={set('notas')} /></Campo>
        </div>
        <Campo t="Carpeta"><input className="campo" value={d.ficha} onChange={set('ficha')} /></Campo>
        {eventos.length > 0 && (
          <div className="space-y-1">
            <span className="text-2xs font-medium text-muted-foreground">Historial</span>
            {eventos.map((e, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                <span className="tabular-nums">{e.fecha}</span> · <span className="text-foreground">{e.campo}</span> → <span className="line-clamp-1 inline">{e.despues || '∅'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <footer className="sticky bottom-0 flex justify-end gap-2 rounded-b-lg border-t border-border bg-card p-3">
        <Boton variante="ghost" disabled={!sucio} onClick={() => setD(fila)}>Descartar</Boton>
        <Boton disabled={!sucio} onClick={() => hacer(() => api.actualizar(fila.orden, cambios))}>Guardar</Boton>
      </footer>
    </div>
  )
}

const Paso = ({ n, t, children }: { n: number; t: string; children: ReactNode }) => (
  <li className="flex gap-4 rounded-lg border border-border bg-card p-4">
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{n}</span>
    <div className="min-w-0 flex-1 space-y-2">
      <h3 className="text-sm font-semibold">{t}</h3>
      {children}
    </div>
  </li>
)

function ConectarGmail({ s, hacer, ocupado, listo }: { s: Estado; hacer: Hacer; ocupado: boolean; listo: () => void }) {
  const [user, setUser] = useState(s.gmail ?? '')
  const [pass, setPass] = useState('')
  const limpia = pass.replace(/\s/g, '')
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <Titulo>Conectar Gmail</Titulo>
        <p className="mt-1 text-sm text-muted-foreground">
          otterjobs lee (solo lee) los correos de reclutadores y de las empresas a las que postulaste. Nunca envía, borra ni marca como leído. La contraseña queda solo en este computador.
        </p>
      </div>
      <ol className="space-y-3">
        <Paso n={1} t="Activa la verificación en dos pasos">
          <p className="text-sm text-muted-foreground">Google la exige para crear contraseñas de aplicación. Si ya la tienes, sigue al paso 2.</p>
          <Boton tam="xs" variante="outline" onClick={() => api.abrir('https://myaccount.google.com/signinoptions/twosv')}><ExternalLink /> Abrir verificación en dos pasos</Boton>
        </Paso>
        <Paso n={2} t="Crea una contraseña de aplicación">
          <p className="text-sm text-muted-foreground">Ponle de nombre «otterjobs» y copia las 16 letras que te muestra Google (no se vuelven a mostrar).</p>
          <Boton tam="xs" variante="outline" onClick={() => api.abrir('https://myaccount.google.com/apppasswords')}><ExternalLink /> Abrir contraseñas de aplicación</Boton>
        </Paso>
        <Paso n={3} t="Pégala aquí">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              hacer(() => api.configurarGmail(user, pass).then((r) => (listo(), r)))
            }}>
            <Campo t="Correo de Gmail"><input className="campo" type="email" value={user} onChange={(e) => setUser(e.target.value)} placeholder="tu.correo@gmail.com" /></Campo>
            <Campo t={`Contraseña de aplicación (${limpia.length}/16)`}><input className="campo font-mono" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="abcd efgh ijkl mnop" /></Campo>
            <div className="flex gap-2 pt-1">
              <Boton type="submit" disabled={ocupado || !user.includes('@') || limpia.length !== 16}>
                <RefreshCw className={ocupado ? 'animate-spin' : ''} /> {ocupado ? 'Conectando y buscando correos…' : 'Conectar y buscar correos del último mes'}
              </Boton>
              {s.gmail && <Boton type="button" variante="ghost" onClick={listo}>Cancelar</Boton>}
            </div>
          </form>
        </Paso>
      </ol>
    </div>
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
