# Novedades

Lo que trae cada versión de otterjobs, lo más nuevo arriba.

## Sin publicar

`refactor/datos-sqlite`

### Cambios
- Las postulaciones y las tareas pasan de `tracker.csv` y `tareas.md` a `otterjobs.db` (SQLite). `pnpm otterjobs migrar` las trae una sola vez.
- **Historial**: cada cambio de una postulación queda registrado y se ve en el panel de detalle y con `otterjobs historial ORDEN`.
- Tareas sueltas desde la CLI: `otterjobs pendiente "texto"` y `otterjobs hecha ID`.

## 0.1.0 · Primera versión

`fase/1-base` · F1: el sistema de postulaciones de la carpeta de datos pasa a una app de escritorio

### Nuevo
- **Hoy**: los próximos pasos de cada postulación activa con su vencimiento (vencidos en rojo, hoy en amarillo) y las tareas sueltas de `tareas.md`, que se marcan y se agregan desde la app.
- **Tablero**: kanban por estado (Por postular, Postulado, Entrevista, Oferta y Cerradas) con arrastrar y soltar, búsqueda y «Nueva oferta». El panel de detalle edita estado, probabilidad, vencimiento, sueldo, modalidad, próximo paso, notas y ficha.
- **Bandeja**: escanea Gmail (solo lectura) y muestra los correos de postulaciones con su empresa. Cada correo se abre en Gmail o se marca como revisado.
- **Preguntarle a Claude**: preparar entrevista, redactar mensaje, evaluar oferta, preparar postulación y revisar la bandeja (`/correo`) abren Claude Code en Windows Terminal sobre la carpeta de datos.
- **CLI** `pnpm otterjobs` con lo mismo que la app, para usarla desde el chat.
- Los cambios hechos desde el chat se ven solos en la app.
