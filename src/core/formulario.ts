// El perfil desde formularios de la app. perfil/perfil.json guarda las respuestas (las de la persona y las que importa
// o refina Claude con /perfil) y de ahí salen, sin IA, los archivos que leen el método y la persona: perfil.md, preferencias.md, marca.md, perfiles.md, criterios-revision.md §1 y §3,
// y cv/cv.html (y cv/cv-en.html si hay resumen en inglés). Lo que escriben los comandos (Correcciones de preferencias.md, §2 y §5 de criterios) se conserva.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { ETAPAS, type Etapa } from './perfil.ts'

export type Campo = { k: string; t: string; tipo?: 'texto' | 'area' | 'mes' | 'lista'; ayuda?: string; campos?: Campo[]; inicial?: Fila[] }
type Fila = Record<string, string>
export type Valores = Record<string, string | Fila[]>
export type PerfilJson = { listas: Etapa[]; etapas: Partial<Record<Etapa, Valores>> }

const lista = (k: string, t: string, campos: Campo[], extra: Partial<Campo> = {}): Campo => ({ k, t, tipo: 'lista', campos, ...extra })
const area = (k: string, t: string, ayuda?: string): Campo => ({ k, t, tipo: 'area', ayuda })
const texto = (k: string, t: string, ayuda?: string): Campo => ({ k, t, ayuda })

/** Qué se pregunta en cada etapa. La revisión no se guarda aquí: agrega filas al registro de criterios §5. */
export const FORMULARIO: Record<Etapa, { intro: string; campos: Campo[] }> = {
  hechos: {
    intro: 'Solo lo que puedes respaldar: cada cifra la vas a tener que explicar en una entrevista. Ten a mano tu material de fuentes/ (CV antiguos, LinkedIn, certificados).',
    campos: [
      texto('nombre', 'Nombre completo'),
      texto('titular', 'Titular', 'El cargo que buscas y tu especialidad, p. ej. «Contadora · Auditoría y control de gestión»'),
      texto('ciudad', 'Ciudad y país'),
      texto('correo', 'Correo de contacto'),
      texto('telefono', 'Teléfono'),
      area('enlaces', 'Enlaces', 'Uno por línea: LinkedIn, portafolio, publicaciones'),
      area('resumen', 'Posicionamiento', 'Cargo objetivo, años de experiencia, especialidad y sectores'),
      area('pilares', 'Pilares', 'Las 3 o 4 cosas que mejor haces, una por línea, cada una con su prueba en la experiencia'),
      lista('experiencia', 'Experiencia', [
        texto('cargo', 'Cargo'),
        texto('empresa', 'Empresa'),
        { k: 'desde', t: 'Desde', tipo: 'mes' },
        { k: 'hasta', t: 'Hasta', tipo: 'mes', ayuda: 'Vacío si sigues ahí' },
        texto('jornada', 'Jornada', 'Completa, parcial, por proyecto…'),
        area('contexto', 'Contexto', 'Qué hace la empresa o el área, y para qué te contrataron. Va al CV en una línea.'),
        area('logros', 'Logros', 'Uno por línea: verbo en pasado, qué hiciste, con qué y qué resultado (con cifra si la hay). Di si fue propio o en equipo.'),
        texto('herramientas', 'Herramientas y habilidades que usaste'),
        area('notas', 'Notas internas', 'No van al CV: cómo nombrar la empresa, qué no se afirma, de dónde sale cada cifra')
      ], { ayuda: 'Del más reciente al más antiguo' }),
      area('diferencia', 'Lo que me diferencia'),
      lista('proyectos', 'Proyectos y trabajo adicional', [texto('nombre', 'Nombre'), area('descripcion', 'Qué es y qué hiciste'), texto('enlace', 'Enlace')], { ayuda: 'Proyectos personales, voluntariado, docencia, publicaciones' }),
      lista('habilidades', 'Herramientas y habilidades', [texto('nombre', 'Área, herramienta o habilidad'), texto('donde', 'Detalle: cuáles, dónde y cuánto')], { ayuda: 'Una fila por área (p. ej. «Software contable: …») o por herramienta' }),
      lista('educacion', 'Educación', [texto('titulo', 'Título'), texto('institucion', 'Institución'), texto('anio', 'Año')]),
      lista('certificaciones', 'Certificaciones', [texto('nombre', 'Certificación'), texto('emisor', 'Emisor'), texto('anio', 'Año')]),
      lista('idiomas', 'Idiomas', [texto('idioma', 'Idioma'), texto('nivel', 'Nivel')]),
      lista('historias', 'Historias para entrevistas (STAR)', [texto('titulo', 'De qué trata'), area('situacion', 'Situación'), area('tarea', 'Tarea'), area('accion', 'Acción (lo que hiciste tú)'), area('resultado', 'Resultado')], { ayuda: 'Al menos 3, sacadas de tu experiencia' }),
      lista('salidas', 'Cómo contar las salidas y los vacíos', [texto('que', 'Salida o vacío'), area('como', 'Cómo lo cuentas')]),
      lista('extras', 'Otras secciones', [texto('titulo', 'Título'), area('contenido', 'Contenido')], { ayuda: 'Lo que no calza arriba: una especialidad que cruza varios trabajos, cómo trabajas o guías a otros, una prueba técnica' }),
      area('sensible', 'Qué queda fuera por sensible', 'Solo el tema, sin el detalle'),
      area('porConfirmar', 'Por confirmar', 'Dudas que te quedan, una por línea')
    ]
  },
  preferencias: {
    intro: 'Lo que el asistente y tú necesitan para actuar sin preguntar cada vez. Vive en tus datos, no en la memoria de una herramienta.',
    campos: [
      texto('cargos', 'Cargos objetivo'),
      texto('descarto', 'Descarto', 'Requisitos que no cumples o no quieres: herramientas, sectores, idioma excluyente, jornada…'),
      texto('modalidad', 'Modalidad y ubicación'),
      texto('disponibilidad', 'Disponibilidad'),
      texto('idiomas', 'Idiomas en que postulo'),
      texto('piso', 'Piso líquido mensual', 'Nunca se pide menos'),
      texto('pretension', 'Pretensión por defecto'),
      texto('responder', 'Cómo responder la renta', 'Bruto o líquido, moneda, si se ajusta al rango publicado sin bajar del piso'),
      texto('correoEnvio', 'Correo desde el que postulo'),
      texto('cuentasNo', 'Cuentas que no se usan para postular', 'P. ej., el correo de otro trabajo'),
      area('formalidad', 'Cómo escribo los mensajes', 'Una regla por línea: saludo, formalidad y largo, por correo y por chat'),
      area('reglas', 'Reglas propias', 'Una por línea: temas que no se mencionan, trabajo que no es tuyo, cifras que no se publican')
    ]
  },
  mercado: {
    intro: 'Busca en los portales de tu profesión y tu país. Anota la fuente y la fecha de cada dato.',
    campos: [
      lista('portales', 'Dónde se postula y cómo filtra cada canal', [texto('canal', 'Canal'), area('filtra', 'Cómo filtra'), area('implica', 'Qué implica para ti')], {
        inicial: [
          { canal: 'LinkedIn', filtra: 'Búsqueda por cargo, ubicación, empresa y aptitudes. Easy Apply agrega preguntas de filtro (años, sueldo, certificaciones).', implica: 'Titular con el cargo objetivo y 3 a 5 habilidades. Aptitudes con la redacción de las ofertas. Respuestas listas para las preguntas de filtro.' },
          { canal: 'ATS de la empresa', filtra: 'Leen el texto del PDF, reconocen secciones y buscan palabras clave y el título del cargo.', implica: 'CV de una columna y palabras clave dentro de cada cargo.' }
        ]
      }),
      lista('bandas', 'Bandas salariales', [texto('cargo', 'Cargo y nivel'), texto('rango', 'Rango'), texto('fuente', 'Fuente y fecha'), texto('encaje', 'Tu encaje y lo que te falta')]),
      area('volumen', 'Volumen de ofertas por cargo'),
      area('lectura', 'Lectura', 'Qué cargo da volumen, cuál paga más, cuál va como CV base y cuáles como variantes')
    ]
  },
  marca: {
    intro: 'Qué se destaca de ti, en qué orden y con qué tono. Cada rasgo necesita una prueba en tu experiencia.',
    campos: [
      texto('rol', 'Rol objetivo', '¿Qué cargo buscas, y cuál es el plan B con más volumen?'),
      texto('mercado', 'Mercado', '¿Dónde? Tipo de empresa, sector, país, idioma'),
      texto('seniority', 'Seniority', '¿Con qué nivel te presentas, y lo sostienen los años y el alcance?'),
      texto('idea', 'Idea central', 'Si te recuerdan por una sola cosa, ¿cuál?'),
      texto('tono', 'Tono', 'Opinión con criterio, cercano, técnico, formal…'),
      texto('visibilidad', 'Visibilidad', '¿Vas a publicar? ¿Con qué frecuencia y sobre qué?'),
      texto('limites', 'Límites', '¿Qué no se menciona nunca? Agrégalo también a «Reglas propias» en Preferencias'),
      area('describo', 'Cómo me describo, en mis palabras', 'Sin pulir: es la materia prima de la marca'),
      area('manifiesto', 'Manifiesto', 'Opcional: tu postura, en tus palabras y más larga'),
      lista('rasgos', 'Rasgos y su evidencia', [texto('rasgo', 'Rasgo'), area('evidencia', 'Evidencia en tu experiencia')], { ayuda: 'Un rasgo sin evidencia no entra' }),
      area('posicionamiento', 'Posicionamiento', 'Una frase, y por qué te distingue de quienes compiten por el mismo cargo'),
      texto('fraseCv', 'Frase para el CV'),
      texto('fraseLinkedin', 'Frase para LinkedIn'),
      texto('frasePosts', 'Frase para posts'),
      lista('historia', 'Cómo entra cada parte de tu historia', [texto('parte', 'Parte'), area('como', 'Cómo se cuenta (prueba principal, contexto o no se menciona)')]),
      area('pilares', 'Pilares de contenido', 'Solo si vas a publicar: 3 o 4 temas, uno por línea'),
      area('publicaciones', 'Primeras publicaciones', 'Una por línea: el gancho y de qué trata')
    ]
  },
  alertas: {
    intro: 'Lee tu experiencia como un reclutador escéptico: vacíos, permanencias cortas, cargos superpuestos, título grande para los años, cambio de rubro, cifras difíciles de creer, requisitos típicos que faltan. Para cada señal, una respuesta corta y honesta.',
    campos: [lista('alertas', 'Señales y su respuesta', [texto('senal', 'Señal'), area('respuesta', 'Respuesta preparada')])]
  },
  cv: {
    intro: 'El CV se arma con tu experiencia, educación e idiomas de «Hechos». Aquí va lo propio del CV. Al guardar se genera cv/cv.html; desde ahí, el PDF.',
    campos: [
      area('resumen', 'Resumen', '3 a 4 frases (50 a 85 palabras) que partan por el valor que entregas. Sin frases de marca ni clichés.'),
      area('competencias', 'Competencias', 'Una por línea, con la redacción de las ofertas. Solo las que tienen un caso concreto que contar.'),
      texto('titularEn', 'En inglés · Titular', 'Opcional: con el resumen en inglés se genera también cv/cv-en.html (empresas, fechas y enlaces salen de «Hechos»)'),
      area('resumenEn', 'En inglés · Resumen', 'Sin pronombres personales («Built…», no «I built…»)'),
      area('competenciasEn', 'En inglés · Competencias', 'Una por línea'),
      lista('experienciaEn', 'En inglés · Experiencia', [texto('empresa', 'Empresa', 'Como en «Hechos»'), texto('cargo', 'Cargo'), texto('jornada', 'Jornada', 'Full-time, part-time…'), area('contexto', 'Contexto'), area('logros', 'Logros', 'Uno por línea')], { ayuda: 'Una fila por cargo, en el mismo orden que la experiencia de «Hechos»' }),
      area('educacionEn', 'En inglés · Educación y certificaciones', 'Una por línea; vacío usa las de «Hechos»'),
      area('idiomasEn', 'En inglés · Idiomas', 'Uno por línea, p. ej. «Spanish: native»')
    ]
  },
  perfiles: {
    intro: 'Textos listos para pegar a mano en cada portal. Dicen lo mismo que el CV: cargos, fechas, jornada y habilidades.',
    campos: [
      texto('titular', 'Titular de LinkedIn', 'Hasta 220 caracteres: cargo objetivo, 3 a 5 habilidades y tu frase de LinkedIn'),
      area('acerca', 'Acerca de', 'Unas 200 a 250 palabras en primera persona: abre con tu frase, una historia con prueba, cómo trabajas y una invitación a conversar'),
      area('aptitudes', 'Aptitudes', 'Una por línea; las 3 primeras van fijadas'),
      area('experiencia', 'Experiencia en LinkedIn', 'Por cargo, 2 o 3 líneas coherentes con el CV'),
      lista('otros', 'Otros portales', [texto('portal', 'Portal'), area('campos', 'Qué va en cada campo')])
    ]
  },
  revision: {
    intro: 'Registra cada evaluación del CV (una herramienta como Jobscan, un reclutador, una revisión propia). La primera cierra la etapa.',
    campos: [
      texto('fecha', 'Fecha'),
      texto('herramienta', 'Herramienta o quién evaluó'),
      texto('version', 'Versión del CV'),
      texto('puntaje', 'Puntaje'),
      area('hallazgos', 'Hallazgos'),
      texto('estado', 'Estado', 'Qué hiciste con los hallazgos')
    ]
  }
}

const GENERADO = 'Generado por otterjobs desde perfil/perfil.json'
const AVISO = `<!-- ${GENERADO}: edítalo en la app (Perfil); lo que cambies aquí se reemplaza al guardar. -->`
const ARCHIVO: Record<Etapa, string> = Object.fromEntries(ETAPAS.map((e) => [e.id, e.archivo])) as Record<Etapa, string>
const ruta = (datos: string) => join(datos, 'perfil', 'perfil.json')

export function leerPerfilJson(datos: string): PerfilJson {
  return existsSync(ruta(datos)) ? JSON.parse(readFileSync(ruta(datos), 'utf8')) : { listas: [], etapas: {} }
}

/** Etapas cuyo archivo se escribió fuera de la app: al guardar se reemplaza, y el actual queda como .anterior. */
export function etapasManuales(datos: string): Etapa[] {
  const j = leerPerfilJson(datos)
  return ETAPAS.filter((e) => e.id !== 'revision' && !j.etapas[e.id] && esManual(join(datos, e.archivo))).map((e) => e.id)
}
const esManual = (f: string) => existsSync(f) && !readFileSync(f, 'utf8').includes(GENERADO) && !readFileSync(f, 'utf8').includes('<!-- pendiente:')

/** Valida lo que llega de la interfaz contra el formulario: solo sus campos, solo texto. */
function limpiar(campos: Campo[], v: unknown): Valores {
  if (typeof v !== 'object' || !v) throw new Error('dato inválido')
  const o = v as Record<string, unknown>
  const r: Valores = {}
  for (const c of campos) {
    const x = o[c.k]
    if (x === undefined) continue
    if (c.tipo === 'lista') {
      if (!Array.isArray(x) || x.length > 200) throw new Error('dato inválido')
      r[c.k] = x.map((f) => limpiar(c.campos!, f) as Fila)
    } else {
      if (typeof x !== 'string' || x.length > 20_000) throw new Error('dato inválido')
      r[c.k] = x
    }
  }
  return r
}

/** Guarda una etapa del formulario y regenera sus archivos. `lista`: la persona la da por buena. */
export function guardarEtapa(datos: string, etapa: Etapa, valores: unknown, lista: boolean): void {
  if (!Object.hasOwn(FORMULARIO, etapa) || etapa === 'revision') throw new Error('etapa inválida')
  const j = leerPerfilJson(datos)
  j.etapas[etapa] = limpiar(FORMULARIO[etapa].campos, valores)
  j.listas = [...j.listas.filter((e) => e !== etapa), ...(lista ? [etapa] : [])]
  escribir(ruta(datos), JSON.stringify(j, null, 2) + '\n')
  const ve = (e: Etapa) => j.etapas[e] ?? {}
  const marca = (e: Etapa) => (j.listas.includes(e) ? '' : `\n<!-- pendiente:${e} — márcala lista en la app (Perfil) cuando la des por buena. -->\n`)
  const f = (e: Etapa) => join(datos, ARCHIVO[e])
  const cv = () => {
    reemplazar(f('cv'), htmlCv(ve('hechos'), ve('cv'), marca('cv')))
    if (s(ve('cv'), 'resumenEn')) reemplazar(join(datos, 'cv', 'cv-en.html'), htmlCv(...enIngles(ve('hechos'), ve('cv')), '', 'en'))
  }
  if (etapa === 'hechos') {
    reemplazar(f('hechos'), mdHechos(ve('hechos'), marca('hechos')))
    if (existsSync(f('cv')) && readFileSync(f('cv'), 'utf8').includes(GENERADO)) cv() // el CV sale de los hechos
  }
  if (etapa === 'preferencias') reemplazar(f(etapa), mdPreferencias(ve(etapa), marca(etapa), leerSi(f(etapa))))
  if (etapa === 'marca') reemplazar(f(etapa), mdMarca(ve(etapa), marca(etapa)))
  if (etapa === 'perfiles') reemplazar(f(etapa), mdPerfiles(ve(etapa), marca(etapa)))
  if (etapa === 'cv') cv()
  if (etapa === 'mercado') reemplazar(f(etapa), seccion(criterios(f(etapa)), '## 1.', mdMercado(ve(etapa), marca(etapa))))
  if (etapa === 'alertas') reemplazar(f(etapa), seccion(criterios(f(etapa)), '## 3.', mdAlertas(ve(etapa), marca(etapa))))
}

/** Rehace los archivos desde perfil.json: lo usa `otterjobs perfil generar` cuando Claude importa o refina las respuestas. */
export function regenerar(datos: string): Etapa[] {
  const j = leerPerfilJson(datos)
  const es = ETAPAS.map((e) => e.id).filter((e) => e !== 'revision' && j.etapas[e])
  for (const e of es) guardarEtapa(datos, e, j.etapas[e], j.listas.includes(e))
  return es
}

/** Agrega una evaluación al registro de criterios §5 (como /revisar) y cierra la etapa de revisión. */
export function registrarEvaluacion(datos: string, valores: unknown): void {
  const v = limpiar(FORMULARIO.revision.campos, valores) as Fila
  if (!v.herramienta?.trim() || !v.puntaje?.trim()) throw new Error('Falta la herramienta y el puntaje')
  const f = join(datos, ARCHIVO.revision)
  let t = criterios(f).replace(/\n?<!-- pendiente:revision[^>]*-->\n?/, '\n')
  if (!/^## 5\./m.test(t)) t = t.trimEnd() + '\n\n---\n\n## 5. Registro de evaluaciones\n'
  if (!/^\| Fecha \| Herramienta/m.test(t.slice(t.search(/^## 5\./m)))) t = t.trimEnd() + '\n\n| Fecha | Herramienta | Versión | Puntaje | Hallazgos | Estado |\n|---|---|---|---|---|---|\n'
  escribir(f, t.trimEnd() + '\n' + fila([v.fecha, v.herramienta, v.version, v.puntaje, v.hallazgos, v.estado]) + '\n')
}

// --- archivos ---

function escribir(f: string, t: string) {
  mkdirSync(dirname(f), { recursive: true })
  writeFileSync(f, t)
}
const leerSi = (f: string) => (existsSync(f) ? readFileSync(f, 'utf8') : '')

/** Reemplaza el archivo; si lo escribió otra mano (no la app), lo guarda antes como «.anterior». */
function reemplazar(f: string, t: string) {
  if (existsSync(f) && !readFileSync(f, 'utf8').includes(GENERADO)) {
    const anterior = f.replace(/(\.\w+)$/, '.anterior$1')
    if (!existsSync(anterior)) copyFileSync(f, anterior)
  }
  escribir(f, t)
}

/** criterios-revision.md actual, con el aviso de que §1 y §3 salen de la app. */
function criterios(f: string): string {
  const t = leerSi(f) || '# Criterios de revisión del CV y los perfiles\n\n## 1. Cómo se postula en mi mercado\n\n---\n\n## 3. Señales de alerta y su respuesta\n\n---\n\n## 5. Registro de evaluaciones\n'
  return t.includes(GENERADO) ? t : t.replace(/^(# .*\n)/, `$1\n<!-- ${GENERADO} (§1 y §3): edítalos en la app. §2 y §5 se editan aquí. -->\n`)
}

/** Reemplaza la sección que parte con `titulo` (p. ej. «## 1.») hasta el siguiente «---» o «## ». */
export function seccion(t: string, titulo: string, cuerpo: string): string {
  const i = t.search(new RegExp(`^${titulo.replace('.', '\\.')}`, 'm'))
  if (i < 0) return `${t.trimEnd()}\n\n---\n\n${cuerpo.trim()}\n`
  const resto = t.slice(i + 1)
  const fin = resto.search(/^(---\s*$|## )/m)
  return `${t.slice(0, i)}${cuerpo.trim()}\n\n${fin < 0 ? '' : resto.slice(fin)}`
}

// --- markdown ---

const s = (v: Valores, k: string) => (typeof v[k] === 'string' ? (v[k] as string).trim() : '')
const filas = (v: Valores, k: string) => (Array.isArray(v[k]) ? (v[k] as Fila[]) : []).filter((f) => Object.values(f).some((x) => x.trim()))
const lineas = (x: string) => x.split(/\r?\n/).map((l) => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean)
const vinetas = (x: string) => lineas(x).map((l) => `- ${l}`).join('\n')
const celda = (x = '') => x.trim().replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>')
const fila = (xs: (string | undefined)[]) => `| ${xs.map(celda).join(' | ')} |`
const tabla = (cab: string[], fs: (string | undefined)[][]) => [fila(cab), `|${cab.map(() => '---').join('|')}|`, ...fs.map(fila)].join('\n')
const bloque = (titulo: string, cuerpo: string) => `${titulo}\n\n${cuerpo.trim() ? cuerpo.trim() + '\n\n' : ''}`

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
export const mes = (x = '') => (/^\d{4}-\d{2}$/.test(x) ? `${MESES[Number(x.slice(5)) - 1]} ${x.slice(0, 4)}` : x)
const periodo = (e: Fila) => `${mes(e.desde)} – ${e.hasta ? mes(e.hasta) : 'actual'}`

function mdHechos(v: Valores, marca: string): string {
  const contacto = [s(v, 'ciudad'), s(v, 'correo'), s(v, 'telefono'), ...lineas(s(v, 'enlaces'))].filter(Boolean).join(' · ')
  return [
    AVISO,
    `# Perfil laboral\n${marca}`,
    bloque(`**${s(v, 'nombre') || 'Nombre'}**${s(v, 'titular') ? ` · ${s(v, 'titular')}` : ''}`, contacto),
    bloque('## 1. Posicionamiento', s(v, 'resumen')),
    bloque('### Pilares', vinetas(s(v, 'pilares'))),
    bloque('## 2. Experiencia', filas(v, 'experiencia').map((e) => [`### ${e.cargo} — ${e.empresa} · ${periodo(e)}${e.jornada ? ` (${e.jornada})` : ''}`, e.contexto?.trim() && `*${e.contexto.trim()}*`, vinetas(e.logros ?? ''), e.herramientas && `Con: ${e.herramientas}`, e.notas?.trim() && `> **Notas internas:** ${lineas(e.notas).join(' · ')}`].filter(Boolean).join('\n\n')).join('\n\n')),
    bloque('## 3. Lo que me diferencia', s(v, 'diferencia')),
    bloque('## 4. Proyectos y trabajo adicional', filas(v, 'proyectos').map((p) => `### ${p.nombre}${p.enlace ? ` (${p.enlace})` : ''}\n\n${p.descripcion ?? ''}`).join('\n\n')),
    bloque('## 5. Herramientas y habilidades', filas(v, 'habilidades').map((h) => `- **${h.nombre}**${h.donde ? `: ${h.donde}` : ''}`).join('\n')),
    bloque(
      '## 6. Educación y certificaciones',
      [
        ...filas(v, 'educacion').map((e) => `- ${e.titulo} — ${e.institucion}${e.anio ? ` (${e.anio})` : ''}`),
        ...filas(v, 'certificaciones').map((c) => `- Certificación: ${c.nombre}${c.emisor ? ` — ${c.emisor}` : ''}${c.anio ? ` (${c.anio})` : ''}`),
        ...filas(v, 'idiomas').map((i) => `- Idioma: ${i.idioma}${i.nivel ? `, ${i.nivel}` : ''}`)
      ].join('\n')
    ),
    bloque('## 7. Historias para entrevistas (formato STAR)', filas(v, 'historias').map((h) => `### ${h.titulo}\n\n- **Situación:** ${h.situacion ?? ''}\n- **Tarea:** ${h.tarea ?? ''}\n- **Acción:** ${h.accion ?? ''}\n- **Resultado:** ${h.resultado ?? ''}`).join('\n\n')),
    bloque('## 8. Cómo contar las salidas y los vacíos', filas(v, 'salidas').map((x) => `- **${x.que}:** ${x.como ?? ''}`).join('\n')),
    ...filas(v, 'extras').map((x) => bloque(`## ${x.titulo}`, x.contenido ?? '')),
    bloque('## Qué quedó fuera por sensible', s(v, 'sensible')),
    bloque('## Por confirmar', vinetas(s(v, 'porConfirmar')))
  ].join('\n').trimEnd() + '\n'
}

function mdPreferencias(v: Valores, marca: string, actual: string): string {
  // «Correcciones» la escribe /mensaje: se copia tal cual.
  const corr = /^## Correcciones\s*$[\s\S]*/m.exec(actual)?.[0].trim() ?? `## Correcciones\n\n${tabla(['Fecha', 'Qué corregí', 'Regla que queda'], [])}`
  const it = (t: string, k: string) => `- **${t}:** ${s(v, k)}`
  return [
    AVISO,
    `# Preferencias\n\nLo que el asistente necesita saber para actuar por ti. Vive aquí, en tus datos, y no en la memoria del asistente.\n${marca}`,
    bloque('## Búsqueda', [it('Cargos objetivo', 'cargos'), it('Descarto', 'descarto'), it('Modalidad y ubicación', 'modalidad'), it('Disponibilidad', 'disponibilidad'), it('Idiomas en que postulo', 'idiomas')].join('\n')),
    bloque('## Renta', [it('Piso líquido mensual', 'piso'), it('Pretensión por defecto', 'pretension'), it('Cómo responder', 'responder'), '- Lo que ya se le dio a cada empresa queda en la columna `sueldo` del tracker: con esa empresa se mantiene la misma cifra.'].join('\n')),
    bloque('## Envíos', [it('Correo desde el que postulo', 'correoEnvio'), it('Cuentas que no se usan para postular', 'cuentasNo'), '- El asistente no envía nada: deja el texto en el portapapeles (con el asunto, si es correo) y tú lo mandas.'].join('\n')),
    bloque('## Mensajes', ['- **Correo:** saludo con el nombre al inicio, tono cordial y profesional, cierre breve.', '- **Chat (WhatsApp, LinkedIn):** corto y natural. Saludo solo al inicio, sin repetir el nombre de la persona en medio.', vinetas(s(v, 'formalidad'))].filter(Boolean).join('\n')),
    bloque('## Reglas propias', vinetas(s(v, 'reglas'))),
    corr
  ].join('\n').trimEnd() + '\n'
}

function mdMarca(v: Valores, marca: string): string {
  const preg = FORMULARIO.marca.campos.slice(0, 7)
  return [
    AVISO,
    `# Marca personal\n\nLa estrategia: qué se destaca, en qué orden y con qué tono. Los hechos que la sostienen están en \`perfil.md\`.\n${marca}`,
    bloque('## Decisiones del cuestionario', tabla(['Tema', 'Pregunta', 'Decisión'], preg.map((c) => [c.t, c.ayuda, s(v, c.k)]))),
    bloque('## Cómo me describo (en mis palabras)', s(v, 'describo')),
    s(v, 'manifiesto') && bloque('### Manifiesto', s(v, 'manifiesto')),
    bloque('## Rasgos y su evidencia', tabla(['Rasgo', 'Evidencia en `perfil.md`'], filas(v, 'rasgos').map((r) => [r.rasgo, r.evidencia]))),
    bloque('## Posicionamiento', s(v, 'posicionamiento')),
    bloque('## Frase de marca, por canal', tabla(['Canal', 'Frase'], [['CV', s(v, 'fraseCv')], ['LinkedIn', s(v, 'fraseLinkedin')], ['Posts', s(v, 'frasePosts')]])),
    bloque('## Cómo entra cada parte de mi historia', tabla(['Parte', 'Cómo se cuenta'], filas(v, 'historia').map((h) => [h.parte, h.como]))),
    bloque('## Pilares de contenido', vinetas(s(v, 'pilares'))),
    s(v, 'publicaciones') && bloque('### Primeras publicaciones', vinetas(s(v, 'publicaciones')))
  ].filter(Boolean).join('\n').trimEnd() + '\n'
}

function mdPerfiles(v: Valores, marca: string): string {
  return [
    AVISO,
    `# Perfiles públicos\n\nTextos listos para pegar a mano en cada portal. Dicen lo mismo que el CV y siguen \`marca.md\`.\n${marca}`,
    '## LinkedIn\n',
    bloque('### Titular', s(v, 'titular')),
    bloque('### Acerca de', s(v, 'acerca')),
    bloque('### Aptitudes', vinetas(s(v, 'aptitudes'))),
    bloque('### Experiencia', s(v, 'experiencia')),
    bloque('## Otros portales', filas(v, 'otros').map((o) => `### ${o.portal}\n\n${o.campos ?? ''}`).join('\n\n'))
  ].join('\n').trimEnd() + '\n'
}

const mdMercado = (v: Valores, marca: string) =>
  [
    `## 1. Cómo se postula en mi mercado\n${marca}`,
    tabla(['Canal', 'Cómo filtra', 'Qué implica'], filas(v, 'portales').map((p) => [p.canal, p.filtra, p.implica])),
    '\n**Bandas salariales** (fuente y fecha de consulta):\n',
    tabla(['Cargo y nivel', 'Rango', 'Fuente', 'Encaje y brecha'], filas(v, 'bandas').map((b) => [b.cargo, b.rango, b.fuente, b.encaje])),
    `\n**Volumen de ofertas por cargo:** ${s(v, 'volumen')}\n`,
    `**Lectura:** ${s(v, 'lectura')}\n`,
    '**Consistencia entre canales:** cargo, fechas, jornada y habilidades dicen lo mismo en el CV y en cada portal.\n'
  ].join('\n')

const mdAlertas = (v: Valores, marca: string) =>
  `## 3. Señales de alerta y su respuesta\n${marca}\n${tabla(['Señal', 'Respuesta preparada'], filas(v, 'alertas').map((a) => [a.senal, a.respuesta]))}\n`

// --- CV ---

const esc = (x = '') => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const SECCIONES = {
  es: { perfil: 'Perfil', competencias: 'Competencias', experiencia: 'Experiencia', proyectos: 'Proyectos', educacion: 'Educación', certificaciones: 'Certificaciones', idiomas: 'Idiomas', actual: 'actual' },
  en: { perfil: 'Summary', competencias: 'Skills', experiencia: 'Experience', proyectos: 'Projects', educacion: 'Education', certificaciones: 'Certifications', idiomas: 'Languages', actual: 'Present' }
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const month = (x = '') => (/^\d{4}-\d{2}$/.test(x) ? `${MONTHS[Number(x.slice(5)) - 1]} ${x.slice(0, 4)}` : x)

/** Los hechos y el CV con lo escrito en inglés encima: cargo por cargo, en el mismo orden. */
function enIngles(h: Valores, cv: Valores): [Valores, Valores] {
  const en = filas(cv, 'experienciaEn')
  const exp = filas(h, 'experiencia').map((e, i) => ({ ...e, ...Object.fromEntries(Object.entries(en[i] ?? {}).filter(([, x]) => x.trim())) }))
  const linea = (k: string) => lineas(s(cv, k)).map((x) => ({ x }))
  return [
    { ...h, titular: s(cv, 'titularEn') || s(h, 'titular'), experiencia: exp, ...(s(cv, 'educacionEn') ? { educacion: [], certificaciones: [], educacionEn: linea('educacionEn') } : {}), ...(s(cv, 'idiomasEn') ? { idiomas: [], idiomasEn: linea('idiomasEn') } : {}) },
    { resumen: s(cv, 'resumenEn'), competencias: s(cv, 'competenciasEn') }
  ]
}

/** CV de una columna, apto para ATS (sin tablas ni columnas, fechas en la línea del cargo), imprimible en A4 o carta. */
function htmlCv(h: Valores, cv: Valores, marca: string, idioma: 'es' | 'en' = 'es'): string {
  const t = SECCIONES[idioma]
  const periodo = (e: Fila) => `${(idioma === 'en' ? month : mes)(e.desde)} – ${e.hasta ? (idioma === 'en' ? month : mes)(e.hasta) : t.actual}`
  const sec = (t: string, cuerpo: string) => (cuerpo.trim() ? `<section><h2>${t}</h2>${cuerpo}</section>` : '')
  const ul = (xs: string[]) => (xs.length ? `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '')
  const contacto = [s(h, 'ciudad'), s(h, 'correo'), s(h, 'telefono'), ...lineas(s(h, 'enlaces'))].filter(Boolean).map(esc).join(' · ')
  return `<!doctype html>
<html lang="${idioma}">
<head>
<meta charset="utf-8">
${AVISO}${marca ? `\n${marca.trim()}` : ''}
<title>${esc(s(h, 'nombre') || 'CV')}</title>
<style>
  @page { size: A4; margin: 16mm 16mm; }
  body { font: 10.5pt/1.4 Calibri, Arial, sans-serif; color: #111; max-width: 780px; margin: 0 auto; }
  h1 { font-size: 20pt; margin: 0; }
  .titular { font-size: 12pt; margin: 2px 0; }
  .contacto { color: #333; margin: 2px 0 10px; }
  h2 { font-size: 11.5pt; text-transform: uppercase; border-bottom: 1px solid #999; margin: 14px 0 6px; padding-bottom: 2px; }
  .cargo { break-inside: avoid; margin-bottom: 8px; }
  .linea { display: flex; justify-content: space-between; gap: 12px; }
  ul { margin: 3px 0 0; padding-left: 18px; }
  li { margin: 1px 0; }
  p { margin: 3px 0; }
  .contexto { font-style: italic; color: #333; }
</style>
</head>
<body>
<h1>${esc(s(h, 'nombre'))}</h1>
${s(h, 'titular') ? `<p class="titular">${esc(s(h, 'titular'))}</p>` : ''}
<p class="contacto">${contacto}</p>
${sec(t.perfil, s(cv, 'resumen') ? `<p>${esc(s(cv, 'resumen'))}</p>` : '')}
${sec(t.competencias, lineas(s(cv, 'competencias')).length ? `<p>${lineas(s(cv, 'competencias')).map(esc).join(' · ')}</p>` : '')}
${sec(t.experiencia, filas(h, 'experiencia').map((e) => `<div class="cargo"><div class="linea"><span><b>${esc(e.cargo)}</b> · <b>${esc(e.empresa)}</b>${e.jornada ? ` (${esc(e.jornada)})` : ''}</span><span>${esc(periodo(e))}</span></div>${e.contexto?.trim() ? `<p class="contexto">${esc(e.contexto.trim())}</p>` : ''}${ul(lineas(e.logros ?? ''))}</div>`).join('\n'))}
${sec(t.proyectos, filas(h, 'proyectos').map((p) => `<div class="cargo"><b>${esc(p.nombre)}</b>${p.enlace ? ` · ${esc(p.enlace)}` : ''}<p>${esc(p.descripcion)}</p></div>`).join('\n'))}
${sec(t.educacion, ul([...filas(h, 'educacion').map((e) => `${e.titulo} — ${e.institucion}${e.anio ? `, ${e.anio}` : ''}`), ...filas(h, 'educacionEn').map((e) => e.x)]))}
${sec(t.certificaciones, ul(filas(h, 'certificaciones').map((c) => `${c.nombre}${c.emisor ? ` — ${c.emisor}` : ''}${c.anio ? `, ${c.anio}` : ''}`)))}
${sec(t.idiomas, ul([...filas(h, 'idiomas').map((i) => `${i.idioma}${i.nivel ? `: ${i.nivel}` : ''}`), ...filas(h, 'idiomasEn').map((i) => i.x)]))}
</body>
</html>
`.replace(/\n{2,}/g, '\n')
}

// --- revisiones sin IA ---

const meses = (x: string) => Number(x.slice(0, 4)) * 12 + Number(x.slice(5, 7)) - 1
const duracion = (n: number) => (n >= 12 ? `${Math.floor(n / 12)} año${n >= 24 ? 's' : ''}${n % 12 ? ` y ${n % 12} meses` : ''}` : `${n} meses`)

/** Señales que un reclutador vería en las fechas de la experiencia: vacíos, permanencias cortas y cargos superpuestos. */
export function alertasSugeridas(hechos: Valores, hoy: string): string[] {
  const xs = filas(hechos, 'experiencia')
    .filter((e) => /^\d{4}-\d{2}$/.test(e.desde ?? ''))
    .map((e) => ({ e, ini: meses(e.desde), fin: /^\d{4}-\d{2}$/.test(e.hasta ?? '') ? meses(e.hasta) : meses(hoy) }))
    .sort((a, b) => a.ini - b.ini)
  const r: string[] = []
  let prev: (typeof xs)[number] | undefined
  for (const x of xs) {
    const n = x.fin - x.ini + 1
    if (x.e.hasta && n < 12) r.push(`Permanencia corta: ${duracion(n)} en ${x.e.empresa}`)
    if (prev && x.ini - prev.fin - 1 >= 3) r.push(`Vacío de ${duracion(x.ini - prev.fin - 1)} entre ${prev.e.empresa} y ${x.e.empresa}`)
    if (prev && x.ini <= prev.fin) r.push(`Cargos superpuestos: ${prev.e.empresa} y ${x.e.empresa}`)
    if (!prev || x.fin > prev.fin) prev = x
  }
  return r
}

/** Los puntos del checklist de criterios §2.B que se pueden medir sin criterio humano. */
export function revisarCv(hechos: Valores, cv: Valores): { ok: boolean; texto: string }[] {
  const palabras = (x: string) => x.split(/\s+/).filter(Boolean).length
  const exp = filas(hechos, 'experiencia')
  const logros = exp.flatMap((e) => lineas(e.logros ?? ''))
  const resumen = palabras(s(cv, 'resumen'))
  const largos = logros.filter((l) => palabras(l) < 15 || palabras(l) > 30).length
  const cifras = logros.filter((l) => /\d/.test(l)).length
  const verbos = Object.entries(logros.reduce<Record<string, number>>((a, l) => ((a[l.split(/\s+/)[0].toLowerCase()] = (a[l.split(/\s+/)[0].toLowerCase()] ?? 0) + 1), a), {})).filter(([, n]) => n > 2)
  const reciente = exp[0] ? lineas(exp[0].logros ?? '').length : 0
  const antiguos = exp.slice(1).filter((e) => { const n = lineas(e.logros ?? '').length; return n < 1 || n > 3 })
  const total = palabras([s(cv, 'resumen'), s(cv, 'competencias'), ...logros, ...filas(hechos, 'proyectos').map((p) => p.descripcion ?? '')].join(' '))
  return [
    { ok: resumen >= 50 && resumen <= 85, texto: `Resumen de 50 a 85 palabras (tiene ${resumen})` },
    { ok: reciente >= 4 && reciente <= 6, texto: `De 4 a 6 logros en el cargo reciente (tiene ${reciente})` },
    { ok: !antiguos.length, texto: `De 1 a 3 logros en los cargos anteriores${antiguos.length ? ` (revisar: ${antiguos.map((e) => e.empresa).join(', ')})` : ''}` },
    { ok: logros.length > 0 && !largos, texto: `Cada logro de 15 a 30 palabras${largos ? ` (${largos} fuera de rango)` : ''}` },
    { ok: cifras >= 5, texto: `Al menos 5 resultados medibles (hay ${cifras} logros con cifras)` },
    { ok: !verbos.length, texto: `Ningún verbo repetido más de 2 veces${verbos.length ? ` (${verbos.map(([v, n]) => `«${v}» ×${n}`).join(', ')})` : ''}` },
    { ok: total < 1000, texto: `Bajo 1.000 palabras (unas ${total})` }
  ]
}
