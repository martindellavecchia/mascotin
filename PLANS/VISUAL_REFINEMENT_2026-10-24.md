# Huella: refinamiento visual de punta a punta

Base: `a6fe3fc` en `codex/huella-six-findings`. Se respetan las reglas de `AUDIT_IMPLEMENTATION_2026-09-30.md` y `HUELLA_SIX_FINDINGS_2026-09-30.md`: Dialog compartido, labels asociados, variant `brand` para botones violeta, zona horaria de Argentina y contraste medido. No cambia la identidad (aubergine/lima, Plus Jakarta Sans, logo), la lógica de negocio ni las dependencias.

## Método

- PostgreSQL embebido local (`127.0.0.1:55439`), base aislada `product_visual`, migraciones al día y datos sintéticos etiquetados con `SyntheticRun` (7 usuarios, 6 mascotas, feed, grupos, eventos, chat, adopciones, caso de rescate, cuatro comercios, turnos y reseñas). El `.env` del repo apunta a Neon productivo y no se usó.
- Build de producción local (`next build` + `next start -p 3200`). El dev server del panel no descarga Plus Jakarta Sans y renderiza la fuente fallback, así que no sirve como referencia visual.
- Playwright con sesión JWT local, 32 rutas × 390×844, 768×1024 y 1440×900 (96 capturas), zona `America/Argentina/Buenos_Aires`, movimiento reducido. Se registran overflow horizontal y errores de consola.
- Estado inicial: sin overflow horizontal en ninguna combinación; el único error de consola es el 400 esperado de `/verify-email` con token inválido.
- Capturas en `artifacts/visual-refinement-2026-10-24/{before,after}/` (local, no se commitea).

## Hallazgos priorizados

### P0: sistémicos o defectos visibles

| # | Hallazgo | Causa | Alcance |
| --- | --- | --- | --- |
| V01 | Bordes y divisores casi negros en tarjetas, listas, tablas y paneles («Tus próximos pasos», Mensajes, Admin, filtros de Adopciones) | Tailwind v4 usa `currentColor` como color de borde por defecto y el proyecto no tenía el reset de shadcn | ~30 contenedores con `border`/`divide-y` sin color |
| V02 | `border-border-control`, `ring-focus` y `bg-surface-soft` no generan CSS | Esas variables existían sólo en `:root`, no en `@theme` | Selects nativos con borde oscuro, anillos de foco y badge `neutral` sin fondo |
| V03 | «Reservar», «Solicitar reserva», «Iniciar sesión», «Publicar negocio», «Confirmar» de turnos, «Guardar cambios» y «Asistiré» con texto oscuro sobre violeta (ilegible) | Variant `default` (foreground oscuro) con `bg-teal-*` encima; mismo patrón que N03 | Tienda, reseñas, panel de proveedor, comunidad |
| V04 | Borde de inputs, textarea y select a 1,96:1 sobre blanco | `border-slate-300` | Todos los formularios (WCAG 1.4.11 pide 3:1) |
| V05 | El corazón de «Me gusta» se ve relleno negro aunque no haya like | `fill={undefined}` anula el `fill="none"` de lucide | Todas las publicaciones |
| V06 | Plurales rotos: «1 comentarios», «1 propuestas», «1 hogares contactados», «1 interesados», «1 reseñas», «1 mascotas», «1 Encuentros» | Contadores interpolados sin singular | Feed, Hogares, Tienda, Perfil, Admin, pendientes |
| V07 | «0 mascotasClínica del Parque» en la tabla de Admin | Dos `span` en línea sin separador | Admin |
| V08 | Skeleton en lima intermitente | `Skeleton` usaba `bg-accent` | Estados de carga |
| V09 | Superficies de modales inconsistentes: Dialog blanco con `slate`, AlertDialog en crema; botón de cierre con estilos shadcn residuales | Primitivos sin migrar a tokens | Todos los modales |

### P1: jerarquía y señales de AI-slop

| # | Hallazgo | Pantallas |
| --- | --- | --- |
| V10 | Inicio abre con dos paneles grandes (intención con cuatro opciones y pendientes) **antes** del título; luego otro bloque de tres tarjetas con «Ir ahora». Cuatro grupos de CTA compiten arriba del pliegue | Inicio |
| V11 | Texto de relleno que describe el diseño en vez de informar: «Un plan claro para hoy», «Tres caminos claros para empezar, sin ruido alrededor», «Menos ruido. Más información útil para decidir… sin pantallas llenas de tarjetas», «La comunidad reporta experiencias mayormente positivas» | Inicio, landing, tienda |
| V12 | Títulos de página con escalas distintas (`text-3xl/4xl` a mano en Inicio, Descubrir y Tu círculo vs `PageHeader` en el resto) | Inicio, Descubrir |
| V13 | Tarjeta de publicación sobrecargada: badge «Foto» redundante (y «Foto» en alertas sin imagen), banner rojo sólido en mayúsculas «¡MASCOTA ENCONTRADA!», cuadro rojo dentro de la tarjeta, bloque de evento lavanda con CTA lima a todo el ancho (tarjeta dentro de tarjeta), texto antes o después del bloque según el tipo, «0 Me gusta», ícono de huella decorativo | Inicio, Comunidad, Grupos |
| V14 | El feed ocupa ~1.090 px en escritorio: líneas de ~150 caracteres y fotos recortadas a una franja | Inicio, Comunidad, Grupo |
| V15 | Avatares de iniciales con tres estilos distintos y el composer muestra «T» de «Tu perfil» en vez de la inicial de la persona | Feed, mensajes, perfil |
| V16 | `outline` con borde aubergine de 1 px repetido en botones secundarios a todo el ancho: pantallas pesadas (Adopciones, Alertas, Hogares, Grupos) | Sistémico |
| V17 | Chips de filtro con tres estilos: lima sólido (Eventos), píldora lavanda (Comunidad, Mapa), aubergine sólido (Proveedor) | Eventos, Comunidad, Mapa, Proveedor |
| V18 | Descubrir: chips en tres estilos, contador «1/1» con una sola foto, corazón decorativo antes de la historia, círculo vacío como ícono de «Juguetona», dos íconos en «Preferencias de búsqueda» | Descubrir |
| V19 | Bandeja de mensajes sin avatar ni indicador de tipo, select nativo con borde oscuro | Mensajes |
| V20 | Tienda: cinco chips sobre el título, bloque de calificación centrado junto a texto alineado a la izquierda, «★ Nuevo» repetido con «0 reseñas», «Mis turnos» y «Guardar búsqueda» dentro del panel de filtros | Servicios, ficha de comercio |
| V21 | Pendientes («Tus próximos pasos») pegado al borde superior en Hogares y sin estado de error estilizado | Hogares, Inicio |
| V22 | Ficha de adopción: el nombre de la mascota es más chico que la descripción; «Volver» sin flecha ni aspecto de enlace | Adopción |
| V23 | Pasaporte público sin acción cuando no hay teléfono compartido; nota en `slate-400` (contraste insuficiente) | `/p/[token]` |
| V24 | «Salir del grupo» como único botón de la cabecera, a todo el ancho | Grupo |
| V25 | Landing: eyebrows en mayúsculas en cada bloque | Landing |

### P2: detalles

- Spinners ad hoc con tamaños y grosores distintos; algunos estados de carga en tarjeta con spinner de 40 px.
- Editor de disponibilidad del proveedor: filas de intervalo en grilla de dos columnas desalineada en móvil.
- Ficha de caso: caja «Necesidades del caso» vacía.
- Alertas: el título de la tarjeta es el nombre de quien publica.

## Implementación

### Sistémico (tokens y primitivos)

| Cambio | Resuelve |
| --- | --- |
| `globals.css`: reset `@layer base` de `border-color` a `--color-border`; `--color-border-control`, `--color-surface-soft`, `--color-focus`, `--color-card` y `--color-card-foreground` pasan a `@theme` | V01, V02 y `bg-card` sin CSS en `MatchesPanel` y `Alert` |
| `Input`, `Textarea`, `SelectTrigger` y los inputs propios de login/registro usan `border-border-control` (3,5:1) con hover `muted-foreground` | V04 |
| `Button outline`: borde neutro `border-control` con hover aubergine; el texto sigue en `primary` | V16 |
| `Dialog`, `AlertDialog`, `Sheet`, `Drawer`: superficie `surface`, texto `foreground`, borde `border`, overlay `foreground/45`; cierre sin estilos shadcn residuales; título `leading-snug` | V09 |
| `Skeleton`, `LoadingSpinner`, `LoadingCard`, `LoadingDots`: `muted`/`primary`, sin rebote, respetan movimiento reducido | V08 |
| `Badge success` con `text-green-700` (6:1 sobre su tinte) | Contraste detectado por axe en la verificación |
| `AvatarFallback`: `primary-soft`/`primary` por defecto. Regla: tu propio avatar en `primary` sólido, el de otras personas en suave | V15 |
| `PageHeader`: eyebrow en minúscula y `font-semibold` | V25 |
| Nuevo `FilterChip` (`aria-pressed`, 44 px, activo `primary-soft` + borde `primary`) en Comunidad, Eventos, Mapa y turnos del proveedor | V17 |
| `countLabel()` en `lib/utils.ts` para singular/plural en 16 contadores | V06 |
| Botones violeta con `variant="brand"`; filtros de turnos sin `bg-teal-*` sobre `default`; «Enviar reporte» y «Publicar alerta» con `destructive` | V03 |
| Codemod de equivalentes exactos (`text-slate-900`→`text-foreground`, `text-slate-500`→`text-muted-foreground`, `border-slate-200`→`border-border`, `bg-white`→`bg-surface`, `text-teal-600`→`text-primary`, etc.) y `text-slate-400`→`text-muted-foreground` por contraste: 718 reemplazos en 77 archivos; usos `teal-*`/`slate-*` de ~1.300 a ~450 | Colores fuera de tokens |
| `Card` con `CardContent` propio (`p-N`) recibe `gap-0 py-0`: 25 tarjetas tenían padding vertical duplicado o franja blanca sobre la imagen | Espaciado |

### Por pantalla

- **Tarjeta de publicación** (Inicio, Comunidad, Grupo): corazón vacío cuando no hay like; contadores sólo si son mayores que cero y con plural; sin badge «Foto»; tipo «Pregunta/Recomendación» como metadato; banner de alerta en tinte con texto en minúscula («Mascota perdida», «Marcar como encontrada»); datos de la alerta como lista, sin caja roja interna; evento como una fila con borde y CTA `outline` sin ancho completo; caso solidario sin caja interna; orden fijo texto → adjunto → imagen; imagen 16:10 en móvil y 2:1 desde `sm`.
- **Inicio**: `PageHeader` con selector de mascota primero; luego pendientes, intención y «Para hoy con Nina» en filas compactas sin «Ir ahora»; feed en una columna de 768 px; composer con la inicial de la persona.
- **Descubrir**: título con la escala de `PageHeader`; un solo estilo de rasgos (máx. 5, sin íconos decorativos); contador de fotos sólo con más de una; «Preferencias de búsqueda» como botón `outline` con un ícono; estados de carga, vacío y error alineados.
- **Mensajes**: filas con ícono por tipo, hora relativa, no leídos en negrita, selección resaltada; `Select` compartido.
- **Servicios**: acciones en la cabecera («Mis turnos», «Ver en el mapa»), filtros en grilla con nombre accesible, «Guardar búsqueda» junto al resultado, «Administrar un negocio» como enlace al pie; filas con miniatura de 64 px, categoría y dirección en texto, un único badge de confianza y «Sin reseñas todavía».
- **Ficha de comercio**: categoría en texto, un badge, etiquetas como lista; calificación alineada a la izquierda; respuesta del negocio sin mayúsculas ni caja; estrellas en `highlight`; respuesta del dueño con label y botón de tamaño normal.
- **Comunidad, Grupos y Eventos**: feed de 768 px; búsqueda sin doble borde; tarjeta de grupo sin franja superior y «Miembro» fuera de la foto; «Salir del grupo» como acción secundaria; eventos con calendario a la izquierda desde `lg`, fecha compacta y «Asistir» en `outline`.
- **Hogares y casos**: pendientes debajo del título; caja de necesidades sólo si hay datos; metadatos en una línea.
- **Adopciones**: enlace de regreso con flecha; acciones compactas; filtros con etiquetas espaciadas; imagen a sangre; la ficha tiene `h1` con el nombre.
- **Alertas**: sin placeholder grande en móvil; «Publicada por» como metadato en lugar de título.
- **Perfil y pasaporte**: acciones de la tarjeta de mascota en una fila («Ver pasaporte», «Editar», eliminar como ícono); sin badges sobre la foto ni zoom al pasar el mouse; pasaporte con el título fuera de la foto y badges unificados.
- **Pasaporte público**: aviso cuando no hay teléfono compartido, CTA `brand` para llamar, nota con contraste suficiente.
- **Landing**: sin la tarjeta translúcida sobre la foto; el bloque de valor describe hechos del producto (reseñas de turnos completados, ubicaciones de rescate privadas, datos del pasaporte elegidos por la persona).
- **Auth**: títulos sin la segunda palabra en otro color ni `font-extrabold`; labels sin sangría.
- **Notificaciones**: íconos en círculo `primary-soft`, `destructive` sólo para alertas urgentes.
- **Proveedor y Admin**: intervalos de agenda alineados en móvil; carga con `StateFeedback`; columna «Info» apilada.
- **Mis turnos**: estado como `Badge` por tono, comercio en texto secundario, fecha destacada; carga, error y vacío con los primitivos.
- **Accesibilidad complementaria**: 31 controles con label visual sin asociar o sólo con placeholder (servicio y solicitud de proveedor, datos del negocio, borrador de adopción del tránsito, radio del caso, filtros y rol en Admin, reporte y reseña de comercio, confirmación de borrado de cuenta) quedan con `htmlFor`/`id` o `aria-label`; títulos de tarjetas de grupo, eventos y panel vacío de Mensajes pasan a `h2` para respetar el orden de encabezados.
- **Textos**: títulos y labels en *sentence case* («Crear nuevo grupo», «Editar publicación», «Mis grupos»); «Token inválido o ya utilizado» pasa a «El enlace no es válido o ya se usó».

## Verificación

- `npm run lint`: sin errores. `npx tsc --noEmit`: sin errores.
- `npm test`: 93 suites, 508 pruebas aprobadas. Se actualizó una expectativa de copy en `HomeClientShell.test.tsx` («Para hoy con Max»).
- `npm run build` con `DATABASE_URL` local: correcto.
- Integración (`jest.product.config.cjs`, base `product_huella_six`): 27 de 28. Falla `reschedules atomically…`, que no se tocó: `future()` toma el primer turno de mañana posterior a `now + 24h` y entre ~17:00 y 20:00 ART el turno `+2h` cae fuera del horario 08–20 del fixture. Es dependiente de la hora de ejecución.
- Playwright sobre el build de producción: 96 capturas (32 rutas × 390, 768 y 1440), cero overflow horizontal, cero errores de JavaScript (sólo el 400 esperado de `/verify-email` con token inválido). axe con `label`, `select-name`, `aria-input-field-name`, `button-name`, `link-name`, `aria-dialog-name`, `color-contrast`, `heading-order` y `page-has-heading-one`: sin violaciones en las 96 combinaciones, tras corregir cuatro `heading-order`, un `button-name` y el contraste del `Badge success` (`text-success` sobre su tinte daba 4,35:1; pasa a `text-green-700`).
- Interacciones (390 y 1440): menú de publicación, diálogo de reporte con foco contenido y Escape, corazón sin relleno, `aria-pressed` en filtros, menú móvil, anillo de foco con teclado y diálogo de reserva con «Reservar» en blanco sobre violeta.
- `scripts/verify-huella-six.mjs` contra el build local: 12 de 12 (diálogos de mascota y perfil, formularios de ayuda, contraste en cuatro estados, eventos pasados, tres resoluciones). Los nombres «Crear grupo» y «Editar publicación» se actualizaron en ese script y en `verify-audit-remediation.mjs`. El script cuenta todos los eventos pasados de la base, así que se borró el evento pasado del seed propio antes de correrlo.
- Evidencia local: `artifacts/visual-refinement-2026-10-24/{before,after,interactions,regression-huella-six}` y `compare.html` con antes/después por pantalla y resolución. `after/` incluye las recapturas posteriores al último build.

## Fuera de alcance (seguimiento sugerido)

- La ficha de comercio muestra «Cita verificada» en reseñas sin turno asociado; es una regla de datos de reputación, no visual.
- El panel de proveedor muestra 0,0 / 0 reseñas mientras el comercio asignado tiene 4,8 con tres: son agregados distintos (`ProviderProfile` vs `Store`).
- Quedan ~450 usos de `teal-*`/`slate-*` sin equivalente exacto (`slate-600/700`, `teal-50/100/200`): migrarlos exige decidir tono por caso.
- `GroupsSidebar` y `UpcomingEventsWidget` no se usan en ninguna ruta.
- El test de reprogramación de turnos depende de la hora del día (ver Verificación).
- No se revisó con contenido real de producción ni en Safari o dispositivos físicos; las capturas usan Chromium con viewport y touch emulados.
