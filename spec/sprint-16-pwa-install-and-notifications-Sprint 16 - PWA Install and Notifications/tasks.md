# sprint-16-pwa-install-and-notifications · undefined — Tareas

Checklist de implementación. El agente marca [x] al completar; los gates verifican.

- [ ] (T1) `manifest.webmanifest` declara nombre, nombre corto, `start_url=/app`, `display=standalone`, colores coherentes con 14E e iconos PNG maskable y convencionales de 192 y 512 px; Chromium reconoce la aplicación como instalable y la app sigue siendo navegable en Safari iOS.  ↔ R1
- [ ] (T2) La UI de Perfil muestra el estado real de instalación cuando la plataforma lo expone, captura `beforeinstallprompt` sin dispararlo automáticamente y solo abre el prompt después de pulsar una acción de instalación de al menos 44 px.  ↔ R2
- [ ] (T3) En iOS/Safari, donde no existe prompt programático, la UI detecta el caso compatible y explica de forma breve «Compartir → Añadir a pantalla de inicio»; en modo standalone no sigue ofreciendo instalar.  ↔ R3
- [ ] (T4) El service worker usa una versión de caché explícita, limpia versiones anteriores y limita el precache al shell público. No cachea respuestas autenticadas, rutas API, mutaciones ni datos privados; la navegación offline cae en `/offline`.  ↔ R4
- [ ] (T5) Nunca se solicita permiso de notificaciones durante carga, registro, login o primer render. Solo una acción explícita en Perfil puede llamar a `Notification.requestPermission()` o `PushManager.subscribe()`.  ↔ R5
- [ ] (T6) Las suscripciones se vinculan al usuario autenticado, guardan endpoint y claves necesarias cifrables/privadas, admiten varias instalaciones, actualizan `lastSeenAt` y pueden revocarse individualmente o en conjunto al cerrar sesión.  ↔ R6
- [ ] (T7) Los endpoints de alta, baja y consulta ignoran cualquier `userId` del cliente, obtienen la identidad de la sesión, validan origen/esquema/tamaño y nunca devuelven suscripciones de otro usuario ni la VAPID private key.  ↔ R7
- [ ] (T8) Perfil presenta preferencias persistidas e independientes para las doce intenciones acordadas, agrupadas en Mercado, Mi equipo, Liga y Jornada; cada control refleja servidor, permiso global y soporte del dispositivo, no solo estado React local.  ↔ R8
- [ ] (T9) Desactivar una intención impide crear nuevas entregas de ese tipo. Denegar o revocar el permiso desactiva el envío en ese dispositivo y muestra instrucciones de recuperación sin controles engañosamente activos.  ↔ R9
- [ ] (T10) El dispatcher recibe eventos de dominio normalizados, verifica preferencia y pertenencia antes de enviar, genera payload mínimo con título, cuerpo, destino interno y etiqueta, y no incluye secretos ni información de ligas ajenas.  ↔ R10
- [ ] (T11) Cada entrega tiene una clave idempotente única por usuario, intención y evento. Reintentos, recalcular una jornada o ejecutar dos workers concurrentes no producen más de una entrega efectiva por suscripción.  ↔ R11
- [ ] (T12) Respuestas Push 404/410 revocan la suscripción; 429/5xx producen un fallo transitorio auditable y reintento acotado; un dispositivo fallido no impide entregar a otras suscripciones ni utilizar la aplicación.  ↔ R12
- [ ] (T13) Recordatorios de alineación y proximidad al bloqueo se calculan en `Europe/Madrid`, se deduplican por usuario, liga, jornada y tipo, y nunca se generan después del cutoff ni para una alineación ya válida.  ↔ R13
- [ ] (T14) Los avisos de resultado solo se generan para puntuaciones publicadas. Una revisión posterior puede generar un aviso de corrección distinto, pero repetir la misma revisión no duplica notificaciones.  ↔ R14
- [ ] (T15) Pulsar una notificación enfoca una ventana existente o abre una ruta interna permitida de Canastio; destinos ausentes o inválidos caen en `/app` y nunca permiten una URL externa arbitraria.  ↔ R15
- [ ] (T16) Cuando Push, Service Worker o instalación no están soportados, toda la PWA continúa operativa y Perfil muestra un estado neutral específico. La navegación y las acciones principales no dependen del permiso.  ↔ R16
- [ ] (T17) Tests unitarios y de integración cubren autorización, validación, preferencias, deduplicación concurrente, expiración 404/410, cutoff y payload; tests de navegador cubren prompt por gesto, permiso denegado, modo standalone, navegación desde notificación y ausencia de caché privada.  ↔ R17
- [ ] Tests que cubran los criterios de aceptación
