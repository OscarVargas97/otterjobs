---
description: Arma o actualiza tu perfil por etapas (hechos, preferencias, mercado, marca, alertas, CV, perfiles, revisión) y te pregunta lo que falta
---

Sigue el método de otterjobs; la regla 1 (no inventar) manda. Argumento: una etapa, o nada para seguir con la que toca.

**Antes:** corre `otterjobs perfil`. Dice qué etapas están listas, cuál sigue y qué queda «Por confirmar». Sin argumento, trabaja la que sigue.

**En cada etapa:** lee lo que ya existe, propone, pregunta de a 3 o 4 cosas (una sola si cuesta responderla) y ofrece opciones concretas sacadas de los datos en vez de preguntas abiertas. Escribe en el archivo de la etapa. Cuando la persona lo da por bueno, quita su marca `<!-- pendiente:ETAPA … -->`, vuelve a correr `otterjobs perfil` y di cuál sigue. No avances de etapa sin cerrar la actual.

## hechos → `perfil/perfil.md`
1. Lee todo `fuentes/`. Si está vacía, di qué conviene dejar (CV antiguos, PDF o exportación de LinkedIn, certificados, cartas de recomendación, evaluaciones de desempeño, chats exportados, notas) y detente.
2. En chats y notas busca lo que la persona hizo, decidió o resolvió, con qué y con qué resultado. Ignora lo de otros.
3. Escribe solo lo respaldado. Lo dudoso va a «Por confirmar» y lo sensible a «Qué quedó fuera», sin el detalle.
4. Entrevista: qué fue propio y qué en equipo, cifras (absolutas aquí), vacíos y salidas (cómo contarlas, §8) y al menos 3 historias STAR.
5. Propón las «Reglas propias» de `perfil/preferencias.md` (temas que no se mencionan, trabajo que no es suyo, cifras que no se publican) y agrégalas si las aprueba.

## preferencias → `perfil/preferencias.md`
Recorre cada campo con la persona. Explícale que esto reemplaza a la memoria del asistente: lo que importa para actuar por ella (piso de renta, desde qué correo postula, cómo deben sonar sus mensajes) queda en sus datos.

## mercado → `perfil/criterios-revision.md` §1
Investiga en la web, citando fuente y fecha: los portales donde se contrata su profesión en su país y cómo filtra cada uno, las bandas salariales por cargo y nivel, y el volumen de ofertas por cargo. Cierra con la lectura: qué cargo da volumen, cuál paga más, cuál va como CV base y cuáles como variantes.

## marca → `perfil/marca.md`
1. **Cuestionario:** la tabla «Decisiones», con 2 o 3 opciones por tema sacadas de `perfil.md` y del mercado.
2. **Cómo me describo:** pide que lo escriba o lo dicte en sus palabras, sin pulir. No lo reescribas: es la materia prima.
3. **Rasgos y evidencia:** cada rasgo con algo de `perfil.md`. Sin evidencia, no entra.
4. **Posicionamiento:** una frase y por qué la distingue de quienes compiten por el mismo cargo.
5. **Frase por canal** (CV, LinkedIn, posts): 3 opciones de cada una; elige la persona.
6. **Cómo entra cada parte de la historia** y, si va a publicar, pilares y primeros ganchos.

## alertas → `perfil/criterios-revision.md` §3
Lee `perfil.md` como un reclutador escéptico: vacíos, permanencias cortas, cargos superpuestos, título grande para los años, cambio de rubro, sobrecalificación, cifras difíciles de creer, requisitos típicos del cargo que faltan. Para cada señal, la persona elige la respuesta y tú la dejas corta, honesta y sin explicaciones de más. Lo que no quiere mencionar va también a «Reglas propias».

## cv → `cv/cv.html` y su PDF
Desde `perfil.md` y `marca.md`, aplicando `criterios-revision.md` §2 y el estilo del método. HTML de una columna, imprimible en A4 o carta. El PDF: `otterjobs pdf cv/cv.html` (usa Edge o Chrome). Después, `/revisar`.

## perfiles → `perfil/perfiles.md`
LinkedIn (titular, Acerca de, aptitudes, experiencia) y los demás portales de §1, coherentes con el CV en cargos, fechas y habilidades. La persona los pega a mano.

## revision
Corre `/revisar`.

$ARGUMENTS
