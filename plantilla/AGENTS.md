# AGENTS.md

Esta carpeta es la fuente de verdad de mi perfil laboral. Antes de redactar algo sobre mí, lee `perfil/perfil.md` (los hechos) y, si existe, `perfil/marca.md` (el enfoque). Si `perfil/perfil.md` sigue vacío, propón `/perfil` antes que nada.

**CLI de otterjobs:** `{{CLI}}` (en los comandos aparece como `otterjobs`).

## Reglas

1. **No inventes.** Todo logro, cifra, cargo o fecha sale de `perfil/perfil.md`. Si falta un dato, pregunta o déjalo fuera.
2. **Datos sensibles.** Nada interno de empleadores en lo que escribas: vulnerabilidades, clientes, colegas, identificadores, secretos ni arquitectura. Generaliza.
3. **Cifras de negocio de exempleadores:** en lo público (CV, perfiles, posts) van en forma relativa ("capacidad ×10"). Las absolutas quedan en `perfil/perfil.md` para las entrevistas.
4. **Nada sale sin visto bueno.** No publiques, envíes ni subas nada sin aprobación explícita en el chat.
5. **`fuentes/` es solo de lectura y no se versiona.** No copies su contenido literal a otros archivos.
6. **Orden:** primero `perfil/perfil.md`, después `perfil/marca.md` y al final los derivados (CV, perfiles, posts).
7. **Tracker:** cada oferta, postulación o cambio de estado se registra en el momento con `otterjobs add|set` (o en la app). Nunca abras `otterjobs.db` con otra herramienta. El próximo paso va en `proximo_paso` (una línea) y su fecha en `vence` (AAAA-MM-DD). Las tareas sueltas, con `otterjobs pendiente "texto"` y `otterjobs hecha ID`.

### Reglas propias

<!-- Lo que solo aplica a esta persona (temas que no se mencionan, proyectos que no son suyos). /perfil las propone. -->

## Dónde va cada cosa

`perfil/` (hechos, marca, perfiles públicos, `criterios-revision.md`), `cv/`, `postulaciones/AAAA-MM-DD-empresa-rol/` (ficha, variante del CV, entrevistas; la columna `ficha` del tracker apunta aquí), `linkedin/` (voz, ideas, posts), `fuentes/` (material en bruto y la bandeja de Gmail). Las carpetas se crean cuando hacen falta.

## Estilo

- Español neutro. Primera persona en el About y en los posts.
- Sin frases vacías ("apasionado", "proactivo", "orientado a resultados").
- **CV:** resumen neutro (años, especialidad, sectores, propuesta de valor). Bullets con verbo en pasado, qué, con qué y qué resultado. Distinguir "diseñé/implementé" de "participé en". Sin coloquialismos ni justificaciones. Antes de editarlo, aplica `perfil/criterios-revision.md`.
- **Posts:** suenan a la persona, no a una IA. Sin tríadas de adjetivos, "no es solo X, es Y", emojis decorativos ni cierres motivacionales. Lo que la persona corrige se anota en `linkedin/voz.md`.
