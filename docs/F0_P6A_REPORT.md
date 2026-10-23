# F0-P6A — informe de entrega

23 de octubre de 2026. Implementada la base universal de habilidades y sinergias con DOLEA como primer caso real. F0-P6B no iniciado.

## Resultado

1. **Contrato universal:** ChampionAbility v1 estricta/serializable con tipos activa, pasiva y mixta; componentes opcionales según tipo, una identidad y maná coherente. Pasivas puras funcionan con capacidad cero.
2. **Sinergias:** core calcula composición por personajes distintos desplegados, el mayor umbral, destinatarios y perfiles iniciales nuevos por combate. Soporta acumulación explícita, efectos y bonificaciones planas/porcentuales.
3. **Pasivas:** cola determinista para comienzo, ataques/N ataques, daño recibido, cruce de vida, lanzamiento, eliminación y expiración. Reglas acotadas con condiciones, contador y cooldown; sin resurrección por daño letal/simultáneo.
4. **Maná:** comprobación de condiciones/objetivos, consumo único al inicio, eventos de lanzamiento/resolución, interrupción por aturdimiento/muerte, sin autoridad visual.
5. **Volumen Sucio:** escudo12 % de vida efectiva en primer cruce bajo50 %; Press de banca0/70, daño100/180/324 físico adyacente,20armadura4s renovable. Fallback Ability solicitado por eventos;3★ usa arte2★.
6. **Hortaleza:**2:+100HP;3:+220HP/+15armadura; miembros, mayor umbral.
7. **Llama de Pádel:**2:+12 %AS;3:+25 %AS; miembros, mayor umbral.
8. **Iconos:** SVG originales32×32, urbanos/pala y llama/fuerza, registro independiente y fallback controlado. No emojis ni recursos copiados.
9. **HUD:** sinergias a la izquierda con nombre, conteo, nivel y tooltip de umbrales/contribuidores; tienda conserva retratos/marcos/economía P5.3 y conecta los dos rasgos reales.
10. **Inspector:** habilidad única con componentes, maná solo si procede, iconos/retrato, estadísticas efectivas, escudos y estados. Velocidad local incluye el multiplicador lógico de Overtime. Se conserva cerrado por defecto.
11. **Pruebas:** 273 casos previos conservados y41nuevos; detalle y resultado final al pie. Escenarios de diagnóstico de1/2/3★, umbrales2/3 y pasiva en Overtime disponibles en Arena.
12. **Guardados:** catálogos antiguos conservan perfiles/reglas; los nuevos fijan catálogo f0p6a y reglas f0p6a-1. Protocolo de transporte3, contrato habilidad/rasgo1. No se reinterpretan trazas viejas; restauración y continuación hasta ronda2 comparadas.
13. **Limitaciones:** balance provisional; solo DOLEA tiene membresías reales. Los umbrales2/3 no se alcanzan en la partida normal hasta incorporar personajes autorizados. No existe animación especial nueva, audio, objetos, aumentos, multijugador ni P6B. Arena sigue mostrando velocidad base en su inspector técnico (rotulada así); el inspector local sí incorpora estados/Overtime. El log técnico de eventos muestra la ventana reciente de reproducción, no el historial completo.
14. **Git:** se preservó el trabajo validado P5.2/P5.3 y banquillo superpuesto en `335df32`. Los cambios P6A quedan revisables en el árbol de trabajo, sin commit adicional ni push. Originales de raíz y Sprites/ no añadidos ni modificados. Sin remoto configurado por esta fase.
15. **Ampliación:** [contrato de personajes](CHARACTER_DESIGN_CONTRACT.md), [habilidades](ABILITY_SYSTEM.md), [sinergias](TRAIT_SYSTEM.md). Nuevas habilidades se configuran con operaciones tipadas; una nueva semántica requiere extensión explícita, pruebas y versión de reglas. Conservar catálogos históricos al cambiar balance.

## Recorrido de navegador

HUD validado en1920×1080,1440×900,1366×768,1280×720 y2560×1440; dimensiones del documento coinciden con viewport. Arena dominante y banquillo flotante preservados. DOLEA comprado y colocado, rasgos1/2, tooltip accesible, inspector unificado y recuperación del guardado de desarrollo. La ficha puede tener scroll interno en alturas pequeñas. Móvil390×844 revisado como auxiliar: scroll vertical permitido, ninguno horizontal.

Arena técnica: primer lanzamiento observado en53/resolución56,45→65armadura y vuelta a45 en96; pasiva75,281/600HP y72escudo. Overtime reduce ese escudo a54. Diagnósticos2/3 verifican700/820HP,45/60armadura,0,896/1ataques/s y eventos de activación. Evoluciones2★/3★ muestran1080/1944HP y resolver Ability→Attack2★. La fusión completa de copias, el pool y las rondas automáticas tienen cobertura automatizada conservada; no se afirma haber repetido toda esa secuencia manual en este recorrido.

Capturas locales en `artifacts/p6a/`: `hud-{1920,1440,1366,1280,2560}-accepted.png`, `shop-final.png`, `tooltip-final.png`, `active-armor.png`, `passive-shield.png`, `overtime-shield.png`, `traits-three.png`, `stars-three-fallback.png`. No se distribuyen como assets del juego. Las primeras capturas `shop-1920.png`/`tooltip-1920.png` son históricas; el HUD final usa badge P6A. La captura final de tienda muestra las cinco ofertas y DOLEA con los dos iconos reales en preparación.

La revisión independiente detectó y corrigió un único fallo material de precedencia CSS que anulaba el inspector compacto. Confirmación final: SHIP. El documenter conservó DESIGN.md y registró las reglas de extensión en el brief local ignorado; no cambió la identidad visual.

## Comprobación final

`pnpm check` correcto: tipos, lint, **314 pruebas en29archivos** y build. `pnpm format:check` y `git diff --check` correctos. Sin remotos. La invocación inicial de formato sobre SVG no tenía parser inferible; el chequeo global de archivos compatibles pasó correctamente. El build mantiene el aviso ya conocido del tamaño de Phaser; no implica un fallo de compilación.
