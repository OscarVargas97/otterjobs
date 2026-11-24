# otterjobs

App de escritorio para la búsqueda de trabajo: tablero de postulaciones, tareas con vencimiento, bandeja de Gmail y Claude Code a un clic. Los datos (`otterjobs.db`, fichas, CV) viven en una carpeta aparte con su propio repo privado.

## Levantarla

```sh
pnpm install
pnpm otterjobs nuevo <carpeta>   # una vez: crea tu carpeta de datos desde plantilla/
pnpm dev
```

Si ya tienes una carpeta de datos, usa `pnpm otterjobs datos <carpeta>` en vez de `nuevo` (y `pnpm otterjobs migrar` si aún tiene `tracker.csv` y `tareas.md`).

## Tu perfil

`nuevo` deja una carpeta sin datos de nadie: reglas (`AGENTS.md`), plantillas en `perfil/` y los comandos de Claude Code `/perfil`, `/correo` y `/semana`. Para armar tu perfil:

1. Deja en `<carpeta>/fuentes/` todo tu material: CV antiguos, el PDF o la exportación de LinkedIn, certificados, chats exportados (Discord, Slack), notas. No se versiona.
2. Abre Claude Code en `<carpeta>` y escribe `/perfil`. Lee el material, completa `perfil/perfil.md` solo con lo que está respaldado y te pregunta lo que falta. Después arma la marca y, si se lo pides, el CV.
3. Conviene versionar la carpeta en un repo **privado** (`git init`): ahí quedan tus datos.

Para la bandeja, crea `~/.otterjobs/.env` con:

```
GMAIL_USER=tu.correo@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

La contraseña es una [contraseña de aplicación](https://myaccount.google.com/apppasswords) (requiere verificación en dos pasos). La app solo lee.

Versiones, ramas y comandos: `AGENTS.md`. Novedades: `CHANGELOG.md`.
