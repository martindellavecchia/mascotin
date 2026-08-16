# Design QA - Plaza social

## Veredicto

La implementación respeta la dirección visual seleccionada: una experiencia social para mascotas, cálida y profesional, con navegación lateral, tarjeta de descubrimiento dominante y contexto comunitario. La información visible proviene de la aplicación real; por eso la mascota, el dueño y la ubicación pueden diferir del concepto estático.

## Fuente de verdad y evidencia

- Referencia: `C:\Users\Usuario\.codex\generated_images\019ffccb-5524-7282-b709-fa200c0f2582\exec-49bcbc5d-0180-4d1c-bdf0-08b7b2573725.png`
- Captura final de escritorio: `C:\Users\Usuario\.codex\visualizations\2026\08\13\019ffccb-5524-7282-b709-fa200c0f2582\mascotin-plaza-social-reference-viewport.png`
- Captura final de página completa: `C:\Users\Usuario\.codex\visualizations\2026\08\13\019ffccb-5524-7282-b709-fa200c0f2582\mascotin-plaza-social-final-full.png`
- Captura móvil: `C:\Users\Usuario\.codex\visualizations\2026\08\13\019ffccb-5524-7282-b709-fa200c0f2582\mascotin-plaza-social-mobile.png`
- Comparación lado a lado inicial: `C:\Users\Usuario\AppData\Local\Temp\mascotin-qa-comparison-pass1.png`

## Normalización

- Referencia: 1487 x 1058 px.
- Implementación comparada: viewport CSS de 1487 x 1058, densidad 1; captura de 1487 x 1058 px.
- Estado comparado: usuario autenticado, pestaña `Descubrir`, primera mascota disponible.
- Móvil verificado: viewport de 390 x 844; captura útil de 384 x 831; sin desbordamiento horizontal.
- La comparación final se realizó con la referencia y la implementación juntas y también en tamaño original. La vista completa conserva legibles navegación, perfil, rasgos, acciones y barra comunitaria; no fue necesario un recorte adicional para juzgar esas regiones.

## Historial de hallazgos

| Prioridad | Hallazgo | Corrección | Evidencia posterior |
| --- | --- | --- | --- |
| P1 | Algunas imágenes reales con hosts no configurados podían romper `next/image`. | Se añadió selección segura de fuentes y fallback fotográfico generado. | La tarjeta y los avatares renderizan; build aprobado y consola del navegador vacía. |
| P2 | El retrato de respaldo del círculo aparecía como icono genérico. | Se incorporaron retratos circulares coherentes con la dirección visual. | `Tu círculo` muestra imágenes reales o fallbacks fotográficos. |
| P2 | La navegación lateral podía cambiar la URL sin sincronizar la pestaña activa. | Se sincronizaron URL, estado de pestaña y evento local. | `Inicio` abre `?tab=home` y `Descubrir` vuelve a `?tab=explore` sin recargar. |
| P2 | Faltaba confirmar composición móvil, menú y overflow. | Se verificó a 390 x 844 y se recorrió el menú móvil. | Menú abre/cierra, pestañas funcionan y `scrollWidth` no supera el viewport útil. |

## Evaluación final

- Jerarquía, espaciado, tipografía, radios, bordes y paleta coinciden con la intención visual de la referencia.
- La tarjeta principal concentra la experiencia y conserva las acciones reales `Ahora no` y `Quiero conocerla`.
- La navegación, las pestañas, el menú móvil y el cambio entre `Inicio` y `Descubrir` funcionan.
- Las diferencias de foto, nombre, dueño y ubicación son contenido dinámico real, no desviaciones del sistema visual.
- El selector de mascota, configuración y cierre de sesión de la referencia se consolidan en el menú de usuario existente para preservar el comportamiento autenticado del producto.
- `npx next build` finaliza correctamente; las 31 pruebas enfocadas pasan; `git diff --check` pasa; la consola del navegador no registra errores.

final result: passed

---

# Design QA - Hogares de tránsito, opción B

## Fuente de verdad y evidencia

- Referencia seleccionada: `C:\Users\Usuario\.codex\generated_images\01a007c2-3d48-7522-a283-a513312af53e\exec-2e3fe6c4-3192-4523-b651-7e1fa9521059.png`.
- Implementación de escritorio: `C:\Users\Usuario\.codex\visualizations\2026\08\16\option-b-implementation\desktop-1000x1170.png`.
- Implementación móvil: `C:\Users\Usuario\.codex\visualizations\2026\08\16\option-b-implementation\mobile-390x844.png`.
- Implementación tablet: `C:\Users\Usuario\.codex\visualizations\2026\08\16\option-b-implementation\tablet-768x1024.png`.
- Implementación amplia: `C:\Users\Usuario\.codex\visualizations\2026\08\16\option-b-implementation\desktop-1440x900-clean.png`.
- Comparación focal de la referencia: `C:\Users\Usuario\.codex\visualizations\2026\08\16\option-b-implementation\focus-source-actions.png`.
- Comparación focal de la implementación: `C:\Users\Usuario\.codex\visualizations\2026\08\16\option-b-implementation\focus-implementation-actions.png`.

## Normalización y estado

- La referencia mide 1159 x 1357 px. Se comparó proporcionalmente contra el viewport CSS de 1000 x 1170; ambos tienen la misma relación de aspecto y densidad efectiva 1.
- La captura principal de implementación mide 1000 x 1170 px, con usuario autenticado, pestaña `Mis casos` y estado vacío.
- La vista móvil se verificó a 390 x 844 CSS px; la captura de página completa mide 384 x 1565 px por el ancho reservado para la barra de desplazamiento. `scrollWidth` y `clientWidth` fueron 390 px.
- La vista tablet se verificó a 768 x 1024 CSS px, con dos columnas de 368 px y sin desbordamiento.
- La vista amplia se inspeccionó a 1280 x 720 y también se midió a 1440 x 900; a 1440 las columnas son de 560 px y no hay desbordamiento horizontal.
- La comparación completa abrió la referencia y la captura de implementación en la misma entrada. La comparación focal recortó únicamente la región de las cuatro acciones para revisar tipografía, iconos, separadores y CTA.

## Hallazgos

- No quedan hallazgos P0, P1 ni P2.
- Diferencia intencional: se eliminó `Módulo principal de MascoTin` por pedido explícito del usuario. Hogares de tránsito conserva identidad propia sin declararse superior a los demás módulos.
- Diferencia aceptable: la implementación usa los Material Symbols existentes (`search` y `publish`) en lugar de los iconos ilustrativos combinados de la imagen generada. La intención queda respaldada por el verbo, la descripción y el CTA.
- Diferencia esperada: el avatar corresponde a la sesión local real y no al retrato estático de la referencia.

## Superficies de fidelidad

- Tipografía: Plus Jakarta Sans, pesos, jerarquía y legibilidad consistentes con el sistema vigente. Los textos se adaptan sin truncarse en mobile.
- Espaciado y layout: dos grupos paralelos desde tablet, apilados con divisor en mobile; radios, padding, ritmos y separador central coinciden con la dirección elegida.
- Colores: teal para ayuda temporal, naranja para adopción definitiva y neutrales slate provenientes de los tokens existentes.
- Activos e iconos: logo, avatar e iconos provienen de los activos y la librería real del producto; no hay SVG o dibujos CSS sustitutos.
- Copy: `Ayuda temporal`, `Adopción definitiva`, las dos intenciones y sus CTA coinciden con la opción B. El tag rechazado no aparece.

## Interacciones y accesibilidad

- `Buscar una mascota` navega a `/adoptions` y mantiene cerrado el formulario de publicación.
- `Publicar una mascota` navega a `/adoptions?create=listing` y abre directamente el formulario.
- Las cuatro acciones conservan nombres accesibles, foco visible y superficies completas de interacción.
- Se verificaron 390, 768, 1000 y 1440 px sin overflow horizontal.
- La consola del navegador quedó sin errores.

## Historial de comparación

- Pase 1: la comparación completa y focal no encontró diferencias P0/P1/P2. No fue necesaria una iteración correctiva posterior.
- La eliminación del tag fue incorporada antes de esta comparación como una modificación explícita de la referencia seleccionada.

## Verificación técnica

- `npm run lint`: aprobado.
- `npm test -- --runInBand`: 37 suites y 256 pruebas aprobadas.
- `npm run build`: aprobado.

final result: passed
