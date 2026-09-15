# Ligas privadas

Una liga pertenece a una competición-temporada y admite hasta 20 miembros activos. El owner cuenta en ese límite, administra invitaciones y no puede abandonar la liga. Las plantillas pasan a estar vinculadas a la liga; el precio de mercado de cada jugador sigue siendo global.

Cada liga tiene un código estable `CNST-XXXXXX` y una contraseña definida por su administrador. La base conserva exclusivamente un hash `scrypt` con salt aleatorio; nunca devuelve ni registra la contraseña. El administrador puede rotarla y el código permanece estable. Las ligas migradas conservan el acceso cerrado hasta que su administrador establezca una contraseña.

La migración `20260906000300_private_leagues` crea una liga personal y un membership OWNER por cada equipo previo antes de hacer obligatorio `fantasy_teams.league_id`.

La API usa el envelope `fantasy-league-api.v1`; la identidad procede siempre de Supabase Auth. La unión exige código y contraseña, responde con un error indistinguible si alguno es incorrecto y bloquea la liga en PostgreSQL antes de comprobar capacidad para impedir que dos altas concurrentes ocupen el último hueco.
## Experiencia social de Liga (v1)

Liga conserva los destinos globales existentes y organiza su interior en Clasificación, Actividad y Miembros. Actividad es automática: no admite publicaciones, comentarios, mensajes ni texto libre. Los eventos se ordenan por `occurred_at DESC, id DESC`, usan cursor opaco y conservan una referencia fuente única. Solo una membresía `ACTIVE` permite consultar o reaccionar.

Las reacciones iniciales son 😂, 🔥, 👀, 💀 y 🤡. La presencia muestra únicamente un recuento anónimo de sesiones con actividad reciente y expira a los 90 segundos. Perfiles y Head-to-Head usan exclusivamente resultados publicados compartidos; lo provisional se identifica y nunca se mezcla en agregados históricos.
