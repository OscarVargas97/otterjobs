# Novedades

Lo que trae cada versión de otterjobs, lo más nuevo arriba.

## 0.1.2 · Menú agrupado y perfil más liviano

`fix/fuentes-orden`

### Nuevo
- **Menú lateral plegable y agrupado**: día a día, búsqueda, perfil y configuración.
- **Etapas del perfil conectadas**: cada etapa muestra de qué etapas sale y dónde se usa, y avisa si falta una previa.

### Arreglos
- **Fuentes**: la lista muestra el estado de cada fuente y se ve el detalle de una a la vez; git se configura en pasos.
- **Perfil**: menos información en pantalla: los pasos aparecen solo si falta algo, las listas van plegadas y los campos en dos columnas.
- En pantallas anchas el contenido queda centrado con un ancho máximo (el tablero sigue a todo el ancho).

## 0.1.1 · Perfil en la app, fuentes y guía

`feat/plantilla`, `feat/terminal`

### Nuevo
- **Guía**: recorre todo lo que hay que configurar, en orden (tu material, tu perfil, postular, LinkedIn), con el estado de cada paso y un botón que lleva a donde se hace. La app abre en la Guía mientras falte lo indispensable.
- **Fuentes**: sección propia para el material del perfil. CV y documentos, exportación de LinkedIn (se guardan solo los archivos sobre ti; mensajes y contactos se descartan), notas pegadas, otros archivos y git: tus correos de autor y carpetas de repos locales, o una cuenta de GitHub o GitLab con token de solo lectura (incluye privados). De git quedan resúmenes de tus commits y PRs en `fuentes/git/`, sin código ni credenciales; los tokens quedan en `~/.otterjobs/git.json`.
- **Perfil por pasos**: arriba de Perfil, los cinco pasos (fuentes, importar, etapas, CV y perfiles, revisión) con el que sigue resaltado.
- **CV en inglés**: campos en inglés en la etapa CV (titular, resumen, competencias, experiencia, educación e idiomas) que generan `cv/cv-en.html` y su PDF.
- **Mercado**: vista con los barridos de ofertas y reportes, editables en la app; «Buscar ofertas con Claude» o un barrido a mano.
- **Aprendizajes**: los archivos de cada postulación se editan en la app, y «Pasar aprendizajes al perfil» abre `/perfil aprendizajes`, que lleva lo aprendido en entrevistas a las historias, alertas y preferencias.
- **Posts publicados** con su enlace y métricas.
- **Perfil en la app**: la vista Perfil arma cada etapa con formularios (empleos, logros, preferencias, cuestionario de marca, alertas, perfiles y registro de evaluaciones). Escribe los archivos del perfil, arma el CV de una columna y lo exporta a PDF. Sugiere las señales de alerta que se ven en tus fechas y revisa lo medible del CV (largo del resumen, logros con cifras, verbos repetidos). Claude queda para refinar cada etapa o importar un perfil ya escrito (`/perfil importar`), editando `perfil/perfil.json`. `otterjobs perfil generar` rehace los archivos.
- **Mis CV**: en Perfil, todos los CV en un lugar (los base y el adaptado de cada postulación), con su PDF. La ficha de cada postulación también muestra su CV y su ficha, y en cada etapa «Ver archivo» muestra lo que se generó.
- **Claude llena las etapas vacías**: «Llenar con Claude» arma la etapa desde fuentes/ y las demás etapas, y pregunta solo lo que falte.
- **LinkedIn**: vista propia con los posts (estado borrador, aprobado o publicado, pilar, fecha, contador de 3000 caracteres y lo que se ve antes de «ver más»), el banco de ideas y tu voz, que armas tú con tus propios textos (o Claude te entrevista con `/semana voz`). Copias el texto y abres LinkedIn para publicarlo tú; la app no publica. «Post de la semana», «Mejorar con Claude» y «Escribir» abren `/semana` con ese post o esa idea.
- Campos nuevos para no perder lo que ya estaba escrito: contexto y notas internas por cargo, otras secciones, cómo escribo los mensajes, encaje y brecha por cargo, manifiesto y primeras publicaciones.
- **Claude dentro de la app**: los botones con Claude abren Claude Code en un panel flotante abajo a la derecha, como un chat, con una pestaña por sesión, en vez de una ventana aparte de Windows Terminal.
- **Conectar Gmail desde la app**: la Bandeja guía los tres pasos con los enlaces de Google, prueba la conexión antes de guardar y busca los correos del último mes. Ya no hay que crear el `.env` a mano. Acepta **varias cuentas**: las lee todas y cada correo se abre en la cuenta donde llegó.
- **Hoy más legible**: los próximos pasos se agrupan en vencidas, hoy, próximas y sin fecha (plegada), con la fecha y la empresa en columnas; «Otras tareas» va al costado.
- **Ficha de la postulación en su propia vista**, con espacio para los campos y el botón para volver, en vez del panel lateral angosto.
- **Tu propio perfil**: `otterjobs nuevo <carpeta>` crea una carpeta de datos vacía desde `plantilla/`, para que cualquier persona arme el suyo desde su material (CV, LinkedIn, chats exportados, notas).
- **Método por etapas**: `/perfil` arma hechos, preferencias, mercado, marca, señales de alerta, CV, perfiles públicos y la primera revisión, y te pregunta lo que falta. `otterjobs perfil` dice qué etapas están listas y cuál sigue.
- **Comandos de búsqueda**: `/buscar` (ofertas abiertas por probabilidad), `/evaluar`, `/postular`, `/entrevista` (práctica con puntaje), `/mensaje` (al portapapeles) y `/revisar` (evaluación del CV con registro).
- **Preferencias en los datos**: piso de renta, correo de envío y tono de los mensajes van en `perfil/preferencias.md`, no en la memoria del asistente.
- `otterjobs pdf <html>`: el CV a PDF con Edge o Chrome.
- En la app: «Buscar ofertas»; los botones de cada postulación abren los comandos nuevos.
- README con la instalación completa desde cero.
- **El método como plugin**: las reglas y los comandos viven en `metodo/` (plugin de Claude Code) y la app lo abre con `--plugin-dir`. La carpeta de datos queda solo con datos, y tus reglas propias pasan a `perfil/preferencias.md`.
- `otterjobs nuevo` sin carpeta crea `otterjobs/datos/` (ignorada por git, para versionarla en su propio repo privado).


`refactor/datos-sqlite`

### Cambios
- Las postulaciones y las tareas pasan de `tracker.csv` y `tareas.md` a `otterjobs.db` (SQLite). `pnpm otterjobs migrar` las trae una sola vez.
- **Historial**: cada cambio de una postulación queda registrado y se ve en el panel de detalle y con `otterjobs historial ORDEN`.
- Tareas sueltas desde la CLI: `otterjobs pendiente "texto"` y `otterjobs hecha ID`.

## 0.1.0 · Primera versión

`fase/1-base` · F1: el sistema de postulaciones pasa a una app de escritorio

### Nuevo
- **Hoy**: los próximos pasos de cada postulación activa con su vencimiento (vencidos en rojo, hoy en amarillo) y las tareas sueltas de `tareas.md`, que se marcan y se agregan desde la app.
- **Tablero**: kanban por estado (Por postular, Postulado, Entrevista, Oferta y Cerradas) con arrastrar y soltar, búsqueda y «Nueva oferta». El panel de detalle edita estado, probabilidad, vencimiento, sueldo, modalidad, próximo paso, notas y ficha.
- **Bandeja**: escanea Gmail (solo lectura) y muestra los correos de postulaciones con su empresa. Cada correo se abre en Gmail o se marca como revisado.
- **Preguntarle a Claude**: preparar entrevista, redactar mensaje, evaluar oferta, preparar postulación y revisar la bandeja (`/correo`) abren Claude Code en Windows Terminal sobre la carpeta de datos.
- **CLI** `pnpm otterjobs` con lo mismo que la app, para usarla desde el chat.
- Los cambios hechos desde el chat se ven solos en la app.
