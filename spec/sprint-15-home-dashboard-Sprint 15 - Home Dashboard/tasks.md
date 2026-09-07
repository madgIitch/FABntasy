# sprint-15-home-dashboard · undefined — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) La ruta de inicio autenticada resuelve el usuario desde la sesión y obtiene su portada mediante una sola carga agregada principal por navegación; no acepta un identificador de usuario suministrado por el cliente ni dispara consultas N+1 desde los módulos visuales.  ↔ R1
- [ ] (T2) El primer viewport móvil muestra la próxima jornada, su fecha y hora de cierre en `Europe/Madrid`, y un estado textual de la alineación: lista, incompleta, sin guardar, bloqueada o sin calendario disponible.  ↔ R2
- [ ] (T3) Cuando la alineación requiere una acción antes del cutoff, la portada muestra una alerta prioritaria y un único CTA que abre directamente la edición del equipo; después del cutoff no ofrece una acción que ya no pueda completarse.  ↔ R3
- [ ] (T4) El resumen de rendimiento muestra la última jornada publicada con puntos, posición en la clasificación aplicable y variación respecto a la jornada publicada anterior; cualquier valor todavía no calculado se presenta como pendiente, nunca como cero.  ↔ R4
- [ ] (T5) El módulo de mercado muestra como máximo cinco movimientos reales y recientes con jugador, precio vigente, variación absoluta y porcentual, periodo comparado y enlace a su ficha; el orden es determinista por variación porcentual, variación absoluta y nombre.  ↔ R5
- [ ] (T6) Una variación de mercado solo se muestra cuando existen precios comparables para los dos extremos del periodo; si no existen movimientos válidos, aparece un estado vacío neutral sin jugadores de ejemplo.  ↔ R6
- [ ] (T7) El módulo de próximos partidos muestra los siguientes encuentros relevantes para los jugadores de la plantilla, con equipos, fecha/hora local y estado oficial, elimina duplicados y enlaza al detalle disponible.  ↔ R7
- [ ] (T8) El módulo de actividad muestra eventos reales y autorizados de las ligas del usuario —fichajes, pujas, cláusulas o cambios relevantes ya persistidos— ordenados del más reciente al más antiguo, sin revelar importes o participantes de ligas ajenas.  ↔ R8
- [ ] (T9) Si el usuario pertenece a varias ligas, la portada identifica el contexto activo y permite cambiarlo sin mezclar clasificación, actividad ni reglas; la próxima jornada deportiva y los partidos conservan el contexto de competición correspondiente.  ↔ R9
- [ ] (T10) Los usuarios sin equipo, sin liga, con plantilla incompleta o sin alineación reciben un estado de onboarding específico con un único siguiente paso válido, en lugar de módulos vacíos o datos simulados.  ↔ R10
- [ ] (T11) La prioridad visual es: acción con vencimiento, jornada en directo o resultado reciente, mercado, próximos partidos y actividad; la pantalla utiliza secciones compactas y separadores, no una cuadrícula de tarjetas equivalentes.  ↔ R11
- [ ] (T12) Cada sección incluye su estado y momento de actualización. Un fallo de identidad, autorización o equipo bloquea la portada con reintento; un fallo en mercado, calendario o actividad degrada solo esa sección y mantiene utilizables las demás.  ↔ R12
- [ ] (T13) En estado en directo la actualización es acotada, evita peticiones concurrentes y se detiene cuando la pestaña queda oculta; fuera del directo no mantiene sondeo continuo y ofrece actualización manual.  ↔ R13
- [ ] (T14) Los iconos de notificaciones, perfil y accesos directos tienen nombre accesible y destino real; no se muestran badges, alertas ni contadores inventados cuando esa información no existe.  ↔ R14
- [ ] (T15) La portada funciona sin scroll horizontal entre 320 y 430 px, respeta áreas seguras, conserva visible la navegación inferior y ofrece objetivos táctiles de al menos 44 px; en desktop mantiene una columna de lectura controlada sin estirar los módulos a todo el ancho.  ↔ R15
- [ ] (T16) El contenido mantiene jerarquía semántica, foco visible, estados que no dependen solo del color y compatibilidad con `prefers-reduced-motion`.  ↔ R16
- [ ] (T17) Tests de servicio/contrato verifican agregación, autorización, ordenación y degradación parcial; tests de componentes y E2E cubren usuario operativo, onboarding, alerta previa al cutoff, datos pendientes, navegación directa y viewport de 320 px.  ↔ R17
- [ ] Tests que cubran los criterios de aceptación
