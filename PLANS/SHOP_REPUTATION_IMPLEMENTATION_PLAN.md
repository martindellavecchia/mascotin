# MascoTin - Plan técnico de negocios y reputación

## Objetivo

Permitir que un proveedor aprobado cree y gestione un negocio público, publique servicios reservables y acumule reputación verificable a partir de citas completadas. Identificar a los owners de negocios en sus interacciones sociales y convertir la reputación en una señal comprensible de confianza.

## Decisiones cerradas

- `Store` es el negocio público y la unidad de reputación.
- `ProviderProfile` conserva la identidad comercial y la aprobación administrativa.
- `Service` sigue siendo el servicio reservable y se vincula de forma aditiva a `Store` mediante `storeId`.
- `Appointment` sigue verificando que hubo una contratación real.
- `StoreService` permanece por compatibilidad, pero el nuevo flujo público no crea una segunda reserva paralela.
- El rol interno se llama `Proveedor`; la interfaz pública habla de `Negocio` y `Owner de negocio`.
- Sólo una cita `COMPLETED` permite reseñar.
- Un usuario mantiene una reseña activa por negocio y puede editarla después de nuevas visitas.
- El owner no puede reseñar su propio negocio ni borrar reseñas.
- La reputación usa 1 a 5 estrellas; el corazón queda reservado para favoritos y el pulgar arriba para reseñas útiles.
- La confianza no desactiva automáticamente al negocio: informa al usuario y habilita moderación. Un negocio sólo se oculta mediante una acción administrativa explícita.

## Historia completa

Proveedor aprobado -> crea negocio categorizado -> sus servicios se vinculan al negocio -> cliente descubre la ficha -> reserva -> proveedor completa la cita -> cliente publica una reseña verificada -> se recalculan promedio, conteo y nivel de confianza -> el owner aparece con badge en la comunidad y puede responder la reseña -> usuarios pueden marcarla útil o reportarla -> administración puede ocultarla.

## Modelo de datos aditivo

### Store

- `ratingAverage Float @default(0)`
- `reviewCount Int @default(0)`
- relación con `Service`, `StoreReview` y `ReviewReport`

### Service

- `storeId String?`
- relación opcional con `Store`

### StoreReview

- `storeId`, `authorId`, `appointmentId`
- `rating Int`
- `comment String?`
- `status String @default("PUBLISHED")`
- `businessReply String?`, `businessReplyAt DateTime?`
- unicidad `(storeId, authorId)` y `appointmentId`

### ReviewHelpful

- `reviewId`, `userId`
- unicidad `(reviewId, userId)`

### ReviewReport

- `reviewId`, `reporterId`, `reason`, `description`, `status`
- unicidad `(reviewId, reporterId)`

## APIs

- `GET /api/store-categories`: categorías activas.
- `GET /api/stores`: catálogo con categoría, servicios, reputación y nivel de confianza.
- `GET /api/stores/[slug]`: ficha pública y elegibilidad del usuario actual.
- `POST /api/provider/store`: creación del negocio del proveedor aprobado.
- `PATCH /api/provider/store/[id]`: edición del negocio propio.
- `POST /api/stores/[id]/reviews`: alta o actualización de reseña verificada.
- `PATCH /api/stores/[id]/reviews/[reviewId]`: editar reseña propia o responder como owner.
- `DELETE /api/stores/[id]/reviews/[reviewId]`: borrar la reseña propia y recalcular agregados.
- `POST /api/stores/[id]/reviews/[reviewId]/helpful`: alternar voto útil.
- `POST /api/stores/[id]/reviews/[reviewId]/report`: reportar reseña.
- `GET/PATCH /api/admin/store-reviews`: cola de moderación y publicación/ocultamiento.

## Reglas de reputación

- `Muy recomendado`: promedio >= 4.5 y al menos 5 reseñas publicadas.
- `Confiable`: promedio >= 4.0 y al menos 3 reseñas publicadas.
- `Opiniones mixtas`: al menos 3 reseñas y promedio entre 3.0 y 3.99.
- `Revisá las experiencias`: al menos 3 reseñas y promedio < 3.0.
- `Nuevo en MascoTin`: menos de 3 reseñas.
- El ranking usa un promedio bayesiano con prior 3.5 y peso mínimo 5 para evitar que una única reseña domine la categoría.

## UI

- `/shop`: categorías, búsqueda, ranking ponderado, tarjetas de negocio y confianza.
- `/shop/[slug]`: galería, datos del negocio, servicios, reserva, resumen de estrellas, reseñas y formulario elegible.
- `/provider`: creación/edición del negocio, reputación y respuestas.
- Badge de owner sobre el avatar del usuario en header, feed y comentarios.
- Badge accesible con texto alternativo `Owner de negocio`.

## Seguridad y moderación

- Autenticación en todas las mutaciones.
- Validación Zod y rate limit en reseñas/reportes.
- Verificación de ownership por `Store.providerId`.
- Verificación de cita completada por `Appointment.userId`, `Service.storeId` y estado.
- Agregados recalculados en la misma transacción de escritura.
- El owner sólo puede responder; administración controla `PUBLISHED`/`HIDDEN`.

## Pruebas y gates

- Unitarias: nivel de confianza, ranking y validaciones.
- API: elegibilidad, autorreseña, reseña única, respuesta del owner, moderación y agregados.
- Componentes: badge y estados de reputación.
- Build: `npx prisma generate`, tests, `npx next build`, `git diff --check`.
- Browser: alta de negocio, catálogo, ficha, reseña, badge, consola y responsive.
- Base de datos: `prisma db push` sin `--accept-data-loss`; detener si Prisma detecta pérdida.
- Producción: push directo a `main`, Vercel `READY`, alias HTTP 200, smoke de catálogo y logs sin errores.

## Criterio de finalización

La funcionalidad sólo se considera terminada cuando el flujo completo funciona localmente con persistencia real, el esquema aditivo está aplicado, `main` contiene el commit publicado, Vercel expone ese despliegue como producción y el catálogo público responde sin errores.
