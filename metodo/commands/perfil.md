---
description: Importa tu perfil a los formularios de la app o refina una etapa (hechos, preferencias, mercado, marca, alertas, CV, perfiles) desde tus fuentes
---

Sigue el método de otterjobs; la regla 1 (no inventar) manda. Argumento: `importar`, una etapa, o nada para la que sigue.

**Cómo se guarda el perfil:** la persona lo llena en la app (vista Perfil) y las respuestas quedan en `perfil/perfil.json` (`{ "listas": [...], "etapas": { "<etapa>": { campo: valor } } }`). De ahí la app genera `perfil.md`, `preferencias.md`, `marca.md`, `perfiles.md`, `criterios-revision.md` §1 y §3 y `cv/cv.html`. **No edites esos archivos generados:** edita `perfil/perfil.json` y corre `otterjobs perfil generar`. `otterjobs perfil campos` da los campos de cada etapa con su ayuda: usa solo esos nombres (`generar` rechaza los demás). Las fechas de la experiencia van como `AAAA-MM`, y la de término queda vacía si la persona sigue en ese cargo. Las listas son arreglos de objetos y los campos de texto largo usan una línea por ítem. **Nunca agregues una etapa a `listas`:** la da por buena la persona en la app.

**Antes:** corre `otterjobs perfil`. Dice qué etapas están listas, cuál sigue y qué queda «Por confirmar».

## importar
Para quien ya tiene un perfil escrito (a mano o con Claude) y quiere llevarlo a los formularios.
1. Lee los archivos del perfil que existen y `fuentes/`. Arma `perfil.json` etapa por etapa, sin perder contenido: lo que no calce en un campo va al campo de texto más cercano (`diferencia`, `sensible`, `porConfirmar` o `reglas`). Si de verdad no calza, dilo y no lo descartes en silencio.
2. Antes de `otterjobs perfil generar`, muestra qué va a quedar distinto en cada archivo: la app reemplaza los archivos escritos a mano y deja el original como `.anterior.md` (o `.anterior.html`). El CV generado es de una columna; si la persona prefiere su diseño actual, no importes la etapa `cv`.
3. Archivos fuera de las etapas (CV en otro idioma, notas, carpetas propias): no se tocan.
4. Termina diciendo qué revisar en la app y que ahí cada etapa se marca como lista.

## En cada etapa (refinar)
Lee `perfil.json` y `fuentes/`. Propón mejoras de a 3 o 4 cosas, con opciones concretas sacadas de los datos en vez de preguntas abiertas. Aplica lo que la persona apruebe en `perfil.json` y corre `otterjobs perfil generar`. Cierra con «Revísalo en la app (Perfil) y márcala lista cuando la des por buena».

## hechos
1. Lee todo `fuentes/`. Si está vacía, di qué conviene dejar (CV antiguos, PDF o exportación de LinkedIn, certificados, cartas de recomendación, evaluaciones de desempeño, chats exportados, notas) y detente.
2. En chats y notas busca lo que la persona hizo, decidió o resolvió, con qué y con qué resultado. Ignora lo de otros.
3. Solo lo respaldado. Lo dudoso va a `porConfirmar` y lo sensible a `sensible`, sin el detalle.
4. Pule cada logro: verbo en pasado, qué, con qué y resultado. Pregunta qué fue propio y qué en equipo, las cifras, los vacíos y salidas (`salidas`), y arma al menos 3 `historias` STAR.
5. Propón `reglas` para preferencias (temas que no se mencionan, trabajo que no es suyo, cifras que no se publican).

## preferencias
Recorre los campos vacíos con la persona. Explícale que esto reemplaza a la memoria del asistente.

## mercado
Investiga en la web, citando fuente y fecha: los portales donde se contrata su profesión en su país y cómo filtra cada uno (`portales`), las bandas salariales por cargo y nivel (`bandas`) y el volumen de ofertas (`volumen`). Cierra con la `lectura`: qué cargo da volumen, cuál paga más, cuál va como CV base y cuáles como variantes.

## marca
1. **Cuestionario** (`rol` a `limites`): 2 o 3 opciones por tema sacadas de los hechos y del mercado.
2. **`describo`:** es de la persona, en sus palabras. No lo reescribas.
3. **`rasgos`:** cada uno con evidencia de los hechos. Sin evidencia, no entra.
4. **`posicionamiento`** y frases por canal (`fraseCv`, `fraseLinkedin`, `frasePosts`): 3 opciones de cada una; elige la persona.
5. **`historia`** y, si va a publicar, `pilares`.

## alertas
Lee los hechos como un reclutador escéptico: vacíos, permanencias cortas, cargos superpuestos, título grande para los años, cambio de rubro, sobrecalificación, cifras difíciles de creer, requisitos típicos del cargo que faltan. La app ya sugiere las de fechas. La persona elige cada respuesta; tú la dejas corta, honesta y sin explicaciones de más.

## cv
`resumen` (50 a 85 palabras, parte por el valor que entrega) y `competencias`, aplicando `criterios-revision.md` §2. La experiencia sale de los hechos: los logros se pulen ahí. El PDF se exporta desde la app o con `otterjobs pdf cv/cv.html`. Después, `/revisar`.

## perfiles
LinkedIn (`titular`, `acerca`, `aptitudes`, `experiencia`) y `otros` portales de §1, coherentes con el CV en cargos, fechas y habilidades. La persona los pega a mano.

## revision
Corre `/revisar`.

$ARGUMENTS
