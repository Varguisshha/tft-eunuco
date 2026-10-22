# Dirección visual de la Arena interna

Dirección confirmada por el usuario: arena oscura y sobria, pixel-art original generado por código, jade para la mitad propia y ámbar para la otra mitad. Se implementa directamente en código conforme a la restricción de recursos provisionales del encargo.

La superficie es una herramienta de preparación y diagnóstico de combate: tablero dominante, reserva inferior y panel lateral. En pantallas estrechas, el panel pasa debajo. La identidad procede de las losetas elevadas, los sprites rectangulares de 32 × 40 px, los trazos hexagonales y una paleta contenida. Los controles de simulación se agrupan encima del tablero; los efectos representan eventos autoritativos.

- Fondo #101916; superficies #19271f; límites #314238.
- Jade #b8d4a3; ámbar #d2ab73; rechazo cobre #e09a7c con cruz, además del color.
- Space Grotesk para títulos; DM Sans para controles y texto, servidas localmente desde dependencias Fontsource. Monoespaciada solo para coordenadas.
- Selección: contorno marfil. Destino disponible: punto. Destino inválido: contorno y cruz cobre con mensaje textual al intentar.
- Reproducción animada de combate desde snapshots/eventos, con barras de vida/maná, escudo, stun y daño. Sin animaciones ambientales que distraigan.

Revisión mecánica: aviso sobre fuente frecuente y falso positivo de borde grueso en el pedestal hexagonal. La fuente se conserva por legibilidad; el borde del pedestal es geometría de profundidad, no un acento de tarjeta.

## Actualización F0-P2

La pantalla se conserva como Arena de pruebas interna permanente; no constituye la dirección artística definitiva. Se añaden controles de combate y efectos funcionales, conservando jade/ámbar, selección y zoom. La futura pantalla de partida será independiente: tablero protagonista con terreno/profundidad, tienda de cinco, banquillo de nueve, economía, nivel/XP, etapa, clasificación, sinergias y panel contextual. Dirección pixel-art retro moderna original y futuro roster inspirado en amigos; sin assets definitivos ni rediseño completo en P2. Véanse docs/GAME_DESIGN_V0.1.md y docs/ROADMAP.md.
