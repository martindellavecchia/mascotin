# Huella: segunda auditoría visual, seis hallazgos

Base verificada: `d527c204e82228a64bb7254a998f408e627c5ee4` en main y origin/main. No modificar los archivos ajenos sin seguimiento ni el worktree de la auditoría anterior.

Fuente: [huella-qa-informe.html](https://chatgpt.com/api/library/files/libfile_ce68bcde2a78819198e63b4228b76fde/download), `file_00000000ac9881f6a71f58417b9658e8`, versión 0, 4.585.921 bytes, 51 capturas. Library read permite consultar el informe completo y sus píxeles. Materialización oficial en este executor bloqueada: primer intento sin red; único reintento con acceso autorizado descarga pero falla en `os.setxattr`, no disponible en Python/Windows. No alterar el helper ni inventar URLs; conservar esta limitación del entregable fuente local.

## Plan autorizado

1. Confirmar causas y reproducir con datos locales aislados.
2. N01: convertir el editor de mascota en diálogo accesible; foco inicial, contención, Escape y retorno. Conservar guardas de cambios/cancelación y edición de perfil.
3. N02: asociar etiquetas de los cuatro combos de compatibilidad, cinco controles de rescate, vivienda/experiencia de hogar, comentario y búsqueda de servicios.
4. N03/N04: corregir foreground/estados del patrón de botón violeta; medir contraste. Dar espacio real a ambas fechas de voluntariado, sin rediseñar otras pantallas.
5. N05/N06: unificar estado visual finalizado conservando asistencia histórica; compartir elegibilidad de candidatos y actualizar recomendaciones al cambiar mascota/estado.
6. Tests de regresión, datos mutantes sólo en base local, QA real 1180x757/768x1024/390x844, teclado, contraste y bordes. Ejecutar lint, tests y build sobre commit final.
7. Verificar flujo/protecciones remotas, commit y push del alcance exacto; integrar/desplegar según repo y comprobar SHA, READY y smoke de producción.

Fuera de alcance: migrar o corregir por semejanza las horas de registros históricos; datos públicos de prueba, cambios de credenciales/privacidad/acceso, rediseño ajeno.

## Causas y resolución

| Hallazgo | Causa confirmada | Implementación |
| --- | --- | --- |
| N01 | Editor de mascota con overlay manual, sin primitives de diálogo | Dialog existente con nombre, descripción, aria-modal, foco contenido y retorno al disparador; confirmación dirty y bloqueo durante guardado/carga |
| N02 | Etiquetas visuales no asociadas a SelectTrigger; inputs con sólo placeholder | Identificadores/labels en compatibilidad, rescate y hogar; nombres accesibles en comentarios y búsqueda |
| N03 | Botones con fondo violeta y foreground heredado del variant default | Variant brand existente en crear/editar grupo, pasaporte, CSV y enviar chat; conserva fondos y estilos del producto |
| N04 | Cuatro columnas dentro de un diálogo de 512 px | Dos columnas desde sm, una en móvil; fechas completas |
| N05 | Condiciones distintas para asistencia existente a eventos pasados | Finalizado deshabilitado en grupos, eventos públicos y feed; conserva contador y registro histórico; handler evita solicitudes tras vencer |
| N06 | Inicio y API usaban distinta especie por defecto, cantidad/orden de candidatos y filtros de visibilidad | Consulta de elegibilidad compartida; recomendaciones por mascota sincronizadas con carga, vacío, error, pase y deshacer |

Durante QA de CSV, un correo largo reveló que el grid podía ensanchar todo el diálogo: min-w-0 limita el scroll a la tabla, sin alterar su contenido.

## Verificación reproducible

- `npm test -- --runInBand`: 93 suites, 508 pruebas aprobadas.
- `npm run test:product`: 3 suites, 28 pruebas aprobadas en PostgreSQL local aislado; incluye cinco pruebas nuevas de elegibilidad, preferencias, visibilidad, bloqueos, distancia, pase/deshacer y autorización.
- `npm run lint`, `npx tsc --noEmit` y `npm run build`: aprobados antes de publicación; volver a ejecutar checks sobre el commit final.
- `scripts/verify-huella-six.mjs`: Playwright sobre build de producción local, 1180×757, 768×1024 y 390×844, zonas Los Ángeles/UTC/Argentina. Verifica foco, Tab/Shift+Tab, Escape, descarte, fallo/reintento de guardado, labels, fechas, contraste en cuatro estados, asistencia pasada/futura, recomendaciones/lista vacía/history, overflow y errores del navegador. Requiere URL y base `product_` locales; elimina sus propios fixtures.
- Regresión anterior `scripts/verify-audit-remediation.mjs`, copia con salida separada: aprobada en 1440×900, 834×1112 y 390×844. Incluye perfil, preferencias, recuperación de errores, URLs inválidas, usuario sin mascotas y fechas evento/post create/edit.
- Evidencia local nueva en `artifacts/huella-audit-six/`; no incorporar artefactos ajenos ni credenciales al commit.
- El informe final de implementación y la evidencia de SHA/READY/smoke se generan después del despliegue en ese directorio.

Flujo confirmado: Vercel enlazado a GitHub, rama de producción main, despliegues Git activados. Main sin protección ni reglas obligatorias; publicación por fast-forward, sin force push. Volver a verificar remoto inmediatamente antes de publicar.
