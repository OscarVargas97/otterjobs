# Novedades

Lo que trae cada versión de otterjobs, lo más nuevo arriba.

## Sin publicar

`feat/plantilla`, `feat/terminal`

### Nuevo
- **Perfil en la app**: la vista Perfil arma cada etapa con formularios (empleos, logros, preferencias, cuestionario de marca, alertas, perfiles y registro de evaluaciones). Escribe los archivos del perfil, arma el CV de una columna y lo exporta a PDF. Sugiere las señales de alerta que se ven en tus fechas y revisa lo medible del CV (largo del resumen, logros con cifras, verbos repetidos). Claude queda para refinar cada etapa o importar un perfil ya escrito (`/perfil importar`), editando `perfil/perfil.json`. `otterjobs perfil generar` rehace los archivos.
- **Mis CV**: en Perfil, todos los CV en un lugar (los base y el adaptado de cada postulación), con su PDF. La ficha de cada postulación también muestra su CV y su ficha, y en cada etapa «Ver archivo» muestra lo que se generó.
- **Claude llena las etapas vacías**: «Llenar con Claude» arma la etapa desde fuentes/ y las demás etapas, y pregunta solo lo que falte.
- Campos nuevos para no perder lo que ya estaba escrito: contexto y notas internas por cargo, otras secciones, cómo escribo los mensajes, encaje y brecha por cargo, manifiesto y primeras publicaciones.
- **Claude dentro de la app**: los botones con Claude abren Claude Code en la vista «Claude», una pestaña por sesión, en vez de una ventana aparte de Windows Terminal.
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
