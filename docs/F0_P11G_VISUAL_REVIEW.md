# P11G — Revisión visual de cierre

Alcance: extensión acotada del HUD Festival Pop × Neon Playground, preservando arena y arte. Revisión independiente fresca mediante Impeccable, sin conversación heredada. No sustituye las pruebas de motor, persistencia o seguridad.

## Evidencias

`artifacts/p11g/visual/`: HUD 1280, 1440, 1920, 2560 y 3840; inventario desplazado, probabilidades, fusión 2★/3★ y confirmación, cierres 3/6/9. `metrics.json` mide todos los viewports. Referencias previas: `artifacts/p11/c/hud-1280.png` y `artifacts/p11/f/network-1920.png`.

## Primera revisión

**FIX**: en ronda 9 el primer hueco mostraba «Coste 4 sin catálogo» junto a check de éxito y DOLEA de una compra anterior. El resto del alcance visual quedó aprobado: dos columnas de 112 px, separación del rail, nueve plazas, pies/estrellas visibles, arena dominante, cinco cartas, recibos legibles y tabla explicativa.

## Corrección y dictamen

Shop utiliza `shopRolls.outcome` para decidir tratamiento de compra, símbolo y nombre, con confirmación por identidad de oferta para el aviso de fusión. Se recapturaron las cinco resoluciones y los estados restantes. Ronda 9 muestra símbolo neutro sin nombre anterior.

Revisión de dictamen: **hallazgo resuelto; SHIP**. Sin correcciones adicionales exigidas dentro de ese alcance.

## Complemento funcional

`functional.json` demuestra dos iconos de equipamiento en banquillo, tres grupos pendientes, clic a través del recibo, retirada automática, ausencia de repetición al restaurar, Escape en tabla y movimiento reducido. Las capturas `bench-equipment.png` y `pending-round-three.png` complementan la revisión. El veredicto no convierte capturas estáticas en evidencia de comportamiento; estos resultados proceden de acciones reales en navegador.

La documentación de extensión conserva DESIGN.md y su sidecar. La deriva documental anterior se registra sin reparar ni cambiar la identidad visual.
