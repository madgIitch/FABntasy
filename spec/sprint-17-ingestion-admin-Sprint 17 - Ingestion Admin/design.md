# sprint-17-ingestion-admin · undefined — Diseño

## Scope (archivos que puede tocar)

- `apps/web/**`
- `services/fab_ingestor/**`
- `prisma/**`
- `tests/**`
- `docs/**`
- `.env.example`
- `spec.json`

## Decisiones de la entrevista

- **product_boundary:** Panel operativo mínimo para observar y relanzar ingestas. No incluye edición manual de estadísticas, gestión general de usuarios, rotación web de credenciales FAB, borrado de RAW ni scheduler avanzado.
- **permission_model:** Rol global INGESTION_ADMIN persistido server-side, provisionado solo por SQL/CLI. Un usuario normal recibe 404 y no ve navegación administrativa.
- **job_model:** La web encola jobs y responde inmediatamente con su ID. El worker Python los reclama con exclusión mutua; no se ejecuta Python dentro de la petición de Vercel.
- **raw_policy:** El listado enseña solo metadatos. El detalle exige acción explícita, redacta secretos recursivamente, limita tamaño, no ofrece descarga masiva y audita cada consulta.

