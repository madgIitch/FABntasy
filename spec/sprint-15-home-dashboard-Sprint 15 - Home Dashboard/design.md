# sprint-15-home-dashboard · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `packages/domain/**`
- `tests/**`
- `docs/**`
- `spec.json`

## Enfoque

- **data_model:** No añade persistencia de negocio; compone alineaciones, jornadas, rankings, precios, partidos, transacciones y ligas ya existentes en una proyección de lectura.
- **external_contracts:** Define un único DTO agregado y versionado con procedencia, estado y fecha de actualización por sección.
- **edge_cases:** Cubre usuario sin equipo o liga, plantilla incompleta, cutoff vencido, jornada en directo, resultado pendiente, partido aplazado, ausencia de movimientos y ausencia de actividad.
- **ui_states:** Especifica jerarquía, navegación directa, estados temporales, responsive y accesibilidad conforme a la referencia.

## Decisiones de la entrevista

- **visual_direction:** La referencia define una portada editorial y compacta, inspirada en un marcador deportivo: la próxima jornada y el estado de la alineación dominan el primer viewport; después aparecen rendimiento, mercado, próximos partidos y actividad. Se adapta al sistema oscuro, lima y tipografía condensada de Canastio, sin copiar el aspecto de un bloque de código ni convertir cada dato en una tarjeta aislada.
- **information_priority:** El orden es accionable: primero cualquier decisión pendiente antes del cierre, después el resultado más reciente, luego oportunidades de mercado, calendario próximo y actividad social de las ligas. Si hay una alerta urgente, desplaza visualmente a los módulos informativos.
- **data_truth:** Todo el contenido procede de fuentes server-side existentes. No se muestran datos de ejemplo, ceros para valores desconocidos ni tendencias calculadas con muestras incompletas.

