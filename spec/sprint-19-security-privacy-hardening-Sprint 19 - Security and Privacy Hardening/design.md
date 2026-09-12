# sprint-19-security-privacy-hardening · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `services/fab_ingestor/**`
- `packages/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `.env.example`
- `spec.json`

## Decisiones de la entrevista

- **data_model:** Solo se añaden estructuras mínimas y auditables para rate limiting, preferencias de descubrimiento, exportación/borrado y sesiones. Los datos deportivos FAB permanecen globales y fuera del ciclo de vida de una cuenta.
- **error_states:** Los rechazos usan códigos seguros y estables; autorización no revela existencia, rate limit devuelve 429 con espera acotada y las operaciones sensibles fallan cerradas.
- **edge_cases:** Se cubren concurrencia, sesión antigua, cambio de correo pendiente, revocación de la sesión actual, membresías históricas, último propietario de liga y borrado parcialmente reintentable.
- **auth_secrets:** La identidad siempre procede de Supabase server-side. Cookies, tokens, contraseñas, claves FAB y VAPID no aparecen en respuestas, HTML, logs ni auditoría.
- **external_contracts:** Email, contraseña y sesiones usan únicamente contratos soportados de Supabase Auth. No se simula MFA; permanece como Próximamente hasta disponer del flujo completo.
- **ui_states:** Cuenta distingue seguridad, privacidad, sesiones, exportación y zona de peligro. Cerrar sesión conserva tratamiento neutral; borrar cuenta exige confirmación reforzada separada.
- **rollback_compat:** Migraciones aditivas. Desactivar controles nuevos no restaura PII borrada ni debilita autorización existente; exportaciones y auditoría conservan trazabilidad mínima sin secretos.
- **tests:** Tests unitarios, integración PostgreSQL y contratos HTTP cubren autorización, límites, headers, redacción, reautenticación, sesiones, descubrimiento, exportación y anonimización.

