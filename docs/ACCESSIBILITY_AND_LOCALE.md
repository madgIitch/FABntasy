# Accesibilidad, tema y configuración regional

La interfaz se verifica en 320, 375, 768, 1024 y 1440 CSS px. Las acciones principales tienen un área mínima de 44 × 44 px, el foco usa un indicador común de alto contraste y los diálogos modales contienen el foco mediante el elemento nativo `dialog`, admiten Escape y devuelven el foco al disparador.

Los estados de carga, vacío, error y sin conexión siempre incluyen texto. Carga y mensajes no urgentes usan `role="status"`; los fallos que requieren atención usan `role="alert"`. Los skeletons son decorativos y mantienen una altura mínima estable.

Solo se ofrece español hasta disponer de una traducción completa. El contrato efectivo es locale `es-ES` y zona horaria `Europe/Madrid`; precios, puntos, fechas y horas deben importar estas constantes desde `src/lib/preferences.ts` cuando se creen o revisen superficies.

El tema admite Sistema, Claro y Oscuro. Un script inline en el `<head>` valida y aplica `canastio-theme` antes del primer pintado. Sistema escucha `prefers-color-scheme`. Un valor inválido o un fallo de `localStorage` degrada a Sistema.
