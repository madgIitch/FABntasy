# Fantasy FAB — Descubrimientos técnicos e ingesta de datos

> Documento de trabajo sobre la viabilidad técnica de una PWA de fantasy para competiciones federadas de la Federación Andaluza de Baloncesto (FAB), con foco inicial en la 1ª Provincial Senior de Sevilla.
>
> Última actualización: 4 de septiembre de 2026.

---

## 1. Objetivo del proyecto

La idea es construir una **PWA accesible desde cualquier navegador**, evitando depender de Google Play y App Store.

El producto inicial estaría orientado a una competición concreta, idealmente:

- 1ª Provincial Senior Masculina de Sevilla.
- Temporada activa 2026/2027.

La arquitectura debe permitir ampliar posteriormente a:

- otras provinciales de Sevilla;
- otras provincias andaluzas;
- Liga Nacional N1;
- otras competiciones FAB.

La clave técnica del proyecto es que **la PWA no debe obtener directamente los datos desde FAB**. En su lugar, tendremos un proceso de ingesta independiente que recopile, normalice y almacene los datos.

---

# 2. Arquitectura general propuesta

```text
                FAB / Afición FAB
                       │
                       │ HTTP
                       ▼
              ┌──────────────────┐
              │   FAB INGESTOR   │
              │      Python      │
              └────────┬─────────┘
                       │
              normalización + upsert
                       │
                       ▼
                ┌──────────────┐
                │ PostgreSQL   │
                └──────┬───────┘
                       │
                 API propia
                       │
                       ▼
                ┌──────────────┐
                │     PWA      │
                │ Next.js/TS   │
                └──────────────┘
```

Principio importante:

> La PWA nunca debería depender directamente de la API de Afición FAB.

Esto permite que, si FAB/Gesdeportiva cambia un endpoint, únicamente tengamos que modificar el ingestor.

---

# 3. Hallazgo principal: Afición FAB utiliza un backend HTTP estructurado

Afición FAB no depende únicamente de páginas HTML ni de PDFs.

Analizando el APK **Afición FAB 5.0.27** se ha comprobado que la aplicación consume un backend ASP.NET mediante peticiones HTTP.

Host principal observado:

```text
https://appaficion.andaluzabaloncesto.org/
```

También aparecen referencias a:

```text
https://appaficion.gesdeportiva.es/
```

El servidor responde como:

```text
Microsoft-IIS/10.0
ASP.NET 4.x
```

Además expone cabeceras CORS como:

```text
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
Access-Control-Allow-Credentials: true
```

---

# 4. Registro de dispositivo

## Estado: CONFIRMADO CON LLAMADA REAL

Antes de consultar determinados endpoints, la app registra un dispositivo.

Endpoint:

```text
POST https://appaficion.andaluzabaloncesto.org/dispositivo.ashx
```

Content-Type:

```text
application/x-www-form-urlencoded
```

Parámetros utilizados:

```text
accion=registrar
uid=<identificador aleatorio/dispositivo>
plataforma=ANDROID
tipo_dispositivo=PHONE
version=5.0.27
```

Ejemplo PowerShell:

```powershell
$uid = -join ((1..16) | ForEach-Object {
    '{0:x}' -f (Get-Random -Maximum 16)
})

$reg = Invoke-RestMethod `
    -Method Post `
    -Uri "https://appaficion.andaluzabaloncesto.org/dispositivo.ashx" `
    -ContentType "application/x-www-form-urlencoded" `
    -Body @{
        accion           = "registrar"
        uid              = $uid
        plataforma       = "ANDROID"
        tipo_dispositivo = "PHONE"
        version          = "5.0.27"
    }
```

La respuesta real obtenida tiene esta estructura:

```json
{
  "resultado": "correcto",
  "id_dispositivo": "...",
  "key": "...",
  "ruta": "https://appaficion.andaluzabaloncesto.org/",
  "error": ""
}
```

Por tanto, para las llamadas siguientes se utilizan:

```text
id_dispositivo
key
```

No fue necesario iniciar sesión con una cuenta de usuario para obtener estas credenciales de dispositivo.

---

# 5. Buscador general

## Endpoint

```text
POST /v2/busqueda.ashx
```

## Estado: CONFIRMADO

La aplicación utiliza este handler para distintos tipos de búsqueda mediante el parámetro `accion`.

Acciones identificadas:

```text
buscarCategoria
buscarPartido
buscarEquipo
buscarJugador
buscarClub
```

---

# 6. Buscar partidos

## Estado: CONFIRMADO CON LLAMADAS REALES

Ejemplo:

```powershell
$r = Invoke-RestMethod `
    -Method Post `
    -Uri "https://appaficion.andaluzabaloncesto.org/v2/busqueda.ashx" `
    -ContentType "application/x-www-form-urlencoded" `
    -Body @{
        accion         = "buscarPartido"
        id_dispositivo = $id
        key            = $key
        texto          = "Coria"
        skip           = "0"
    }
```

La respuesta contiene:

```text
partidos
resultado
key
ruta
error
numeroMaximoResultados
```

El backend indicó:

```text
numeroMaximoResultados = 20
```

Por tanto existe paginación mediante:

```text
skip = 0
skip = 20
skip = 40
...
```

---

# 7. Estructura observada de un partido

La búsqueda real devolvió objetos con campos como:

```text
IdPartido
IdPartidoNotificacion

NombreEquipoLocal
NombreEquipoVisitante

ImgEquipoLocal
ImgEquipoVisitante

Fecha
Hora

CampoJuego
DireccionCampo
Longitud
Latitud

Competicion
Categoria
Delegacion

Estado

FechaHora
FechaHoraUTC

NumeroJornada
FechaJornada

Video

Resultados
  ResultadoLocal
  ResultadoVisitante
  ResultadosPeriodo

OTT
UrlOTT

TipoActa
```

Ejemplo de valores observados:

```text
Competicion = COMPETICIONES-FAB-26-27
Categoria   = LIGA NACIONAL N1 MAS
Estado      = No comenzado
TipoActa    = ESTADÍSTICAS
```

Esto es especialmente importante porque el backend distingue explícitamente:

```text
TipoActa = ACTA
```

de:

```text
TipoActa = ESTADÍSTICAS
```

Para el fantasy interesan principalmente los partidos con:

```text
TipoActa = ESTADÍSTICAS
```

---

# 8. Identificadores de partido

Se han observado dos identificadores distintos.

## IdPartidoNotificacion

Ejemplo:

```text
512037
```

Es un entero relativamente normal.

## IdPartido

Ejemplo aproximado:

```text
6D007200510076004300510047004800...
```

Es un identificador opaco codificado.

El APK utiliza `IdPartido` para varias operaciones internas.

Para el endpoint de estadísticas debemos trabajar inicialmente con este identificador opaco.

---

# 9. Buscar categorías/competiciones

## Estado: CONFIRMADO CON LLAMADA REAL

La acción correcta es:

```text
POST /v2/busqueda.ashx
accion=buscarCategoria
```

No:

```text
/v2/categoria.ashx
```

Ejemplo:

```powershell
$body = @{
    accion         = "buscarCategoria"
    id_dispositivo = $id
    key            = $key
    texto          = "Senior"
    skip           = "0"
}

$categorias = Invoke-RestMethod `
    -Method Post `
    -Uri "https://appaficion.andaluzabaloncesto.org/v2/busqueda.ashx" `
    -ContentType "application/x-www-form-urlencoded" `
    -Body $body
```

Cada resultado contiene:

```text
Id
IdCompeticionCategoria
NombreCategoria
NombreCompeticion
NombreDelegacion
```

Ejemplo real:

```text
NombreCategoria        = Senior Masculino
NombreCompeticion      = CAMPEONATO PROVINCIAL ESPECIAL 26/27
NombreDelegacion       = Delegación de Huelva
```

---

# 10. Buscar equipos

## Estado: CONFIRMADO CON LLAMADA REAL

Acción:

```text
accion=buscarEquipo
```

Endpoint:

```text
POST /v2/busqueda.ashx
```

Ejemplo:

```powershell
$bodyEquipo = @{
    accion         = "buscarEquipo"
    id_dispositivo = $id
    key            = $key
    texto          = "CIRCULO MERCANTIL"
    skip           = "0"
}
```

Los objetos de equipo contienen:

```text
Nombre
Club
Categoria
Competicion
Delegacion
Temporada

IdCategoriaCompeticion
IdCompeticion
IdCategoria
IdEquipoNotificacion
Id
```

Ejemplo real observado:

```text
Nombre      = CIRCULO MERCANTIL E INDUSTRIAL
Categoria   = LIGA NACIONAL N1 MAS
Competicion = COMPETICIONES-FAB-26-27
Temporada   = Temporada 2026/2027
```

---

# 11. Comportamiento respecto a temporadas

Las pruebas realizadas indican que los buscadores:

```text
buscarCategoria
buscarEquipo
buscarPartido
```

están claramente orientados a la **temporada activa**.

Se intentó buscar directamente:

```text
25/26
Provincial 25/26
Senior 25/26
```

sin obtener competiciones históricas útiles.

También `buscarEquipo` para Círculo Mercantil devolvió únicamente inscripciones de:

```text
Temporada 2026/2027
```

Esto no representa un problema para el producto, ya que el fantasy se plantea para la temporada activa.

Conclusión:

> No es necesario resolver la obtención de históricos 25/26 para lanzar el fantasy 26/27.

---

# 12. Endpoint de estadísticas del partido

## Estado: IDENTIFICADO EN APK, PENDIENTE DE VALIDACIÓN CON PARTIDO TERMINADO

Endpoint encontrado en Afición FAB 5.0.27:

```text
POST /v2/envivo/estadisticas.ashx
```

Parámetros identificados:

```text
id_dispositivo
key
id_partido
```

Petición prevista:

```powershell
$stats = Invoke-RestMethod `
    -Method Post `
    -Uri "https://appaficion.andaluzabaloncesto.org/v2/envivo/estadisticas.ashx" `
    -ContentType "application/x-www-form-urlencoded" `
    -Body @{
        id_dispositivo = $id
        key            = $key
        id_partido     = $partido.IdPartido
    }
```

Este es el endpoint central para la futura ingesta del fantasy.

---

# 13. Estadísticas disponibles según el APK

## Estado: EXTRAÍDO DEL MODELO DE DATOS DEL APK

El modelo utilizado por Afición FAB contempla, por jugador, campos similares a:

```text
nombre
dorsal
equipo
idequipo
componente_id

capitan
quintetotitular

puntos

canasta1p
canasta2p
canasta3p

tiro1p
tiro1Fallado

tiro2p
tiro2Fallado

tiro3p
tiro3Fallado

porcentaje1p
porcentaje2p
porcentaje3p

reboteofensivo
rebotedefensivo
rebotes

asistencias
recuperaciones
perdidas

taponescometidos
taponesrecibidos

faltascometidas
faltasrecibidas
tecnicas

tiempo_jugado
milisegundos_jugados

valoracion
masMenos
```

Si el endpoint devuelve efectivamente estos campos para la competición provincial, el dataset es más que suficiente para un fantasy completo.

Permitiría calcular puntuaciones basadas en:

- puntos;
- rebotes;
- asistencias;
- robos;
- pérdidas;
- tapones;
- tiros anotados/fallados;
- faltas;
- minutos;
- valoración;
- +/-.

---

# 14. Estructura del objeto de estadísticas

## Estado: EXTRAÍDO DEL APK

El contenedor de estadísticas contempla campos como:

```text
estadisticasEquipoLocal
estadisticasEquipoVisitante

fechaUltimaActualizacion

categoria
competicion
delegacion
temporada

entrenadorLocal
entrenadorVisitante

equipoLocal
equipoVisitante
```

Esto permitiría reconstruir tanto el boxscore individual como el contexto completo del partido.

---

# 15. Descarga de PDF de estadísticas

## Estado: IDENTIFICADO EN APK, PENDIENTE DE PRUEBA

El APK construye una URL similar a:

```text
GET /descargar.ashx
```

con:

```text
tipo=estadisticaPartido
id_partido=<ID>
id_dispositivo=<ID_DISPOSITIVO>
key=<KEY>
```

Ejemplo:

```powershell
curl.exe -L -G `
  "https://appaficion.andaluzabaloncesto.org/descargar.ashx" `
  --data-urlencode "tipo=estadisticaPartido" `
  --data-urlencode "id_partido=$partido" `
  --data-urlencode "id_dispositivo=$id" `
  --data-urlencode "key=$key" `
  -o "estadisticas_$partido.pdf"
```

Para el fantasy, el PDF sería principalmente:

- respaldo;
- depuración;
- comprobación manual;
- auditoría de inconsistencias.

No debería ser la fuente primaria si disponemos del JSON estructurado.

---

# 16. Otros endpoints detectados en el APK

Se localizaron referencias a endpoints como:

```text
/v2/envivo/estadisticas.ashx
/v2/envivo/comparativa.ashx
/v2/envivo/mapa-de-tiro.ashx
/v2/envivo/mejores-jugadores.ashx
```

También se observaron acciones asociadas a categorías:

```text
detalleCategoria
clasificacion
equipos

estadisticaEquipo
estadisticaEquipoCC

estadisticaJugadores
estadisticaJugadoresCC

mejoresJugadores

fasesGrupos

Jornadas

horariosFecha
horariosJornadas
```

No todos estos endpoints/acciones han sido todavía probados contra el servidor.

---

# 17. Flujo previsto para recorrer una competición

La estrategia ideal para la temporada activa sería:

```text
buscarCategoria
      │
      ▼
competición/categoría
      │
      ▼
detalle / fasesGrupos
      │
      ▼
grupo + fase
      │
      ▼
Jornadas
      │
      ▼
horariosJornadas
      │
      ▼
partidos
      │
      ▼
TipoActa == ESTADÍSTICAS
      │
      ▼
estadisticas.ashx
      │
      ▼
boxscore
```

Todavía faltan algunas pruebas para reconstruir al 100 % las firmas exactas de:

```text
fasesGrupos
Jornadas
horariosJornadas
```

pero el APK confirma que estas operaciones existen.

---

# 18. Ingestor Python propuesto

La ingesta puede resolverse con un servicio Python relativamente pequeño.

Estructura propuesta:

```text
fab_ingestor/
├── __init__.py
├── client.py
├── auth.py
├── competitions.py
├── teams.py
├── games.py
├── stats.py
├── normalizer.py
├── storage.py
├── config.py
└── main.py
```

---

# 19. Cliente FAB

Interfaz deseada:

```python
class FabClient:
    def register_device(self):
        ...

    def search_category(self, text, skip=0):
        ...

    def search_team(self, text, skip=0):
        ...

    def search_match(self, text, skip=0):
        ...

    def get_groups(self, competition_id):
        ...

    def get_rounds(self, competition_id, group_id):
        ...

    def get_matches(self, competition_id, group_id, round_id):
        ...

    def get_match_stats(self, match_id):
        ...

    def download_match_stats_pdf(self, match_id):
        ...
```

---

# 20. Ejemplo simplificado del ingestor

```python
def ingest_competition(client, db, competition):
    teams = client.get_teams(competition)

    for team in teams:
        db.upsert_team(team)

    matches = client.get_matches(competition)

    for match in matches:
        db.upsert_match(match)

        if (
            match["Estado"] == "Terminado"
            and match["TipoActa"] == "ESTADÍSTICAS"
        ):
            stats = client.get_match_stats(match["IdPartido"])
            db.upsert_match_stats(stats)
```

---

# 21. Frecuencia de ejecución

Para un MVP no necesitamos infraestructura compleja.

Puede utilizarse:

```text
cron
```

o un scheduler equivalente.

Por ejemplo:

```cron
*/10 * * * * python /app/fab_ingestor/main.py
```

Sin embargo, una estrategia más razonable sería:

### Entre semana

```text
cada 1-3 horas
```

para actualizar:

- altas/bajas;
- calendarios;
- cambios de horarios.

### Durante jornadas

```text
cada 5-15 minutos
```

para detectar:

- partidos terminados;
- estadísticas nuevas;
- correcciones.

### Después de la jornada

Una pasada adicional que confirme los resultados definitivos.

---

# 22. Idempotencia

El ingestor debe ser idempotente.

Esto significa que podemos ejecutar:

```text
ingest()
ingest()
ingest()
```

sin duplicar registros.

Para ello utilizaremos:

```text
UPSERT
```

basándonos en identificadores externos FAB.

Ejemplo:

```sql
INSERT INTO games (...)
VALUES (...)
ON CONFLICT (fab_game_id)
DO UPDATE SET ...;
```

---

# 23. Guardar siempre los datos originales

Es muy recomendable conservar las respuestas originales del backend.

Tabla propuesta:

```text
raw_fab_payloads

id
endpoint
entity_type
external_id
retrieved_at
http_status
payload_json
```

Esto sirve para:

- depurar cambios en la API;
- reproducir errores;
- comprobar correcciones;
- reimportar datos sin volver a consultar FAB;
- comparar respuestas antes/después.

---

# 24. Modelo normalizado

Tablas deportivas principales:

```text
competitions
competition_seasons

teams
team_registrations

players
player_registrations

groups
rounds

games

player_game_stats
```

---

# 25. `player_game_stats`

Ejemplo:

```text
id
game_id
player_id
team_id

starter

minutes

points

ft_made
ft_attempted

two_made
two_attempted

three_made
three_attempted

offensive_rebounds
defensive_rebounds
rebounds

assists
steals
turnovers

blocks
blocks_received

fouls_committed
fouls_received
technicals

valuation
plus_minus

raw_payload_id
```

---

# 26. Separación entre datos deportivos y fantasy

Muy importante: no mezclar la estructura FAB con el juego fantasy.

## Datos reales

```text
competitions
teams
players
games
player_game_stats
```

## Datos fantasy

```text
users
fantasy_leagues
fantasy_teams

fantasy_rosters
fantasy_lineups

player_prices

market_listings
transactions

fantasy_round_scores
fantasy_player_scores
```

De esta manera mañana podemos añadir otra competición sin cambiar el motor fantasy.

---

# 27. Puntuación fantasy

Todavía no está definida definitivamente.

Gracias al dataset disponible, podría basarse en:

```text
PTS
REB
AST
STL
BLK
TO

tiros anotados/fallados

faltas
faltas recibidas

valoración

minutos
+/-
```

Una primera posibilidad sería partir de la valoración estadística del partido y aplicar modificadores propios.

Ejemplo conceptual:

```text
Fantasy Score =
    puntos
  + rebotes
  + asistencias
  + robos
  + tapones
  - pérdidas
  - tiros fallados
  + bonus
```

La fórmula debe definirse más adelante desde una perspectiva de diseño de juego, no de ingesta.

---

# 28. PWA

El producto se plantea como una **Progressive Web App**.

Ventajas:

- accesible desde cualquier navegador;
- sin Google Play;
- sin App Store;
- instalación opcional en pantalla de inicio;
- un único frontend;
- enlaces compartibles a ligas;
- despliegue inmediato de nuevas versiones.

Stack inicialmente propuesto:

```text
Frontend/PWA:
Next.js
TypeScript
Tailwind

Backend:
FastAPI o API de Next.js

Base de datos:
PostgreSQL

Ingesta:
Python
```

---

# 29. La PWA NO debe consultar FAB directamente

Evitar:

```text
Browser
   ↓
Afición FAB
```

Utilizar:

```text
Browser
   ↓
Nuestra API
   ↓
Nuestra DB

FAB
 ↓
Python ingestor
 ↓
Nuestra DB
```

Ventajas:

- no exponemos `id_dispositivo` y `key`;
- no dependemos del rendimiento de FAB desde cada cliente;
- podemos cachear;
- podemos controlar errores;
- podemos normalizar;
- podemos corregir datos;
- podemos implementar rate limiting;
- podemos mantener funcionando la PWA aunque FAB esté temporalmente caída.

---

# 30. Gestión de credenciales del dispositivo

Las credenciales:

```text
id_dispositivo
key
```

deben vivir únicamente en el servidor del ingestor.

Nunca deberían aparecer en:

- JavaScript del navegador;
- variables públicas de Next.js;
- código enviado al cliente;
- repositorio Git.

Ejemplo:

```env
FAB_DEVICE_ID=...
FAB_DEVICE_KEY=...
```

El ingestor debería poder volver a ejecutar `register_device()` cuando sea necesario.

---

# 31. Manejo de rotación de `key`

Las respuestas observadas de algunos endpoints pueden devolver una nueva propiedad:

```text
key
```

Por precaución, el cliente debería actualizar la key almacenada cuando el backend entregue una nueva.

Pseudo-código:

```python
response = request(...)

if response.get("key"):
    self.key = response["key"]
    save_key(self.key)
```

---

# 32. Rate limiting y comportamiento responsable

Aunque los datos se muestran públicamente mediante Afición FAB, no estamos trabajando con una API pública documentada.

Por tanto:

- minimizar peticiones;
- cachear;
- no consultar constantemente datos que no cambian;
- usar `If-Modified-Since`/ETag si alguna ruta lo permite;
- actualizar únicamente partidos pendientes;
- no bombardear el backend;
- aplicar backoff en errores.

Ejemplo:

```text
equipos       → 1 vez/día
calendario    → cada pocas horas
partidos live → cada 5-15 min
partidos fin  → una última sincronización
```

---

# 33. Consideración legal / operativa

La interfaz encontrada pertenece a Afición FAB/Gesdeportiva y no se ha localizado documentación pública que la presente como una API oficial para terceros.

Esto significa que para:

```text
prototipo / investigación / MVP
```

podemos diseñar el sistema alrededor de estas rutas mientras validamos la viabilidad técnica.

Para un lanzamiento comercial o a gran escala convendría:

- revisar términos de servicio;
- contactar con FAB/Gesdeportiva;
- solicitar autorización o feed oficial;
- disponer de una estrategia de fallback.

El objetivo arquitectónico debe ser que sustituir la fuente FAB sea barato.

---

# 34. Estado actual de descubrimientos

## Confirmado mediante llamadas reales

- El host de Afición FAB responde.
- Backend IIS/ASP.NET.
- `/v2/` existe.
- Registro de dispositivo mediante `dispositivo.ashx`.
- Obtención de `id_dispositivo`.
- Obtención de `key`.
- `buscarPartido`.
- paginación con `skip`.
- `buscarCategoria`.
- `buscarEquipo`.
- estructura de los objetos de partido.
- estructura básica de categoría.
- estructura básica de equipo.
- existencia de `TipoActa`.
- partidos activos con `TipoActa = ESTADÍSTICAS`.
- temporada activa 2026/27 accesible.

## Confirmado mediante APK 5.0.27

- `/v2/envivo/estadisticas.ashx`.
- modelos detallados de estadísticas.
- descarga de estadísticas mediante `descargar.ashx`.
- acciones de categoría.
- endpoints de comparativa.
- mapas de tiro.
- mejores jugadores.
- uso interno de IDs opacos.

## Pendiente de prueba real

- respuesta de `estadisticas.ashx` sobre un partido terminado.
- descarga PDF real.
- `fasesGrupos`.
- `Jornadas`.
- `horariosJornadas`.
- forma exacta de descubrir automáticamente toda la 1ª Provincial Sevilla 26/27.
- consistencia de estadísticas en todos los partidos provinciales.

---

# 35. Próximo experimento decisivo

En cuanto exista un partido terminado de la competición activa con:

```text
Estado = Terminado
TipoActa = ESTADÍSTICAS
```

hacer:

```text
POST /v2/envivo/estadisticas.ashx
```

con:

```text
id_dispositivo
key
id_partido
```

y validar:

1. estructura JSON;
2. lista de jugadores;
3. presencia de rebotes;
4. asistencias;
5. robos;
6. pérdidas;
7. tapones;
8. tiros;
9. minutos;
10. valoración;
11. +/-.

Si esos campos están presentes, el principal riesgo técnico de la ingesta queda resuelto.

---

# 36. MVP técnico del ingestor

## Sprint 0

- Implementar `FabClient`.
- Registro automático de dispositivo.
- Persistencia de `key`.
- `buscarCategoria`.
- `buscarEquipo`.
- `buscarPartido`.
- logging.
- almacenamiento de payloads RAW.

## Sprint 1

- descubrir competición objetivo;
- equipos;
- jornadas;
- partidos;
- sincronización con PostgreSQL.

## Sprint 2

- `estadisticas.ashx`;
- normalización de boxscores;
- `player_game_stats`;
- validaciones.

## Sprint 3

- scheduler;
- retries/backoff;
- detección de partidos terminados;
- recalculo automático de puntos fantasy.

Después de esto, la ingesta debería convertirse en una pieza prácticamente autónoma.

---

# 37. Conclusión

El principal descubrimiento es que **no necesitamos introducir estadísticas manualmente, hacer OCR ni depender de scraping visual de actas PDF**.

Afición FAB ya consume datos estructurados desde un backend HTTP.

La estrategia recomendada es:

```text
FAB/Afición FAB
      ↓
Python ingestor
      ↓
PostgreSQL
      ↓
Fantasy Engine
      ↓
API propia
      ↓
PWA
```

La ingesta puede mantenerse como un componente Python pequeño, desacoplado del resto del producto.

El principal punto todavía pendiente es validar en un partido terminado la respuesta real de:

```text
/v2/envivo/estadisticas.ashx
```

Una vez confirmado el boxscore, la mayor incógnita técnica del proyecto queda eliminada.
