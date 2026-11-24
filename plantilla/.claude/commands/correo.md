---
description: Escanea Gmail y actualiza el tracker con lo que llegó
---

Usa la CLI de otterjobs que indica `AGENTS.md`.

1. `otterjobs gmail --dias 7` (o los días que se pidan). Si faltan credenciales, explica cómo crear `~/.otterjobs/.env` (README de otterjobs) y detente.
2. `otterjobs gmail --pendientes` y lee cada correo. Descarta el ruido sin comentarlo.
3. Por cada correo relevante, aplica el cambio con `otterjobs set|add` (estado, `proximo_paso`, `vence`). Si pide respuesta, redáctala y déjala en el portapapeles, sin enviarla.
4. `otterjobs gmail --revisado` y `otterjobs tareas`. Resume en 5 líneas qué cambió y qué toca hoy.

$ARGUMENTS
