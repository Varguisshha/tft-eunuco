# Neon Playground

Propuesta cromática de Festival Pop; sin aprobación de producción.

Cinco semillas: #222653, #5078F5, #C7EF60, #F56DC3, #F4F3FF.

El lima identifica rápido los controles; la fascia azul y el magenta dejan una personalidad arcade clara.

Límite: Mayor tensión cromática con el verde de árboles y sprites; no conviene ampliar las superficies lima.

## Ajustes tonales

Rampas sRGB derivadas únicamente de las cinco semillas y blanco/negro. Tropical usa coral + 91% blanco para texto; Neon reserva magenta como acento secundario y usa oro semántico común. Botón: #5078F5 → #4262C9. Los textos pequeños del inspector y las sinergias usan text.secondary explícito, sin atenuación por opacidad.

## Tokens

| Token | Color |
|---|---|
| `surface.primary` | `#222653` |
| `surface.elevated` | `#2E315C` |
| `surface.overlay` | `#1C1F44` |
| `surface.canvas` | `#0F1125` |
| `surface.paper` | `#C3CEFC` |
| `border.primary` | `#5078F5` |
| `border.highlight` | `#8EA7F9` |
| `border.frame` | `#0F1125` |
| `text.primary` | `#F4F3FF` |
| `text.secondary` | `#D4D4E5` |
| `text.onPaper` | `#0F1125` |
| `text.onAccent` | `#0F1125` |
| `accent.primary` | `#C7EF60` |
| `accent.secondary` | `#F56DC3` |
| `button.default` | `#4262C9` |
| `button.hover` | `#4B64B7` |
| `button.pressed` | `#3750A5` |
| `button.active` | `#C7EF60` |
| `button.activeHover` | `#CEF078` |
| `button.activePressed` | `#B1D459` |
| `button.disabled` | `#4C4F75` |
| `button.disabledText` | `#CACADD` |
| `button.disabledBorder` | `#767898` |
| `card.paper` | `#F4F3FF` |
| `card.motif` | `#AABCFA` |
| `card.motifInk` | `#0F1125` |
| `card.footer` | `#222653` |
| `card.trait` | `#1C1F44` |
| `card.text` | `#F4F3FF` |
| `card.code` | `#0F1125` |
| `game.playerLifeFill` | `#267264` |
| `game.rivalLifeFill` | `#986035` |
| `game.life` | `#70E0A3` |
| `game.enemyLife` | `#FFB56F` |
| `game.mana` | `#66C9ED` |
| `game.shield` | `#B4DDF0` |
| `game.gold` | `#F6C454` |
| `game.cost1` | `#A9B5C7` |
| `game.cost2` | `#74E1CD` |
| `game.cost3` | `#FFB755` |
| `game.danger` | `#FF817A` |
| `game.damagePhysical` | `#FFD166` |
| `game.damageMagic` | `#B9A3FF` |
| `game.threshold` | `#74E1CD` |
| `game.thresholdInk` | `#152D2B` |
| `game.track` | `#171E2B` |
| `tooltip.surface` | `#1C1F44` |
| `tooltip.text` | `#F4F3FF` |
| `result.surface` | `#222653` |
| `result.title` | `#C7EF60` |
| `counter.surface` | `#1C1F44` |
| `counter.text` | `#F4F3FF` |
| `material.highlight` | `#B2C2FB` |
| `material.shadow` | `#0F1125` |
| `phase.surface` | `#C3CEFC` |
| `phase.text` | `#0F1125` |
| `phase.timer` | `#334D9D` |
| `emblem.surface` | `#4262C9` |
| `emblem.text` | `#F4F3FF` |
| `emblem.activeSurface` | `#F6C454` |
| `emblem.activeText` | `#0F1125` |
| `state.locked` | `#C7EF60` |
| `state.insufficient` | `#FF817A` |
| `state.selected` | `#C7EF60` |

## Composiciones

- [Partida](screen-1920.png)
- [Inspector](inspector-1920.png)
- [Detalles](components-1920.png)
- [Prototipo](index.html)

[Contraste completo](../comparison/CONTRAST.html).
