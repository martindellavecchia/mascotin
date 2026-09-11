# Implementación de mejoras de producto

Plan aprobado el 11 de septiembre de 2026. Rama: `codex/product-ux-improvements`. Base: `05ce48727131ab8ad0978508afa35e8e050e602d`.

Las seis fases están implementadas y publicadas en producción mediante push a `main`, según la indicación del usuario. El despliegue se verificó por SHA, estado `READY`, alias y recorridos autenticados con cuentas sintéticas aisladas.

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
- [x] Regresión posterior a la QA: cuatro pruebas de configuración, sesión eliminada, creación de defaults y persistencia de intención.
- [x] Integración con PostgreSQL aislado: 11 pruebas, incluyendo concurrencia, permisos, reprogramación, paginación, conservación de historial, deduplicación y separación sintética.
- [x] TypeScript y ESLint.
- [x] Build de producción: 97 páginas generadas.
- [x] Instalación de las siete migraciones en una base UTF8 local nueva.
- [x] Actualización del esquema anterior: dos reservas superpuestas conservan ID, fecha y estado; duración histórica de 90 minutos correctamente copiada. Reproducible con `npm run test:product:upgrade`.
- [x] `git diff --check`.
- [x] QA visual e interacción autenticada de los recorridos principales, con muestras en 390×844, 768×1024 y 1440×900. El alcance concreto se detalla debajo.
- [x] Release directo a `main` indicado por el usuario, con SHA, Vercel `READY` y alias verificados.
- [x] Migraciones aplicadas en la base de producción de Vercel y tres funciones activadas para el siguiente despliegue.
- [x] Recorrido real posterior al despliegue con recursos sintéticos.

Las pruebas de integración y actualización utilizaron PostgreSQL local en `127.0.0.1:55439`. Docker no fue restablecido: se utilizó un PostgreSQL portátil aislado. Para publicar se comprobó que la conexión coincide exactamente con `DATABASE_URL` de Vercel y se aplicaron las dos migraciones nuevas. La base publicada tiene las siete migraciones completas. No había turnos existentes; se verificó que ese historial permanece sin cambios. No se borraron datos de producción.

## Publicación y evidencia

El arranque local fue rechazado por el entorno de ejecución, aun con autorización del usuario. Posteriormente el usuario indicó expresamente usar el push a `main` y el build automático de Vercel. La publicación sigue esa instrucción y la QA local deja de ser un requisito previo para esta entrega.

La implementación principal quedó en `3f85a2d`. El primer release se comprobó con SHA `bae534f7265b11a45efbdcff6a0c19b9149af468`, despliegue `dpl_G2QPgpKnwE1t7XdAobV2E1oPvD9t`, estado `READY` y alias https://mascotin-pi.vercel.app. `/api/product-features` respondió con búsquedas, turnos y encuentros activos.

Recorridos ejercitados en producción:

- Búsquedas: guardar desde Servicios, editar zona, conservar filtros al abrir y pausar. Verificación móvil y tablet.
- Turnos: solicitud y confirmación mediante las APIs autenticadas del cliente y prestador sintéticos; reprogramación y cancelación desde la interfaz, conservando los cuatro cambios en el historial. Verificación móvil y escritorio. No se publicó un comercio de prueba en el directorio público.
- Encuentros: crear desde el chat, aceptar como contraparte por API, obtener calendario con recordatorio de 30 minutos y editar desde la interfaz; el cambio de lugar y hora vuelve a exigir aceptación. Verificación móvil y tablet.
- Descubrir: pasar una mascota y deshacer desde la interfaz; la mascota reaparece y la acción queda marcada como deshecha.
- Ayuda sin mascota: seleccionar la intención, acceder a Hogares y abrir el contacto correcto desde la bandeja unificada. Diálogo privado revisado en móvil.

La QA detectó horarios ambiguos de 12 horas y un error 500 al leer configuración con una sesión de una cuenta eliminada. El ajuste usa 24 horas, conserva la zona del prestador en el historial y devuelve 401 para la sesión inválida. Se verificó con TypeScript, ESLint y cuatro pruebas de regresión. Los recursos de prueba pertenecen a una única ejecución sintética con borrado en cascada al finalizar la validación.

Esta evidencia cubre esos recorridos y tamaños; no constituye una auditoría completa de todas las pantallas. El resumen diario y el push tienen validación automatizada de deduplicación, pero no se atribuye a esta sesión una entrega real de notificaciones programadas a dispositivos.

El resumen diario se programa a partir de las 09:00 de Argentina; Vercel Hobby permite variación dentro de esa hora. Un atraso que devuelva `hasMore` se reanuda invocando nuevamente el endpoint autorizado. La ampliación de volumen requiere dimensionar esa reanudación y observar el cursor más antiguo.
