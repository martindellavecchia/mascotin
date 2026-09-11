# Implementación de mejoras de producto

Plan aprobado el 11 de septiembre de 2026. Rama: `codex/product-ux-improvements`. Base: `05ce48727131ab8ad0978508afa35e8e050e602d`.

La implementación de las seis fases está realizada. La entrega completa sigue pendiente de QA visual autenticada y publicación. La suite y el build no sustituyen esa validación.

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
- [ ] Migraciones y activación de las tres funciones en producción; recorrido real posterior al despliegue.

La verificación utiliza exclusivamente PostgreSQL local en `127.0.0.1:55439`. Docker no fue restablecido: se utilizó un PostgreSQL portátil aislado. La inspección remota fue de solo lectura; no se aplicaron migraciones ni se modificaron datos publicados.

## Pendiente para cerrar la entrega

El usuario autorizó explícitamente el arranque local mediante «Mándale». El nuevo intento, limitado a `127.0.0.1:3000` y PostgreSQL local en `55439`, volvió a ser rechazado por la revisión automática de aprobación con «bloqueado por política», sin un motivo adicional. El proceso no llegó a iniciarse. Las reglas locales disponibles no aportaron una explicación adicional. La autorización del usuario ya está otorgada; el bloqueo restante corresponde al entorno de ejecución. No se sustituyó esta comprobación por un despliegue en producción.

Cuando el entorno permita el arranque: iniciar con base local y las tres funciones activas; recorrer guardar/editar/pausar búsquedas, solicitar/confirmar/reprogramar/cancelar turnos, abrir chat de tránsito sin mascota, deshacer pase y proponer/aceptar/editar encuentro; comprobar datos, errores de consola y adaptación a los tamaños indicados. Corregir hallazgos y publicar únicamente después de esas comprobaciones. La implementación quedó en el commit local `3f85a2d`.

El resumen diario se programa a partir de las 09:00 de Argentina; Vercel Hobby permite variación dentro de esa hora. Un atraso que devuelva `hasMore` se reanuda invocando nuevamente el endpoint autorizado. La ampliación de volumen requiere dimensionar esa reanudación y observar el cursor más antiguo.
