# Remediación QA01–QA05 de Huella

Implementación autorizada por el usuario, incluida su publicación en producción.
Base verificada: `f258055cd04efbca1b64a46143ccd045f3e1ba64`, coincidente con el deployment productivo `dpl_23WXa4YWnQxgp68BoQqisXwbwhuF` al comenzar. La auditoría y el plan originales se conservan como evidencia de la ronda anterior.

## Decisiones e implementación

| Hallazgo | Resultado |
| --- | --- |
| QA01 | Pestaña y mascota se derivan de la URL. CTA, navegación principal e historial comparten navegación nativa integrada con Next. Los parámetros desconocidos tienen fallback. Descubrir carga al entrar y descarta respuestas tardías de otra mascota. |
| QA02 | La zona de eventos es `America/Argentina/Buenos_Aires`, indicada en formularios y vistas. La API exige un instante ISO con zona. Los editores conservan el instante original, incluso segundos y milisegundos, cuando no se cambia el minuto visible. Calendario y agrupación usan el día de Argentina. |
| QA03 | El editor de perfil usa el Dialog compartido con nombre, descripción, foco contenido y retorno al disparador. Escape, Cancelar y cierre conservan la confirmación de descarte. La lectura inmediata de los indicadores de cambios/guardado evita cierres con un estado anterior. |
| QA04 | Etiquetas persistentes e IDs únicos en publicaciones, eventos de grupos, alertas y contraseñas. El slider transmite su nombre al elemento interactivo. La prueba real de alertas detectó y corrigió un payload preexistente incompatible con la API: imágenes como array y mascota opcional omitida. |
| QA05 | «Preferencias de búsqueda» abre Mascotas y enfoca la sección correcta; explica la fuente geográfica y permite volver con la mascota activa. Al regresar, la búsqueda usa las preferencias guardadas. |

### Eventos vinculados

`Event.date` y `Event.location` son canónicos cuando `Post.eventId` existe. La lectura de feed, publicación individual y grupo deriva esos valores; las columnas duplicadas históricas no determinan lo mostrado. La creación de grupo genera Event y Post vinculados en una transacción. La edición desde la publicación actualiza el Event en la misma transacción y comprueba permisos de edición del evento.

Los eventos históricos sin vínculo siguen siendo publicaciones independientes. No se infieren relaciones por texto, título o fecha. Cambiar una publicación normal a evento crea un vínculo nuevo. Convertirla de evento a texto o eliminar la publicación conserva el Event independiente. Eliminar el Event transforma sus publicaciones vinculadas en texto y retira sus acciones de evento, atómicamente.

No hay migración de esquema, backfill, desplazamiento de fechas históricas ni cambio de elegibilidad del matching. El radio sigue usando coordenadas de mascota con fallback al propietario; sin coordenadas no aplica el límite.

## Verificación reproducible

Toda escritura de QA utiliza PostgreSQL 17 aislado en loopback, base con prefijo `product_` y usuarios ficticios eliminados al finalizar. El runner de navegador rechaza destinos remotos. No se ejecuta el canary productivo.

- `npm run lint` y `npm run build`: correctos; 96 páginas generadas.
- Unitarias/componentes: 92 suites, 501 pruebas. En el worktree oculto de Windows se usa `node node_modules/jest/bin/jest.js --config ./jest.config.js --runInBand --silent --testPathIgnorePatterns integration` para evitar la interpretación del path absoluto en los patrones de Jest.
- Producto: `node --env-file=.env node_modules/jest/bin/jest.js --config ./jest.product.config.cjs --runInBand --silent`: 2 suites, 23 pruebas. Incluye PostgreSQL real, permisos, fechas inválidas, vínculo/canonicalidad y rollback de creación/edición mediante errores SQL forzados. Ejecutado con `TZ=UTC`, `TZ=America/Argentina/Buenos_Aires` y `TZ=America/Los_Angeles`, junto con la suite temporal.
- Navegador: `node --env-file=.env scripts/verify-audit-remediation.mjs`, sobre `next start -p 3100` y servidor en UTC. Matriz: 1440×900 / Los Ángeles, 834×1112 / UTC, 390×844 / Argentina. Incluye CTA real, historial, contexto, vacío/error/reintento, preferencias guardadas, perfil con descarte/error/éxito, alertas perdida/encontrada, creación y edición de eventos/publicaciones, calendario con cambio de día, IDs, nombres accesibles, overflow y errores de JavaScript.
- Fixture temporal: `2026-12-06T21:11:29.123Z` permanece exacta tras editar sólo título; `2026-12-07T01:30:00.000Z` aparece el 6 de diciembre a las 22:30 y se filtra por ese día.

Las capturas y logs se conservan localmente en `artifacts/audit-remediation/`; `results.json` registra los resultados de la última matriz y la limpieza de fixtures. No forman parte del commit.

Resultado final: las tres variantes de navegador pasaron y la limpieza dejó cero usuarios de prueba. El recorrido móvil requirió apilar las acciones del composer y limitar el contenedor compartido de Comunidad al ancho disponible.

## Límites y publicación

La causa específica de la discrepancia histórica «fiesta» en «Amantes de los Schnauzers» continúa sin atribución: no se obtuvieron los IDs, vínculo y zona originales. La reproducción aislada valida la corrección del contrato; no acredita reparación de aquellos registros.

La verificación de accesibilidad usa teclado real de Chromium, asociaciones y reglas de axe; no equivale a una sesión con lector de pantalla ni a cobertura de otros navegadores o dispositivos físicos. Las pruebas autenticadas y mutantes corresponden al entorno aislado.

La publicación utiliza la integración Git de Vercel. El cierre requiere comprobar convergencia de SHA local/remoto/deployment, estado READY, alias productivo, rutas públicas y logs de runtime. Esa confirmación se entrega por separado después del despliegue.
