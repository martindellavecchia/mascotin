# Flujos de producto implementados

Decisiones aprobadas: confirmación manual de reservas, una agenda por prestador sin simultaneidad entre servicios y un resumen diario de búsquedas. Huella conserva su identidad y Hogares de tránsito sigue siendo un módulo principal.

## Activación y migraciones

Aplicar `prisma migrate deploy` antes de desplegar el código que consulta los nuevos campos. Son migraciones aditivas: intención opcional, búsquedas y deduplicación, duración histórica de turnos, historial, secuencia de swipes, lectura de grupos y propuestas. La duración de los turnos anteriores se copia del servicio existente durante la migración. No se cancelan superposiciones anteriores.

Variables de servidor, desactivadas si no valen `true`:

- `PRODUCT_SAVED_SEARCHES_ENABLED`
- `PRODUCT_BOOKINGS_ENABLED`
- `PRODUCT_MEETUPS_ENABLED`

El endpoint público `/api/product-features` expone únicamente estos tres booleanos. Desactivar reservas impide nuevas solicitudes y reprogramaciones; los turnos existentes siguen pudiendo confirmarse, cancelarse y completarse según sus reglas. Desactivar búsquedas detiene el resumen. Las tablas se conservan para permitir volver a activar.

## Búsquedas

Máximo de diez por persona. Adopciones: texto, especie, tamaño y zona. Servicios: texto, categoría, calificación mínima y zona. La zona se escribe expresamente; no se pide geolocalización automática. Editar filtros establece un nuevo punto inicial para las novedades. Pausar conserva la búsqueda; eliminar solo borra esa preferencia.

`GET /api/cron/search-digests` requiere `Authorization: Bearer <CRON_SECRET>`. El cron diario de Vercel se programa a las 12:00 UTC (09:00 Argentina). En el plan Hobby actual puede iniciar entre las 09:00 y las 09:59; la interfaz promete un resumen a partir de las 09:00, sin un minuto exacto. Ver [límites oficiales de cron](https://vercel.com/docs/cron-jobs/usage-and-pricing). Cada persona tiene una marca única por día; cada resultado tiene una marca única por persona y tipo. Los reintentos no duplican notificaciones. Las alertas solidarias de adopción usan la misma deduplicación cuando esta función está activa. Las búsquedas excluyen bloqueos y separan ejecuciones sintéticas.

El trabajo conserva un cursor por búsqueda y procesa hasta 500 novedades de cada búsqueda en cada resumen. Si una ejecución se acerca al límite de tiempo devuelve `hasMore: true` y registra `search_digest_backlog`; volver a invocar el endpoint con el mismo secreto continúa con las personas restantes. Un usuario que falla no impide procesar a los demás. Antes de ampliar el volumen, dimensionar la frecuencia de reanudación y alertar por atrasos usando `oldestSearchCheckpoint` de métricas. El horario exacto del push depende del dispositivo y sus permisos.

## Reservas

`/provider` permite intervalos semanales y excepciones con cierre completo u horarios especiales. Una agenda vacía no publica horarios. Se ofrecen 30 días con inicios cada 15 minutos en la zona horaria del prestador. El backend vuelve a verificar todo al solicitar o reprogramar.

Una transacción bloquea la fila del prestador. `PENDING` y `CONFIRMED` ocupan tiempo; cada turno usa su duración guardada. Una reprogramación cambia el mismo turno, agrega historia y queda `PENDING`. Ante conflicto no se pierde la fecha original. `DELETE /api/appointments/:id` es compatible con cancelar, sin borrar el registro. Solo el prestador confirma; solo un confirmado puede completarse después de su finalización. Los clientes pueden cancelar o reprogramar antes del inicio.

`/appointments` reúne estado, reprogramación e historial paginado. Sus accesos están en Servicios, navegación de usuario y próximos pasos. El panel del prestador incluye historial y contadores de todos los estados, también los anteriores. Se muestra la zona horaria del prestador. Cada transición registra un evento de negocio deduplicado y respeta la preferencia de avisos de la contraparte. La eliminación administrativa de un prestador con turnos se rechaza para conservar el historial.

## Conversaciones y próximos pasos

La bandeja unificada incluye encuentros, grupos, ofertas de tránsito y voluntariado. Las conversaciones de ayuda abren el caso y el contacto autorizado existente. El resumen distingue contexto y mensajes sin leer; una membresía registra su última lectura de grupo. Los próximos pasos provienen de ofertas vigentes, confirmaciones de tránsito, interés recibido y turnos, con prioridad por urgencia y vencimiento y antigüedad como desempate.

## Descubrir y encuentros

La secuencia de acciones de cada mascota permite deshacer exclusivamente su último pase negativo. Un pase deshecho permanece en el historial y no vuelve a otorgar XP. Bloqueos y encuentros ya creados impiden deshacer; likes y chats se conservan.

Desde el chat de un encuentro activo pueden proponerse lugar público, fecha y duración. Solo la contraparte acepta o declina. Las ediciones requieren una aceptación nueva; se rechazan versiones desactualizadas. Un bloqueo vuelve a verificarse en cada operación. El tiempo por sí solo no completa un encuentro. Los aceptados se exportan a `.ics` en UTC con alarma de calendario a 30 minutos. Si el encuentro cambia después de descargarlo, debe actualizarse también en el calendario personal.

## Medición y pruebas

`/api/admin/product-metrics` requiere administrador. Cuenta eventos únicos, estados de turnos y adopciones, respuestas solidarias y estados de tránsito. Ventana de 30 días; `?synthetic=true` consulta pruebas por separado. No exporta textos, teléfonos ni ubicaciones. `empty_*_search` cuenta personas con búsquedas vacías por día, no impresiones. Las respuestas y resultados de ayuda se consultan desde sus registros de dominio. Los eventos nuevos no reconstruyen historial anterior: tomar la primera medición como línea base.

Validaciones: `npm test`, `npm run lint`, `npx tsc --noEmit --incremental false`, `npm run build`. Para integración real: `DATABASE_URL` debe apuntar a localhost y a una base cuyo nombre empiece por `product_`, luego ejecutar `npm run test:product`. La suite usa usuarios y recursos propios con prefijo único y los elimina al terminar; no se admite una URL remota.

`npm run test:product:upgrade` usa esa conexión local para crear una base UTF8 nueva, aplicar las migraciones anteriores, insertar dos reservas superpuestas y comprobar la actualización. Verifica que sus IDs, fechas y estados permanezcan iguales y que la duración se copie correctamente. Conserva la base generada para inspección. En Windows ejecutar la integración y `npm run build` de forma secuencial porque Prisma regenera una DLL que las pruebas mantienen abierta.

QA de interfaz: guardar/editar/pausar búsqueda; solicitar/confirmar/reprogramar/cancelar turno; abrir conversación de tránsito desde bandeja; deshacer pase; proponer/aceptar/editar encuentro. Revisar 390×844, 768×1024 y 1440×900, además de los anchos de cambio de navegación. La publicación requiere prueba de migración, QA, SHA remoto y despliegue Vercel `READY` con alias confirmado.
