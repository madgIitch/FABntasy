# Incidente FAB 2026-09-10: expiración de identidad de dispositivo

## Resumen

Durante la validación local del ciclo 14F, `sync-all --force-stats` falló en la fase `competition`. El acceso a PostgreSQL y la carga del contenedor eran correctos, pero FAB rechazaba peticiones autenticadas que anteriormente funcionaban.

El incidente demostró que FAB no solo rota la `key` dentro de respuestas válidas: también puede invalidar el par completo `id_dispositivo`/`key`. El cliente ya persistía una `key` nueva, pero no recuperaba automáticamente una identidad de dispositivo caducada.

## Impacto observado

- `sync-all` terminó con `phases_succeeded=0` y `phases_failed=1`.
- `ingestion_runs` registró `competition / FAB_RESPONSE` y `sync_all / PHASE_FAILED` sin filtrar secretos.
- No se modificaron ni eliminaron datos deportivos ya confirmados.
- Scoring, ranking y pricing no se ejecutaron porque el pipeline se detuvo correctamente en la primera fase fallida.

## Evidencias saneadas

La respuesta de `fasesGrupos` contenía:

```text
resultado=error
error=Faltan parámetros
key ausente
```

La búsqueda autenticada devolvía el mismo patrón aunque su firma coincidía con el contrato previamente confirmado. Tras ejecutar `register-device --force`, la sincronización de la misma competición (`10468`) volvió a funcionar y el ciclo completo terminó con:

```text
competitions=1
phases_succeeded=3
phases_failed=0
skipped_locked=0
```

No se incluyen `id_dispositivo`, `key`, URLs con contraseña ni cuerpos completos.

## Causa raíz

La identidad FAB persistida había caducado. El cliente interpreta y guarda rotaciones ordinarias de `key`, pero no distingue todavía una identidad completa inválida de otros errores funcionales devueltos con HTTP 200.

Además, el primer comando Docker montaba `fab-credentials.json` como `readonly`. Ese patrón permite leer credenciales, pero impide que `FileCredentialStore.replace()` persista rotaciones mediante reemplazo atómico. El montaje correcto es el directorio `.local` completo en escritura.

## Mitigación aplicada

1. Se registró manualmente una identidad nueva con `register-device --force`.
2. Se montó `.local` como directorio persistente escribible en `/var/lib/canastio`.
3. Se repitió primero la fase `competition` y después `sync-all --force-stats`.
4. Ambos terminaron correctamente.

Comando operativo local:

```powershell
docker run --rm `
  --env-file "C:\Users\peorr\Desktop\FABntasy\.env" `
  --mount "type=bind,source=C:\Users\peorr\Desktop\FABntasy\services\fab_ingestor\.local,target=/var/lib/canastio" `
  -e FAB_CREDENTIALS_FILE=/var/lib/canastio/fab-credentials.json `
  canastio-fab-ingestor:test sync-all --force-stats
```

## Riesgo pendiente

Un job desatendido seguirá necesitando intervención manual cuando caduque la identidad completa. Reintentar ante cualquier `resultado=error` sería inseguro: `Faltan parámetros` también puede indicar una regresión del contrato o parámetros realmente incompletos.

La solución debe clasificar el rechazo mediante una sonda autenticada controlada, renovar como máximo una vez, reproducir solo operaciones de lectura seguras, persistir atómicamente el nuevo par y conservar diagnóstico saneado. Este trabajo se planifica en Sprint 14G.

## Recuperación implementada en Sprint 14G

El cliente trata `resultado=error`, `error=Faltan parámetros` y ausencia de `key` como una señal ambigua, no como prueba suficiente de caducidad. Ejecuta una sonda de lectura contra el contrato ya confirmado de `buscarCategoria`. Si la sonda funciona, clasifica la petición original como `FAB_CONTRACT_ERROR`; si reproduce el rechazo, coordina la renovación mediante un lock asociado al fichero, vuelve a cargar las credenciales por si otro worker ya las cambió y registra un dispositivo solo cuando siguen obsoletas.

La petición original se repite una sola vez. Un segundo rechazo termina como `FAB_AUTH_REFRESH_FAILED`. Los errores 429, 5xx y de transporte conservan su política de retry y nunca activan la renovación.

La recuperación se controla con `FAB_AUTO_CREDENTIAL_REFRESH=true|false`. En modo `live`, el proceso comprueba al arrancar que el directorio de `FAB_CREDENTIALS_FILE` permite escritura y reemplazo atómico. El montaje Docker correcto sigue siendo el directorio persistente en lectura/escritura, nunca el JSON individual como `readonly`.

La sonda puede validarse manualmente sin renovar la identidad ni ejecutar una sincronización:

```powershell
docker run --rm `
  --env-file "C:\Users\peorr\Desktop\FABntasy\.env" `
  --mount "type=bind,source=C:\Users\peorr\Desktop\FABntasy\services\fab_ingestor\.local,target=/var/lib/canastio" `
  -e FAB_CREDENTIALS_FILE=/var/lib/canastio/fab-credentials.json `
  canastio-fab-ingestor:test probe-auth
```
