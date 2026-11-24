# AGENTS.md — Contenido de LinkedIn

Aquí se piensan, escriben y registran las publicaciones de LinkedIn. La IA investiga y propone, pero cada post tiene que sonar a la persona y no a una IA.

## Contexto que siempre se carga

- Hechos (qué se puede afirmar): @../perfil/perfil.md
- Marca, pilares y tono: @../perfil/marca.md
- Reglas del perfil: @../AGENTS.md
- Voz: @voz.md

Si un post afirma algo que no está en `perfil/perfil.md`, se pregunta o se saca. Las reglas del `AGENTS.md` raíz aplican igual aquí.

## Cómo se escribe

1. **Ideas:** se buscan en la web y en la experiencia real de la persona. Se anotan en `ideas.md` con su fuente.
2. **Material propio primero:** antes de redactar, se entrevista a la persona para sacar la anécdota, el dato o la opinión real. Sin material propio no hay post.
3. **Borrador:** en primera persona, en español neutro.
4. **Quitar lo que suena a IA**, revisando contra `voz.md`: fuera tríadas de adjetivos, "en el mundo actual", "no es solo X, es Y", emojis decorativos, cierres motivacionales, guiones largos en serie, preguntas de engagement forzadas.
5. **La persona aprueba y edita.** Sus cambios se anotan en `voz.md` para aprender su estilo.
6. **Publicación:** la hace la persona a mano. No se publica, programa ni comenta nada sin su visto bueno explícito en el chat.

## Archivos

- `ideas.md`: banco de ideas (fecha, idea, fuente, pilar, estado).
- `posts/AAAA-MM-DD-slug/post.md`: una carpeta por post, con `estado: borrador | aprobado | publicado`, el texto final y, si se publicó, el link.
- `voz.md`: cómo escribe la persona, qué palabras usa y cuáles evita.
