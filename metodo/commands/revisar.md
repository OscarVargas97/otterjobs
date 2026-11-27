---
description: Evalúa el CV (o un perfil) con criterios-revision.md, le pone puntaje y registra lo aprendido
---

Evalúa lo que se indique (por defecto `cv/cv.html` y su PDF) con `perfil/criterios-revision.md`. Si la persona trae un resultado externo (Jobscan, un reclutador, otra IA), salta al paso 5 y regístralo igual.

1. Copia de prueba sin teléfono ni correo en una carpeta temporal. Extrae el texto plano del PDF (con `pdftotext`, o con Python y `pypdf`; si no hay ninguno, pide instalar `pip install pypdf`) y léelo como un ATS: orden, fechas, secciones, tildes.
2. Recorre §2 punto por punto (✅ ⚠️ ❌) y §3: ¿cada señal de alerta tiene respuesta?
3. Si hay ofertas en el tracker (`otterjobs ver`), mide la coincidencia de palabras clave con 2 a 4 de ellas.
4. Puntaje sobre 100, pensando en que lo leerán filtros automáticos y modelos de lenguaje antes que una persona, y los 5 cambios que más lo suben, cada uno con su punto de §2.
5. Registra en §5 (fecha, herramienta, versión, puntaje, hallazgos, estado). Los criterios nuevos y válidos van a §2 con su origen; lo que choca con §1 o con una decisión de la persona se descarta anotando por qué. Si es la primera evaluación, quita la marca `pendiente:revision`.
6. Aplica los cambios solo si los aprueba.

$ARGUMENTS
