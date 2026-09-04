# Supabase

Supabase es el PostgreSQL gestionado de FABntasy. Prisma usa `DATABASE_URL` para la conexión normal de la aplicación y `DIRECT_URL` para migraciones y operaciones que requieren conexión directa.

Ambas variables son server-side y nunca deben tener el prefijo `NEXT_PUBLIC_`. No se versiona `.env` ni se copian sus valores a `.env.example`.

Para validar el schema:

```powershell
pnpm exec prisma validate
```

Para crear una migración cuando el schema deje de estar vacío:

```powershell
pnpm exec prisma migrate dev --name init
```
