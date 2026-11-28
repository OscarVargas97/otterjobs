import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Bot, CalendarClock, Check, ChevronRight, ExternalLink, FileText, FolderOpen, Inbox, KanbanSquare, Mail, Megaphone, Minus, Plus, RefreshCw, UserRound, X } from 'lucide-react'
import type { Correo } from '../../core/gmail.ts'
import type { Pendiente } from '../../core/pendientes.ts'
import type { Evento, Fila, Tarea } from '../../core/tracker.ts'
import type { Pedido } from '../../core/claude.ts'
import type { Campo as CampoForm, Valores } from '../../core/formulario.ts'
import type { EstadoPerfil, Etapa } from '../../core/perfil.ts'
import { Terminales } from './Terminales'

type Estado = {
  datos: string | null
  filas?: Fila[]
  tareas?: Tarea[]
  pendientes?: Pendiente[]
  inbox?: (Correo & { enlace: string })[]
  gmail?: string[]
  perfil?: {
    formulario: Record<Etapa, { intro: string; campos: CampoForm[] }>
    valores: Partial<Record<Etapa, Valores>>
    manual: Etapa[]
    estado: EstadoPerfil
    sugeridas: string[]
    checks: { ok: boolean; texto: string }[]
    pdf: boolean
    cvs: { ruta: string; titulo: string; archivo: string; pdfs: string[] }[]
  }
  linkedin?: {
    posts: { slug: string; estado: string; pilar: string; fecha: string; imagen: string; texto: string; archivos: string[] }[]
    ideas: { fecha: string; idea: string; fuente: string; pilar: string; estado: string }[]
    pilares: string[]
    voz: Record<string, string>
    camposVoz: { id: string; titulo: string; ayuda: string }[]
  }
  version?: string
}
type Api = {
  [k in 'cargar' | 'elegirDatos' | 'actualizar' | 'agregar' | 'marcarPendiente' | 'nuevoPendiente' | 'escanear' | 'configurarGmail' | 'quitarGmail' | 'revisado' | 'claude' | 'guardarEtapa' | 'pdfCv' | 'abrirArchivo' | 'guardarPost' | 'nuevoPost' | 'agregarIdea' | 'estadoIdea' | 'guardarVoz']: (...a: unknown[]) => Promise<Estado>
} & { historial: (orden: string) => Promise<Evento[]>; archivos: (carpeta: string) => Promise<string[]>; leerArchivo: (ruta: string) => Promise<string | null>; abrir: (url: string) => void; alCambiar: (cb: (e: Estado) => void) => () => void }
const api = (window as unknown as { api: Api }).api

const COLUMNAS = ['Por postular', 'Postulado', 'Entrevista', 'Oferta', 'Cerradas'] as const
const columnaDe = (e: string) => (e === 'Descartada' || e === 'Rechazada' ? 'Cerradas' : e)
const ESTADOS = ['Oferta', 'Entrevista', 'Postulado', 'Por postular', 'Descartada', 'Rechazada']
const PROBS = ['Alta', 'Media-alta', 'Media', 'Media-baja', 'Baja', '—']
const COLOR_PROB: Record<string, string> = { Alta: 'bg-ok/20 text-ok', 'Media-alta': 'bg-ok/10 text-ok', Media: 'bg-muted text-foreground', 'Media-baja': 'bg-muted text-muted-foreground', Baja: 'bg-muted text-muted-foreground' }

export function App() {
  const [s, setS] = useState<Estado | null>(null)
  const [vista, setVista] = useState<'hoy' | 'tablero' | 'bandeja' | 'perfil' | 'cv' | 'linkedin'>('hoy')
  const [chat, setChat] = useState(false)
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
        <Nav activo={vista === 'perfil' && !fila} onClick={() => ir('perfil')} icono={<UserRound />} texto="Perfil" n={s.perfil?.estado.etapas.filter((e) => !e.listo).length || undefined} />
        <Nav activo={vista === 'cv' && !fila} onClick={() => ir('cv')} icono={<FileText />} texto="CV" n={s.perfil?.cvs.length || undefined} />
        <Nav activo={vista === 'linkedin' && !fila} onClick={() => ir('linkedin')} icono={<Megaphone />} texto="LinkedIn" n={s.linkedin?.posts.filter((p) => p.estado === 'aprobado').length || undefined} />
        <div className="mt-auto space-y-1 px-2 text-2xs text-muted-foreground">
          <div className="truncate" title={s.datos}>{s.datos}</div>
          <div>v{s.version}</div>
        </div>
      </nav>

      <main className="min-w-0 flex-1 overflow-auto p-5 pb-20">
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
            {vista === 'perfil' && s.perfil && <Perfil s={s} hacer={hacer} ocupado={ocupado} />}
            {vista === 'cv' && s.perfil && <MisCv cvs={s.perfil.cvs} hacer={hacer} />}
            {vista === 'linkedin' && s.linkedin && <Linkedin li={s.linkedin} hacer={hacer} ocupado={ocupado} />}
          </>
        )}
      </main>
      {/* Claude flota abajo a la derecha, como un chat: se abre solo cuando un botón inicia una sesión */}
      <div className={`fixed bottom-20 right-5 z-40 flex h-[min(80vh,760px)] w-[min(1000px,calc(100vw-15rem))] flex-col overflow-hidden rounded-xl border border-border bg-[#141414] shadow-2xl ${chat ? '' : 'hidden'}`}>
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2 text-sm font-medium">
          <Bot className="size-4" /> Claude
          <button onClick={() => setChat(false)} title="Minimizar" className="ml-auto text-muted-foreground hover:text-foreground"><Minus className="size-4" /></button>
        </div>
        <Terminales visible={chat} alAbrir={() => setChat(true)} alCambiar={setSesiones} />
      </div>
      <button onClick={() => setChat(!chat)} title="Claude" className="fixed bottom-5 right-5 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:opacity-90">
        {chat ? <X className="size-5" /> : <Bot className="size-5" />}
        {sesiones > 0 && !chat && <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-2xs text-white">{sesiones}</span>}
      </button>
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
  const [agregar, setAgregar] = useState(false)
  const [quitar, setQuitar] = useState<string>()
  const cuentas = s.gmail ?? []
  const correos = (s.inbox ?? []).filter((c) => todos || !c.revisado)
  const pendientes = (s.inbox ?? []).filter((c) => !c.revisado).length
  if (!cuentas.length || agregar) return <ConectarGmail cuentas={cuentas} hacer={hacer} ocupado={ocupado} listo={() => setAgregar(false)} />
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
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>Solo lectura en:</span>
        {cuentas.map((u) =>
          quitar === u ? (
            <span key={u} className="flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-foreground">
              ¿Dejar de leer {u}?
              <button className="underline" onClick={() => (setQuitar(undefined), hacer(() => api.quitarGmail(u)))}>Sí</button>
              <button className="underline" onClick={() => setQuitar(undefined)}>No</button>
            </span>
          ) : (
            <span key={u} className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5">
              {u}
              <button title={`Quitar ${u}`} className="hover:text-foreground" onClick={() => setQuitar(u)}><X className="size-3" /></button>
            </span>
          )
        )}
        <button className="flex items-center gap-0.5 underline hover:text-foreground" onClick={() => setAgregar(true)}><Plus className="size-3" /> Agregar otra cuenta</button>
      </div>
      {pendientes > 0 && <p className="text-xs text-muted-foreground">Siguiente paso: «Revisar con Claude» clasifica estos correos y actualiza tus postulaciones.</p>}
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
            {cuentas.length > 1 && c.cuenta && <span className="ml-auto shrink-0">→ {c.cuenta}</span>}
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
        {fila.ficha && <ArchivosPostulacion carpeta={fila.ficha} hacer={hacer} />}
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

function ConectarGmail({ cuentas, hacer, ocupado, listo }: { cuentas: string[]; hacer: Hacer; ocupado: boolean; listo: () => void }) {
  const [user, setUser] = useState('')
  const [pass, setPass] = useState('')
  const limpia = pass.replace(/\s/g, '')
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <Titulo>{cuentas.length ? 'Agregar otra cuenta de Gmail' : 'Conectar Gmail'}</Titulo>
        <p className="mt-1 text-sm text-muted-foreground">
          otterjobs lee (solo lee) los correos de reclutadores y de las empresas a las que postulaste. Nunca envía, borra ni marca como leído. La contraseña queda solo en este computador. Puedes conectar varias cuentas, una por vez: haz los pasos 1 y 2 con la sesión de Google de la cuenta que vas a agregar.
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
              {cuentas.length > 0 && <Boton type="button" variante="ghost" onClick={listo}>Cancelar</Boton>}
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

type Fila_ = Record<string, string>
const NOMBRE: Record<Etapa, string> = { hechos: 'Hechos', preferencias: 'Preferencias', mercado: 'Mercado', marca: 'Marca', alertas: 'Alertas', cv: 'CV', perfiles: 'Perfiles', revision: 'Revisión' }
const vacia = (c: CampoForm) => Object.fromEntries((c.campos ?? []).map((x) => [x.k, ''])) as Fila_

function Perfil({ s, hacer, ocupado }: { s: Estado; hacer: Hacer; ocupado: boolean }) {
  const p = s.perfil!
  const [etapa, setEtapa] = useState<Etapa>(() => p.estado.siguiente ?? 'hechos')
  const e = p.estado.etapas.find((x) => x.id === etapa)!
  const manual = p.manual.includes(etapa)
  const [ver, setVer] = useState(false)
  const vacio = !Object.values(p.valores[etapa] ?? {}).some((v) => (Array.isArray(v) ? v.length : String(v).trim()))
  const conClaude = () => hacer(() => api.claude('perfil', etapa))
  return (
    <div className="flex gap-5">
      <div className="w-60 shrink-0 space-y-3">
        <Titulo>Tu perfil</Titulo>
        <p className="text-xs text-muted-foreground">
          {p.estado.fuentes} archivos en fuentes/ ·{' '}
          <button className="underline hover:text-foreground" onClick={() => hacer(() => api.abrirArchivo('fuentes'))}>abrir</button>
        </p>
        <div className="space-y-0.5">
          {p.estado.etapas.map((x) => (
            <button key={x.id} onClick={() => setEtapa(x.id)} className={`flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm ${x.id === etapa ? 'bg-accent' : 'hover:bg-accent/60'}`}>
              <span className={`w-4 ${x.listo ? 'text-ok' : 'text-muted-foreground'}`}>{x.listo ? <Check className="size-4" /> : '·'}</span>
              <span className="flex-1">
                <span className="block">{NOMBRE[x.id]}</span>
                <span className="block text-2xs text-muted-foreground">{p.manual.includes(x.id) ? 'Escrito fuera de la app' : x.que}</span>
              </span>
            </button>
          ))}
        </div>
        {p.manual.length > 0 && (
          <div className="space-y-2 rounded-md border border-border p-2 text-xs text-muted-foreground">
            <p>Ya tienes archivos de perfil escritos fuera de la app. Claude puede llevarlos a estos formularios sin perder nada.</p>
            <Boton tam="xs" variante="outline" onClick={() => hacer(() => api.claude('perfil', 'importar'))}><Bot /> Importar con Claude</Boton>
          </div>
        )}
      </div>

      <div className="min-w-0 max-w-3xl flex-1 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 className="text-base font-semibold">{NOMBRE[etapa]}</h2>
            <p className="text-xs text-muted-foreground">{e.archivo} · {p.formulario[etapa].intro}</p>
          </div>
          <div className="flex rounded-md border border-border p-0.5 text-xs">
            {(['Formulario', 'Ver archivo'] as const).map((x, i) => (
              <button key={x} onClick={() => setVer(!!i)} className={`rounded px-2 py-0.5 ${ver === !!i ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}>{x}</button>
            ))}
          </div>
          {etapa !== 'revision' && <Boton tam="xs" variante="outline" onClick={conClaude}><Bot /> {vacio ? 'Llenar' : 'Refinar'} con Claude</Boton>}
        </div>
        {ver ? <Visor key={etapa + JSON.stringify(p.valores[etapa] ?? null) + p.estado.etapas.map((x) => x.listo).join()} ruta={e.archivo} /> : <>
        {vacio && !manual && etapa !== 'revision' && (
          <div className="flex items-center gap-3 rounded-md border border-primary/40 bg-primary/10 p-3 text-sm">
            <p className="flex-1">No hace falta llenarlo a mano: Claude lo arma con lo que hay en fuentes/ (CV antiguos, LinkedIn, certificados) y tus otras etapas, y te pregunta solo lo que falte. Después lo revisas aquí.</p>
            <Boton tam="sm" onClick={conClaude}><Bot /> Llenar con Claude</Boton>
          </div>
        )}
        {manual && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
            {e.archivo} se escribió fuera de la app y este formulario está vacío. Impórtalo con Claude primero; si guardas igual, el archivo se reemplaza y el actual queda como copia «.anterior».
          </p>
        )}
        <Formulario key={etapa + JSON.stringify(p.valores[etapa] ?? null)} etapa={etapa} p={p} listo={e.listo} hacer={hacer} ocupado={ocupado} />
        </>}
      </div>
    </div>
  )
}

function Formulario({ etapa, p, listo, hacer, ocupado }: { etapa: Etapa; p: NonNullable<Estado['perfil']>; listo: boolean; hacer: Hacer; ocupado: boolean }) {
  const f = p.formulario[etapa]
  const [v, setV] = useState<Valores>(() =>
    etapa === 'revision' ? { fecha: new Date().toISOString().slice(0, 10) } : (p.valores[etapa] ?? Object.fromEntries(f.campos.filter((c) => c.inicial).map((c) => [c.k, c.inicial!])))
  )
  const guardar = (lista: boolean) => hacer(() => api.guardarEtapa(etapa, v, lista))
  const alertas = (v.alertas as Fila_[] | undefined) ?? []
  return (
    <div className="space-y-4">
      {etapa === 'alertas' && p.sugeridas.length > 0 && (
        <div className="space-y-1 rounded-md border border-border p-2 text-xs">
          <p className="text-muted-foreground">Señales que se ven en tus fechas:</p>
          {p.sugeridas.map((a) => (
            <div key={a} className="flex items-center gap-2">
              <span className="flex-1">{a}</span>
              {!alertas.some((x) => x.senal === a) && <Boton tam="xs" variante="ghost" onClick={() => setV({ ...v, alertas: [...alertas, { senal: a, respuesta: '' }] })}><Plus /> Agregar</Boton>}
            </div>
          ))}
        </div>
      )}
      {etapa === 'cv' && (
        <div className="space-y-2 rounded-md border border-border p-2 text-xs">
          <ul className="space-y-0.5">
            {p.checks.map((c) => <li key={c.texto} className={c.ok ? 'text-ok' : 'text-muted-foreground'}>{c.ok ? '✓' : '·'} {c.texto}</li>)}
          </ul>
          <div className="flex gap-2">
            <Boton tam="xs" variante="outline" onClick={() => hacer(() => api.abrirArchivo('cv/cv.html'))}><ExternalLink /> Ver CV</Boton>
            <Boton tam="xs" variante="outline" disabled={ocupado} onClick={() => hacer(() => api.pdfCv())}>Exportar PDF</Boton>
            {p.pdf && <Boton tam="xs" variante="ghost" onClick={() => hacer(() => api.abrirArchivo('cv/cv.pdf'))}>Abrir PDF</Boton>}
          </div>
        </div>
      )}
      {f.campos.map((c) => <CampoPerfil key={c.k} c={c} v={v[c.k]} set={(x) => setV({ ...v, [c.k]: x })} />)}
      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-background py-2">
        {etapa === 'revision' ? (
          <Boton disabled={ocupado} onClick={() => guardar(true)}>Registrar evaluación</Boton>
        ) : (
          <>
            <Boton variante="outline" disabled={ocupado} onClick={() => guardar(listo)}>Guardar</Boton>
            <Boton disabled={ocupado} onClick={() => guardar(!listo)}>{listo ? 'Guardar y volver a pendiente' : 'Guardar y marcar lista'}</Boton>
          </>
        )}
      </div>
    </div>
  )
}

function CampoPerfil({ c, v, set }: { c: CampoForm; v: Valores[string] | undefined; set: (v: string | Fila_[]) => void }) {
  if (c.tipo === 'lista') {
    const xs = Array.isArray(v) ? v : []
    const cambiar = (i: number, k: string, x: string) => set(xs.map((f, j) => (j === i ? { ...f, [k]: x } : f)))
    return (
      <div className="space-y-2">
        <div>
          <span className="text-sm font-medium">{c.t}</span>
          {c.ayuda && <span className="ml-2 text-2xs text-muted-foreground">{c.ayuda}</span>}
        </div>
        {xs.map((f, i) => (
          <div key={i} className="relative grid grid-cols-2 gap-2 rounded-md border border-border p-2 pr-8">
            <button title="Quitar" className="absolute top-2 right-2 text-muted-foreground hover:text-foreground" onClick={() => set(xs.filter((_, j) => j !== i))}><X className="size-4" /></button>
            {c.campos!.map((sub) => (
              <div key={sub.k} className={sub.tipo === 'area' ? 'col-span-2' : ''}>
                <CampoPerfil c={sub} v={f[sub.k]} set={(x) => cambiar(i, sub.k, x as string)} />
              </div>
            ))}
          </div>
        ))}
        <Boton tam="xs" variante="outline" onClick={() => set([...xs, vacia(c)])}><Plus /> Agregar</Boton>
      </div>
    )
  }
  const x = typeof v === 'string' ? v : ''
  return (
    <Campo t={c.t}>
      {c.tipo === 'area' ? (
        <textarea rows={Math.min(12, Math.max(3, x.split('\n').length + 1))} value={x} placeholder={c.ayuda} onChange={(e) => set(e.target.value)} className="campo h-auto py-1.5" />
      ) : (
        <input type={c.tipo === 'mes' ? 'month' : 'text'} value={x} placeholder={c.tipo === 'mes' ? undefined : c.ayuda} onChange={(e) => set(e.target.value)} className="campo" />
      )}
      {c.tipo === 'mes' && c.ayuda && <span className="text-2xs text-muted-foreground">{c.ayuda}</span>}
    </Campo>
  )
}

/** Muestra un archivo de los datos: HTML (el CV) en un iframe sin scripts y Markdown con un lector mínimo. */
function Visor({ ruta, alto = 'h-[70vh]' }: { ruta: string; alto?: string }) {
  const [t, setT] = useState<string | null | undefined>()
  useEffect(() => void api.leerArchivo(ruta).then(setT, () => setT(null)), [ruta])
  if (t === undefined) return <p className="text-xs text-muted-foreground">Cargando…</p>
  if (t === null) return <p className="text-xs text-muted-foreground">{ruta} todavía no existe.</p>
  if (/\.html?$/i.test(ruta)) return <iframe title={ruta} sandbox="" srcDoc={t} className={`w-full rounded-md border border-border bg-white ${alto}`} />
  return <div className={`overflow-auto rounded-md border border-border p-4 ${alto}`}>{/\.md$/i.test(ruta) ? <Markdown texto={t} /> : <pre className="text-xs whitespace-pre-wrap">{t}</pre>}</div>
}

/** Markdown de los archivos del perfil: títulos, listas, tablas, negrita y código. Todo como texto de React, sin HTML crudo. */
function Markdown({ texto }: { texto: string }) {
  const enLinea = (s: string) =>
    s.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((p, i) =>
      p.startsWith('**') && p.endsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : p.startsWith('`') && p.endsWith('`') ? <code key={i} className="rounded bg-muted px-1">{p.slice(1, -1)}</code> : p.replace(/<br>/g, ' · ')
    )
  const celdas = (l: string) => l.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'))
  const out: ReactNode[] = []
  const ls = texto.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i]
    const h = /^(#{1,4}) (.*)/.exec(l)
    if (h) out.push(<div key={i} className={['', 'text-lg font-semibold mt-2', 'text-base font-semibold mt-4 border-b border-border pb-1', 'text-sm font-semibold mt-3', 'text-sm font-medium mt-2'][h[1].length]}>{enLinea(h[2])}</div>)
    else if (/^\s*[-*] /.test(l)) {
      const items: string[] = []
      for (; i < ls.length && /^\s*[-*] /.test(ls[i]); i++) items.push(ls[i].replace(/^\s*[-*] (\[[ x]\] )?/i, ''))
      i--
      out.push(<ul key={i} className="list-disc space-y-0.5 pl-5">{items.map((x, j) => <li key={j}>{enLinea(x)}</li>)}</ul>)
    } else if (l.startsWith('|')) {
      const fs: string[][] = []
      for (; i < ls.length && ls[i].startsWith('|'); i++) if (!/^\|[\s|:-]+\|$/.test(ls[i].trim())) fs.push(celdas(ls[i]))
      i--
      out.push(
        <table key={i} className="w-full border-collapse text-xs">
          <tbody>{fs.map((f, j) => <tr key={j} className={j ? 'border-t border-border' : 'font-medium text-muted-foreground'}>{f.map((c, k) => <td key={k} className="p-1 align-top">{enLinea(c)}</td>)}</tr>)}</tbody>
        </table>
      )
    } else if (/^---+$/.test(l.trim())) out.push(<hr key={i} className="border-border" />)
    else if (l.trim()) out.push(<p key={i}>{enLinea(l)}</p>)
  }
  return <div className="space-y-2 text-sm">{out}</div>
}

/** Los archivos de la carpeta de una postulación: el CV (o la ficha) se ve aquí; lo demás se abre afuera. */
function ArchivosPostulacion({ carpeta, hacer }: { carpeta: string; hacer: Hacer }) {
  const [fs, setFs] = useState<string[]>([])
  const [ver, setVer] = useState<string>()
  useEffect(() => {
    void api.archivos(carpeta).then((todos) => {
      const xs = todos.filter((x) => /\.(pdf|html?|md|txt|docx?|png|jpe?g)$/i.test(x))
      setFs(xs)
      setVer(xs.find((x) => /^cv.*\.html?$/i.test(x)) ?? xs.find((x) => /\.(md|html?)$/i.test(x)))
    }, () => setFs([]))
  }, [carpeta])
  if (!fs.length) return <p className="text-xs text-muted-foreground">La carpeta {carpeta} no tiene archivos todavía.</p>
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {fs.map((f) =>
          /\.(md|html?|txt)$/i.test(f) ? (
            <Boton key={f} tam="xs" variante={ver === f ? 'default' : 'outline'} onClick={() => setVer(f)}>{f}</Boton>
          ) : (
            <Boton key={f} tam="xs" variante="ghost" onClick={() => hacer(() => api.abrirArchivo(`${carpeta}/${f}`))}><ExternalLink /> {f}</Boton>
          )
        )}
        <Boton tam="xs" variante="ghost" onClick={() => hacer(() => api.abrirArchivo(carpeta))}><FolderOpen /> Carpeta</Boton>
      </div>
      {ver && <Visor ruta={`${carpeta}/${ver}`} />}
    </div>
  )
}

/** Todos los CV en un lugar: los base y el adaptado de cada postulación. */
function MisCv({ cvs, hacer }: { cvs: NonNullable<Estado['perfil']>['cvs']; hacer: Hacer }) {
  const [sel, setSel] = useState(cvs[0]?.ruta)
  const cv = cvs.find((c) => c.ruta === sel) ?? cvs[0]
  if (!cv) return <p className="text-sm text-muted-foreground">Todavía no hay CV. El base se arma en Perfil → CV, y cada postulación trae el suyo (/postular).</p>
  return (
    <div className="flex min-w-0 flex-1 gap-4">
      <div className="w-64 shrink-0 space-y-0.5 overflow-auto">
        {cvs.map((c) => (
          <button key={c.ruta} onClick={() => setSel(c.ruta)} className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${c.ruta === cv.ruta ? 'bg-accent' : 'hover:bg-accent/60'}`}>
            <span className="block truncate">{c.titulo}</span>
            <span className="block truncate text-2xs text-muted-foreground">{c.archivo}</span>
          </button>
        ))}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-auto truncate text-xs text-muted-foreground">{cv.ruta}</span>
          {cv.pdfs.map((f) => (
            <Boton key={f} tam="xs" variante="ghost" onClick={() => hacer(() => api.abrirArchivo(f))}><ExternalLink /> {f.split('/').pop()}</Boton>
          ))}
          <Boton tam="xs" variante="ghost" onClick={() => hacer(() => api.abrirArchivo(cv.ruta.slice(0, cv.ruta.lastIndexOf('/'))))}><FolderOpen /> Carpeta</Boton>
        </div>
        <Visor key={cv.ruta} ruta={cv.ruta} alto="h-[80vh]" />
      </div>
    </div>
  )
}

type Li = NonNullable<Estado['linkedin']>
type PostLi = Li['posts'][number]
const ESTADOS_POST = ['borrador', 'aprobado', 'publicado'] as const
const ESTADOS_IDEA = ['sin usar', 'en borrador', 'aprobado', 'publicado', 'descartada'] as const
const COLOR_POST: Record<string, string> = { borrador: 'text-muted-foreground', aprobado: 'text-primary', publicado: 'text-ok' }
const dias = (desde: string) => Math.round((Date.now() - new Date(`${desde}T12:00:00`).getTime()) / 864e5)

/** Posts, banco de ideas y voz. Claude escribe y mejora (/semana); aquí se revisa, se aprueba y se copia para publicar a mano. */
function Linkedin({ li, hacer, ocupado }: { li: Li; hacer: Hacer; ocupado: boolean }) {
  const [pestana, setPestana] = useState<'posts' | 'ideas' | 'voz'>('posts')
  const ultimo = li.posts.filter((p) => p.estado === 'publicado').map((p) => p.fecha).sort().pop()
  const semana = () => hacer(() => api.claude('semana'))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Titulo>LinkedIn</Titulo>
        <span className="text-xs text-muted-foreground">
          {li.posts.filter((p) => p.estado === 'publicado').length} publicados · {li.posts.filter((p) => p.estado !== 'publicado').length} por publicar · {li.ideas.filter((i) => i.estado === 'sin usar').length} ideas sin usar
          {ultimo && <> · último publicado hace {dias(ultimo)} días{dias(ultimo) > 7 && <span className="text-destructive"> (toca uno esta semana)</span>}</>}
        </span>
        <div className="ml-auto flex rounded-md border border-border p-0.5 text-xs">
          {(['posts', 'ideas', 'voz'] as const).map((x) => (
            <button key={x} onClick={() => setPestana(x)} className={`rounded px-2 py-0.5 capitalize ${pestana === x ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}>{x}</button>
          ))}
        </div>
        <Boton tam="xs" onClick={semana}><Bot /> Post de la semana con Claude</Boton>
      </div>
      {pestana === 'posts' && <Posts li={li} hacer={hacer} ocupado={ocupado} />}
      {pestana === 'ideas' && <Ideas li={li} hacer={hacer} ocupado={ocupado} />}
      {pestana === 'voz' && <Voz key={JSON.stringify(li.voz)} li={li} hacer={hacer} ocupado={ocupado} />}
    </div>
  )
}

function Posts({ li, hacer, ocupado }: { li: Li; hacer: Hacer; ocupado: boolean }) {
  const [sel, setSel] = useState<string | undefined>(li.posts[0]?.slug)
  const [titulo, setTitulo] = useState('')
  const p = li.posts.find((x) => x.slug === sel) ?? li.posts[0]
  const crear = () => titulo.trim() && hacer(async () => {
    const r = await api.nuevoPost(titulo)
    setTitulo('')
    setSel(undefined)
    return r
  })
  return (
    <div className="flex gap-4">
      <div className="w-64 shrink-0 space-y-2">
        <div className="flex gap-1">
          <input className="campo" placeholder="Post nuevo: de qué trata" value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && crear()} />
          <Boton tam="xs" variante="outline" disabled={!titulo.trim() || ocupado} onClick={crear}><Plus /></Boton>
        </div>
        <div className="space-y-0.5">
          {li.posts.map((x) => (
            <button key={x.slug} onClick={() => setSel(x.slug)} className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${x.slug === p?.slug ? 'bg-accent' : 'hover:bg-accent/60'}`}>
              <span className="block truncate">{x.texto.split('\n')[0] || x.slug.slice(11)}</span>
              <span className="block text-2xs text-muted-foreground">{x.fecha} · <span className={COLOR_POST[x.estado]}>{x.estado}</span>{x.pilar && ` · ${x.pilar}`}</span>
            </button>
          ))}
        </div>
      </div>
      {p ? <EditorPost key={p.slug + p.texto + p.estado + p.pilar + p.fecha} p={p} pilares={li.pilares} hacer={hacer} ocupado={ocupado} /> : <p className="text-sm text-muted-foreground">Todavía no hay posts. Crea uno o pídele el de la semana a Claude.</p>}
    </div>
  )
}

function EditorPost({ p, pilares, hacer, ocupado }: { p: PostLi; pilares: string[]; hacer: Hacer; ocupado: boolean }) {
  const [texto, setTexto] = useState(p.texto)
  const [copiado, setCopiado] = useState(false)
  const cambio = texto !== p.texto
  const guardar = (c: Record<string, string>) => hacer(() => api.guardarPost(p.slug, c))
  // LinkedIn corta el post en «…ver más» cerca de los 210 caracteres o la tercera línea: ahí tiene que estar el gancho.
  const corte = Math.min(210, texto.split('\n').slice(0, 3).join('\n').length)
  const copiar = async () => (await navigator.clipboard.writeText(texto), setCopiado(true), setTimeout(() => setCopiado(false), 1500))
  return (
    <div className="min-w-0 max-w-3xl flex-1 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border border-border p-0.5 text-xs">
          {ESTADOS_POST.map((x) => (
            <button key={x} disabled={ocupado} onClick={() => x !== p.estado && guardar({ estado: x })} className={`rounded px-2 py-0.5 ${p.estado === x ? `bg-accent ${COLOR_POST[x]}` : 'text-muted-foreground'}`}>{x}</button>
          ))}
        </div>
        <select className="campo w-auto" value={p.pilar} onChange={(e) => guardar({ pilar: e.target.value })}>
          <option value="">Sin pilar</option>
          {[...new Set([...pilares, p.pilar].filter(Boolean))].map((x) => <option key={x}>{x}</option>)}
        </select>
        <input type="date" className="campo w-auto" value={/^\d{4}-\d{2}-\d{2}$/.test(p.fecha) ? p.fecha : ''} onChange={(e) => guardar({ fecha: e.target.value })} />
        <Boton tam="xs" variante="outline" className="ml-auto" onClick={() => hacer(() => api.claude('semana', `post ${p.slug}`))}><Bot /> Mejorar con Claude</Boton>
      </div>
      <textarea className="campo min-h-[45vh] font-[inherit] leading-relaxed" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className={texto.length > 3000 ? 'text-destructive' : ''}>{texto.length} / 3000</span>
        <span>· antes de «ver más»: «{texto.slice(0, corte).replace(/\n+/g, ' ')}»</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Boton disabled={!cambio || ocupado} onClick={() => guardar({ texto })}>Guardar</Boton>
        <Boton variante="outline" disabled={!texto.trim()} onClick={() => void copiar()}>{copiado ? <Check /> : null} {copiado ? 'Copiado' : 'Copiar texto'}</Boton>
        <Boton variante="outline" onClick={() => api.abrir('https://www.linkedin.com/feed/?shareActive=true')}><ExternalLink /> Abrir LinkedIn</Boton>
        {p.estado === 'aprobado' && <Boton variante="ghost" onClick={() => guardar({ estado: 'publicado' })}><Check /> Ya lo publiqué</Boton>}
      </div>
      {(p.archivos.length > 0 || (p.imagen && p.imagen !== 'ninguna')) && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>Imagen: {p.imagen || '—'}</span>
          {p.archivos.map((f) => (
            <Boton key={f} tam="xs" variante="ghost" onClick={() => hacer(() => api.abrirArchivo(`linkedin/posts/${p.slug}/${f}`))}><ExternalLink /> {f}</Boton>
          ))}
          <Boton tam="xs" variante="ghost" onClick={() => hacer(() => api.abrirArchivo(`linkedin/posts/${p.slug}`))}><FolderOpen /> Carpeta</Boton>
        </div>
      )}
    </div>
  )
}

function Ideas({ li, hacer, ocupado }: { li: Li; hacer: Hacer; ocupado: boolean }) {
  const [v, setV] = useState({ idea: '', fuente: '', pilar: '' })
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })
  const idea = useRef<HTMLInputElement>(null)
  const [falta, setFalta] = useState(false)
  const agregar = () => {
    if (!v.idea.trim()) return setFalta(true), idea.current?.focus()
    hacer(async () => {
    const r = await api.agregarIdea(v)
      setV({ idea: '', fuente: '', pilar: '' })
      return r
    })
  }
  return (
    <div className="max-w-5xl space-y-3">
      <div className="flex flex-wrap gap-2">
        <input ref={idea} className={`campo flex-[3] ${falta && !v.idea.trim() ? 'border-destructive' : ''}`} placeholder="Idea: qué te pasó o qué opinas" value={v.idea} onChange={set('idea')} onKeyDown={(e) => e.key === 'Enter' && agregar()} />
        <input className="campo flex-[2]" placeholder="Fuente (experiencia propia, una noticia…)" value={v.fuente} onChange={set('fuente')} />
        <select className="campo flex-1" value={v.pilar} onChange={set('pilar')}>
          <option value="">Pilar</option>
          {li.pilares.map((x) => <option key={x}>{x}</option>)}
        </select>
        <Boton variante="outline" disabled={ocupado} onClick={agregar}><Plus /> Agregar</Boton>
      </div>
      {li.ideas.length ? (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr><th className="p-1.5">Fecha</th><th className="p-1.5">Idea</th><th className="p-1.5">Fuente</th><th className="p-1.5">Pilar</th><th className="p-1.5">Estado</th><th /></tr>
          </thead>
          <tbody>
            {li.ideas.map((x, i) => (
              <tr key={i} className={`border-t border-border align-top ${x.estado === 'descartada' ? 'opacity-50' : ''}`}>
                <td className="whitespace-nowrap p-1.5 text-xs text-muted-foreground">{x.fecha}</td>
                <td className="p-1.5">{x.idea}</td>
                <td className="p-1.5 text-xs text-muted-foreground">{x.fuente}</td>
                <td className="p-1.5 text-xs">{x.pilar}</td>
                <td className="p-1.5">
                  <select className="campo w-auto py-0.5 text-xs" value={x.estado} onChange={(e) => hacer(() => api.estadoIdea(i, e.target.value))}>
                    {[...new Set([x.estado, ...ESTADOS_IDEA])].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-1.5">
                  {x.estado === 'sin usar' && <Boton tam="xs" variante="outline" onClick={() => hacer(() => api.claude('semana', x.idea))}><Bot /> Escribir</Boton>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted-foreground">El banco está vacío. Anota lo que te pase en la semana, o deja que Claude busque temas en /semana.</p>
      )}
    </div>
  )
}

/** La voz es de quien usa la app: la escribe aquí con sus propios textos, o la arma con Claude (/semana voz). */
function Voz({ li, hacer, ocupado }: { li: Li; hacer: Hacer; ocupado: boolean }) {
  const [v, setV] = useState(li.voz)
  const cambio = li.camposVoz.some((c) => (v[c.id] ?? '') !== (li.voz[c.id] ?? ''))
  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 text-sm text-muted-foreground">Tu forma de escribir, para que los posts suenen a ti. Claude la lee antes de cada borrador y anota lo que le corriges.</p>
        <Boton tam="xs" onClick={() => hacer(() => api.claude('semana', 'voz'))}><Bot /> {Object.values(li.voz).some(Boolean) ? 'Afinar mi voz con Claude' : 'Armar mi voz con Claude'}</Boton>
      </div>
      {li.camposVoz.map((c) => (
        <label key={c.id} className="block space-y-1">
          <span className="text-sm font-medium">{c.titulo}</span>
          <span className="block text-xs text-muted-foreground">{c.ayuda}</span>
          <textarea className={`campo leading-relaxed ${c.id === 'textos' ? 'min-h-40' : 'min-h-24'}`} value={v[c.id] ?? ''} onChange={(e) => setV({ ...v, [c.id]: e.target.value })} />
        </label>
      ))}
      <div className="flex gap-2">
        <Boton disabled={!cambio || ocupado} onClick={() => hacer(() => api.guardarVoz(v))}>Guardar</Boton>
        <Boton variante="ghost" onClick={() => hacer(() => api.abrirArchivo('linkedin/voz.md'))}><ExternalLink /> Ver el archivo</Boton>
      </div>
    </div>
  )
}
