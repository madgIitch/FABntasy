# Sprint 14G - FAB Credential Resilience · Diseño

## Scope

- `services/fab_ingestor/**`
- `tests/**`
- `docs/**`
- `.env.example`
- `spec.json`

## Máquina de estados

```text
READY
  ├─ respuesta válida con nueva key → ROTATE_KEY → READY
  ├─ transporte/429/5xx → RETRY_POLICY
  ├─ error funcional/contrato → FAIL_CLASSIFIED
  └─ señal de auth dudosa → PROBE
                            ├─ auth válida → FAIL_CONTRACT
                            └─ auth caducada → REFRESH_DEVICE
                                                  ├─ éxito → REPLAY_ONCE → READY/FAIL
                                                  └─ fallo → FAIL_AUTH_REFRESH
```

## Decisiones

- `FabClient` continúa encapsulando todo el contrato externo.
- Se introduce un clasificador que trabaja únicamente con status y campos permitidos (`resultado`, presencia de `key`, código/error normalizado), nunca con mensajes completos en logs.
- La sonda será una operación autenticada mínima cuyo contrato se valide primero mediante llamada real y fixture saneada.
- El replay se limita a métodos de lectura del cliente y comparte un presupuesto independiente de los retries de transporte.
- La renovación usa un lock entre procesos asociado al almacén de credenciales; tras adquirirlo vuelve a cargar el fichero para aprovechar una renovación hecha por otro worker.
- El directorio de credenciales debe ser persistente y escribible. Docker monta el directorio, no un fichero `readonly`, para permitir `os.replace()` atómico.
- La operación expone códigos estables para observabilidad, pero mantiene mensajes y secretos fuera de `ingestion_runs`.

## Rollback

La recuperación automática se controla mediante una variable server-side inicialmente desactivable. El rollback restaura el comportamiento fail-fast conservando la rotación ordinaria de `key` y el comando manual `register-device --force`.

