# otterjobs

App de escritorio para la búsqueda de trabajo: tablero de postulaciones, tareas con vencimiento, bandeja de Gmail y Claude Code a un clic. Lee y escribe los datos del carpeta de datos.

## Levantarla

```sh
pnpm install
pnpm otterjobs datos <carpeta>   # una vez
pnpm dev
```

Para la bandeja, crea `~/.otterjobs/.env` con:

```
GMAIL_USER=tu.correo@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

La contraseña es una [contraseña de aplicación](https://myaccount.google.com/apppasswords) (requiere verificación en dos pasos). La app solo lee.

Versiones, ramas y comandos: `AGENTS.md`. Novedades: `CHANGELOG.md`.
