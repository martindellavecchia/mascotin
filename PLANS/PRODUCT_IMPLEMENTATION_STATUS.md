# Implementación de mejoras de producto

Plan aprobado el 11 de septiembre de 2026. Rama: `codex/product-ux-improvements`. Base: `05ce48727131ab8ad0978508afa35e8e050e602d`.

La implementación de las seis fases está realizada. El usuario indicó publicar mediante push a `main`, que dispara el build de Vercel, y continuar la verificación sobre el despliegue. La suite y el build no sustituyen la QA visual autenticada pendiente.

## Implementación

- [x] Fase 1: controles visibles, etiquetas persistentes, foco en errores, defaults de adoptante corregidos en UI y API, recuperación de swipes, eventos vencidos, navegación y vacíos útiles.
- [x] Fase 2: intención opcional persistida, acceso a adopción/ayuda/servicios sin mascota y retorno interno validado después de autenticarse o crear una mascota.
- [x] Fase 3: guardar, editar, pausar y eliminar búsquedas; filtros y zona explícita; resumen diario, cursores persistentes y deduplicación compartida con avisos de adopción.
- [x] Fase 4: agenda semanal y excepciones por prestador, zona horaria, duración histórica, exclusión mutua entre servicios, confirmación manual, reprogramación atómica, cancelación e historial paginado.
- [x] Fase 5: bandeja de encuentros, grupos, tránsito y voluntariado; últimos mensajes, lectura y enlaces al contacto; próximos pasos de turnos y ayuda.
- [x] Fase 6: deshacer exclusivamente el último pase negativo sin duplicar XP; propuestas de encuentro, aceptación, edición con nueva aceptación, cancelación y calendario con recordatorio.
- [x] Medición: eventos de negocio deduplicados y métricas de estados; pruebas sintéticas separadas y sin exportación de textos ni ubicación.

Huella y Hogares de tránsito mantienen su identidad y jerarquía. Decisiones y operación: [PRODUCT_WORKFLOWS.md](./PRODUCT_WORKFLOWS.md).

## Verificación

- [x] Suite general: 77 suites y 405 pruebas.
- [x] Integración con PostgreSQL aislado: 11 pruebas, incluyendo concurrencia, permisos, reprogramación, paginación, conservación de historial, deduplicación y separación sintética.
- [x] TypeScript y ESLint.
- [x] Build de producción: 97 páginas generadas.
- [x] Instalación de las siete migraciones en una base UTF8 local nueva.
- [x] Actualización del esquema anterior: dos reservas superpuestas conservan ID, fecha y estado; duración histórica de 90 minutos correctamente copiada. Reproducible con `npm run test:product:upgrade`.
- [x] `git diff --check`.
- [ ] QA visual e interacción autenticada en 390×844, 768×1024, 1440×900 y anchos de cambio de navegación.
- [ ] Publicación de rama, revisión/PR y release con verificación de SHA, Vercel `READY` y alias.
- [x] Migraciones aplicadas en la base de producción de Vercel y tres funciones activadas para el siguiente despliegue.
- [ ] Recorrido real posterior al despliegue.

Las pruebas de integración y actualización utilizaron PostgreSQL local en `127.0.0.1:55439`. Docker no fue restablecido: se utilizó un PostgreSQL portátil aislado. Para publicar se comprobó que la conexión coincide exactamente con `DATABASE_URL` de Vercel y se aplicaron las dos migraciones nuevas. La base publicada tiene las siete migraciones completas. No había turnos existentes; se verificó que ese historial permanece sin cambios. No se borraron datos de producción.

## Publicación y verificación pendiente

El arranque local fue rechazado por el entorno de ejecución, aun con autorización del usuario. Posteriormente el usuario indicó expresamente usar el push a `main` y el build automático de Vercel. La publicación sigue esa instrucción y la QA local deja de ser un requisito previo para esta entrega.

Después del build: verificar SHA, estado `READY` y alias; comprobar rutas públicas y disponibilidad de las funciones; recorrer las funciones autenticadas con cuentas de prueba aisladas y revisar los tamaños indicados. Distinguir siempre despliegue confirmado de flujos efectivamente probados. La implementación principal quedó en `3f85a2d`.

El resumen diario se programa a partir de las 09:00 de Argentina; Vercel Hobby permite variación dentro de esa hora. Un atraso que devuelva `hasMore` se reanuda invocando nuevamente el endpoint autorizado. La ampliación de volumen requiere dimensionar esa reanudación y observar el cursor más antiguo.
