# Ligas privadas

Una liga pertenece a una competición-temporada y admite hasta 20 miembros activos. El owner cuenta en ese límite, administra invitaciones y no puede abandonar la liga. Las plantillas pasan a estar vinculadas a la liga; el precio de mercado de cada jugador sigue siendo global.

Las invitaciones usan tokens aleatorios de 128 bits. La base conserva exclusivamente su SHA-256. Crear una invitación nueva revoca las anteriores; caducan en 24 horas. La landing pública revela solo nombre, competición y ocupación.

La migración `20260906000300_private_leagues` crea una liga personal y un membership OWNER por cada equipo previo antes de hacer obligatorio `fantasy_teams.league_id`.

La API usa el envelope `fantasy-league-api.v1`; la identidad procede siempre de Supabase Auth. La unión bloquea la liga en PostgreSQL antes de comprobar capacidad para impedir que dos altas concurrentes ocupen el último hueco.
