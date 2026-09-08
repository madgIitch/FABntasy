# Canastio 14D — Componentes suaves, retícula precisa, verde y blanco

Estado: propuesta de diseño para revisión. No constituye aprobación de implementación.
Fecha: 7 de septiembre de 2026.
Fuente: vídeo local de Marvin Schwaibold facilitado por el usuario, identificador `2096306375978848256`, duración 33,43 s, resolución 960 × 592, 30 fps.

## 1. Método y límites de la referencia

Se han extraído y revisado fotogramas a intervalos de un segundo de todo el vídeo, además del último fotograma disponible. Los acercamientos permiten leer dimensiones y algunas anotaciones. Las hojas de contacto conservan la secuencia: [0–11 s](14d-reference/contact-1.jpg), [12–23 s](14d-reference/contact-2.jpg), [24–33 s](14d-reference/contact-3.jpg).

El vídeo recorre un lienzo de estudio con cinco columnas: componente original, retícula de píxeles, áreas/padding, estructura y familias tipográficas. La retícula morada, los bloques pastel y las cajas de texto de estructura son herramientas explicativas, no tratamientos que deban aparecer en la aplicación. El halo circular sigue el cursor de la demostración; no se propone como interacción de Canastio.

Las dimensiones explícitamente legibles se recogen como observaciones. Los colores hexadecimales, sombras, escalas responsive y duraciones propuestos más abajo son decisiones propias para Canastio, no valores extraídos del código del autor. La interacción más clara es la edición de Quick note entre 18 y 24 s. El desplazamiento y zoom del lienzo no demuestran animaciones de entrada de los componentes. No se han evaluado audio ni comportamiento fuera de lo visible.

## 2. Inventario de componentes observados

### 2.1 Music — 0–4 s

[Fotograma](14d-reference/frame-000.00.jpg). Módulo blanco de 352 × 200 px, radio e inset indicados de 24 px. Portada cuadrada a la izquierda; título y artista alineados a la derecha; tres controles pequeños bajo la identidad. El control principal es circular oscuro y contrasta con los secundarios. Barra de progreso fina en una segunda franja, con tiempos en los extremos.

Su calidad procede de tres grupos claros: identidad, controles y progreso. La imagen aporta el color y la jerarquía no depende de cajas interiores. La tabla tipográfica visible a 4 s usa Inter con título de 16/500, artista 14/400 y tiempos 12/400.

Adaptación: cabecera compacta de jugador con retrato o fallback, nombre, equipo y datos relevantes; acción principal diferenciada. Una barra solo se incorpora cuando representa progreso real. No se añade reproductor musical ni controles decorativos.

### 2.2 Focus timer — 0–1 y 5 s

[Fotograma](14d-reference/frame-005.00.jpg). Excepción oscura dentro del sistema claro: superficie azul casi negra, título pequeño arriba a la izquierda y duración de sesión al otro extremo. Un anillo de marcas finas centra una cifra de tiempo grande; controles reducidos debajo. El color y la composición concentran la atención en una sola tarea.

Adaptación: un módulo de jornada prioritaria puede usar verde profundo y texto blanco. El cierre debe mostrar fecha/hora y estado textual reales; no introducir un dial circular que implique una proporción temporal sin inicio conocido. Solo un módulo invertido dominante por pantalla.

### 2.3 Flight — 6 s

[Fotograma](14d-reference/frame-006.00.jpg). Superficie blanca de 352 × 224 px. Dos extremos simétricos con códigos grandes y nombres secundarios; línea horizontal fina con icono de avión; horas y etiquetas debajo. Radio e inset de 24 px. La simetría organiza la comparación y el espacio central conecta los extremos.

Adaptación: enfrentamiento local/visitante, nombres de equipos, marcador central, fecha y estado. Sustituir la metáfora de trayecto por una relación deportiva; no usar la línea como progreso del partido si no existe ese dato. En móvil, admitir nombres largos sin recortarlos de forma irreversible.

### 2.4 Location — 6–7 y 32–33 s

[Fotograma](14d-reference/frame-033.23.jpg). Módulo de 352 × 304 px con mapa ocupando prácticamente toda la superficie. El redondeo recorta el contenido; nombre y localización descansan abajo sobre una zona aclarada. El mapa es el contenido principal y el texto queda subordinado.

Adaptación: fotografía de pabellón o imagen de contexto en portada pública cuando se disponga de un recurso autorizado. El patrón no obliga a añadir mapas ni geolocalización. Una ficha de partido solo muestra sede si existe en los datos; la imagen debe tener un área de lectura con contraste verificable.

### 2.5 Weather — 7–9 s

[Fotograma](14d-reference/frame-007.00.jpg). Módulo compacto azul de 352 × 184 px. Localidad pequeña, temperatura grande, condición lateral y una banda inferior de pequeños valores repetidos por día. Una cifra manda y los datos secundarios comparten alineación.

Adaptación: resumen de puntos de jornada con cifra principal y datos secundarios —posición, variación, estado— cuando estén disponibles. Blanco/verde en lugar de azul. Una serie temporal de jornadas exige etiquetas y valores reales; no se crean previsiones o estadísticas para llenar el módulo.

### 2.6 News — 9–11 s

[Fotograma](14d-reference/frame-010.00.jpg). Lista blanca de 352 × 272 px con cabecera breve y tres filas. Cada fila combina miniatura cuadrada suavemente redondeada, titular y metadatos grises. El conjunto es una unidad; las filas no son tarjetas independientes.

Adaptación: movimientos de mercado y próximos partidos en Inicio; listas de jugadores en Mercado. Imagen/fallback de 40–48 px, nombre de lectura rápida, contexto secundario y precio/estado a la derecha. La lista completa puede estar contenida en una superficie si sirve para agruparla; cada jugador no necesita sombra propia.

### 2.7 Inbox — 12–16 s

[Fotograma](14d-reference/frame-012.00.jpg). Panel blanco de 352 × 392 px. Cabecera con título, cantidad de no leídos y búsqueda ligera. Filas con remitente, hora alineada al extremo, vista previa de dos líneas y, en una de ellas, miniaturas superpuestas. Los no leídos se distinguen mediante un punto de color.

La lámina de tipografía a 15 s explicita Inter: título 16/500; contador, hora y búsqueda 12/400; remitente 14/500; vista previa 14/400. Son valores del estudio, no mínimos recomendados para todos nuestros controles.

Adaptación: actividad real de liga con acción, actor autorizado y fecha. Mantener una lista continua. Los puntos requieren texto accesible y un estado persistido; no añadir contadores de mensajes o búsqueda si no existen. El centro de notificaciones pertenece al Sprint 16.

### 2.8 Quick note — 17–24 y 30 s

[Lectura](14d-reference/frame-018.00.jpg) y [edición](14d-reference/frame-024.00.jpg). Panel blanco de 352 × 240 px, radio e inset de 24 px. Etiqueta sans pequeña, texto serif de mayor tamaño y una insignia amarilla pequeña al pie. Mucho aire entre contenido y estado.

La nota pasa a un área editable delimitada, se selecciona el texto y se reemplaza por otro; el pie cambia de estado y muestra hora. La documentación menciona Baskerville para Quick note e Inter para interfaz. La captura demuestra una edición y feedback visual, no prueba persistencia en servidor.

Adaptación: edición de perfil en una superficie tranquila, con campo identificado, foco y feedback de guardado. El texto de producto será Inter; no incorporar un editor de notas o una tercera familia por reproducir esta excepción. Una insignia verde pálida puede indicar Guardado únicamente después de éxito real; error debe seguir mostrando el borrador recuperable.

### 2.9 Mood board — 17 y 25 s

[Fotograma](14d-reference/frame-025.00.jpg). Composición de cuatro imágenes en una retícula 2 × 2, separadas por un gutter estrecho y con esquinas suaves. Título y breve descripción al pie. El color vive en las imágenes, sobre una estructura discreta.

Adaptación: criterio para composiciones visuales de marca o una selección de imágenes editorial futura. No convertir Inicio en un mosaico de cuatro módulos equivalentes ni inventar galerías. En Mi equipo, la distribución de titulares sigue la función de la alineación, no la retícula del mood board.

### 2.10 Up next — 25–27 s

[Fotograma](14d-reference/frame-026.00.jpg). Módulo blanco de 352 × 240 px: etiqueta pequeña, hora grande con sufijo menor, nombre del evento y contexto; avatares agrupados abajo y acción secundaria redondeada al lado. Un icono de reloj equilibra la parte superior.

Adaptación: próximo encuentro o cierre de alineación. Hora y fecha en Europe/Madrid, nombres reales, estado y CTA apropiado. El grupo de avatares solo representa participantes reales y autorizados. No se ofrece editar después del cierre ni indicaciones de ruta sin destino disponible.

### 2.11 Nike running — 26–29 s

[Fotograma](14d-reference/frame-027.00.jpg). Fotografía deportiva con recorte amplio, predominio de verdes/azules y esquinas redondeadas; la imagen lleva la composición. El vídeo muestra parcialmente el original al desplazarse, por lo que no permite describir con certeza todo su contenido inferior o sus controles.

Adaptación: energía deportiva en la portada pública mediante fotografía de baloncesto propia/autorizada, sin reutilizar la imagen del corredor ni marcas ajenas. No colocar fotografías grandes en cada pantalla operativa.

## 3. Síntesis del lenguaje visual

La tesis visual de Canastio será: una aplicación deportiva andaluza luminosa, de superficies blancas y verde firme, con módulos suaves y una estructura rigurosa que deje leer personas, puntos y decisiones rápidamente.

Plan de contenido: portada pública con marca, promesa breve, imagen deportiva y CTA; onboarding con crear/unirse; área privada con acción prioritaria, información deportiva y contexto secundario. Perfil ordenado por identidad, ligas y cuenta. No aplicar un hero publicitario a Mercado o al perfil.

Tesis de interacción: feedback de botones en 120–160 ms; apertura de diálogos en 180–220 ms; entrada breve del módulo prioritario en 200–240 ms. Son propuestas propias, con movimiento máximo de 4–8 px y alternativa sin desplazamiento para reduced motion. Sin animación de filas en cada actualización de datos ni zoom de lienzo.

Los principios que sí se trasladan son: retícula constante; grupos interiores claros; pocas escalas tipográficas; radio generoso en el contenedor principal; miniaturas útiles; estados pequeños y legibles; sombra casi imperceptible. Evitar bordes dentro de bordes, elevación en cada fila y tarjetas anidadas. Las tarjetas se justifican por una tarea o una entidad autocontenida, no por cada dato.

## 4. Sistema propuesto para Canastio

### Color

Verde y blanco son la identidad principal por petición del usuario. Los valores son una propuesta de producto inspirada en Andalucía, no una afirmación sobre colores oficiales de la bandera.

| Token | Valor inicial | Uso |
| --- | --- | --- |
| `--color-canvas` | `#F6F8F6` | Fondo general claro |
| `--color-surface` | `#FFFFFF` | Módulos, formularios, navegación |
| `--color-brand` | `#00843D` | Acciones principales e identidad |
| `--color-brand-hover` | `#006B32` | Hover/pressed principal |
| `--color-brand-soft` | `#E8F4EC` | Selección y estados positivos suaves |
| `--color-brand-deep` | `#073B24` | Módulo prioritario invertido |
| `--color-text` | `#15241B` | Texto principal |
| `--color-text-muted` | `#59675F` | Texto secundario legible |
| `--color-border` | `#DCE5DE` | Divisiones decorativas |
| `--color-control-border` | `#7B8B80` | Contornos de campos/controles |
| `--color-danger` | `#B42318` | Error/acción destructiva |
| `--color-warning` | `#855400` | Aviso con texto y fondo suave |

El blanco ocupa las superficies de lectura; el verde concentra acciones, selección y marca. Se retira el lima `#c9ff36` como acento principal y los fondos casi negros generalizados. El contraste debe medirse en todos los pares usados: 4,5:1 en texto normal y 3:1 en texto grande y elementos gráficos necesarios. Los separadores decorativos no sustituyen contornos de controles.

14D entrega una experiencia clara coherente. El selector Sistema/Claro/Oscuro sigue en Sprint 21, que deberá crear tokens oscuros equivalentes, sin resucitar la paleta lima. No se incluyen interruptores de tema sin funcionamiento.

### Tipografía

Inter para interfaz, títulos operativos, nombres y cifras; pesos 400, 500, 600 y 700. Carga local/gestionada por Next y fallback `system-ui`, sin nuevas peticiones a un CDN en cada render. Oswald se reserva para el wordmark existente y, si hace falta, un breve titular de portada; se elimina su uso generalizado en listados, precios y formularios. Máximo dos familias. No añadir Baskerville solo por la nota del vídeo.

Escala inicial: metadatos 12–13 px, cuerpo/listas 14–16 px, campos 16 px, título de módulo 16–18 px, título de página 28–36 px, cifra destacada 36–48 px. Interlineado 1,4–1,55 para lectura y 1,1–1,2 en cifras. Títulos en frase, mayúsculas reservadas a marca y etiquetas muy breves. Números tabulares en puntos, precios, clasificación y marcadores.

### Geometría, densidad y superficies

Unidad base de 8 px; 4 px para ajustes finos. Espaciados: 4, 8, 12, 16, 24, 32, 48, 64. Panel principal con radio de 24 px y padding 24 px; a 320–375 px puede bajar a 16 px de padding. Radio de controles 12 px, miniaturas 10–12 px y avatar circular. No imponer los 352 px del estudio como ancho fijo.

Canvas móvil con márgenes de 16 px, escritorio 24–40 px. Columna de lectura de 880–960 px para Inicio/perfil; tablas y mercado pueden crecer hasta 1200 px. Espacio entre secciones de 24–32 px. Sombra de referencia propuesta: `0 4px 20px rgba(21,36,27,.05)`, solo en módulos elevados y overlays. La interfaz debe seguir siendo clara al quitarla.

### Controles y estados

Botón principal verde con texto blanco, mínimo 44 px de alto; secundario blanco con borde de control y texto oscuro; terciario textual con área táctil completa. Foco visible con anillo verde y separación blanca. Hover no desplaza el layout. Desactivado mantiene legibilidad y razón visible cuando sea necesaria.

Campos de superficie blanca, borde definido, label persistente y ayuda debajo; errores localizados que no dependen del placeholder. Tabs/segmentos con selección verde pálida y texto/atributo de estado. Badges reservados para estado, no para adornar metadatos. Un único estilo de iconos lineales, consistente en tamaño/grosor, con nombres accesibles para botones sin texto.

Loading conserva geometría con skeletons neutros; vacío explica el siguiente paso real; error ofrece reintento o corrección; offline identifica lecturas almacenadas y bloquea mutaciones como antes. Pendiente nunca se representa como cero. Confirmaciones usan el mismo lenguaje visual, foco gestionado, Escape y devolución del foco al origen. Cerrar sesión es neutral; eliminar cuenta queda en el futuro flujo destructivo.

## 5. Aplicación por superficie existente

| Superficie / archivos principales | Cambio esperado |
| --- | --- |
| Portada, `app/page.tsx` y `globals.css` | Blanco/verde, marca reconocible, CTA visible móvil, composición deportiva y fotografía autorizada si se incorpora; retirar glow lima y gradientes ornamentales actuales |
| Login, registro y recuperación, `app/auth/*` | Formulario claro, campos con contorno, radio y ritmo constantes; conservar username obligatorio, errores y valores recuperables |
| `league-onboarding.*` | Una composición con Crear liga/Unirme, formularios claros y logout; sin mostrar navegación privada antes de pertenecer a una liga |
| Shell, `app/app/layout.tsx`, `account-controls.tsx` | Navegación blanca, selección verde, iconos consistentes, avatar persistente; cinco destinos inferiores y áreas seguras |
| `home-dashboard.*` | Un módulo prioritario de jornada; módulos secundarios News/Up next, listas compactas; mantener la jerarquía funcional de Sprint 15 |
| `canastio-market.*` | Buscador y filtros claros, filas tipo News con precio alineado y tendencias textuales; evitar tarjeta por jugador |
| `fantasy-team-manager.*` | Superficie de alineación verde moderada, fichas de jugador blancas, suplentes diferenciados, guardado y bloqueo legibles |
| `journey-live.*` | Marcador inspirado en Flight/Weather, puntos grandes y timeline legible; gráfico y tabla equivalente con datos reales |
| `league-hub.*`, `league-detail.*` | Identidad de liga, lista de miembros/clasificación y controles administrativos agrupados; contexto activo inequívoco |
| Perfil y edición, `app/app/perfil/*` | Cabecera de identidad blanca y compacta, métricas sobrias, lista de ligas y cuenta; formularios acordes al patrón de edición |
| Competición, jugadores, equipos y partidos | Tablas claras, fichas compactas, escudos/retratos con fallback, marcadores y desglose de puntos compartidos |
| Loading, error, offline y recuperación | Aplicación completa de tokens y estados; evitar pantallas residuales con estilo oscuro anterior |
| Logo, favicon y PWA | Conservar el símbolo; comprobar legibilidad sobre blanco y tamaños pequeños, eliminar usos lima que dependan de fondos oscuros; variantes solo si son necesarias |

El CSS actual mezcla variables globales con valores oscuros/lima hardcodeados en CSS Modules. La implementación debe migrar ambos a tokens semánticos y revisar selectores globales; cambiar solo `:root` no completa el rediseño.

## 6. Alcance futuro

Sprint 16: centro de notificaciones y preferencias con listas tipo Inbox, estados persistidos y controles compartidos. Sprint 19: cuenta/seguridad/privacidad con formularios y diálogos 14D, y zona de peligro aislada. Sprint 21: tema oscuro equivalente, selector de tema, revisión de contraste y responsive. Futuras pantallas reutilizarán tokens y componentes 14D una vez aprobados; esta referencia no autoriza mensajería, notas, mapas ni nuevas métricas.

## 7. Verificación que exigirá 14D

Inventario completo de rutas y estados antes/después; revisión visual de portada, registro, onboarding, Inicio, Mercado, Mi equipo, Jornada, Liga, perfil, ficha deportiva y errores a 320, 375, 430, 768 y 1440 px. Incluir nombres largos, importes grandes, sin imagen, datos pendientes y error de formulario. Comprobar teclado, foco, reduced motion, zoom 200 %, targets de 44 px y ausencia de scroll horizontal salvo tablas justificadas como boxscore.

Conservar flujos y permisos: registro con username, usuario sin liga bloqueado, crear/unirse, perfil y logout; las pruebas existentes de mercado, alineación y resultados deben seguir pasando. Verificar contraste calculado y capturas revisadas manualmente; una captura generada por sí sola no constituye validación. No añadir tests que solo comparen cadenas CSS.

No se modifica el ingestor Python, las credenciales FAB, la base de datos ni los contratos de negocio por razones estéticas. La vuelta atrás consiste en revertir el cambio visual, sin migraciones ni pérdida de datos.
