# Sprint 14D — Evidencia de QA visual

## Cobertura

- 50 capturas de las diez familias principales de componentes a 320, 375, 430, 768 y 1440 px.
- 25 capturas de rutas públicas reales: portada, registro, login, recuperación y offline en los mismos cinco anchos.
- Revisión manual mediante hojas de contacto en esta carpeta y capturas individuales conservadas como evidencia.
- Resultado automatizado: cero desbordamientos horizontales y cero errores de captura.

## Smoke tests de interacción

- Registro: `username` obligatorio, patrón válido y foco visible al fallar.
- Onboarding: sin membresía no aparece la navegación principal y solo permite crear liga, unirse o cerrar sesión.
- Shell: exactamente cinco destinos, selección actual expuesta y avatar de cuenta.
- Mercado: apertura/cierre del diálogo, Escape, restauración del foco, validación de importe y filtros.
- Mi equipo: cambio de pestaña y estado seleccionado.
- Perfil: confirmación de cierre de sesión.
- Liga: confirmación y cancelación al abandonar.
- Accesibilidad: recorrido de teclado, zoom al 200 % y `prefers-reduced-motion`.

## Contraste medido

| Combinación | Ratio |
| --- | ---: |
| Verde `#00843d` sobre blanco | 4.81:1 |
| Verde de texto `#006b32` sobre verde suave | 6.15:1 |
| Texto `#15241b` sobre blanco | 16.15:1 |
| Texto secundario `#59675f` sobre canvas | 5.57:1 |
| Blanco sobre verde profundo `#073b24` | 12.65:1 |
| Borde de control `#7b8b80` sobre blanco | 3.59:1 |

Los datos de las fixtures son sintéticos. No contienen credenciales FAB ni secretos.
