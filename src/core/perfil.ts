// Etapas del perfil y su estado, sin IA: lo usan `otterjobs perfil`, el comando /perfil y, más adelante, la app.
// Cada plantilla marca lo que falta con `<!-- pendiente:ETAPA -->`; la etapa está lista cuando su archivo existe y ya no tiene la marca.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// `usa`: de qué sale cada etapa (por eso van en este orden). `sirve`: dónde se nota fuera del perfil.
export const ETAPAS = [
  { id: 'hechos', archivo: 'perfil/perfil.md', que: 'Hechos respaldados por fuentes/ y tus respuestas', usa: [], sirve: 'el CV, la evaluación de ofertas, las postulaciones y la preparación de entrevistas' },
  { id: 'preferencias', archivo: 'perfil/preferencias.md', que: 'Cargos, renta, modalidad, correo de envío y tono', usa: [], sirve: 'la búsqueda de ofertas, su evaluación, las postulaciones y los mensajes' },
  { id: 'mercado', archivo: 'perfil/criterios-revision.md', que: 'Portales, cómo filtran y bandas salariales', usa: ['preferencias'], sirve: 'la búsqueda de ofertas (dónde buscar) y la revisión del CV' },
  { id: 'marca', archivo: 'perfil/marca.md', que: 'Cuestionario, posicionamiento y frases por canal', usa: ['hechos'], sirve: 'el CV y los posts de LinkedIn' },
  { id: 'alertas', archivo: 'perfil/criterios-revision.md', que: 'Lo que preguntará un reclutador y tu respuesta', usa: ['hechos'], sirve: 'la preparación de entrevistas' },
  { id: 'cv', archivo: 'cv/cv.html', que: 'CV base desde los hechos y la marca', usa: ['hechos', 'marca'], sirve: 'las postulaciones' },
  { id: 'perfiles', archivo: 'perfil/perfiles.md', que: 'LinkedIn y los portales de tu mercado', usa: ['cv'], sirve: 'tu LinkedIn y los portales (los pegas a mano)' },
  { id: 'revision', archivo: 'perfil/criterios-revision.md', que: 'Primera evaluación del CV (/revisar)', usa: ['cv'], sirve: 'saber qué corregir del CV' }
] as const
export type Etapa = (typeof ETAPAS)[number]['id']

export type EstadoPerfil = {
  fuentes: number
  etapas: { id: Etapa; archivo: string; que: string; usa: readonly Etapa[]; sirve: string; listo: boolean }[]
  porConfirmar: string[]
  siguiente: Etapa | null
}

/** Lo que hay y lo que falta en la carpeta de datos. */
export function estadoPerfil(datos: string): EstadoPerfil {
  const leer = (a: string) => (existsSync(join(datos, a)) ? readFileSync(join(datos, a), 'utf8') : null)
  const etapas = ETAPAS.map((e) => {
    const t = leer(e.archivo)
    return { ...e, listo: t !== null && !t.includes(`<!-- pendiente:${e.id}`) }
  })
  // Los ítems de «## Por confirmar» en perfil.md: preguntas abiertas para la persona.
  const por = /^## Por confirmar\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(leer('perfil/perfil.md') ?? '')?.[1] ?? ''
  const dirFuentes = join(datos, 'fuentes')
  return {
    fuentes: existsSync(dirFuentes) ? readdirSync(dirFuentes, { recursive: true }).filter((f) => !String(f).startsWith('gmail')).length : 0,
    etapas,
    // «- [x] …» ya está resuelto; «- [ ] …» y «- …» siguen abiertos
    porConfirmar: por.split(/\r?\n/).filter((l) => /^\s*[-*] \S/.test(l) && !/^\s*[-*] \[x\]/i.test(l)).map((l) => l.replace(/^\s*[-*] (\[ \] )?/, '')),
    siguiente: etapas.find((e) => !e.listo)?.id ?? null
  }
}
