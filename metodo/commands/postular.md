---
description: Prepara una postulación: ficha, variante del CV, respuestas y mensaje, sin enviar nada
---

Argumento: la postulación del tracker (`#ORDEN`). Carpeta: `postulaciones/AAAA-MM-DD-empresa-rol/`.

1. **Ficha** (`ficha.md`): datos de la oferta (enlace, modalidad, renta, postulantes), «Qué piden y con qué lo respaldo» (tabla con evidencia de `perfil.md`), «Brechas» y **la empresa**: investiga qué hace, su producto o servicio, clientes públicos, noticias y cultura. Cierra con el **interés mutuo**: qué de la empresa conecta con la marca y la experiencia de la persona, y qué le aporta ella.
2. **Variante del CV** en la carpeta: título de la oferta, resumen y orden de los bullets ajustados al cargo, palabras clave literales de la oferta. Nada que no esté en `perfil.md`. El PDF: `otterjobs pdf <carpeta>/cv.html`.
3. **Respuestas** del formulario o carta: fortalezas reales, tono natural, sin relleno. La renta según `preferencias.md` y coherente con lo que ya se dio a esa empresa.
4. **Mensaje** al reclutador si corresponde, en el portapapeles (como en `/mensaje`).
5. La persona postula. Cuando confirme: `otterjobs set ORDEN estado=Postulado ficha=postulaciones/… proximo_paso=… vence=…`.

$ARGUMENTS
