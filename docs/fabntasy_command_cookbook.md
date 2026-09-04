# FABntasy — Command Cookbook

> Referencia operativa de los comandos que han resultado útiles durante el desarrollo e investigación de FABntasy.
>
> Objetivo: tener en un único archivo los comandos de entorno, PostgreSQL/Prisma, ingestor Python y reverse engineering/consulta de Afición FAB.
>
> **Importante:** no guardar nunca credenciales reales de FAB en Git. Los valores `FAB_DEVICE_ID` y `FAB_KEY` deben permanecer vacíos en `.env.example` y cargarse únicamente en entorno privado.

---

# 1. Variables de entorno

## `.env.example`

Este es el bloque base que debe poder commitearse:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fabntasy
FAB_DEVICE_ID=
FAB_KEY=
INGESTOR_MODE=mock

# Never expose the following as NEXT_PUBLIC_* variables.
```

Regla fundamental:

```text
FAB_DEVICE_ID
FAB_KEY
DATABASE_URL
```

son variables **server-side**.

Nunca:

```env
NEXT_PUBLIC_FAB_DEVICE_ID=...
NEXT_PUBLIC_FAB_KEY=...
NEXT_PUBLIC_DATABASE_URL=...
```

La PWA no debe conocer ninguna credencial de Afición FAB.

---

# 2. Crear el `.env` desde PowerShell

Desde la raíz del repositorio:

```powershell
@'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fabntasy
FAB_DEVICE_ID=
FAB_KEY=
INGESTOR_MODE=mock

# Never expose the following as NEXT_PUBLIC_* variables.
'@ | Set-Content .env
```

Para crear también el ejemplo seguro:

```powershell
@'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fabntasy
FAB_DEVICE_ID=
FAB_KEY=
INGESTOR_MODE=mock

# Never expose the following as NEXT_PUBLIC_* variables.
'@ | Set-Content .env.example
```

Comprobar el contenido:

```powershell
Get-Content .env
```

---

# 3. Variables temporales en la sesión de PowerShell

Si no queremos editar `.env`:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/fabntasy"
$env:FAB_DEVICE_ID = ""
$env:FAB_KEY = ""
$env:INGESTOR_MODE = "mock"
```

Verificar:

```powershell
$env:DATABASE_URL
$env:INGESTOR_MODE
```

Evitar imprimir:

```powershell
$env:FAB_DEVICE_ID
$env:FAB_KEY
```

en capturas, logs o terminales compartidos.

---

# 4. Modos del ingestor

Durante desarrollo sin tocar FAB:

```env
INGESTOR_MODE=mock
```

Cuando el ingestor real esté preparado:

```env
INGESTOR_MODE=live
```

La aplicación debería negarse a usar modo live si faltan:

```text
FAB_DEVICE_ID
FAB_KEY
```

---

# 5. PostgreSQL local con Docker

Una forma sencilla de levantar PostgreSQL local:

```powershell
docker run `
    --name fabntasy-postgres `
    -e POSTGRES_USER=postgres `
    -e POSTGRES_PASSWORD=postgres `
    -e POSTGRES_DB=fabntasy `
    -p 5432:5432 `
    -d postgres:16
```

La URL correspondiente es:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fabntasy
```

Comprobar contenedores:

```powershell
docker ps
```

Comprobar también los detenidos:

```powershell
docker ps -a
```

Arrancar PostgreSQL de nuevo:

```powershell
docker start fabntasy-postgres
```

Pararlo:

```powershell
docker stop fabntasy-postgres
```

Ver logs:

```powershell
docker logs fabntasy-postgres
```

Seguir logs:

```powershell
docker logs -f fabntasy-postgres
```

Entrar con `psql`:

```powershell
docker exec -it fabntasy-postgres psql -U postgres -d fabntasy
```

Dentro de `psql`:

```sql
\dt
```

Ver bases de datos:

```sql
\l
```

Salir:

```sql
\q
```

Eliminar el contenedor local si queremos recrearlo:

```powershell
docker rm -f fabntasy-postgres
```

> Esto elimina el contenedor. Si no se ha configurado un volumen persistente, también se perderán sus datos locales.

---

# 6. Prisma

Instalar/generar cliente:

```powershell
pnpm prisma generate
```

Validar schema:

```powershell
pnpm prisma validate
```

Crear/aplicar una migración de desarrollo:

```powershell
pnpm prisma migrate dev
```

Con nombre:

```powershell
pnpm prisma migrate dev --name init
```

Abrir Prisma Studio:

```powershell
pnpm prisma studio
```

Comprobar estado de migraciones:

```powershell
pnpm prisma migrate status
```

Aplicar migraciones en producción:

```powershell
pnpm prisma migrate deploy
```

---

# 7. Comandos generales del proyecto

Habilitar Corepack:

```powershell
corepack enable
```

Instalar dependencias:

```powershell
pnpm install
```

Typecheck:

```powershell
pnpm typecheck
```

Lint:

```powershell
pnpm lint
```

Tests:

```powershell
pnpm test
```

Arrancar desarrollo cuando el repositorio exponga el script raíz:

```powershell
pnpm dev
```

---

# 8. Python — entorno del ingestor

Crear virtualenv en Windows:

```powershell
py -3.12 -m venv .venv
```

Activarlo:

```powershell
.\.venv\Scripts\Activate.ps1
```

Actualizar pip:

```powershell
python -m pip install --upgrade pip
```

Si el servicio usa `requirements.txt`:

```powershell
python -m pip install -r services/fab_ingestor/requirements.txt
```

Tests:

```powershell
python -m pytest
```

Si Ruff está configurado:

```powershell
ruff check services/fab_ingestor
```

Formateo:

```powershell
ruff format services/fab_ingestor
```

Salir del virtualenv:

```powershell
deactivate
```

---

# 9. Afición FAB — host principal

Backend descubierto:

```text
https://appaficion.andaluzabaloncesto.org/
```

Comprobar respuesta del host:

```powershell
curl.exe -I "https://appaficion.andaluzabaloncesto.org/"
```

Comprobar `/v2/`:

```powershell
curl.exe -I "https://appaficion.andaluzabaloncesto.org/v2/"
```

El hecho de que `/v2/` devuelva `403` no significa que los handlers no existan.

Los endpoints concretos `.ashx` sí responden.

---

# 10. Registrar un dispositivo en Afición FAB

## Confirmado con llamada real

Generar UID aleatorio:

```powershell
$uid = -join ((1..16) | ForEach-Object {
    '{0:x}' -f (Get-Random -Maximum 16)
})
```

Registrar dispositivo:

```powershell
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

Inspeccionar respuesta sin necesidad de copiarla completa:

```powershell
$reg |
    Select-Object resultado, id_dispositivo, ruta, error |
    Format-List
```

Guardar credenciales en variables de PowerShell:

```powershell
$id  = $reg.id_dispositivo
$key = $reg.key
```

No hace falta hacer login de usuario para esta operación.

---

# 11. Llevar las credenciales recién obtenidas al entorno

Para la sesión actual:

```powershell
$env:FAB_DEVICE_ID = $id
$env:FAB_KEY = $key
```

Para trabajar en live:

```powershell
$env:INGESTOR_MODE = "live"
```

No pegar automáticamente `$key` en Git ni en un `.env.example`.

---

# 12. Buscar partidos

## Confirmado con llamada real

```powershell
$partidos = Invoke-RestMethod `
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

Ver JSON:

```powershell
$partidos | ConvertTo-Json -Depth 30
```

Ver solo campos interesantes:

```powershell
$partidos.partidos |
    Select-Object `
        Fecha,
        NombreEquipoLocal,
        NombreEquipoVisitante,
        Competicion,
        Categoria,
        Delegacion,
        Estado,
        TipoActa,
        IdPartidoNotificacion,
        IdPartido |
    Format-Table -Wrap -AutoSize
```

---

# 13. Paginación de partidos

Afición FAB devuelve como máximo 20 resultados por página.

Ejemplo:

```powershell
$todos = @()

for ($skip = 0; $skip -le 1000; $skip += 20) {

    $r = Invoke-RestMethod `
        -Method Post `
        -Uri "https://appaficion.andaluzabaloncesto.org/v2/busqueda.ashx" `
        -ContentType "application/x-www-form-urlencoded" `
        -Body @{
            accion         = "buscarPartido"
            id_dispositivo = $id
            key            = $key
            texto          = "Coria"
            skip           = "$skip"
        }

    if ($r.key) {
        $key = $r.key
    }

    if (-not $r.partidos -or $r.partidos.Count -eq 0) {
        break
    }

    $todos += $r.partidos

    Write-Host "skip=$skip -> $($r.partidos.Count) partidos"

    if ($r.partidos.Count -lt 20) {
        break
    }
}
```

Importante:

```powershell
if ($r.key) {
    $key = $r.key
}
```

porque el backend puede devolver una `key` actualizada.

---

# 14. Buscar varios equipos/strings de partido

```powershell
$terminos = @(
    "Coria",
    "Nautico",
    "Náutico",
    "Caja 87"
)

$todos = @()

foreach ($texto in $terminos) {

    Write-Host "Buscando: $texto"

    for ($skip = 0; $skip -le 1000; $skip += 20) {

        $r = Invoke-RestMethod `
            -Method Post `
            -Uri "https://appaficion.andaluzabaloncesto.org/v2/busqueda.ashx" `
            -ContentType "application/x-www-form-urlencoded" `
            -Body @{
                accion         = "buscarPartido"
                id_dispositivo = $id
                key            = $key
                texto          = $texto
                skip           = "$skip"
            }

        if ($r.key) {
            $key = $r.key
        }

        if (-not $r.partidos -or $r.partidos.Count -eq 0) {
            break
        }

        $todos += $r.partidos

        Write-Host "  skip=$skip -> $($r.partidos.Count) partidos"

        if ($r.partidos.Count -lt 20) {
            break
        }
    }
}
```

---

# 15. Buscar categorías

## Confirmado con llamada real

**Endpoint correcto:**

```text
/v2/busqueda.ashx
```

No usar `/v2/categoria.ashx` para `buscarCategoria`.

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

Ver JSON:

```powershell
$categorias | ConvertTo-Json -Depth 30
```

Tabla:

```powershell
$categorias.categorias |
    Select-Object `
        IdCompeticionCategoria,
        NombreCategoria,
        NombreCompeticion,
        NombreDelegacion,
        Id |
    Format-Table -Wrap -AutoSize
```

---

# 16. Paginar búsquedas de categorías

```powershell
$busquedas = @(
    "Senior",
    "Provincial",
    "Campeonato Provincial"
)

$resultados = @()

foreach ($texto in $busquedas) {

    for ($skip = 0; $skip -le 100; $skip += 20) {

        $r = Invoke-RestMethod `
            -Method Post `
            -Uri "https://appaficion.andaluzabaloncesto.org/v2/busqueda.ashx" `
            -ContentType "application/x-www-form-urlencoded" `
            -Body @{
                accion         = "buscarCategoria"
                id_dispositivo = $id
                key            = $key
                texto          = $texto
                skip           = "$skip"
            }

        if ($r.key) {
            $key = $r.key
        }

        if ($r.categorias) {
            $resultados += $r.categorias
        }

        if (-not $r.categorias -or $r.categorias.Count -lt 20) {
            break
        }
    }
}
```

Filtrar Sevilla:

```powershell
$resultados |
    Sort-Object IdCompeticionCategoria -Unique |
    Where-Object {
        $_.NombreDelegacion -like "*Sevilla*"
    } |
    Select-Object `
        IdCompeticionCategoria,
        NombreCategoria,
        NombreCompeticion,
        NombreDelegacion,
        Id |
    Format-Table -Wrap -AutoSize
```

---

# 17. Buscar equipos

## Confirmado con llamada real

```powershell
$bodyEquipo = @{
    accion         = "buscarEquipo"
    id_dispositivo = $id
    key            = $key
    texto          = "CIRCULO MERCANTIL"
    skip           = "0"
}

$equipos = Invoke-RestMethod `
    -Method Post `
    -Uri "https://appaficion.andaluzabaloncesto.org/v2/busqueda.ashx" `
    -ContentType "application/x-www-form-urlencoded" `
    -Body $bodyEquipo
```

Mostrar campos interesantes:

```powershell
$equipos.equipos |
    Select-Object `
        Nombre,
        Club,
        Categoria,
        Competicion,
        Delegacion,
        Temporada,
        IdCategoriaCompeticion,
        IdCompeticion,
        IdCategoria,
        IdEquipoNotificacion,
        Id |
    Format-List
```

---

# 18. Paginar búsqueda de equipos

```powershell
$todosEquipos = @()

for ($skip = 0; $skip -le 200; $skip += 20) {

    $r = Invoke-RestMethod `
        -Method Post `
        -Uri "https://appaficion.andaluzabaloncesto.org/v2/busqueda.ashx" `
        -ContentType "application/x-www-form-urlencoded" `
        -Body @{
            accion         = "buscarEquipo"
            id_dispositivo = $id
            key            = $key
            texto          = "CIRCULO MERCANTIL"
            skip           = "$skip"
        }

    if ($r.key) {
        $key = $r.key
    }

    if (-not $r.equipos -or $r.equipos.Count -eq 0) {
        break
    }

    $todosEquipos += $r.equipos

    if ($r.equipos.Count -lt 20) {
        break
    }
}
```

Ver resultados:

```powershell
$todosEquipos |
    Select-Object `
        Nombre,
        Categoria,
        Competicion,
        Delegacion,
        Temporada,
        Id |
    Format-List
```

---

# 19. Mostrar partidos de forma legible

En vez de imprimir el JSON entero:

```powershell
$todos |
    Sort-Object Fecha |
    ForEach-Object {
        [PSCustomObject]@{
            Fecha       = $_.Fecha
            Local       = $_.NombreEquipoLocal
            Visitante   = $_.NombreEquipoVisitante
            Competicion = $_.Competicion
            Categoria   = $_.Categoria
            Delegacion  = $_.Delegacion
            Estado      = $_.Estado
            TipoActa    = $_.TipoActa
            ID          = $_.IdPartidoNotificacion
        }
    } |
    Format-List
```

---

# 20. Filtrar partidos por temporada/fecha

Este bloque fue útil durante la investigación del histórico:

```powershell
$historicos = $todos |
    Sort-Object IdPartido -Unique |
    Where-Object {

        try {
            $fecha = [datetime]::ParseExact(
                $_.Fecha,
                "dd/MM/yyyy",
                [System.Globalization.CultureInfo]::InvariantCulture
            )

            $fecha -ge [datetime]"2025-09-01" -and
            $fecha -le [datetime]"2026-06-30"
        }
        catch {
            $false
        }
    }
```

Aunque el fantasy final se centra en la temporada activa, este patrón sigue siendo útil para depuración.

---

# 21. Filtrar por delegación

```powershell
$historicos |
    Where-Object {
        $_.Delegacion -like "*Sevilla*"
    } |
    Select-Object `
        Fecha,
        NombreEquipoLocal,
        NombreEquipoVisitante,
        Competicion,
        Categoria,
        Estado,
        TipoActa,
        IdPartidoNotificacion |
    Sort-Object Fecha |
    Format-Table -Wrap -AutoSize
```

---

# 22. Filtrar partidos con estadísticas

Para encontrar candidatos interesantes para el fantasy:

```powershell
$candidatos = $todos |
    Where-Object {
        $_.TipoActa -eq "ESTADÍSTICAS"
    }
```

Solo terminados:

```powershell
$candidatos = $todos |
    Where-Object {
        $_.Estado -eq "Terminado" -and
        $_.TipoActa -eq "ESTADÍSTICAS"
    }
```

Inspeccionar:

```powershell
$candidatos |
    Select-Object `
        Fecha,
        NombreEquipoLocal,
        NombreEquipoVisitante,
        Competicion,
        Categoria,
        IdPartidoNotificacion,
        IdPartido |
    Format-List
```

Seleccionar uno:

```powershell
$p = $candidatos | Select-Object -First 1
```

Ver todo:

```powershell
$p | Format-List *
```

---

# 23. Estadísticas de partido

## Endpoint encontrado en APK 5.0.27

```text
POST /v2/envivo/estadisticas.ashx
```

Parámetros:

```text
id_dispositivo
key
id_partido
```

Comando:

```powershell
$stats = Invoke-RestMethod `
    -Method Post `
    -Uri "https://appaficion.andaluzabaloncesto.org/v2/envivo/estadisticas.ashx" `
    -ContentType "application/x-www-form-urlencoded" `
    -Body @{
        id_dispositivo = $id
        key            = $key
        id_partido     = $p.IdPartido
    }
```

Ver respuesta:

```powershell
$stats | ConvertTo-Json -Depth 50
```

> Este endpoint es el punto central para la ingesta automática de boxscores.

---

# 24. PDF de estadísticas de un partido

## Endpoint encontrado en APK

```powershell
$partido = $p.IdPartido

curl.exe -L -G `
  "https://appaficion.andaluzabaloncesto.org/descargar.ashx" `
  --data-urlencode "tipo=estadisticaPartido" `
  --data-urlencode "id_partido=$partido" `
  --data-urlencode "id_dispositivo=$id" `
  --data-urlencode "key=$key" `
  -o "estadisticas_partido.pdf"
```

El PDF debe considerarse herramienta secundaria:

```text
JSON estructurado -> fuente principal
PDF -> auditoría/debug/fallback manual
```

---

# 25. Endpoints FAB relevantes descubiertos

```text
https://appaficion.andaluzabaloncesto.org/autenticar.ashx
https://appaficion.andaluzabaloncesto.org/delegaciones.ashx
https://appaficion.andaluzabaloncesto.org/descargar.ashx
https://appaficion.andaluzabaloncesto.org/dispositivo.ashx
https://appaficion.andaluzabaloncesto.org/equipos-jugadores.ashx
https://appaficion.andaluzabaloncesto.org/imagenes.ashx
https://appaficion.andaluzabaloncesto.org/misdatos.ashx

https://appaficion.andaluzabaloncesto.org/v2/busqueda.ashx
https://appaficion.andaluzabaloncesto.org/v2/categoria.ashx
https://appaficion.andaluzabaloncesto.org/v2/club.ashx
https://appaficion.andaluzabaloncesto.org/v2/equipo.ashx
https://appaficion.andaluzabaloncesto.org/v2/jugador.ashx

https://appaficion.andaluzabaloncesto.org/v2/envivo/partido.ashx
https://appaficion.andaluzabaloncesto.org/v2/envivo/estadisticas.ashx
https://appaficion.andaluzabaloncesto.org/v2/envivo/comparativa.ashx
https://appaficion.andaluzabaloncesto.org/v2/envivo/mapa-de-tiro.ashx
https://appaficion.andaluzabaloncesto.org/v2/envivo/mejores-jugadores.ashx
https://appaficion.andaluzabaloncesto.org/v2/envivo/videos.ashx
```

No todos han sido probados todavía.

---

# 26. Acciones de categoría descubiertas

En `/v2/categoria.ashx` se han identificado:

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

No usar:

```text
accion=buscarCategoria
```

contra:

```text
/v2/categoria.ashx
```

porque esa combinación devolvió:

```text
Faltan parámetros
```

`buscarCategoria` pertenece a:

```text
/v2/busqueda.ashx
```

---

# 27. `fasesGrupos` para un equipo

Firma descubierta en APK:

```text
POST /v2/equipo.ashx
accion=fasesGrupos
id_dispositivo
key
id_equipo
```

Comando preparado:

```powershell
$fases = Invoke-RestMethod `
    -Method Post `
    -Uri "https://appaficion.andaluzabaloncesto.org/v2/equipo.ashx" `
    -ContentType "application/x-www-form-urlencoded" `
    -Body @{
        accion         = "fasesGrupos"
        id_dispositivo = $id
        key            = $key
        id_equipo      = $equipo.Id
    }

$fases | ConvertTo-Json -Depth 30
```

> Pendiente de cerrar/validar completamente en el flujo de competición objetivo.

---

# 28. Patrón recomendado para `Invoke-RestMethod`

Durante las pruebas PowerShell hubo errores cuando una línea con backtick:

```powershell
`
```

se cortó y `-ContentType` o `-Body` terminaron ejecutándose como comandos independientes.

La forma más robusta es construir primero el body:

```powershell
$body = @{
    accion         = "buscarCategoria"
    id_dispositivo = $id
    key            = $key
    texto          = "Senior"
    skip           = "0"
}
```

y ejecutar `Invoke-RestMethod` en una línea:

```powershell
$r = Invoke-RestMethod -Method Post -Uri "https://appaficion.andaluzabaloncesto.org/v2/busqueda.ashx" -ContentType "application/x-www-form-urlencoded" -Body $body
```

Esto evita errores como:

```text
-ContentType : El término '-ContentType' no se reconoce...
-Body : El término '-Body' no se reconoce...
```

---

# 29. Patrón para imprimir JSON profundamente anidado

```powershell
$r | ConvertTo-Json -Depth 30
```

Para estadísticas:

```powershell
$stats | ConvertTo-Json -Depth 50
```

---

# 30. Patrón para inspeccionar todos los campos de un objeto

```powershell
$objeto | Format-List *
```

Ejemplo:

```powershell
$p | Format-List *
```

---

# 31. Patrón para deduplicar partidos

Por el identificador opaco de FAB:

```powershell
$unicos = $todos |
    Sort-Object IdPartido -Unique
```

Por el ID de notificación:

```powershell
$unicos = $todos |
    Sort-Object IdPartidoNotificacion -Unique
```

Preferencia para ingesta:

```text
IdPartido externo + restricciones únicas en base de datos
```

---

# 32. Flujo manual completo de investigación FAB

```text
1. Registrar dispositivo
2. Guardar $id y $key
3. buscarCategoria
4. buscarEquipo
5. identificar competición activa
6. obtener grupos/fases
7. obtener jornadas/partidos
8. localizar Estado=Terminado
9. comprobar TipoActa=ESTADÍSTICAS
10. llamar estadisticas.ashx
11. guardar RAW
12. normalizar a PostgreSQL
```

---

# 33. Flujo automático objetivo del ingestor

Pseudo-comandos conceptuales:

```text
sync:competition
sync:schedule
sync:stats
sync:all
```

El servicio Python debería terminar exponiendo comandos equivalentes, por ejemplo:

```powershell
python -m fab_ingestor sync:competition
```

```powershell
python -m fab_ingestor sync:schedule
```

```powershell
python -m fab_ingestor sync:stats
```

```powershell
python -m fab_ingestor sync:all
```

> Estos nombres pertenecen a la arquitectura objetivo y deben mantenerse alineados con la implementación real del CLI.

---

# 34. Modo mock durante desarrollo

Configuración:

```env
INGESTOR_MODE=mock
```

Objetivo:

```text
- desarrollar sin golpear FAB;
- ejecutar tests;
- cargar fixtures;
- probar UI;
- probar normalización;
- probar scoring.
```

Una vez existan fixtures:

```powershell
$env:INGESTOR_MODE = "mock"
```

y arrancar el ingestor con el comando real definido en el repositorio.

---

# 35. Modo live

Solo cuando existan credenciales privadas:

```powershell
$env:FAB_DEVICE_ID = $id
$env:FAB_KEY = $key
$env:INGESTOR_MODE = "live"
```

La configuración equivalente en `.env` privado sería:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fabntasy
FAB_DEVICE_ID=<PRIVATE>
FAB_KEY=<PRIVATE>
INGESTOR_MODE=live
```

Nunca copiar este bloque con valores reales a:

```text
.env.example
GitHub
README público
NEXT_PUBLIC_*
frontend
logs
```

---

# 36. Comprobación rápida antes de trabajar

PostgreSQL:

```powershell
docker ps
```

Entorno:

```powershell
$env:INGESTOR_MODE
```

Prisma:

```powershell
pnpm prisma validate
```

TypeScript:

```powershell
pnpm typecheck
```

Python:

```powershell
python -m pytest
```

---

# 37. Quality gates del proyecto

Antes de cerrar un sprint:

```powershell
pnpm typecheck
pnpm lint
pnpm test
python -m pytest
pnpm prisma validate
```

Cuando haya migraciones:

```powershell
pnpm prisma migrate status
```

---

# 38. Qué NO repetir

## Endpoint incorrecto para buscar categoría

No:

```text
POST /v2/categoria.ashx
accion=buscarCategoria
```

Sí:

```text
POST /v2/busqueda.ashx
accion=buscarCategoria
```

---

## No exponer las credenciales

No:

```env
NEXT_PUBLIC_FAB_DEVICE_ID=...
NEXT_PUBLIC_FAB_KEY=...
```

Sí:

```env
FAB_DEVICE_ID=
FAB_KEY=
```

---

## No hacer la ingesta desde la PWA

No:

```text
Browser -> Afición FAB
```

Sí:

```text
Afición FAB
      ↓
Python ingestor
      ↓
PostgreSQL
      ↓
API propia
      ↓
PWA
```

---

# 39. `.gitignore` mínimo recomendado

```gitignore
.env
.env.local
.env.*.local

.venv/
__pycache__/
.pytest_cache/

node_modules/
.next/

*.log
```

Comprobar qué archivos de entorno están ignorados:

```powershell
git check-ignore -v .env
```

Antes de commit:

```powershell
git status
```

Buscar accidentalmente variables públicas peligrosas:

```powershell
Get-ChildItem -Recurse -File |
    Select-String -Pattern "NEXT_PUBLIC_FAB_|NEXT_PUBLIC_DATABASE_URL"
```

Buscar un valor de key conocido antes de commit se puede hacer localmente con `Select-String`, pero **no dejar el secreto escrito en scripts o documentación**.

---

# 40. Resumen de endpoints confirmados útiles

| Operación | Endpoint | Acción |
|---|---|---|
| Registro dispositivo | `/dispositivo.ashx` | `registrar` |
| Buscar partido | `/v2/busqueda.ashx` | `buscarPartido` |
| Buscar categoría | `/v2/busqueda.ashx` | `buscarCategoria` |
| Buscar equipo | `/v2/busqueda.ashx` | `buscarEquipo` |
| Boxscore | `/v2/envivo/estadisticas.ashx` | parámetros directos |
| PDF stats | `/descargar.ashx` | `tipo=estadisticaPartido` |
| Fases equipo | `/v2/equipo.ashx` | `fasesGrupos` |

---

# 41. Estado actual

Ya está confirmado que podemos obtener desde Afición FAB:

```text
- credenciales de dispositivo;
- categorías activas;
- equipos activos;
- temporada;
- IDs externos;
- calendario mediante búsquedas;
- resultados;
- TipoActa;
- identificación de partidos con ESTADÍSTICAS.
```

El punto más importante a terminar de validar es:

```text
/v2/envivo/estadisticas.ashx
```

sobre un partido terminado de la temporada activa.

Cuando eso esté validado, el pipeline esperado será:

```text
FAB
 ↓
FabClient Python
 ↓
raw_fab_payloads
 ↓
normalización
 ↓
PostgreSQL
 ↓
scoring fantasy
 ↓
API propia
 ↓
PWA
```
