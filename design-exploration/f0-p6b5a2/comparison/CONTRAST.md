# Contraste de las seis paletas

Se usa el cálculo de luminancia relativa sRGB de WCAG 2.2: (L clara + 0.05) / (L oscura + 0.05). Las decisiones se calculan antes de redondear.

Texto normal: mínimo 4.5:1; información gráfica esencial: 3:1. Se exige 4.5:1 también a muchos títulos para dejar margen. Los controles deshabilitados se miden, pero están exentos; no se presentan como aprobados.

Referencias: [W3C — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) y [W3C — Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

| Paleta | Texto normal mínimo | Precio | Botones: normal / hover / pulsado | Mediciones válidas |
|---|---:|---:|---|---:|
| Royal Pop | 5.04:1 | 6.97:1 | 5.04 / 5.05 / 6.46 | 36 / 36 |
| Neon Playground | 5.00:1 | 8.80:1 | 5.00 / 5.02 / 6.70 | 36 / 36 |
| Tropical Party | 4.96:1 | 5.14:1 | 5.05 / 5.10 / 6.35 | 36 / 36 |
| Coastal Mint | 5.00:1 | 5.83:1 | 5.00 / 5.06 / 6.48 | 36 / 36 |
| Soft Royal | 5.02:1 | 5.33:1 | 5.05 / 5.04 / 6.45 | 36 / 36 |
| Warm Sand | 5.09:1 | 6.31:1 | 5.09 / 5.12 / 6.49 | 36 / 36 |

## Royal Pop

| Uso | Frente | Fondo | Contraste | Umbral | Resultado |
|---|---|---|---:|---:|---|
| Texto principal / surface.primary | #F4EADB | #373078 | 9.50:1 | 4.5:1 | Cumple |
| Texto secundario / surface.primary | #D8CECC | #373078 | 7.34:1 | 4.5:1 | Cumple |
| Texto principal / surface.elevated | #F4EADB | #413A7D | 8.30:1 | 4.5:1 | Cumple |
| Texto secundario / surface.elevated | #D8CECC | #413A7D | 6.41:1 | 4.5:1 | Cumple |
| Texto principal / surface.overlay | #F4EADB | #2D2762 | 11.18:1 | 4.5:1 | Cumple |
| Texto secundario / surface.overlay | #D8CECC | #2D2762 | 8.63:1 | 4.5:1 | Cumple |
| Botón default | #F4EADB | #6A51BA | 5.04:1 | 4.5:1 | Cumple |
| Botón hover | #F4EADB | #6B55A8 | 5.05:1 | 4.5:1 | Cumple |
| Botón pressed | #F4EADB | #58449D | 6.46:1 | 4.5:1 | Cumple |
| Botón active | #191636 | #46B9EC | 7.78:1 | 4.5:1 | Cumple |
| Botón activeHover | #191636 | #60C0E9 | 8.45:1 | 4.5:1 | Cumple |
| Botón activePressed | #191636 | #41A5D6 | 6.27:1 | 4.5:1 | Cumple |
| Precio de tienda | #F6C454 | #373078 | 6.97:1 | 4.5:1 | Cumple |
| Nombre de tienda | #F4EADB | #373078 | 9.50:1 | 4.5:1 | Cumple |
| Sinergias de tienda | #F4EADB | #2D2762 | 11.18:1 | 4.5:1 | Cumple |
| Temporizador | #523F90 | #D2C2DF | 5.06:1 | 4.5:1 | Cumple |
| Ronda y clasificación | #191636 | #D2C2DF | 10.35:1 | 4.5:1 | Cumple |
| Código / material de retrato | #191636 | #F4EADB | 14.59:1 | 4.5:1 | Cumple |
| Código / material de retrato | #191636 | #C2AEE1 | 8.63:1 | 4.5:1 | Cumple |
| Código / material de retrato | #191636 | #CAB7E0 | 9.39:1 | 4.5:1 | Cumple |
| Umbral activo | #152D2B | #74E1CD | 9.29:1 | 4.5:1 | Cumple |
| Emblema de sinergia | #F4EADB | #6A51BA | 5.04:1 | 3:1 | Cumple |
| Emblema activo | #191636 | #F6C454 | 10.70:1 | 3:1 | Cumple |
| Borde esencial / fondo | #AF98E3 | #191636 | 6.96:1 | 3:1 | Cumple |
| Foco / fondo | #46B9EC | #191636 | 7.78:1 | 3:1 | Cumple |
| Barra life | #70E0A3 | #171E2B | 10.25:1 | 3:1 | Cumple |
| Barra enemyLife | #FFB56F | #171E2B | 9.62:1 | 3:1 | Cumple |
| Barra mana | #66C9ED | #171E2B | 8.86:1 | 3:1 | Cumple |
| Barra shield | #B4DDF0 | #171E2B | 11.57:1 | 3:1 | Cumple |
| Texto auxiliar: inspector | #D8CECC | #373078 | 7.34:1 | 4.5:1 | Cumple |
| Texto auxiliar: sinergias | #D8CECC | #413A7D | 6.41:1 | 4.5:1 | Cumple |
| Vida jugador / clasificación | #267264 | #D2C2DF | 3.41:1 | 3:1 | Cumple |
| Vida rival / clasificación | #986035 | #D2C2DF | 3.08:1 | 3:1 | Cumple |
| Tooltip | #F4EADB | #2D2762 | 11.18:1 | 4.5:1 | Cumple |
| Resultado: título | #46B9EC | #373078 | 5.07:1 | 3:1 | Cumple |
| Contador | #F4EADB | #2D2762 | 11.18:1 | 4.5:1 | Cumple |
| Deshabilitado (exento) | #CEC5C7 | #5D558C | 3.96:1 | Exento | Medido; exento |

Ajuste: botón derivado de #8465E8 a #6A51BA; temporizador #523F90 sobre placa #D2C2DF.

## Neon Playground

| Uso | Frente | Fondo | Contraste | Umbral | Resultado |
|---|---|---|---:|---:|---|
| Texto principal / surface.primary | #F4F3FF | #222653 | 13.00:1 | 4.5:1 | Cumple |
| Texto secundario / surface.primary | #D4D4E5 | #222653 | 9.76:1 | 4.5:1 | Cumple |
| Texto principal / surface.elevated | #F4F3FF | #2E315C | 11.18:1 | 4.5:1 | Cumple |
| Texto secundario / surface.elevated | #D4D4E5 | #2E315C | 8.39:1 | 4.5:1 | Cumple |
| Texto principal / surface.overlay | #F4F3FF | #1C1F44 | 14.38:1 | 4.5:1 | Cumple |
| Texto secundario / surface.overlay | #D4D4E5 | #1C1F44 | 10.80:1 | 4.5:1 | Cumple |
| Botón default | #F4F3FF | #4262C9 | 5.00:1 | 4.5:1 | Cumple |
| Botón hover | #F4F3FF | #4B64B7 | 5.02:1 | 4.5:1 | Cumple |
| Botón pressed | #F4F3FF | #3750A5 | 6.70:1 | 4.5:1 | Cumple |
| Botón active | #0F1125 | #C7EF60 | 14.14:1 | 4.5:1 | Cumple |
| Botón activeHover | #0F1125 | #CEF078 | 14.51:1 | 4.5:1 | Cumple |
| Botón activePressed | #0F1125 | #B1D459 | 11.03:1 | 4.5:1 | Cumple |
| Precio de tienda | #F6C454 | #222653 | 8.80:1 | 4.5:1 | Cumple |
| Nombre de tienda | #F4F3FF | #222653 | 13.00:1 | 4.5:1 | Cumple |
| Sinergias de tienda | #F4F3FF | #1C1F44 | 14.38:1 | 4.5:1 | Cumple |
| Temporizador | #334D9D | #C3CEFC | 5.04:1 | 4.5:1 | Cumple |
| Ronda y clasificación | #0F1125 | #C3CEFC | 12.03:1 | 4.5:1 | Cumple |
| Código / material de retrato | #0F1125 | #F4F3FF | 16.95:1 | 4.5:1 | Cumple |
| Código / material de retrato | #0F1125 | #AABCFA | 10.01:1 | 4.5:1 | Cumple |
| Código / material de retrato | #0F1125 | #B5C4FB | 10.87:1 | 4.5:1 | Cumple |
| Umbral activo | #152D2B | #74E1CD | 9.29:1 | 4.5:1 | Cumple |
| Emblema de sinergia | #F4F3FF | #4262C9 | 5.00:1 | 3:1 | Cumple |
| Emblema activo | #0F1125 | #F6C454 | 11.48:1 | 3:1 | Cumple |
| Borde esencial / fondo | #8EA7F9 | #0F1125 | 8.02:1 | 3:1 | Cumple |
| Foco / fondo | #C7EF60 | #0F1125 | 14.14:1 | 3:1 | Cumple |
| Barra life | #70E0A3 | #171E2B | 10.25:1 | 3:1 | Cumple |
| Barra enemyLife | #FFB56F | #171E2B | 9.62:1 | 3:1 | Cumple |
| Barra mana | #66C9ED | #171E2B | 8.86:1 | 3:1 | Cumple |
| Barra shield | #B4DDF0 | #171E2B | 11.57:1 | 3:1 | Cumple |
| Texto auxiliar: inspector | #D4D4E5 | #222653 | 9.76:1 | 4.5:1 | Cumple |
| Texto auxiliar: sinergias | #D4D4E5 | #2E315C | 8.39:1 | 4.5:1 | Cumple |
| Vida jugador / clasificación | #267264 | #C3CEFC | 3.69:1 | 3:1 | Cumple |
| Vida rival / clasificación | #986035 | #C3CEFC | 3.34:1 | 3:1 | Cumple |
| Tooltip | #F4F3FF | #1C1F44 | 14.38:1 | 4.5:1 | Cumple |
| Resultado: título | #C7EF60 | #222653 | 10.85:1 | 3:1 | Cumple |
| Contador | #F4F3FF | #1C1F44 | 14.38:1 | 4.5:1 | Cumple |
| Deshabilitado (exento) | #CACADD | #4C4F75 | 4.85:1 | Exento | Medido; exento |

Ajuste: botón derivado de #5078F5 a #4262C9; temporizador #334D9D sobre placa #C3CEFC.

## Tropical Party

| Uso | Frente | Fondo | Contraste | Umbral | Resultado |
|---|---|---|---:|---:|---|
| Texto principal / surface.primary | #FFFBF1 | #175D70 | 7.17:1 | 4.5:1 | Cumple |
| Texto secundario / surface.primary | #DCE3DE | #175D70 | 5.67:1 | 4.5:1 | Cumple |
| Texto principal / surface.elevated | #FFFBF1 | #246677 | 6.27:1 | 4.5:1 | Cumple |
| Texto secundario / surface.elevated | #DCE3DE | #246677 | 4.96:1 | 4.5:1 | Cumple |
| Texto principal / surface.overlay | #FFFBF1 | #134C5C | 9.17:1 | 4.5:1 | Cumple |
| Texto secundario / surface.overlay | #DCE3DE | #134C5C | 7.26:1 | 4.5:1 | Cumple |
| Botón default | #FFFBF1 | #197973 | 5.05:1 | 4.5:1 | Cumple |
| Botón hover | #FFFBF1 | #2B7772 | 5.10:1 | 4.5:1 | Cumple |
| Botón pressed | #FFFBF1 | #166865 | 6.35:1 | 4.5:1 | Cumple |
| Botón active | #0A2A32 | #A6E77B | 10.31:1 | 4.5:1 | Cumple |
| Botón activeHover | #0A2A32 | #B3EA8D | 10.84:1 | 4.5:1 | Cumple |
| Botón activePressed | #0A2A32 | #93D072 | 8.28:1 | 4.5:1 | Cumple |
| Precio de tienda | #FFD166 | #175D70 | 5.14:1 | 4.5:1 | Cumple |
| Nombre de tienda | #FFFBF1 | #175D70 | 7.17:1 | 4.5:1 | Cumple |
| Sinergias de tienda | #FFFBF1 | #134C5C | 9.17:1 | 4.5:1 | Cumple |
| Temporizador | #156763 | #BEEAE0 | 5.09:1 | 4.5:1 | Cumple |
| Ronda y clasificación | #0A2A32 | #BEEAE0 | 11.53:1 | 4.5:1 | Cumple |
| Código / material de retrato | #0A2A32 | #FFFBF1 | 14.62:1 | 4.5:1 | Cumple |
| Código / material de retrato | #0A2A32 | #9EE2D8 | 10.30:1 | 4.5:1 | Cumple |
| Código / material de retrato | #0A2A32 | #ADE6DC | 10.88:1 | 4.5:1 | Cumple |
| Umbral activo | #152D2B | #74E1CD | 9.29:1 | 4.5:1 | Cumple |
| Emblema de sinergia | #FFFBF1 | #197973 | 5.05:1 | 3:1 | Cumple |
| Emblema activo | #0A2A32 | #FFD166 | 10.48:1 | 3:1 | Cumple |
| Borde esencial / fondo | #7AD8CF | #0A2A32 | 9.03:1 | 3:1 | Cumple |
| Foco / fondo | #A6E77B | #0A2A32 | 10.31:1 | 3:1 | Cumple |
| Barra life | #70E0A3 | #171E2B | 10.25:1 | 3:1 | Cumple |
| Barra enemyLife | #FFB56F | #171E2B | 9.62:1 | 3:1 | Cumple |
| Barra mana | #66C9ED | #171E2B | 8.86:1 | 3:1 | Cumple |
| Barra shield | #B4DDF0 | #171E2B | 11.57:1 | 3:1 | Cumple |
| Texto auxiliar: inspector | #DCE3DE | #175D70 | 5.67:1 | 4.5:1 | Cumple |
| Texto auxiliar: sinergias | #DCE3DE | #246677 | 4.96:1 | 4.5:1 | Cumple |
| Vida jugador / clasificación | #267264 | #BEEAE0 | 4.37:1 | 3:1 | Cumple |
| Vida rival / clasificación | #986035 | #BEEAE0 | 3.95:1 | 3:1 | Cumple |
| Tooltip | #FFFBF1 | #134C5C | 9.17:1 | 4.5:1 | Cumple |
| Resultado: título | #A6E77B | #175D70 | 5.06:1 | 3:1 | Cumple |
| Contador | #FFFBF1 | #134C5C | 9.17:1 | 4.5:1 | Cumple |
| Deshabilitado (exento) | #D1DBD7 | #457D8A | 3.26:1 | Exento | Medido; exento |

Ajuste: botón derivado de #28C3BA a #197973; temporizador #156763 sobre placa #BEEAE0.

## Coastal Mint

| Uso | Frente | Fondo | Contraste | Umbral | Resultado |
|---|---|---|---:|---:|---|
| Texto principal / surface.primary | #F3F0E7 | #263E4A | 9.85:1 | 4.5:1 | Cumple |
| Texto secundario / surface.primary | #D4D5CF | #263E4A | 7.60:1 | 4.5:1 | Cumple |
| Texto principal / surface.elevated | #F3F0E7 | #314853 | 8.44:1 | 4.5:1 | Cumple |
| Texto secundario / surface.elevated | #D4D5CF | #314853 | 6.51:1 | 4.5:1 | Cumple |
| Texto principal / surface.overlay | #F3F0E7 | #1F333D | 11.52:1 | 4.5:1 | Cumple |
| Texto secundario / surface.overlay | #D4D5CF | #1F333D | 8.89:1 | 4.5:1 | Cumple |
| Botón default | #F3F0E7 | #496D6B | 5.00:1 | 4.5:1 | Cumple |
| Botón hover | #F3F0E7 | #4F6B69 | 5.06:1 | 4.5:1 | Cumple |
| Botón pressed | #F3F0E7 | #3D5B5B | 6.48:1 | 4.5:1 | Cumple |
| Botón active | #111C21 | #B7D4C7 | 10.94:1 | 4.5:1 | Cumple |
| Botón activeHover | #111C21 | #C0D8CC | 11.50:1 | 4.5:1 | Cumple |
| Botón activePressed | #111C21 | #A3BEB3 | 8.72:1 | 4.5:1 | Cumple |
| Precio de tienda | #D9B675 | #263E4A | 5.83:1 | 4.5:1 | Cumple |
| Nombre de tienda | #F3F0E7 | #263E4A | 9.85:1 | 4.5:1 | Cumple |
| Sinergias de tienda | #F3F0E7 | #1F333D | 11.52:1 | 4.5:1 | Cumple |
| Temporizador | #3C5A58 | #CAD7D0 | 5.06:1 | 4.5:1 | Cumple |
| Ronda y clasificación | #111C21 | #CAD7D0 | 11.67:1 | 4.5:1 | Cumple |
| Código / material de retrato | #111C21 | #F3F0E7 | 15.21:1 | 4.5:1 | Cumple |
| Código / material de retrato | #111C21 | #B5CBC5 | 10.16:1 | 4.5:1 | Cumple |
| Código / material de retrato | #111C21 | #BED1CA | 10.86:1 | 4.5:1 | Cumple |
| Umbral activo | #152D2B | #74E1CD | 9.29:1 | 4.5:1 | Cumple |
| Emblema de sinergia | #F3F0E7 | #496D6B | 5.00:1 | 3:1 | Cumple |
| Emblema activo | #111C21 | #D9B675 | 8.99:1 | 3:1 | Cumple |
| Borde esencial / fondo | #9EBDB8 | #111C21 | 8.60:1 | 3:1 | Cumple |
| Foco / fondo | #B7D4C7 | #111C21 | 10.94:1 | 3:1 | Cumple |
| Barra life | #70E0A3 | #171E2B | 10.25:1 | 3:1 | Cumple |
| Barra enemyLife | #FFB56F | #171E2B | 9.62:1 | 3:1 | Cumple |
| Barra mana | #66C9ED | #171E2B | 8.86:1 | 3:1 | Cumple |
| Barra shield | #B4DDF0 | #171E2B | 11.57:1 | 3:1 | Cumple |
| Texto auxiliar: inspector | #D4D5CF | #263E4A | 7.60:1 | 4.5:1 | Cumple |
| Texto auxiliar: sinergias | #D4D5CF | #314853 | 6.51:1 | 4.5:1 | Cumple |
| Vida jugador / clasificación | #267264 | #CAD7D0 | 3.85:1 | 3:1 | Cumple |
| Vida rival / clasificación | #986035 | #CAD7D0 | 3.48:1 | 3:1 | Cumple |
| Tooltip | #F3F0E7 | #1F333D | 11.52:1 | 4.5:1 | Cumple |
| Resultado: título | #B7D4C7 | #263E4A | 7.09:1 | 3:1 | Cumple |
| Contador | #F3F0E7 | #1F333D | 11.52:1 | 4.5:1 | Cumple |
| Deshabilitado (exento) | #CACCC8 | #4F6269 | 3.95:1 | Exento | Medido; exento |

Ajuste: botón derivado de #6A9E9B a #496D6B; temporizador #3C5A58 sobre placa #CAD7D0.

## Soft Royal

| Uso | Frente | Fondo | Contraste | Umbral | Resultado |
|---|---|---|---:|---:|---|
| Texto principal / surface.primary | #ECE9E2 | #32364F | 9.75:1 | 4.5:1 | Cumple |
| Texto secundario / surface.primary | #D0CECC | #32364F | 7.53:1 | 4.5:1 | Cumple |
| Texto principal / surface.elevated | #ECE9E2 | #3C4057 | 8.40:1 | 4.5:1 | Cumple |
| Texto secundario / surface.elevated | #D0CECC | #3C4057 | 6.49:1 | 4.5:1 | Cumple |
| Texto principal / surface.overlay | #ECE9E2 | #292C41 | 11.31:1 | 4.5:1 | Cumple |
| Texto secundario / surface.overlay | #D0CECC | #292C41 | 8.74:1 | 4.5:1 | Cumple |
| Botón default | #ECE9E2 | #5F5E86 | 5.05:1 | 4.5:1 | Cumple |
| Botón hover | #ECE9E2 | #605F7E | 5.04:1 | 4.5:1 | Cumple |
| Botón pressed | #ECE9E2 | #4F4F70 | 6.45:1 | 4.5:1 | Cumple |
| Botón active | #161824 | #B9B5D4 | 8.93:1 | 4.5:1 | Cumple |
| Botón activeHover | #161824 | #C1BDD6 | 9.68:1 | 4.5:1 | Cumple |
| Botón activePressed | #161824 | #A5A2BF | 7.16:1 | 4.5:1 | Cumple |
| Precio de tienda | #C8AA76 | #32364F | 5.33:1 | 4.5:1 | Cumple |
| Nombre de tienda | #ECE9E2 | #32364F | 9.75:1 | 4.5:1 | Cumple |
| Sinergias de tienda | #ECE9E2 | #292C41 | 11.31:1 | 4.5:1 | Cumple |
| Temporizador | #4B4A6A | #C9C6D1 | 5.02:1 | 4.5:1 | Cumple |
| Ronda y clasificación | #161824 | #C9C6D1 | 10.49:1 | 4.5:1 | Cumple |
| Código / material de retrato | #161824 | #ECE9E2 | 14.55:1 | 4.5:1 | Cumple |
| Código / material de retrato | #161824 | #B7B5C8 | 8.79:1 | 4.5:1 | Cumple |
| Código / material de retrato | #161824 | #BFBDCC | 9.55:1 | 4.5:1 | Cumple |
| Umbral activo | #152D2B | #74E1CD | 9.29:1 | 4.5:1 | Cumple |
| Emblema de sinergia | #ECE9E2 | #5F5E86 | 5.05:1 | 3:1 | Cumple |
| Emblema activo | #161824 | #C8AA76 | 7.95:1 | 3:1 | Cumple |
| Borde esencial / fondo | #A3A2BE | #161824 | 7.12:1 | 3:1 | Cumple |
| Foco / fondo | #B9B5D4 | #161824 | 8.93:1 | 3:1 | Cumple |
| Barra life | #70E0A3 | #171E2B | 10.25:1 | 3:1 | Cumple |
| Barra enemyLife | #FFB56F | #171E2B | 9.62:1 | 3:1 | Cumple |
| Barra mana | #66C9ED | #171E2B | 8.86:1 | 3:1 | Cumple |
| Barra shield | #B4DDF0 | #171E2B | 11.57:1 | 3:1 | Cumple |
| Texto auxiliar: inspector | #D0CECC | #32364F | 7.53:1 | 4.5:1 | Cumple |
| Texto auxiliar: sinergias | #D0CECC | #3C4057 | 6.49:1 | 4.5:1 | Cumple |
| Vida jugador / clasificación | #267264 | #C9C6D1 | 3.40:1 | 3:1 | Cumple |
| Vida rival / clasificación | #986035 | #C9C6D1 | 3.07:1 | 3:1 | Cumple |
| Tooltip | #ECE9E2 | #292C41 | 11.31:1 | 4.5:1 | Cumple |
| Resultado: título | #B9B5D4 | #32364F | 5.98:1 | 3:1 | Cumple |
| Contador | #ECE9E2 | #292C41 | 11.31:1 | 4.5:1 | Cumple |
| Deshabilitado (exento) | #C7C5C5 | #575A6C | 3.96:1 | Exento | Medido; exento |

Ajuste: botón derivado de #7776A8 a #5F5E86; temporizador #4B4A6A sobre placa #C9C6D1.

## Warm Sand

| Uso | Frente | Fondo | Contraste | Umbral | Resultado |
|---|---|---|---:|---:|---|
| Texto principal / surface.primary | #F1EAE0 | #343B43 | 9.49:1 | 4.5:1 | Cumple |
| Texto secundario / surface.primary | #D5D0C8 | #343B43 | 7.39:1 | 4.5:1 | Cumple |
| Texto principal / surface.elevated | #F1EAE0 | #3E454C | 8.14:1 | 4.5:1 | Cumple |
| Texto secundario / surface.elevated | #D5D0C8 | #3E454C | 6.33:1 | 4.5:1 | Cumple |
| Texto principal / surface.overlay | #F1EAE0 | #2B3037 | 11.13:1 | 4.5:1 | Cumple |
| Texto secundario / surface.overlay | #D5D0C8 | #2B3037 | 8.66:1 | 4.5:1 | Cumple |
| Botón default | #F1EAE0 | #5A6468 | 5.09:1 | 4.5:1 | Cumple |
| Botón hover | #F1EAE0 | #5C6366 | 5.12:1 | 4.5:1 | Cumple |
| Botón pressed | #F1EAE0 | #4B5458 | 6.49:1 | 4.5:1 | Cumple |
| Botón active | #171B1E | #C8A58B | 7.60:1 | 4.5:1 | Cumple |
| Botón activeHover | #171B1E | #CEAF98 | 8.42:1 | 4.5:1 | Cumple |
| Botón activePressed | #171B1E | #B3947E | 6.15:1 | 4.5:1 | Cumple |
| Precio de tienda | #D6BF8B | #343B43 | 6.31:1 | 4.5:1 | Cumple |
| Nombre de tienda | #F1EAE0 | #343B43 | 9.49:1 | 4.5:1 | Cumple |
| Sinergias de tienda | #F1EAE0 | #2B3037 | 11.13:1 | 4.5:1 | Cumple |
| Temporizador | #4C5458 | #D3D3CE | 5.15:1 | 4.5:1 | Cumple |
| Ronda y clasificación | #171B1E | #D3D3CE | 11.53:1 | 4.5:1 | Cumple |
| Código / material de retrato | #171B1E | #F1EAE0 | 14.51:1 | 4.5:1 | Cumple |
| Código / material de retrato | #171B1E | #C4C7C5 | 10.17:1 | 4.5:1 | Cumple |
| Código / material de retrato | #171B1E | #CBCCC9 | 10.74:1 | 4.5:1 | Cumple |
| Umbral activo | #152D2B | #74E1CD | 9.29:1 | 4.5:1 | Cumple |
| Emblema de sinergia | #F1EAE0 | #5A6468 | 5.09:1 | 3:1 | Cumple |
| Emblema activo | #171B1E | #D6BF8B | 9.64:1 | 3:1 | Cumple |
| Borde esencial / fondo | #B3BABA | #171B1E | 8.79:1 | 3:1 | Cumple |
| Foco / fondo | #C8A58B | #171B1E | 7.60:1 | 3:1 | Cumple |
| Barra life | #70E0A3 | #171E2B | 10.25:1 | 3:1 | Cumple |
| Barra enemyLife | #FFB56F | #171E2B | 9.62:1 | 3:1 | Cumple |
| Barra mana | #66C9ED | #171E2B | 8.86:1 | 3:1 | Cumple |
| Barra shield | #B4DDF0 | #171E2B | 11.57:1 | 3:1 | Cumple |
| Texto auxiliar: inspector | #D5D0C8 | #343B43 | 7.39:1 | 4.5:1 | Cumple |
| Texto auxiliar: sinergias | #D5D0C8 | #3E454C | 6.33:1 | 4.5:1 | Cumple |
| Vida jugador / clasificación | #267264 | #D3D3CE | 3.81:1 | 3:1 | Cumple |
| Vida rival / clasificación | #986035 | #D3D3CE | 3.44:1 | 3:1 | Cumple |
| Tooltip | #F1EAE0 | #2B3037 | 11.13:1 | 4.5:1 | Cumple |
| Resultado: título | #C8A58B | #343B43 | 4.97:1 | 3:1 | Cumple |
| Contador | #F1EAE0 | #2B3037 | 11.13:1 | 4.5:1 | Cumple |
| Deshabilitado (exento) | #CBC7C1 | #5A5E62 | 3.88:1 | Exento | Medido; exento |

Ajuste: botón derivado de #8D9CA3 a #5A6468; temporizador #4C5458 sobre placa #D3D3CE.

## Alcance de la validación

216 pares conformes: 36 por paleta; además 6 mediciones de controles deshabilitados. Se comprobaron estilos calculados en navegador, fuentes cargadas, estados ilustrados y lectura visual. Los fondos de sinergias, fichas, inspector y contadores son opacos: los pares se corresponden con sus superficies reales. Los textos auxiliares se hacen explícitos para evitar pérdida por opacidad.

El material diagonal de los retratos conserva la opacidad y geometría originales: se comprueba la tinta contra ambos extremos y su mezcla, sin texto sobre el sprite. Los rótulos situados directamente sobre la escena, como el título del banquillo, mantienen las sombras de C; una foto no tiene un único fondo medible y esos rótulos no se incluyen en los pares planos. El efecto de la viñeta de C permanece idéntico. No se declara conformidad WCAG completa, accesibilidad del juego ni validación de visión cromática. No se ha medido fatiga en sesiones reales.
