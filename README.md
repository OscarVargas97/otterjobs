# otterjobs

Sistema para buscar trabajo con un perfil y una marca personal que se mantienen al día: tablero de postulaciones, tareas con vencimiento, bandeja de Gmail y un método, guiado por Claude Code, para armar tu perfil a partir de tu material y usarlo en cada postulación, entrevista y mensaje.

Hay dos partes que viven separadas:

- **otterjobs** (este repo): la app de escritorio, la CLI y `plantilla/`. No tiene datos de nadie.
- **Tu carpeta de datos**: tu perfil, tu CV, tus postulaciones (`otterjobs.db`) y tu material en bruto (`fuentes/`). Se crea con `otterjobs nuevo` y conviene versionarla en un repo **privado**.

Lo determinista (tracker, historial, estado del perfil, lectura de Gmail) lo hacen scripts. Claude Code se usa solo donde hace falta criterio: leer tu material, preguntarte, redactar y evaluar. Lo que necesita saber para actuar por ti queda en tus datos (`perfil/preferencias.md`), no en la memoria del asistente.

## 1. Requisitos

Probado en Windows 11. En Linux funciona la CLI; los botones de la app abren Claude en `x-terminal-emulator`. macOS no está probado.

| Qué | Para qué | Cómo instalarlo (Windows) |
|---|---|---|
| Node.js 24 o superior | Corre la app y la CLI (usa `node:sqlite` y TypeScript sin compilar) | `winget install OpenJS.NodeJS.LTS` y comprobar con `node -v` |
| pnpm | Instala las dependencias | `npm install -g pnpm` |
| Git | Clonar este repo y versionar tus datos. Claude Code en Windows también lo usa | `winget install Git.Git` |
| Claude Code | El método (`/perfil`, `/postular`…). Necesita una cuenta de Claude con Claude Code (plan Pro o Max) | `npm install -g @anthropic-ai/claude-code`, luego `claude` una vez para iniciar sesión |
| Windows Terminal | Los botones de la app abren Claude ahí | Viene con Windows 11; si no, `winget install Microsoft.WindowsTerminal` |
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
pnpm otterjobs nuevo C:/ruta/a/mis-datos
```

Crea la carpeta desde `plantilla/` (reglas en `AGENTS.md`, plantillas en `perfil/`, comandos de Claude Code en `.claude/commands/`, la base vacía) y la deja como carpeta activa en `~/.otterjobs/config.json`. La carpeta tiene que no existir o estar vacía.

Para versionarla (recomendado, en un repo **privado**):

```sh
cd C:/ruta/a/mis-datos
git init
git add -A
git commit -m "inicio"
```

`fuentes/` queda fuera del repo (`.gitignore`): ahí va material que no se publica.

¿Ya tienes una carpeta de datos? `pnpm otterjobs datos <carpeta>` la deja como activa.

## 4. Armar tu perfil

1. Deja en `mis-datos/fuentes/` todo lo que tengas: CV antiguos, el PDF o la exportación de LinkedIn, certificados, cartas de recomendación, evaluaciones de desempeño, chats exportados (Discord, Slack, WhatsApp), notas sueltas.
2. Revisa qué falta: `pnpm otterjobs perfil` (desde la carpeta de otterjobs).
3. Abre Claude Code en tu carpeta de datos (`cd mis-datos` y `claude`) y escribe `/perfil`. Trabaja una etapa por vez, te pregunta lo que falta y escribe en tus archivos solo lo que está respaldado:

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

Cada plantilla marca lo pendiente con `<!-- pendiente:ETAPA -->`; la etapa queda lista cuando apruebas el contenido y la marca se quita. `/perfil marca` (o cualquier etapa) vuelve a una etapa puntual.

## 5. Buscar trabajo

Con la app (`pnpm dev`) o desde Claude Code en tu carpeta de datos:

| Comando | Qué hace |
|---|---|
| `/buscar` | Busca ofertas abiertas según tus preferencias, las ordena por probabilidad y, con tu visto bueno, las agrega al tracker |
| `/evaluar #N` | Calce, brechas y renta de una oferta, y si vale la pena |
| `/postular #N` | Ficha con la investigación de la empresa, variante del CV, respuestas y mensaje |
| `/entrevista #N` | Preparación y práctica, una pregunta a la vez con puntaje |
| `/mensaje` | Redacta la respuesta y la deja en el portapapeles |
| `/correo` | Lee la bandeja y actualiza el tracker |
| `/revisar` | Evalúa el CV y registra lo aprendido |
| `/semana` | Ideas y el post semanal de LinkedIn |

Nada se envía ni se publica solo: los textos quedan en el portapapeles y tú los mandas. En la app, el panel de cada postulación tiene estos mismos botones.

La CLI hace lo mismo que la app: `pnpm otterjobs ver`, `stats`, `tareas`, `historial N`, `set N campo=valor`, `add campo=valor`, `pendiente "texto"`, `hecha ID`, `perfil`, `pdf cv/cv.html`.

## 6. Bandeja de Gmail (opcional)

La app lee (solo lee) los correos de postulaciones por IMAP.

1. Activa la [verificación en dos pasos](https://myaccount.google.com/signinoptions/twosv) en la cuenta donde te llegan los correos de reclutadores.
2. Crea una [contraseña de aplicación](https://myaccount.google.com/apppasswords) con el nombre `otterjobs`. Google muestra 16 letras.
3. Crea el archivo `~/.otterjobs/.env` (en Windows, `C:\Users\<tu usuario>\.otterjobs\.env`) con:

   ```
   GMAIL_USER=tu.correo@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```

4. Prueba con `pnpm otterjobs gmail --dias 7`.

El archivo queda fuera de los repos. Para revocar el acceso, borra la contraseña de aplicación en Google.

## Desarrollo

Versiones, ramas, reglas del código y comandos: `AGENTS.md`. Novedades: `CHANGELOG.md`.
