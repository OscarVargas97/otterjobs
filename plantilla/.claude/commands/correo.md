---
description: Escanea Gmail y actualiza el tracker de postulaciones con lo que llegó
---

1. Corre `pnpm -s --dir {{OTTERJOBS}} otterjobs gmail --dias 7` (o los días que se pidan). Si falla por credenciales, explica cómo crear `~/.otterjobs/.env` (ver el README de otterjobs) y detente.
2. Corre `pnpm -s --dir {{OTTERJOBS}} otterjobs gmail --pendientes` y lee cada correo. Descarta el ruido (newsletters, alertas de empleo genéricas) sin comentarlo.
3. Para cada correo relevante, propón el cambio en el tracker: fila, nuevo `estado`, `proximo_paso` (con la fecha del correo) y `vence`. Si es una oferta nueva, propón un `add`.
4. Aplica los cambios con `pnpm -s --dir {{OTTERJOBS}} otterjobs set|add` (regla 7 de AGENTS.md). Si el correo pide respuesta, redáctala y déjala en el portapapeles, pero no la envíes.
5. Corre `pnpm -s --dir {{OTTERJOBS}} otterjobs gmail --revisado` y después `pnpm -s --dir {{OTTERJOBS}} otterjobs tareas`, y resume en 5 líneas o menos qué cambió y qué hay que hacer hoy.

$ARGUMENTS
