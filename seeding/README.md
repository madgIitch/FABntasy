# Seed de desarrollo

Ejecuta los scripts en este orden contra una base de desarrollo:

1. `seeder.sql`: competición, cuatro equipos y 40 jugadores.
2. `generate_random_games.sql`: seis jornadas, 12 partidos y 240 boxscores.
3. `seed_fantasy.sql`: completa los equipos fantasy existentes con plantilla, alineaciones, puntuaciones y rankings.

El tercer script es aditivo y reejecutable. Solo actúa sobre la competición identificada por la federación `CANASTIO DEV SEED`; no crea usuarios ni elimina equipos fantasy del desarrollador.

```powershell
corepack pnpm exec prisma db execute --file seeding/seed_fantasy.sql --schema prisma/schema.prisma
```
