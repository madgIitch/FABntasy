# Sprint 14D — Rediseño integral verde y blanco

Estado: completado (`spec_approved: true`).

## Fuente y objetivo

[Análisis visual y adaptación](CANASTIO_14D_VISUAL_DIRECTION.md). Este documento es la base normativa de estética: inventario con fotogramas, tokens propuestos, componentes, mapa de superficies y límites.

Transformar la interfaz actual, oscura y con acento lima, en un sistema claro de superficies blancas y verde andaluz. El cambio afecta composición, tipografía, densidad, controles, imágenes, estados y navegación, no solo la paleta.

## Orden y dependencias

Depende del cierre de revisión de 14C y de la experiencia de jornada 14B. 14C sigue en `review_pending`; esta propuesta no lo marca terminado. Sprint 15 figura como `spec_ready` y ya tiene componentes presentes: 14D adapta los componentes existentes sin declarar completo el contrato funcional de 15. Cuando 15 se cierre, sus nuevas superficies deberán respetar este lenguaje visual. No se cambia silenciosamente ninguna spec aprobada.

## Alcance

- `apps/web/**`
- `tests/**`
- `docs/**`
- `spec.json`

Incluye portada pública, login, registro, recuperación/actualización de contraseña, onboarding de liga, shell, Inicio, Mercado, Mi equipo, Jornada, Liga y detalle, perfil y edición, competición, listados y fichas deportivas, loading/error/offline, diálogos y assets de marca/PWA que necesiten ajuste.

No incorpora nuevas funcionalidades de notificaciones, mensajes, notas, mapas, sesiones activas, privacidad o tema. No cambia schema, migraciones, servicios de negocio, ingestor ni credenciales. La selección de recursos visuales debe usar assets autorizados y conservar procedencia.

## Arquitectura de componentes

Consolidar en `apps/web/src/components/ui/` (o ubicación equivalente documentada) solo las primitivas repetidas: Button, Field, Surface, SectionHeading, StatusBadge, Avatar, DataRow y Dialog. Nombres orientativos; reutilizar implementaciones accesibles ya existentes. Las reglas de negocio permanecen en sus componentes de dominio.

Centralizar tokens en un archivo de estilos global cargado una vez. CSS Modules mantiene layouts de cada pantalla y consume variables semánticas. No exigir una nueva librería de componentes o animación: CSS y las dependencias existentes son suficientes para el alcance previsto.

Variantes de superficie: plana para listas, blanca suavemente elevada para entidad/tarea autocontenida, verde profundo para foco prioritario y overlay para diálogos. No tarjeta por cada métrica. El sistema debe ser reconocible sin sombras.

Prioridad de revisión: registro + onboarding + Inicio + Mercado para validar escala y controles; después el resto de superficies. La implementación del sprint solo se considera completa cuando se migra el inventario entero.

## Dimensiones de diseño y contrato

| Dimensión | Resolución propuesta |
| --- | --- |
| data_model | Sin persistencia nueva. Conserva perfiles, membresías, equipo, precios, scoring y DTO existentes. |
| error_states | Reutiliza códigos y flujos actuales; traduce el estado a feedback claro, foco y reintento; conserva inputs recuperables y borradores. |
| edge_cases | Usuario sin liga, perfil heredado incompleto, varias ligas, sesión caducada, cutoff vencido, nombres largos, cifras grandes, falta de imagen/datos, 320 px y zoom. El rediseño no cambia el orden de autorización/onboarding. |
| auth_secrets | Ningún cambio de autenticación o permisos. Correo privado, actor desde sesión y FAB en ingestor. Capturas de QA con datos de prueba y sin secretos. |
| external_contracts | No cambia rutas API ni llamadas FAB. Assets optimizados/locales, con permiso de uso. No introduce mapas, tracking o servicios externos de vídeo. |
| ui_states | Tokens y componentes del documento visual, cinco destinos, perfil por avatar, selección activa, loading/empty/error/offline y foco visibles. |
| rollback_compat | Cambio de presentación reversible por commit; sin migraciones destructivas. Separar consolidación de primitivas y adopción por superficie para localizar regresiones. |
| tests | Checks de proyecto existentes y smoke tests de comportamiento; revisión visual por ruta/estado/tamaño y medición de contraste. No pruebas que solo reflejen cadenas de implementación. |

## Requisitos de aceptación

R1. La implementación sigue docs/design/CANASTIO_14D_VISUAL_DIRECTION.md; mantiene la distinción entre componentes finales del vídeo y láminas explicativas, sin introducir cuadrículas moradas, bloques pastel de wireframe ni halo de cursor.

R2. Todas las rutas de producto existentes usan canvas claro, superficies blancas y verde principal #00843D; el lima #c9ff36 deja de ser acento de interfaz y no quedan páginas con fondos oscuros heredados, salvo módulos invertidos deliberados en verde profundo.

R3. Los colores y escalas compartidos proceden de tokens semánticos; se migran globals.css y CSS Modules sin resolver el rediseño mediante una capa de overrides globales que deje componentes antiguos incoherentes.

R4. Inter es la tipografía de interfaz, datos y títulos operativos; Oswald se limita a marca/portada, con máximo dos familias, números tabulares y campos de al menos 16 px.

R5. Las superficies usan ritmo de 8 px, radio principal de 24 px y padding de 24 px reducible a 16 px en móvil; las filas de datos no se convierten en tarjetas elevadas individuales y ninguna medida de 352 px impide reflow.

R6. Botones, campos, tabs, badges, avatares, listas y diálogos comparten variantes y estados accesibles; iconos coherentes y controles sin texto tienen nombre accesible, y las acciones principales tienen targets mínimos de 44 px.

R7. La portada conserva marca reconocible y CTA visible en el primer viewport móvil; cualquier fotografía nueva es propia o autorizada, tiene fallback y no reutiliza imágenes o marcas del vídeo como assets de producción.

R8. Registro mantiene username obligatorio y los flujos de verificación/recuperación; el onboarding sin membresía sigue limitado a crear liga, unirse y cerrar sesión, incluso al solicitar una ruta privada profunda.

R9. El shell conserva cinco destinos móviles y avatar de perfil; identifica selección actual, respeta safe areas y no tapa controles ni foco.

R10. Inicio conserva la prioridad de acción con vencimiento y sus fuentes reales; Mercado, Mi equipo, Jornada, Liga y perfil conservan acciones, permisos, borradores y estados temporales al cambiar su presentación.

R11. Clasificación, calendario, fichas de jugador/equipo/partido y desglose de puntuación adoptan el mismo sistema; nombres largos, importes grandes y ausencia de retrato no rompen alineación ni ocultan información necesaria.

R12. Loading, vacío, error, offline, provisional, bloqueado y pendiente reciben tratamiento coherente y textual; no se inventan métricas, mensajes, notificaciones, mapas ni progreso para reproducir un componente de referencia.

R13. Se verifica contraste mínimo de 4.5:1 para texto normal y 3:1 para texto grande y gráficos/controles necesarios; foco visible y estados no dependen exclusivamente del color.

R14. Se revisan capturas de las familias de pantallas a 320, 375, 430, 768 y 1440 px, con zoom 200 %, navegación por teclado y áreas seguras; no hay scroll horizontal salvo tablas justificadas y documentadas.

R15. Las transiciones de feedback y diálogos son breves, no cambian el layout ni reinician animaciones en cada actualización; prefers-reduced-motion elimina desplazamientos y animación ornamental.

R16. Tests existentes, typecheck, lint y build pasan; los smoke tests cubren registro, onboarding bloqueante, navegación, perfil/logout y flujos operativos críticos, acompañados de revisión manual de capturas y contraste.

R17. El sprint no requiere migraciones, cambios en ingesta FAB ni alteración de contratos de negocio; el rollback visual no modifica datos. Notificaciones, seguridad avanzada y selector de temas permanecen en sus sprints con referencia al sistema 14D.

## Plan de trabajo verificable

- [ ] T1. Inventario de rutas/estados y capturas de línea base; identificar estilos hardcodeados y assets.
- [ ] T2. Tokens, carga tipográfica y primitivas; tabla de contraste comprobada.
- [ ] T3. Portada, autenticación y onboarding, con username y bloqueo de liga intactos.
- [ ] T4. Shell, navegación activa, avatar y logout; comprobar áreas seguras.
- [ ] T5. Inicio, Mercado y Mi equipo; listas, filtros, importes y acciones.
- [ ] T6. Jornada, Liga y clasificación; marcadores, estados y contexto.
- [ ] T7. Perfil, edición y explorador deportivo completo.
- [ ] T8. Loading/error/offline, diálogos, fallbacks e identidad PWA.
- [ ] T9. Revisión de todas las familias en cinco anchos, teclado, zoom y reduced motion; corregir regresiones.
- [ ] T10. Ejecutar checks y smoke tests; guardar evidencia y actualizar guía de componentes para sprints futuros.

## Matriz mínima de QA

| Familia | Caso normal | Caso adverso |
| --- | --- | --- |
| Portada/auth | CTA, registro, verificación y recuperación | Error, username ocupado, teclado móvil |
| Onboarding | Crear y unirse | Sin membresía y URL privada profunda; error de alta/unión |
| Shell/perfil | Cinco destinos, avatar, edición y logout | Sin avatar, nombre largo, perfil incompleto |
| Inicio | Jornada/prioridad y módulos reales | Sin calendario, pendiente y degradación parcial |
| Mercado/equipo | Filas, filtros, selección y guardado | Importe grande, conflicto y bloqueo por cutoff |
| Jornada/liga | Marcador, timeline y ranking | Provisional, DNP, aplazado, varias ligas |
| Explorador | Jugador, equipo, partido y boxscore | Sin imagen, sin estadísticas y tabla ancha |
| Global | Foco, scroll y contraste | Offline, loading, error y zoom 200 % |

Las capturas cubren 320, 375, 430, 768 y 1440 px. Pruebas de teclado y zoom en vistas representativas y todos los diálogos. Datos de fixture autorizados; no adulterar datos de producción para producir capturas. Guardar resultados de revisión, no solo imágenes.

## Sprints futuros

- 16: notificaciones reutiliza lista/estado/controles, con inspiración Inbox; no se añade aquí la infraestructura.
- 19: seguridad y privacidad reutiliza formulario/dialog y zona destructiva; no se añaden acciones ficticias.
- 21: variantes Sistema/Claro/Oscuro sobre tokens semánticos; 14D ya cumple los mínimos de accesibilidad y 21 amplía la auditoría.
- Cualquier pantalla futura usa la guía 14D una vez aprobada y no reintroduce colores hardcodeados o una tercera tipografía.

## Entrega y aprobación

Esta entrega contiene documentación y la entrada pendiente en `spec.json`. La aprobación de 14C no se extiende a 14D. Cuando el usuario apruebe el alcance 14D, registrar esa aprobación mediante el flujo del harness y generar su carpeta aprobada en `spec/`; hasta entonces mantenerla como propuesta en `docs/design/`.
