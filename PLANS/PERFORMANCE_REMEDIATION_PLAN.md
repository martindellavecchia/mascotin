# Plan de remediación de performance — MascoTin

## Estado y fuente de verdad

- Estado: aprobado para implementación.
- Objetivo: resolver los findings verificados sobre la versión productiva en Vercel.
- Este documento es la fuente de verdad de alcance, orden, decisiones y criterios de aceptación.
- La implementación debe partir de `origin/main`, preservar cambios ajenos y excluir `artifacts/`, `projects/` y `worker.lock` de cualquier commit.

## Resumen

La prioridad es eliminar la fuente dominante del problema móvil: Material Symbols descarga unos 525 KB y bloquea el render. La prueba controlada mostró una mejora de Lighthouse de 66 a 94 y de LCP de 5,80 s a 2,76 s al bloquear esa fuente.

El trabajo se entregará en cuatro cambios independientes y medibles, partiendo de la versión productiva más reciente de `origin/main`.

Objetivos de aceptación para `/`, `/login` y `/shop`, medidos como mediana de tres ejecuciones móviles:

- Lighthouse Performance >= 90.
- FCP <= 2,2 s.
- LCP <= 2,8 s en laboratorio; objetivo de campo p75 < 2,5 s.
- CLS < 0,1 y TBT < 200 ms.
- Transferencia inicial <= 450 KB.
- Cero solicitudes a Google Fonts, 404, 401 inesperados o errores de consola.

## 1. Lucide, fuentes y recursos estáticos

- Reemplazar las 308 apariciones de `material-symbols-rounded` presentes en 82 archivos por `lucide-react`.
- Usar imports nombrados y directos por componente. No usar imports globales, comodines, `lucide-react/dynamic` ni un registro central con los 100 iconos, para no inflar el bundle.
- Para iconos dinámicos:
  - Tipar campos como `LucideIcon`.
  - Guardar referencias de componentes en arrays y mapas, no nombres en strings.
  - Mantener mapas locales por funcionalidad; crear únicamente un pequeño componente compartido para tipos de mascota.
- Fijar las equivalencias principales:
  - `pets` -> `PawPrint`.
  - `favorite` / `heart_broken` -> `Heart` / `HeartCrack`.
  - `storefront` -> `Store`; altas -> `Store` + `Plus`.
  - `groups`, `person`, `person_add` -> `Users`, `UserRound`, `UserPlus`.
  - `location_on`, `my_location` -> `MapPin`, `LocateFixed`.
  - `warning`, `error`, `emergency` -> `TriangleAlert`, `CircleAlert`.
  - `volunteer_activism`, `home_health` -> `HandHeart`, `HouseHeart`.
  - Salud -> `Stethoscope`, `Hospital`, `Syringe`.
  - Calendarios -> `CalendarDays`.
  - Verificaciones -> `BadgeCheck` o `ShieldCheck` según semántica.
  - Cargas -> `LoaderCircle` con `animate-spin`.
  - Visibilidad -> `Eye` / `EyeOff`; envío -> `Send`.
  - Género -> `Mars` / `Venus`.
  - Fotos y cargas -> `Image`, `Camera`, `ImagePlus`, `Upload`.
- Para tokens no enumerados, elegir el icono Lucide de semántica equivalente sin cambiar comportamiento, copy o jerarquía visual.
- Convertir tamaños basados en texto a cajas explícitas `size-*`. Mantener `fill="currentColor"` solamente en favoritos, estrellas o estados actualmente rellenos.
- Marcar iconos decorativos con `aria-hidden="true"` y conservar `aria-label` en todos los botones que solo contienen un icono.
- Una vez que no queden referencias:
  - Eliminar stylesheet, preconnects y script `document.fonts.load` de Material Symbols.
  - Eliminar sus reglas y estados de ocultamiento de `globals.css`.
  - Conservar Plus Jakarta Sans y la paleta vigente.
- Generar un `favicon.ico` 16/32/48 a partir del icono existente para que `/favicon.ico` deje de responder 404.
- Corregir `sizes` en la imagen comunitaria de la portada a `"(min-width: 768px) 50vw, calc(100vw - 48px)"`.

Gate de esta etapa: búsquedas sin resultados para `material-symbols-rounded`, `Material Symbols`, `fonts.googleapis.com`, `fonts.gstatic.com` y `document.fonts.load`.

## 2. Separación pública/privada y sesión

La raíz quedará siempre pública y estática. La experiencia autenticada se moverá a `/inicio`.

| Rutas | Usuario anónimo | Usuario autenticado | Renderizado |
|---|---|---|---|
| `/` | Landing pública | Misma landing, con acceso a `/inicio` | Estático |
| `/shop`, `/shop/[slug]` | Permitido | Permitido | SSR cacheado/ISR |
| `/login`, `/register`, recuperación | Permitido | Redirect a `/inicio` | Público |
| `/p/*` | Permitido | Permitido | Público |
| `/inicio` y resto de `(main)` | Redirect a login | Permitido | Dinámico |
| `/adoptions`, `/community`, `/hogares-de-transito` | Redirect a login | Permitido | Dinámico |

Cambios:

- Mover el home autenticado actual a `/inicio` y dejar `GuestHome` como página raíz.
- Mover `/shop` y `/shop/[slug]` fuera del layout privado.
- Reemplazar `withAuth` por middleware explícito con `getToken`, compatible con Edge:
  - Las rutas privadas redirigen a `/login?callbackUrl=<ruta+y+query>`.
  - Las rutas de autenticación redirigen a `/inicio` cuando ya existe sesión.
  - El redirect ocurre antes de renderizar o solicitar APIs protegidas.
- Sanitizar `callbackUrl` en login: aceptar únicamente rutas relativas que comiencen con `/` y rechazar `//`, protocolos y dominios externos. Default: `/inicio`.
- Actualizar enlaces, redirects posteriores a login/registro/creación y tabs desde `/` y `/?tab=explore` hacia `/inicio` y `/inicio?tab=explore`.
- Dividir providers:
  - El provider raíz conserva tema, toaster, Analytics y Speed Insights.
  - `SessionProvider` vive solamente en el layout privado.
  - Sembrarlo con la sesión obtenida en servidor y desactivar refetch periódico y por foco.
- Envolver la obtención de sesión en `cache()` de React para que el layout privado y `/inicio` compartan el mismo resultado dentro del request.
- El header público será no personalizado y tendrá un CTA neutral hacia `/inicio`; middleware resolverá si corresponde mostrar login.

Gate de esta etapa: ninguna página pública debe solicitar `/api/auth/session` ni disparar APIs protegidas.

## 3. Directorio de negocios y acceso a datos

### Listado `/shop`

- Convertir la página en Server Component.
- Cargar categorías y listado inicial en paralelo con `Promise.all`.
- Pasar `initialCategories` e `initialStores` a una isla cliente encargada de filtros y tarjetas.
- No repetir el fetch inicial al hidratar.
- Aplicar debounce de 250 ms exclusivamente al texto de búsqueda.
- Ejecutar inmediatamente cambios de categoría, rating u orden, cancelando requests anteriores con `AbortController`.
- Sustituir el CTA condicionado por rol por uno público: “Publicá o administrá tu negocio”, enlazado a `/provider`.

### Detalle `/shop/[slug]`

- Renderizar en servidor y cachear los datos públicos del negocio y sus reseñas.
- Separar la personalización en `GET /api/stores/[slug]/viewer`, manteniendo el envelope actual `{ success, data }`.
- Definir `StoreViewerState` con:
  - `isAuthenticated`.
  - `reviewEligibility`: `unauthenticated`, `eligible`, `already-reviewed` o `no-completed-appointment`.
  - `ownReviewId`.
  - `helpfulReviewIds`.
- Para visitantes, el endpoint responderá 200 con estado anónimo, nunca 401.
- Cargar `/api/pet/mine` únicamente cuando un usuario autenticado abra la reserva.
- Acciones protegidas de visitantes enviarán a login conservando el `callbackUrl`.

### Consultas y caché

- Extraer funciones puras de servidor para categorías activas, listado público y detalle por slug.
- Eliminar `ensureDefaultStoreCategories` del GET público: las categorías se crean mediante el seed existente, nunca durante una lectura.
- Política:
  - Categorías: `revalidate: 3600`, tag `store-categories`, CDN 3600 s + stale-while-revalidate 86400 s.
  - Listado inicial: `revalidate: 300`, tag `store-directory`, CDN 300 s + stale-while-revalidate 600 s.
  - Detalle: `revalidate: 300`, tags `store-directory` y `store:<slug>`.
  - Búsquedas y combinaciones de filtros de alta cardinalidad: `no-store`.
  - Estado del visitante: siempre `private, no-store`.
- Centralizar invalidación de tags después de cambios en categorías, negocios, servicios, promociones y reseñas/moderaciones que alteren datos públicos o agregados.
- No invalidar por helpful/report salvo que el resultado público mostrado cambie.
- Añadir logs estructurados sin PII: ruta, `duration_ms`, cantidad de resultados, modo de caché y presencia de filtros sanitizados.

No se requiere migración de base de datos.

## 4. Región, medición y despliegue

- Verificar el hostname de `DATABASE_URL` productivo sin imprimir credenciales.
- Si termina en `.sa-east-1.aws.neon.tech`, configurar en `vercel.json` la región de Functions Node.js como `gru1`.
- Mantener Prisma y los Server Components con runtime Node.js; el middleware continúa ejecutándose en Edge.
- Si el host productivo no corresponde a `sa-east-1`, no incluir el cambio regional en esta entrega y documentar la diferencia.
- Comparar preview en `gru1` contra producción mediante los logs `duration_ms` de al menos 20 requests DB-backed equivalentes.
- Promover la región únicamente si el p50 mejora al menos 20%, el p95 no empeora más de 10% y no aparecen errores de conexión. De lo contrario, revertir solo esa configuración.

La entrega se divide en cuatro commits o unidades revisables y desplegables:

1. Lucide, eliminación de fuente, favicon e imagen.
2. `/` público, `/inicio`, middleware y providers.
3. SSR/caché del directorio y separación del viewer.
4. Región `gru1`, condicionada a la verificación anterior.

Cada etapa pasa por verificación local, preview, medición y smoke antes de avanzar a producción.

## Pruebas y aceptación

- Añadir `@lhci/cli` y `npm run perf:audit`, configurable con `PERF_BASE_URL`, para ejecutar tres pasadas móviles sobre `/`, `/login` y `/shop` con los presupuestos definidos.
- Ejecutar:
  - `npm run lint`.
  - `npx tsc --noEmit --incremental false`.
  - `npm test`.
  - `npm run build`.
- Probar middleware y redirects:
  - Acceso anónimo y autenticado a cada grupo de rutas.
  - Preservación de path y query en `callbackUrl`.
  - Rechazo de redirects abiertos.
  - Redirect de usuarios autenticados desde páginas de login.
- Probar directorio:
  - Contenido inicial presente en HTML.
  - Sin fetch inicial duplicado ni espera artificial.
  - Cancelación de búsquedas obsoletas.
  - Estados vacío, error y carga.
  - GET de categorías sin escrituras.
  - Headers de caché y transición `MISS` -> `HIT`.
  - Invalidación después de cada mutación pública.
- Realizar QA visual de todos los iconos y estados en 390x844, 768x1024 y 1440x900, comprobando alineación, rellenos, botones, accesibilidad y overflow.
- En producción:
  - Verificar deployment `READY/PROMOTED` y SHA desplegado.
  - Repetir Lighthouse.
  - Confirmar cero solicitudes a Google Fonts y cero 401/404 en páginas públicas.
  - Revisar logs 5xx/error/fatal durante la primera hora.
  - Revisar Speed Insights cuando exista muestra suficiente, idealmente después de siete días: LCP p75 < 2,5 s, INP < 200 ms y CLS < 0,1.

## Supuestos fijados

- La migración a Lucide abarca toda la aplicación; no se conserva Material Symbols como fallback.
- `/` no cambia según la sesión y permanece cacheable.
- `/shop` y sus detalles son públicos; adopciones, comunidad, hogares de tránsito y el resto del producto permanecen privados.
- Analytics y Speed Insights incorporados en producción se conservan.
- La implementación parte de `origin/main`, preservando todos los archivos locales no versionados.

## Handoff para adversarial review

Al terminar, entregar un reporte verificable con:

- Resumen por etapa y decisiones tomadas.
- Lista de archivos modificados y commits.
- Resultado completo de lint, TypeScript, tests y build.
- Evidencia de QA visual y Lighthouse antes/después.
- Estado del preview y, solo si fue autorizado, de producción.
- Riesgos, deuda o criterios que no se hayan podido cumplir.
- `git status`, diff acotado y lista explícita de archivos excluidos.

No presentar la implementación como final hasta que un segundo agente realice el adversarial review de código, rutas, caché, seguridad de redirects, accesibilidad visual y evidencia de performance.
