# Sprint 14E — Reskin global bosque y lima

Estado: propuesta pendiente de aprobación (`spec_approved: false`).

## Objetivo y relación con 14D

Aplicar a toda la interfaz existente de Canastio un cambio exclusivamente cromático inspirado en la antigua landing: verde bosque muy oscuro, superficies verdes escalonadas, blanco roto, lima ácido y luz ambiental verde.

14E no es un nuevo rediseño. Conserva como contrato la arquitectura visual, composición, jerarquía, densidad, tipografía, tamaños, responsive, componentes y comportamiento aprobados en [Sprint 14D](SPRINT_14D_SPEC.md). Solo reemplaza la dirección cromática clara de 14D y los efectos dependientes del color. Ante cualquier conflicto, 14E prevalece únicamente en color, fondos, degradados, sombras, bordes y estados cromáticos; 14D sigue prevaleciendo en todo lo demás.

## Alcance

- `apps/web/**`
- `tests/**`
- `docs/**`
- `spec.json`

Incluye landing, autenticación, registro, recuperación de contraseña, onboarding de liga, shell, navegación, Inicio, Mercado y sus diálogos, Mi equipo y sus cuatro vistas, Jornada, Liga y sus tabs, perfil, formularios, fichas deportivas, loading, empty, error, offline y assets de marca/PWA cuyo color dependa del tema.

No incluye cambios de layout, contenido, microcopy, iconografía, funcionalidad, datos, permisos, APIs, schema, migraciones, ingesta o reglas fantasy. Tampoco incluye un selector Claro/Oscuro/Sistema ni persistencia de preferencia: esa capacidad continúa en Sprint 21.

## Restricción normativa: reskin, no rediseño

No se modifican dimensiones, paddings, márgenes, gaps, grid, flex, radios, tamaños de cards, estructura de componentes, navegación, posición, breakpoints, tipografía, tamaño o peso de fuente, iconografía, contenido, lógica ni jerarquía informativa.

La comparación visual antes/después solo puede mostrar cambios en:

- colores y opacidades;
- fondos, degradados y shaders;
- bordes necesarios para preservar separación y contraste;
- sombras adaptadas al fondo oscuro;
- estados cromáticos de interacción y feedback;
- assets cuyo color forme parte inseparable de la identidad del tema.

No se permiten ajustes geométricos encubiertos para compensar el nuevo tema.

## Paleta base y tokens semánticos

Los valores siguientes son la referencia inicial. Solo pueden ajustarse ligeramente si una medición de contraste o coherencia lo exige, sin abandonar la dirección bosque + lima:

```css
--canastio-bg: #081811;
--canastio-bg-deep: #06130d;
--canastio-bg-elevated: #0c2318;
--canastio-surface: #102a1e;
--canastio-surface-2: #173626;
--canastio-surface-3: #1d3b28;

--canastio-accent: #c8fe36;
--canastio-accent-hover: #b8ef2c;
--canastio-accent-pressed: #a8df20;
--canastio-accent-soft: rgba(200, 254, 54, 0.10);

--canastio-text: #ecefe7;
--canastio-text-muted: #adb7b0;
--canastio-text-subtle: #687965;

--canastio-border: rgba(200, 254, 54, 0.12);
--canastio-border-neutral: rgba(236, 239, 231, 0.10);
```

La implementación centraliza estos valores en los tokens semánticos existentes, sin crear sistemas paralelos por página:

```css
--color-canvas;
--color-surface;
--color-surface-raised;
--color-surface-selected;
--color-text;
--color-text-muted;
--color-brand;
--color-brand-hover;
--color-brand-soft;
--color-border;
--color-control-border;
--color-success;
--color-warning;
--color-danger;
```

El lima se reserva para CTA principal, navegación o tab activo, foco, indicadores positivos, datos prioritarios y pequeños detalles de marca. No se usa como canvas ni como relleno dominante.

## Tratamiento por familia

### Canvas, superficies y luz

El canvas usa verde casi negro con degradados ambientales sutiles, nunca negro plano. La referencia es una combinación de `#081811`, `#0a2117` y `#06130d`, con un halo radial verde de baja opacidad en zonas prioritarias.

Las superficies existentes pasan a `#0c2318`–`#102a1e`; superficies seleccionadas o prioritarias pueden usar `#173626`–`#1d3b28`. Los degradados deben percibirse como luz ambiental, no como decoración visible. Se prohíben glow neón, glassmorphism, blur intenso, degradados multicolor, fondos lima y sombras negras duras.

No se añaden bordes donde no existían salvo que sean imprescindibles para mantener separación perceptible. Las sombras actuales conservan su función y geometría, reducidas y tintadas para el fondo oscuro.

### Texto, controles y estados

Texto principal `#ecefe7`, secundario `#adb7b0` y sutil `#687965`, ajustando este último cuando el contraste medido sea insuficiente.

Inputs conservan exactamente su geometría. Usan fondo verde casi negro, borde verde grisáceo, texto blanco roto, placeholder gris verdoso y foco lima con halo discreto.

Botón primario usa fondo lima y texto bosque. Hover y pressed emplean los tonos definidos. Botones secundarios mantienen su geometría, con fondo transparente, texto claro y borde neutral. Disabled usa superficie verde-gris oscura y texto legible; nunca se comunica solo mediante opacidad o color.

Success usa lima con apoyo textual o iconográfico. Warning usa ámbar apagado. Danger usa rojo terroso/desaturado compatible con fondo oscuro. Ningún estado depende solo del color.

### Navegación, tabs y selección

La navegación superior, lateral e inferior y todos los tabs conservan su componente y posición. En reposo usan gris verdoso; activos usan texto/icono lima, indicador lima y fondo lima suave o superficie elevada. Focus visible usa lima sin alterar dimensiones.

### Mi equipo

La cancha conserva composición, líneas, jugadores y comportamiento. Solo cambia a fondo `#102a1e`, líneas `rgba(200,254,54,.18)`, tokens de jugador `#173626`, iniciales lima y texto bosque sobre el avatar.

### Mercado

La estructura actual no cambia. Precio en blanco roto, subida en lima, bajada en rojo apagado y estable en gris verdoso. Los resúmenes usan verde profundo y Comprar usa lima. El resultado debe seguir pareciendo un fantasy deportivo, no una plataforma de trading.

### Diálogos y bottom sheets

Conservan tamaño, posición, transición, foco y estructura. Superficie aproximada `#0c2318`, backdrop `rgba(0,8,4,.70)`, texto blanco roto y CTA lima. El fondo no puede perder contexto ni permitir interacción accidental.

## Dimensiones de diseño y contrato

| Dimensión | Resolución 14E |
| --- | --- |
| data_model | Sin persistencia nueva ni cambios en DTO. El tema global se resuelve en tokens y estilos. |
| error_states | Conserva los estados y mensajes de 14D; cambia únicamente su expresión cromática y verifica contraste. |
| edge_cases | 320–1440 px, zoom 200 %, nombres e importes largos, autofill, imágenes ausentes, offline, reduced motion, alto contraste y pantallas OLED. Ningún caso autoriza cambios de layout. |
| auth_secrets | Sin cambios. Las capturas usan fixtures y no exponen credenciales, códigos reales ni datos privados. |
| external_contracts | Sin APIs, fuentes, librerías visuales ni servicios externos nuevos. Assets locales/autorizados. |
| ui_states | Reposo, hover, pressed, focus, selected, disabled, loading, empty, success, warning, danger, provisional y offline tienen tokens oscuros coherentes. |
| rollback_compat | Reversible por commit y por restauración del mapa de tokens; sin migraciones ni mutaciones de datos. |
| tests | Checks existentes, auditoría de hardcodes, capturas comparativas, contraste, teclado, zoom y smoke funcional. |

## Requisitos de aceptación

R1. Todas las rutas del inventario usan la dirección bosque oscuro + blanco roto + lima y ninguna conserva accidentalmente el canvas claro o cards blancas de 14D.

R2. La estructura DOM significativa, layout, dimensiones, espaciado, radios, tipografía, iconos, contenido, navegación, responsive y comportamiento permanecen iguales a la versión 14D de referencia.

R3. Los colores compartidos proceden de tokens semánticos centrales; se auditan y migran colores hardcodeados en globals, CSS Modules, componentes y assets sin crear overrides globales frágiles ni paletas por página.

R4. El canvas presenta profundidad verde y shaders ambientales extremadamente sutiles; no hay negro plano dominante, glow neón, glassmorphism, gradientes multicolor ni fondos lima.

R5. Cards, paneles, listas y módulos prioritarios mantienen su jerarquía mediante niveles de verde oscuro, bordes discretos y sombras suaves sin introducir superficies nuevas.

R6. Texto principal, secundario y sutil alcanza al menos 4.5:1 para texto normal; texto grande y gráficos/controles necesarios alcanzan 3:1. Los ajustes de la paleta base quedan documentados.

R7. Botones, links, inputs, selects, tabs, navegación y controles de icono tienen estados hover, pressed, focus, selected y disabled distinguibles; el foco lima es visible y ningún estado depende solo del color.

R8. El lima se usa con disciplina en acciones y datos prioritarios. No domina grandes áreas ni reduce la legibilidad por sobreuso.

R9. La cancha de Mi equipo, el Mercado y sus indicadores financieros adoptan el tema oscuro conservando exactamente su composición y semántica actual.

R10. Diálogos y bottom sheets usan superficie oscura y backdrop coherente, conservan gestión de foco, cierre, tamaños y posición, y mantienen contraste suficiente en acciones destructivas y secundarias.

R11. Landing, auth, onboarding, Inicio, Mercado, Mi equipo, Jornada, Liga, Perfil, explorador, navegación y todos los estados globales se revisan visualmente a 320, 375, 430, 768 y 1440 px y con zoom 200 %.

R12. Loading, empty, error, offline, success, warning, danger, provisional y disabled permanecen comprensibles mediante texto, iconos o estructura además del color.

R13. No se añaden nuevas funcionalidades, selector de tema, persistencia de preferencia, microcopy, métricas ni cambios de contratos para completar el reskin.

R14. Typecheck, lint, tests y build pasan; los smoke tests críticos producen el mismo resultado funcional antes y después del cambio.

R15. Una revisión de diff confirma que los cambios de producción se limitan a tokens, declaraciones cromáticas, sombras/degradados y assets dependientes del tema; cualquier excepción queda justificada en la evidencia de QA.

## Plan de trabajo verificable

- [ ] T1. Capturar la referencia 14D y generar inventario completo de rutas, estados, tokens y colores hardcodeados.
- [ ] T2. Definir el mapa semántico 14E y una tabla medida de contraste para texto, controles y estados.
- [ ] T3. Cambiar tokens globales, canvas, superficies, bordes, sombras, foco y estados compartidos.
- [ ] T4. Migrar hardcodes residuales sin modificar geometría ni estructura.
- [ ] T5. Revisar landing, auth, registro, recuperación y onboarding.
- [ ] T6. Revisar shell, navegación, Inicio, Perfil, formularios y explorador deportivo.
- [ ] T7. Revisar Mercado, todos sus estados y diálogos.
- [ ] T8. Revisar Mi equipo, Cancha/Puntos/Valor/Forma, Jornada y Liga/Clasificación/Actividad/Mi liga.
- [ ] T9. Revisar loading, empty, errors, offline, autofill, disabled, focus y reduced motion.
- [ ] T10. Capturar cinco anchos y zoom 200 %, comparar geometría con 14D, ejecutar checks y guardar evidencia.

## Matriz mínima de QA

| Familia | Verificación cromática | Verificación de no regresión |
| --- | --- | --- |
| Landing/auth | Shaders, CTA lima, inputs/autofill, errores | Mismo contenido, orden y primer viewport |
| Onboarding | Selector, formulario contextual, disabled/focus | Mismos modos, validación y bloqueo de app |
| Shell | Canvas, navegación activa, avatar | Cinco destinos, safe areas y posición intactos |
| Inicio | Jerarquía de superficies y estados | Mismos datos, CTA y prioridad |
| Mercado | Tendencias, saldo, filtros y acciones | Mismos precios, operaciones y diálogos |
| Mi equipo | Cancha, jugadores y cuatro tabs | Mismo quinteto, guardado y métricas |
| Jornada/Liga | Estados, ranking, feed y administración | Mismos permisos, resultados y acciones |
| Perfil/deporte | Formularios, listas y tablas | Mismos campos, enlaces y datos |
| Global | Contraste, foco, disabled y offline | Sin reflow, scroll nuevo o cambio funcional |

La evidencia debe incluir capturas comparables antes/después y un registro de contraste. No se modifican datos de producción para fabricar estados.

## Dependencias y futuro

14E depende de 14D y presupone su UI como línea base congelada. Las funcionalidades posteriores deben consumir los tokens 14E.

Sprint 21 conserva la responsabilidad de introducir los modos Sistema/Claro/Oscuro y persistir la preferencia sin flash de hidratación. Cuando se implemente, el tema bosque-lima de 14E será la referencia oscura; recuperar un tema claro requerirá tokens equivalentes, no revertir componentes ni duplicar CSS.

## Entrega y aprobación

Esta entrega solo define la propuesta y su entrada en `spec.json`. No autoriza implementación. Para comenzar el reskin, el usuario debe aprobar explícitamente Sprint 14E y el harness debe registrar `spec_approved: true` y generar la carpeta aprobada en `spec/`.
