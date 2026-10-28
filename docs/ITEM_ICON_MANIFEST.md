> **Contrato vigente P11H:** contenido/economía `f0p11h-1`, combate `f0p11h-1`, objetos `f0p11h-18.5-1`. 32 completos disponibles y cuatro bloqueados. [Auditoría y límites](ITEM_FIDELITY_AUDIT.md), [arte individual](ITEM_ICON_ASSET_MANIFEST.md), [entrega y tooltips/compras](F0_P11H_REPORT.md). El cuerpo siguiente es histórico y conserva las reglas de su versión; no describe por sí solo el catálogo vigente.

# Manifiesto de iconos de objetos · F0-P8E

Los 44 recursos son originales **provisionales**, renderizados como SVG inline por `apps/web/src/match/items/ItemIcon.tsx`; no son 44 archivos de imagen ni ilustraciones definitivas. No se incorporan assets oficiales. Ocho glifos forman los componentes; los 36 completos combinan dos glifos en diagonal, incluidos los dobles, sobre marco dorado. El marco de componente es azul. Las marcas C/O y las etiquetas acompañan el color.

La columna clave corresponde exactamente a `ItemDefinition.icon` del catálogo de objetos `f0p8d-1`. `ITEM_ICON_OVERRIDES[clave] = ruta` sustituye cualquier recurso sin cambiar ID, receta, efecto ni cifras. El registro empieza vacío. Si una imagen falla, `onError` vuelve al SVG; una definición ausente muestra el marco neutral con cuadrado. Un glifo desconocido se omite dentro del marco. Las imágenes tienen alt vacío y los SVG son decorativos: el botón proporciona la etiqueta accesible.

## Componentes

| Definición               | Clave de icono                 | Etiqueta técnica       | Glifo                     |
| ------------------------ | ------------------------------ | ---------------------- | ------------------------- |
| `component-ad`           | `forge-component-ad`           | Componente · Potencia  | hoja diagonal             |
| `component-attack_speed` | `forge-component-attack_speed` | Componente · Impulso   | rayo                      |
| `component-ap`           | `forge-component-ap`           | Componente · Ingenio   | rombo dividido            |
| `component-mana`         | `forge-component-mana`         | Componente · Reserva   | gota                      |
| `component-armor`        | `forge-component-armor`        | Componente · Coraza    | escudo                    |
| `component-magic_resist` | `forge-component-magic_resist` | Componente · Amparo    | amparo facetado           |
| `component-health`       | `forge-component-health`       | Componente · Vitalidad | cruz                      |
| `component-critical`     | `forge-component-critical`     | Componente · Precisión | estrella de cuatro puntas |

## Objetos completos

Las etiquetas son descriptivas de ingredientes; no nombres oficiales. Estadísticas, condiciones y restricciones se leen de la definición versionada, nunca del dibujo.

| Definición                              | Clave de icono                    | Etiqueta técnica / pareja de glifos |
| --------------------------------------- | --------------------------------- | ----------------------------------- |
| `item-forge-ad--ad`                     | `forge-ad-ad`                     | Objeto · Potencia + Potencia        |
| `item-forge-ad--ap`                     | `forge-ad-ap`                     | Objeto · Potencia + Ingenio         |
| `item-forge-ad--armor`                  | `forge-ad-armor`                  | Objeto · Potencia + Coraza          |
| `item-forge-ad--attack_speed`           | `forge-ad-attack_speed`           | Objeto · Potencia + Impulso         |
| `item-forge-ad--critical`               | `forge-ad-critical`               | Objeto · Potencia + Precisión       |
| `item-forge-ad--health`                 | `forge-ad-health`                 | Objeto · Potencia + Vitalidad       |
| `item-forge-ad--magic_resist`           | `forge-ad-magic_resist`           | Objeto · Potencia + Amparo          |
| `item-forge-ad--mana`                   | `forge-ad-mana`                   | Objeto · Potencia + Reserva         |
| `item-forge-ap--ap`                     | `forge-ap-ap`                     | Objeto · Ingenio + Ingenio          |
| `item-forge-ap--armor`                  | `forge-ap-armor`                  | Objeto · Ingenio + Coraza           |
| `item-forge-ap--attack_speed`           | `forge-ap-attack_speed`           | Objeto · Ingenio + Impulso          |
| `item-forge-ap--critical`               | `forge-ap-critical`               | Objeto · Ingenio + Precisión        |
| `item-forge-ap--health`                 | `forge-ap-health`                 | Objeto · Ingenio + Vitalidad        |
| `item-forge-ap--magic_resist`           | `forge-ap-magic_resist`           | Objeto · Ingenio + Amparo           |
| `item-forge-ap--mana`                   | `forge-ap-mana`                   | Objeto · Ingenio + Reserva          |
| `item-forge-armor--armor`               | `forge-armor-armor`               | Objeto · Coraza + Coraza            |
| `item-forge-armor--attack_speed`        | `forge-armor-attack_speed`        | Objeto · Coraza + Impulso           |
| `item-forge-armor--critical`            | `forge-armor-critical`            | Objeto · Coraza + Precisión         |
| `item-forge-armor--health`              | `forge-armor-health`              | Objeto · Coraza + Vitalidad         |
| `item-forge-armor--magic_resist`        | `forge-armor-magic_resist`        | Objeto · Coraza + Amparo            |
| `item-forge-armor--mana`                | `forge-armor-mana`                | Objeto · Coraza + Reserva           |
| `item-forge-attack_speed--attack_speed` | `forge-attack_speed-attack_speed` | Objeto · Impulso + Impulso          |
| `item-forge-attack_speed--critical`     | `forge-attack_speed-critical`     | Objeto · Impulso + Precisión        |
| `item-forge-attack_speed--health`       | `forge-attack_speed-health`       | Objeto · Impulso + Vitalidad        |
| `item-forge-attack_speed--magic_resist` | `forge-attack_speed-magic_resist` | Objeto · Impulso + Amparo           |
| `item-forge-attack_speed--mana`         | `forge-attack_speed-mana`         | Objeto · Impulso + Reserva          |
| `item-forge-critical--critical`         | `forge-critical-critical`         | Objeto · Precisión + Precisión      |
| `item-forge-critical--health`           | `forge-critical-health`           | Objeto · Precisión + Vitalidad      |
| `item-forge-critical--magic_resist`     | `forge-critical-magic_resist`     | Objeto · Precisión + Amparo         |
| `item-forge-critical--mana`             | `forge-critical-mana`             | Objeto · Precisión + Reserva        |
| `item-forge-health--health`             | `forge-health-health`             | Objeto · Vitalidad + Vitalidad      |
| `item-forge-health--magic_resist`       | `forge-health-magic_resist`       | Objeto · Vitalidad + Amparo         |
| `item-forge-health--mana`               | `forge-health-mana`               | Objeto · Vitalidad + Reserva        |
| `item-forge-magic_resist--magic_resist` | `forge-magic_resist-magic_resist` | Objeto · Amparo + Amparo            |
| `item-forge-magic_resist--mana`         | `forge-magic_resist-mana`         | Objeto · Amparo + Reserva           |
| `item-forge-mana--mana`                 | `forge-mana-mana`                 | Objeto · Reserva + Reserva          |

## Sustitución y comprobación

Usar un recurso propio autorizado, mantener silueta legible a 30–48 px y comprobar hover, selección, foco, equipo y aviso de reparto. Cambiar solo el override de la clave elegida; las etiquetas técnicas permanecen accesibles. Revisar también una URL fallida para confirmar el retorno al SVG. Las composiciones dobles conservan dos glifos: no representan dos instancias equipadas.
