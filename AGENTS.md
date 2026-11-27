# AGENTS.md

otterjobs es la app de escritorio (Electron + React) para la búsqueda de trabajo: tablero de postulaciones, tareas con vencimiento, bandeja de Gmail y botones que abren Claude Code. **Los datos no se versionan aquí**: viven en su propia carpeta y repo privado: `otterjobs.db` (postulaciones, historial de cambios y tareas), `perfil/`, una carpeta por postulación y `fuentes/gmail/inbox.json` (no versionada). `plantilla/` son los archivos de datos por llenar que copia `otterjobs nuevo` (`crearDatos`), sin datos de nadie. Las reglas para trabajar sobre esos datos (qué se puede publicar, qué no se inventa) y los comandos están en `metodo/`, un plugin de Claude Code que la app carga con `--plugin-dir`; la carpeta de datos no lleva instrucciones.

## Cómo se trabaja

- **Ramas**: `main` es la rama por defecto y la de las releases, y se desarrolla en `dev`. Cada fase va en `fase/N-nombre` desde `dev` y lo demás en `feat|fix|refactor|chore|docs/<nombre>`. Todo entra a `dev` por PR. **Una release es un PR de `dev` a `main`**: al fusionarlo, GitHub Actions publica `0.FASE.N` en el canal estable de Velopack.
- **Versión**: `VERSION` dice solo la fase (`0.1`) y se edita al abrir una. N sube con cada PR fusionado en `dev` (`scripts/version.ps1`), y cada push a `dev` publica la prerelease `0.FASE.N-dev` (canal `dev`).
- **Commits** pequeños, en Conventional Commits y en español (`feat(tablero): …`), con `Refs #n` de la tarea.
- **Novedades**: cada release agrega su entrada arriba en `CHANGELOG.md` («## 0.FASE.N · Título», ramas, «### Nuevo», «### Arreglos»).

## Reglas

- Claude se usa a través del Claude Code interactivo del usuario (`wt.exe … claude "<pedido>"`), **nunca con `claude -p` ni con la API de Anthropic**.
- Lo determinista va en `src/core` y lo usan igual la app y la CLI: Claude decide y los scripts repiten.
- `otterjobs.db` (SQLite, `node:sqlite`, sin dependencias) se escribe solo con `src/core/tracker.ts` y `pendientes.ts`: validan, ordenan y registran cada cambio en `eventos`, dentro de una transacción. Las columnas en SQL salen solo de `CAMPOS`. La base se abre, se usa y se cierra (`usar`) para que nunca quede bloqueada entre la app y la CLI.
- **El método vive en `metodo/`**, no en el código ni en los datos: `metodo.md` (reglas, que el hook `SessionStart` le pasa a Claude con la ruta de la CLI) y `commands/`; cada botón de la app abre uno (`PEDIDOS` en `src/core/claude.ts`; una prueba exige que exista). Las etapas del perfil se marcan con `<!-- pendiente:ETAPA -->` en `plantilla/` (`src/core/perfil.ts` solo lee esas marcas). Lo que el asistente necesita saber de la persona, incluidas sus reglas propias, va en `perfil/preferencias.md` de sus datos, nunca en `metodo/` ni en la memoria de Claude.
- Nada personal en este repo (es público): ni nombres, ni empresas reales, ni rutas de una máquina. Las pruebas usan datos inventados.
- La plantilla y los comandos sirven para cualquier profesión y país: nada de supuestos de un rubro (stack, portales locales) fuera de los ejemplos.
- Gmail es solo lectura (IMAP con contraseña de aplicación). La app no envía correos.
- Credenciales y datos personales nunca en el repo ni en logs (ni en `plantilla/` ni en las pruebas): van en `~/.otterjobs/` o en la carpeta de datos.
- Código mínimo: sin abstracciones de una sola implementación ni andamiaje "para después".

## Comandos

| Para | Comando |
|---|---|
| App en caliente | `pnpm dev` |
| App compilada | `pnpm build && pnpm start` |
| Pruebas / tipos | `pnpm test` / `pnpm typecheck` |
| CLI (para Claude Code y la terminal) | `pnpm otterjobs ver\|stats\|tareas\|set\|add\|gmail\|perfil\|pdf\|nuevo\|datos` |
| Versión actual | `./scripts/version.ps1` |
| Instalador local | `./scripts/empaquetar.ps1` → `artefactos/paquetes` con `0.FASE.N-local.M` |

## Configuración

- `~/.otterjobs/config.json`: `{ "datos": "<carpeta de datos>" }`. Se fija con `pnpm otterjobs datos <carpeta>` o desde la app.
- `~/.otterjobs/.env`: `GMAIL_USER` y `GMAIL_APP_PASSWORD` (contraseña de aplicación de Google).
- `OTTERJOBS_DATOS` y `OTTERJOBS_HOME` los reemplazan (útil en pruebas).
