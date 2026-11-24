# AGENTS.md

Esta carpeta es la fuente de verdad de mi perfil laboral. Antes de redactar cualquier cosa sobre mí, lee `perfil/perfil.md` (los hechos) y `perfil/marca.md` (el enfoque). Si `perfil/perfil.md` todavía es la plantilla vacía, propón correr `/perfil` antes de cualquier otra cosa.

## Reglas

1. **No inventes.** Todo logro, cifra, cargo o fecha sale de `perfil/perfil.md`. Si falta un dato, pregunta o déjalo fuera. Nunca lo supongas.
2. **Datos sensibles.** No incluyas, ni aquí ni en ningún documento derivado, información interna de empleadores: vulnerabilidades, nombres de clientes o colegas, identificadores internos, secretos ni arquitectura de red. Generaliza: "endurecí la seguridad", no "corregí la vulnerabilidad X".
3. **Cifras de negocio de exempleadores:** en todo lo público (CV, LinkedIn, portales, posts) van en forma relativa ("capacidad ×10"), nunca en volúmenes absolutos. Las cifras absolutas quedan en `perfil/perfil.md` y en `fuentes/` para las entrevistas.
4. **Nada sale sin visto bueno.** No publiques, envíes ni subas contenido (LinkedIn, portales, correos, artifacts) sin aprobación explícita en el chat.
5. **`fuentes/` es solo de lectura y no se versiona.** No copies su contenido literal a archivos versionados.
6. **Orden de actualización:** primero `perfil/perfil.md`, después `perfil/marca.md`, y al final los derivados.
7. **Postulaciones:** cada oferta nueva, postulación o cambio de estado se registra en el tracker (`otterjobs.db`) en el mismo momento, **solo** con la app otterjobs o con `pnpm -s --dir {{OTTERJOBS}} otterjobs set|add`. Nunca abras `otterjobs.db` con otra herramienta. El próximo paso va en `proximo_paso`, en una sola línea, y su fecha límite en `vence` (AAAA-MM-DD). Las tareas que no son de una oferta se agregan con `otterjobs pendiente "texto"` y se cierran con `otterjobs hecha ID`.

### Reglas propias

<!-- Lo que solo aplica a esta persona: temas que no se mencionan, cómo contar una salida, proyectos que no son suyos, etc. /perfil las propone. -->

## Estructura

| Carpeta | Qué hay |
|---|---|
| `perfil/` | `perfil.md` (hechos), `marca.md` (enfoque), `perfiles.md` (LinkedIn y portales), `criterios-revision.md` |
| `cv/` | CV base (`cv.html`, `cv-en.html`) y sus PDF |
| `postulaciones/AAAA-MM-DD-empresa-rol/` | Todo lo de una oferta: `ficha.md`, la variante del CV y `entrevistas/`. La columna `ficha` del tracker apunta aquí |
| `mercado/` | Reportes de mercado y barridos de oportunidades |
| `linkedin/` | Voz, ideas y `posts/AAAA-MM-DD-slug/` |
| `otterjobs.db` | Tracker, historial y tareas. Se versiona, pero solo se escribe con otterjobs |
| `fuentes/` | Material en bruto (CV antiguos, exportación de LinkedIn, chats, notas) y la bandeja de Gmail. No se versiona |

## Sistema

La app **otterjobs** (`{{OTTERJOBS}}`) tiene el tablero, las tareas y la bandeja de Gmail. Su CLI hace lo mismo desde el chat:

- `pnpm -s --dir {{OTTERJOBS}} otterjobs ver|stats|tareas|historial ORDEN`: consultas.
- `pnpm -s --dir {{OTTERJOBS}} otterjobs set ORDEN campo=valor …` y `add campo=valor …`: los únicos que escriben el tracker.
- `pnpm -s --dir {{OTTERJOBS}} otterjobs gmail [--dias N | --pendientes | --revisado]`: lee Gmail (solo lectura) y deja los correos en `fuentes/gmail/inbox.json`. El criterio lo pones tú con `/correo`.

Comandos: `/perfil` (arma o actualiza el perfil desde `fuentes/`), `/correo` (bandeja → tracker), `/semana` (ritual de LinkedIn).

## Estilo

- Español neutro. Primera persona en el About y en los posts.
- Evita las frases vacías: "apasionado", "proactivo", "orientado a resultados", "dinámico".
- Bullets con verbo y sistema o alcance. Cifras solo si están en `perfil/perfil.md`.

## Revisión del CV

Antes de evaluar o editar el CV o los perfiles públicos, lee `perfil/criterios-revision.md` y aplica su checklist. Después de cada evaluación externa, registra el resultado en su §5 y agrega al checklist los criterios nuevos que sean válidos.

## Registro del CV

- **Resumen:** tono neutro y profesional. Años de experiencia, especialidad, sectores y propuesta de valor. Sin eslóganes ni preguntas.
- **Bullets:** verbo en pasado, qué se hizo, con qué tecnología y con qué resultado, medible si existe.
- Sin coloquialismos ni justificaciones ("en vez de…", "porque…").
- Distinguir siempre **"diseñé/implementé"** (propio) de **"participé en"** (en equipo).
- La marca personal se expresa en qué se destaca y en qué orden, no en frases de marca. Esas van en LinkedIn y en los posts.
