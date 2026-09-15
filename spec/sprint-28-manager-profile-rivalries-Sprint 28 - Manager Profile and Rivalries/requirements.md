# sprint-28-manager-profile-rivalries · Perfil fantasy completo, palmarés visual y acceso a rivalidades — Requisitos

- name: `Sprint 28 - Manager Profile and Rivalries` · priority: P2 · sdd: true
- aprobado por: peorr · 2026-09-15T12:44:18.348Z

## Contexto

Completar el perfil social de cada manager dentro de una liga privada siguiendo la referencia visual, con identidad real, palmarés verificable, siete iconos aportados por producto, histórico y acceso contextual a comparativas y rivalidades.

## Requisitos funcionales

R1. Existe una ruta canónica de perfil bajo la liga que solo responde para actor y manager objetivo con membresía ACTIVE en esa misma liga; otra liga, expulsión e identificadores inexistentes devuelven 404 RESOURCE_NOT_FOUND sin filtrar existencia.
R2. Los enlaces desde Miembros y Actividad transportan un estado de retorno validado; Atrás restaura pestaña, filtros, cursor, scroll y foco, y un retorno ausente o inválido degrada a la sección Liga sin redirección abierta.
R3. El encabezado devuelve identidad pública autorizada, equipo, posición vigente, valor de plantilla y liga, con un estado explícito PUBLISHED, PROVISIONAL o UNAVAILABLE para cada métrica aplicable.
R4. El avatar usa únicamente una URL autorizada y saneada; ausencia, error de carga o revocación producen un fallback con iniciales derivadas de la identidad pública, texto alternativo útil y ninguna ruta, UUID o metadata privada.
R5. La taxonomía trophy-icons.v1 usa exactamente los siete PNG suministrados y los importa en las rutas semánticas declaradas en visual_assets: montón de mierdas para LEAGUE_LAST_PLACE, mierda para ROUND_LAST_PLACE, corona para CURRENT_LEAGUE_LEADER, estrella para ROUND_MVP y copas de oro, plata y cobre para LEAGUE_FIRST_PLACE, LEAGUE_SECOND_PLACE y LEAGUE_THIRD_PLACE; no se sustituyen por emojis ni iconos genéricos.
R6. LEAGUE_FIRST_PLACE, LEAGUE_SECOND_PLACE, LEAGUE_THIRD_PLACE y LEAGUE_LAST_PLACE son trofeos permanentes concedidos una vez se cierra la liga usando el orden canónico final; hay exactamente un receptor por puesto y, si hay empate a puntos, se respeta el desempate ya publicado por la clasificación autoritativa.
R7. CURRENT_LEAGUE_LEADER es una insignia temporal y exclusiva del manager que ocupa el primer puesto en la clasificación autoritativa vigente; se mueve al publicar o corregir una jornada, no forma parte del palmarés permanente y nunca convive en dos perfiles de la misma liga.
R8. ROUND_MVP concede y conserva una estrella por cada jornada publicada en la que el manager obtiene la puntuación máxima, y ROUND_LAST_PLACE concede el logro de mierda por cada jornada con la puntuación mínima; si varios managers empatan exactamente en el máximo o mínimo, todos reciben la concesión correspondiente y el perfil muestra el total y el detalle de jornadas.
R9. Cada premio expuesto incluye type, ruleVersion, status, awardedAt, leagueSeasonId, roundNumber nullable, magnitud opcional y referencia pública de revisión; una corrección crea una concesión sustitutiva o revoca la anterior sin eliminar filas auditables y recalcula corona y logros de jornada desde la revisión vigente.
R10. Cada icono se muestra con su etiqueta textual, texto alternativo contextual y recuento cuando pueda repetirse; su significado no depende solo del color, las imágenes conservan proporción sin recorte y se sirven en tamaños responsive sin provocar saltos de layout.
R11. La función de racha implementa la regla versionada aprobada y devuelve tipo, longitud, temporada, primera y última jornada y revisiones fuente; unit tests fijan victoria, empate, interrupción, ausencia, hueco, cambio de temporada y corrección retroactiva.
R12. El histórico usa orden total inmutable por temporada, jornada, revisión e ID opaco, cursor versionado y límite máximo; no duplica ni omite elementos al paginar y separa periodos no comparables.
R13. Compartir genera una tarjeta según un contrato versionado y allowlist de campos; tests inspeccionan que no contiene email, UUID internos, secretos, código o contraseña de liga, presencia ni URLs que concedan acceso.
R14. La compartición prueba tres caminos deterministas: Web Share compatible, fallback de descarga y fallback de copia; cancelación, permiso denegado y API parcial producen mensajes accesibles sin tratar una cancelación del usuario como error crítico.
R15. Head-to-Head solo compara al manager objetivo con el usuario autenticado y Rivalidad solo se habilita cuando la regla vigente devuelve una detección; ambos destinos revalidan las dos membresías ACTIVE en servidor en cada petición.
R16. Carga usa status accesible, errores accionables usan alert, el vacío y la ausencia de histórico tienen texto propio, y tras cargar o fallar se conserva una secuencia de foco coherente; todas las acciones tienen objetivo mínimo de 44 por 44 px.
R17. E2E cubre 320, 375, 768, 1024 y 1440 px, navegación por teclado, lector de pantalla mediante nombres y roles, avatar roto, perfil propio, expulsión durante sesión, retorno desde ambas secciones y los fallbacks de compartir.
R18. La migración, si resulta necesaria, es aditiva, admite datos previos de Sprint 27 y no borra premios ni revisiones; el rollback de aplicación mantiene legibles las tablas y rutas anteriores.
R19. Los tests unitarios, integración PostgreSQL con RLS y E2E incluyen dos ligas aisladas, cursor inválido, empate, jornada ausente, corrección y supersesión; typecheck, lint, test, Prisma validate y diff-scope terminan con código cero.

## Restricciones

- **error_states:** Sin sesión se devuelve 401. Liga o manager inexistente, ajeno o sin membresía ACTIVE devuelve siempre 404 RESOURCE_NOT_FOUND para no filtrar existencia. Un cursor inválido devuelve 422 INVALID_CURSOR. Los fallos de avatar, tarjeta o compartición son locales, mantienen utilizable el perfil y ofrecen fallback o reintento con mensajes accesibles.
- **auth_secrets:** El actor procede de Supabase Auth; perfil, premios y comparativas exigen membresía ACTIVE en la misma liga mediante servidor y RLS. La tarjeta excluye correo, UUID, secretos, presencia y cualquier dato que conceda acceso. La expulsión revoca el acceso inmediatamente y se representa como 404 RESOURCE_NOT_FOUND.
- **rollback_compat:** La entrega es estrictamente aditiva y compatible con Sprint 27, sin backfill bloqueante. Los premios antiguos incompletos se presentan como Histórico anterior, con los campos disponibles y UNAVAILABLE en los ausentes. Un flag server-side desactiva las rutas y entradas nuevas; el rollback conserva filas, premios y revisiones y mantiene operativas las superficies anteriores.

