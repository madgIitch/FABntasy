# Correcciones de datos deportivos

Sprint 18 añade `/app/admin/correcciones` para proponer, previsualizar y confirmar cambios controlados sobre partidos y estadísticas de jugador. Solo un perfil con grant activo `INGESTION_ADMIN` puede acceder.

Las revisiones son inmutables. Guardan snapshots anterior y posterior, fingerprint de concurrencia, origen, motivo, impacto y estado del recálculo. Una reversión crea una nueva revisión compensatoria; nunca borra el historial.

## Flujo

1. Localizar el UUID interno de `Game` o `PlayerGameStat`.
2. Elegir un campo de la allowlist y distinguir corrección confirmada de FAB de override manual.
3. Escribir motivo interno y, si procede, un motivo público saneado.
4. Revisar el diff y el alcance de recálculo.
5. Confirmar. El servidor verifica el fingerprint bajo lock y rechaza estados obsoletos con `REVISION_CONFLICT`.

Tras aplicar, se recalculan scores de jugador, resultados de jornada, rankings y precios de la jornada afectada. Mientras tanto, los resultados publicados anteriores permanecen legibles. Si falla el recálculo, la revisión queda `FAILED` y no se oculta el diagnóstico estable.

Los overrides manuales aplicados protegen ese campo frente a posteriores UPSERT del ingestor. Para volver a aceptar el valor FAB se debe crear una revisión explícita o una reversión auditada.

## Seguridad

- El actor se obtiene de Supabase Auth y nunca del body.
- IDs, external IDs, credenciales, reglas, usuarios, ligas, economía y derivados no son editables.
- No se guardan RAW, cookies, cabeceras ni mensajes internos de excepción.
- El motivo público no incluye el nombre del administrador ni notas internas.
