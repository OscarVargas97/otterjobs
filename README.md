# otterjobs

Sistema para buscar trabajo con un perfil y una marca personal que se mantienen al día: tablero de postulaciones, tareas con vencimiento, bandeja de Gmail y tu perfil armado con formularios en la app (con Claude Code para refinarlo desde tu material) y usarlo en cada postulación, entrevista y mensaje.

Hay dos partes que viven separadas:

- **otterjobs** (este repo): la app de escritorio, la CLI, el método (`metodo/`, un plugin de Claude Code con las reglas y los comandos) y `plantilla/` (los archivos del perfil por llenar). No tiene datos de nadie.
- **Tu carpeta de datos**: tu perfil, tu CV, tus postulaciones (`otterjobs.db`) y tu material en bruto (`fuentes/`). Solo datos, sin instrucciones: el método se actualiza con otterjobs. Se crea con `otterjobs nuevo` y conviene versionarla en un repo **privado**.

Lo determinista (tracker, historial, estado del perfil, lectura de Gmail) lo hacen scripts. Claude Code se usa solo donde hace falta criterio: leer tu material, preguntarte, redactar y evaluar. Lo que necesita saber para actuar por ti queda en tus datos (`perfil/preferencias.md`), no en la memoria del asistente.

## 1. Requisitos

Probado en Windows 11. En Linux funciona la CLI; la app no está probada. macOS tampoco.

| Qué | Para qué | Cómo instalarlo (Windows) |
|---|---|---|
| Node.js 24 o superior | Corre la app y la CLI (usa `node:sqlite` y TypeScript sin compilar) | `winget install OpenJS.NodeJS.LTS` y comprobar con `node -v` |
| pnpm | Instala las dependencias | `npm install -g pnpm` |
| Git | Clonar este repo y versionar tus datos. Claude Code en Windows también lo usa | `winget install Git.Git` |
| Claude Code | El método (`/perfil`, `/postular`…). Necesita una cuenta de Claude con Claude Code (plan Pro o Max) | `npm install -g @anthropic-ai/claude-code`, luego `claude` una vez para iniciar sesión |
| Microsoft Edge o Chrome | `otterjobs pdf`: el CV de HTML a PDF | Edge viene con Windows. Otra ruta: variable `OTTERJOBS_NAVEGADOR` |
| Python 3 y `pypdf` (opcional) | La prueba de texto plano del CV en `/revisar` | `winget install Python.Python.3.13` y `pip install pypdf` |

Después de instalar, abre una terminal nueva para que tome los cambios.

## 2. Instalar otterjobs

```sh
git clone <url de este repo> otterjobs
cd otterjobs
pnpm install
```

## 3. Crear tu carpeta de datos

```sh
pnpm otterjobs nuevo
```

Crea `otterjobs/datos/` desde `plantilla/` (los archivos de `perfil/` por llenar y la base vacía) y la deja como carpeta activa en `~/.otterjobs/config.json`. `datos/` está en el `.gitignore` de otterjobs: es solo datos y se versiona aparte, en su propio repo. `pnpm otterjobs nuevo <carpeta>` la crea en otro lugar. La carpeta tiene que no existir o estar vacía.

Para versionarla (recomendado, en un repo **privado**):

```sh
cd datos
git init
git add -A
git commit -m "inicio"
```

`fuentes/` queda fuera del repo (`.gitignore`): ahí va material que no se publica.

¿Ya tienes una carpeta de datos? `pnpm otterjobs datos <carpeta>` la deja como activa.

## 4. Armar tu perfil

1. Deja en `datos/fuentes/` todo lo que tengas: CV antiguos, el PDF o la exportación de LinkedIn, certificados, cartas de recomendación, evaluaciones de desempeño, chats exportados (Discord, Slack, WhatsApp), notas sueltas.
2. En la app, abre **Perfil**: las etapas con su estado y, en cada una, un formulario (empleos, logros con cifras, preferencias, el cuestionario de marca, respuestas a las señales de alerta). Al guardar, la app escribe los archivos de abajo y arma el CV (`cv/cv.html`, una columna, apto para ATS; «Exportar PDF» lo pasa a PDF con Edge o Chrome). «Guardar y marcar lista» cierra la etapa. Tus respuestas quedan en `perfil/perfil.json`.
3. **Refinar con Claude** (opcional, en cada etapa): abre Claude Code con `/perfil <etapa>` en una terminal dentro de la app (vista «Claude»). Lee tus `fuentes/`, propone logros mejor redactados, cifras que falten, opciones para la marca o la investigación del mercado, y escribe en `perfil.json` solo lo que apruebes. Lo ves al tiro en el formulario. La etapa la sigues marcando tú.
4. **Si ya tenías un perfil escrito** (a mano o con Claude), la app marca esas etapas como «Escrito fuera de la app». «Importar con Claude» (`/perfil importar`) lo lleva a los formularios sin perder contenido. Si guardas una etapa sin importarla, el archivo se reemplaza y el anterior queda como `.anterior.md`.

Sin la app: `pnpm otterjobs perfil` dice qué falta, y Claude Code en tu carpeta de datos (`cd datos` y `claude --plugin-dir ../metodo --settings ../metodo/settings.json`; el segundo deja fuera el `CLAUDE.md` de desarrollo de otterjobs) hace lo mismo con `/perfil` (o `/otterjobs:perfil`). Edita `perfil.json` y corre `otterjobs perfil generar`.


| Etapa | Archivo | Qué queda |
|---|---|---|
| `hechos` | `perfil/perfil.md` | Experiencia, logros con cifras, habilidades, historias para entrevistas, qué se dice de las salidas |
| `preferencias` | `perfil/preferencias.md` | Cargos, lo que descartas, piso de renta, correo desde el que postulas, tono de tus mensajes |
| `mercado` | `perfil/criterios-revision.md` §1 | Portales de tu profesión y cómo filtran, bandas salariales, volumen por cargo |
| `marca` | `perfil/marca.md` | Cuestionario, cómo te describes, rasgos con evidencia, posicionamiento, frases por canal |
| `alertas` | `perfil/criterios-revision.md` §3 | Lo que un reclutador va a cuestionar y tu respuesta |
| `cv` | `cv/cv.html` y PDF | CV base |
| `perfiles` | `perfil/perfiles.md` | LinkedIn y los demás portales, listos para pegar |
| `revision` | `perfil/criterios-revision.md` §5 | Primera evaluación del CV con puntaje |

Cada archivo marca lo pendiente con `<!-- pendiente:ETAPA -->`; la marca se quita cuando das la etapa por lista. Los archivos generados dicen «Generado por otterjobs»: se editan en la app, no a mano. Las secciones que escriben los comandos (§2 y §5 de criterios, «Correcciones» de preferencias) se conservan al guardar.

## 5. Buscar trabajo

Con la app (`pnpm dev`) o desde Claude Code en tu carpeta de datos, con el plugin:

| Comando | Qué hace |
|---|---|
| `/buscar` | Busca ofertas abiertas según tus preferencias, las ordena por probabilidad y, con tu visto bueno, las agrega al tracker |
| `/evaluar #N` | Calce, brechas y renta de una oferta, y si vale la pena |
| `/postular #N` | Ficha con la investigación de la empresa, variante del CV, respuestas y mensaje |
| `/entrevista #N` | Preparación y práctica, una pregunta a la vez con puntaje |
| `/mensaje` | Redacta la respuesta y la deja en el portapapeles |
| `/correo` | Lee la bandeja y actualiza el tracker |
| `/revisar` | Evalúa el CV y registra lo aprendido |
| `/semana` | Ideas y el post semanal de LinkedIn (también desde la vista LinkedIn) |

Nada se envía ni se publica solo: los textos quedan en el portapapeles y tú los mandas. En la app, el panel de cada postulación tiene estos mismos botones.

La CLI hace lo mismo que la app: `pnpm otterjobs ver`, `stats`, `tareas`, `historial N`, `set N campo=valor`, `add campo=valor`, `pendiente "texto"`, `hecha ID`, `perfil` (`perfil generar` rehace los archivos desde `perfil.json`), `pdf cv/cv.html`.

## 6. Bandeja de Gmail (opcional)

La app lee (solo lee) los correos de postulaciones por IMAP. No usa IA para leerlos: un script guarda los que nombran una empresa de tu tracker o hablan de reclutamiento, y «Revisar con Claude» (`/correo`) los clasifica y actualiza tus postulaciones.

En la app, abre **Bandeja**: te guía en tres pasos, con los enlaces de Google (verificación en dos pasos y [contraseña de aplicación](https://myaccount.google.com/apppasswords)). Al pegar la contraseña, prueba la conexión, la guarda en `~/.otterjobs/gmail.json` (fuera de los repos) y busca los correos del último mes. Si los correos de postulaciones te llegan a más de una cuenta, conéctalas todas («Agregar otra cuenta»): «Buscar correos nuevos» las lee todas y cada correo se abre en la cuenta donde llegó.

Sin la app: para una cuenta, crea `~/.otterjobs/.env` con `GMAIL_USER=…` y `GMAIL_APP_PASSWORD=…` y corre `pnpm otterjobs gmail --dias 7`. Para revocar el acceso, borra la contraseña de aplicación en Google.

## Desarrollo

Versiones, ramas, reglas del código y comandos: `AGENTS.md`. Novedades: `CHANGELOG.md`.
