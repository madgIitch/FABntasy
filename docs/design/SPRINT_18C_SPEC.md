# Sprint 18C — Pulido contextual de Inicio

Estado: propuesta lista para aprobación (`spec_approved: false`). No autoriza implementación.

## Objetivo

Hacer que Inicio explique en menos de diez segundos **qué está pasando, qué implica para el usuario y qué puede o debe hacer**, manteniendo la arquitectura aprobada: un único módulo prioritario seguido de un feed deportivo continuo.

Este sprint no replantea el Home ni sustituye el sistema visual. Convierte datos técnicamente correctos en lenguaje de producto más humano, reduce ruido de frescura y aplica una prioridad contextual pequeña, estable y verificable.

## Fundamento y decisiones heredadas

### Sprint 15 — Home Dashboard

- La identidad procede exclusivamente de la sesión.
- El primer viewport contiene jornada, cutoff y estado de alineación.
- Una acción urgente antes del cutoff obtiene una única CTA.
- Mercado vacío debe conservar un estado honesto, sin datos simulados.
- Cada sección mantiene estado y frescura independientes.
- Live refresca de forma acotada; fuera de live existe actualización manual y no polling continuo.
- La jerarquía aprobada es acción urgente, live/resultado reciente, mercado, agenda y actividad.

### Sprint 14D — Arquitectura visual

- Mobile-first desde 320 px, targets de 44 px y safe areas.
- Una única superficie prioritaria por pantalla.
- Listas continuas, grupos interiores claros y pocas escalas tipográficas.
- Las tarjetas se justifican por tarea o entidad autocontenida; no se crea una por cada dato.
- Estados legibles, foco visible y movimiento reducido/funcional.

### Sprint 14E — Color vigente

- Bosque oscuro, blanco roto y lima sustituyen únicamente la dirección cromática de 14D.
- El lima se reserva para CTA, foco, selección, navegación activa e información viva.
- No se admiten fondos lima dominantes, glow neón, glassmorphism ni paletas por página.
- Texto normal debe alcanzar 4.5:1; texto grande y gráficos necesarios, 3:1.

## Evidencia observada

Las capturas reales a 400 × 864 confirman:

- el módulo `Guarda tu quinteto` y su CTA ya dominan el primer viewport;
- el patrón de columna continua funciona y no necesita otro hero;
- `No comenzado`, nombres `APELLIDOS, NOMBRE`, `5 M créditos` y fechas completas proceden demasiado directamente de contratos internos;
- la frescura repetida tras cada sección genera ruido cuando todos los bloques comparten el mismo instante;
- Resultados se escanea bien, pero no diferencia ganador y usa una flecha ambigua junto al marcador;
- Actividad se percibe como log por repetición de puntos, nombres administrativos, metadata y acciones idénticas;
- el espacio inferior debe revisarse con safe area real antes de reducirlo;
- 400 px funciona, pero 320 px sigue siendo el caso límite obligatorio.

## Alcance

Incluye exclusivamente la portada autenticada, su agregador server-side, DTO de presentación, formatters, estilos, fixtures y pruebas relacionadas.

No incluye:

- rediseño de otras pantallas;
- cambios en ingesta, schema o datos FAB almacenados;
- nueva paleta, selector de tema o cambios de navegación global;
- feed completo nuevo, notificaciones o nuevos tipos de evento de dominio;
- personalización algorítmica o aprendizaje del orden;
- ocultar errores, pendientes o vacíos mediante valores inventados.

## Máquina de presentación

El servidor deriva un modo explícito a partir de datos persistidos y una hora inyectable:

| Modo | Condición | Orden tras el módulo prioritario |
| --- | --- | --- |
| `LIVE` | Jornada relevante con partido live | contexto live/resultados → Mercado → Agenda → Actividad |
| `RECENT_FINAL` | Jornada relevante terminada dentro del horizonte documentado | resultado de jornada/resultados → Mercado → Actividad → Agenda |
| `DEFAULT` | Sin jornada live ni final reciente | Mercado → Agenda → Resultados → Actividad |

El horizonte de `RECENT_FINAL` debe fijarse durante implementación como constante de dominio de presentación, quedar cubierto por pruebas de borde y no depender del reloj del navegador. La recomendación inicial es hasta 24 horas después del cierre efectivo o hasta que la siguiente jornada pase a dominar; si ambas señales existen, se adopta la condición más conservadora y se documenta.

No se reordenan módulos por éxito/error de una consulta dentro de la misma carga. Actividad permanece última salvo el orden explícito de `RECENT_FINAL`. No existe aleatoriedad.

## Módulo prioritario

Se conserva el componente actual y se refuerza sin crear otro hero. Todo estado debe responder:

1. **Qué está pasando:** jornada, live, cierre o resultado.
2. **Qué implica para mí:** alineación lista/pendiente, puntos provisionales/finales o ausencia honesta.
3. **Qué puedo hacer:** una única acción válida, o ninguna si no procede.

Los estados pobres en datos no inventan cifras. La superficie tonal, escala del mensaje, CTA y separación respecto al feed deben garantizar que siga dominando.

## Lenguaje de producto

### Estados deportivos

Una función central transforma valores conocidos y conserva un fallback seguro:

| Interno/FAB | Presentación |
| --- | --- |
| `No comenzado`, `scheduled` | Próximo |
| `Comenzado`, `live`, `playing`, `in_progress` | En directo |
| `Terminado`, `Finalizado`, `finished` | Final |
| `postponed`, `Aplazado` | Aplazado |
| desconocido no vacío | Estado original saneado o Estado pendiente |

La transformación nunca muta PostgreSQL ni el RAW.

### Nombres

`APELLIDOS, NOMBRE` se muestra en orden natural solo cuando hay exactamente una coma útil y ambas partes son no vacías. Se normaliza capitalización respetando tildes, apóstrofos y guiones. Casos ambiguos, siglas y nombres de equipo conservan el original. La identidad y las búsquedas siguen usando los IDs persistidos.

### Importes y actividad

- `5 M créditos` pasa a `5 M` dentro de una frase.
- Ejemplo: `Pepe fichó a Mario Chaín Roldán por 5 M`.
- El tiempo ocupa una segunda línea breve solo cuando aporta contexto.
- Inicio muestra cuatro eventos; la vista completa conserva el histórico disponible.
- Los marcadores visuales por tipo deben ser mínimos, accesibles y semánticos. No se introduce una feria de iconos.

## Frescura y degradación

La frescura continúa siendo parte del contrato de confianza:

- normal del mismo día: `Actualizado 04:45`;
- live/reciente: `Actualizado hace 32 s`;
- stale tras umbral: `Datos de hace 3 h`;
- error: `No hemos podido actualizar esta sección`, con acción localizada si existe;
- desconocida: `Actualización pendiente`.

El DTO conserva `updatedAt` por sección. La UI puede evitar repetir visualmente el mismo timestamp cuando varios bloques comparten valor, pero debe mantener información suficiente para identificar una sección stale o fallida. La acción global `Actualizar` permanece como fallback secundario y accesible fuera de live.

## Tratamiento por sección

### Mercado

Conserva hasta cinco movimientos comparables. Si está vacío, mantiene un mensaje neutral compacto. No se inventan jugadores ni métricas. Cotización y variación definen su patrón visual.

### Agenda

Muestra fecha, enfrentamiento y estado Canastio. El enlace usa un chevron de navegación consistente en el extremo. La fecha futura ya aporta contexto; `Próximo` no debe competir con los equipos.

### Resultados

Muestra hasta cuatro partidos relevantes, marcador tabular y ganador con mayor peso tipográfico. Un empate no destaca ganador. Un marcador nullable permanece `—`. El chevron no se coloca como si fuera una tendencia.

### Actividad

Muestra como máximo cuatro eventos autorizados, en forma de frases humanas. Actor, acción, objeto e importe se leen como una noticia breve. La segunda línea contiene solo tiempo u otro contexto real. `Abrir` conduce a la vista completa de la liga activa.

## Accesibilidad y responsive

- Verificación obligatoria: 320, 375, 400, 430, 768 y 1440 px; zoom 200 %.
- Casos: nombres largos, dos scores de tres cifras, timestamps localizados, ausencia de marcador, mercado vacío, error y live.
- No overflow horizontal; truncado solo cuando existe acceso al nombre completo o la fila permite lectura suficiente.
- Targets interactivos de 44 px, foco visible, orden DOM coherente con el orden visual y `prefers-reduced-motion`.
- Ganador, stale, live y tendencias nunca dependen únicamente del color.
- Medición real de contraste sobre tokens renderizados: 4.5:1 normal y 3:1 grande/gráfico.

## Pruebas y evidencia

1. Unitarias de la máquina de modos y bordes temporales.
2. Unitarias de estados FAB, nombres, importes y frescura.
3. Servicio: autorización, liga activa, aislamiento y límites de resultados/actividad.
4. Componente: hero pobre en datos, live, final reciente, vacíos, stale y error.
5. Responsive: capturas en todos los anchos y zoom definidos, con nombres largos.
6. Accesibilidad: foco, targets, contraste y reduced motion.
7. Gates: typecheck, lint, tests, build y diff-scope.

## Rollback y compatibilidad

No hay migraciones ni mutaciones de datos. La vuelta atrás restaura la proyección y presentación anterior. Los valores FAB, IDs, permisos, cutoff, reglas fantasy y contratos de ingesta permanecen intactos.

## Decisiones que deberán quedar registradas al aprobar

- La arquitectura definitiva de Inicio es un único módulo prioritario más feed continuo contextual.
- La máquina de orden solo admite `LIVE`, `RECENT_FINAL` y `DEFAULT`.
- La humanización de nombres y estados es una transformación de presentación, no de identidad ni persistencia.
- Frescura y actualización manual permanecen como señales de confianza, con menor peso visual.
- El tema bosque-lima de 14E y los contratos mobile-first de 14D no se reabren en este sprint.
