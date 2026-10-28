# F0-P8E — Informe de entrega

## Base y alcance

Base exacta `8a6850b`, integración P8D + FLORIN/Splash Arts (padres `2d622b4` y `4aa8cef`). Rama aislada `codex/f0-p8e-item-hud`, worktree `/Users/vargas/.codex/worktrees/p8e-item-hud/TFT EUNUCO`. El checkout de integración se conserva. No se hace push, despliegue ni cambio en Supabase o servicios normales.

## Resultado

| Requisito            | Implementación y evidencia                                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inventario visual    | Bandejas separadas de 16 componentes y 16 completos, pendientes con recuperación explícita. `ItemHud`, `full-pending.png`.                                                                                                        |
| Iconografía          | 44 SVG originales provisionales (8 glifos y 36 parejas), registro de sustitución por clave y fallback. `ITEM_ICON_MANIFEST.md`.                                                                                                   |
| Recetas              | Ocho opciones por componente, ingredientes, resultado, descripción versionada y disponibilidad. No consume al consultar. `inventory-1920.png`.                                                                                    |
| Arrastre y clic      | Componente a componente, inventario a unidad de arena o banquillo, segundo componente sobre equipo. Alternativa por selección + destino + Equipar. `crafted.png`, `drag-to-jaramillo.png`.                                        |
| Equipamiento         | Tres ranuras por coste, incluida ocupación triple; componentes y completos diferenciados. Inspector y marcas compactas bajo los pies. `three-equipped.png`.                                                                       |
| Rechazo y devolución | Cuarto objeto rechazado, devolución por venta, conservación y excedentes en fusión; reglas existentes del core. `fourth-rejected.png`, `sold-returned.png`, `fusion-returned.png`.                                                |
| Reparto              | Avisos basados en los registros privados P8D, deduplicados por ID. Ronda y dos/tres iconos; aviso de pendientes. `round3.png`, `round6.png` son fixtures DEV de registros ya recibidos, no una concesión real simulada por la UI. |
| Persistencia visual  | Inventario y equipo reconstruidos desde estado autoritativo; primera lectura histórica se presenta como «ya recibida». No existe otro inventario en almacenamiento del navegador.                                                 |
| FLORIN y personajes  | Equipar/autocombinar probado con DOLEA, VARGAS, JARAMILLO y FLORIN. FLORIN equipado en prueba multijugador real.                                                                                                                  |
| Splash arts y arena  | Assets y composición de tienda conservados; ninguna modificación en recursos públicos, personajes, recetas, reparto, economía o simulación.                                                                                       |
| Responsive           | 1440×900, 1920×1080, 2560×1440, 3840×2160 y 1280×720: cinco ofertas visibles, sin scroll de documento. Bandejas con tamaño acotado e interior desplazable.                                                                        |
| Accesibilidad        | Etiquetas, foco visible interior, selección y mensajes accesibles, detalles persistentes, operación sin arrastre, Escape, estado inválido con texto y borde, movimiento reducido. `keyboard-*.png`.                               |

## Confirmación y multijugador

La previsualización usa una copia del estado. La interfaz envía los comandos existentes y espera al snapshot confirmado, incluso si el recibo llega antes. Pending evita el doble envío. Las pruebas cubren rechazo, reintento, desconexión, duplicación de request ID y conservación de ingredientes. Un aviso de servicio recibido antes del primer snapshot ya no consulta un reloj inexistente; hay regresión específica.

Prueba real adicional con dos clientes autenticados de diagnóstico, servidor en 2582, control en 2583 y PostgreSQL aislado en 55439: equipar un componente a FLORIN, confirmar, matar el proceso con SIGKILL, reiniciarlo y reconectar. El inventario y equipo coinciden exactamente: 15 componentes, 0 completos en bandeja, 4 pendientes; cero errores de navegador. La proyección rival solo contiene campos públicos de formación, sin bolsas ni concesiones. Evidencia: `network.json`, `network-confirmed.png`, `network-disconnected.png`, `network-recovered.png`.

## Evidencias y validación

Directorio local `artifacts/p8e/`: `browser.json`, `interactions.json`, `network.json`, capturas de todas las resoluciones e interacciones y scripts de reproducción. La revisión Impeccable resolvió los cuatro hallazgos: foco en siluetas recortadas, contraste del tab seleccionado, estabilidad de detalles y mensaje vacío a ancho completo. Veredicto final: ship para los ajustes revisados. PRODUCT, DESIGN y sidecar permanecen intactos; la deriva documental anterior está señalada en ITEM_HUD.

El resultado técnico final se registra en [VALIDATION](VALIDATION.md).

## Límites y siguiente paso

- Iconos y nombres técnicos son provisionales, originales y reemplazables; no ilustraciones finales ni nombres oficiales de TFT.
- En cada montaje se puede mostrar una vez el último reparto histórico como «ya recibido». No se conserva un historial visual de avisos entre montajes y no se vuelve a conceder nada.
- Los avisos de ronda en capturas DEV verifican presentación; las pruebas de PostgreSQL verifican el reparto persistente real. La prueba visual de SIGKILL verifica inventario/equipo reales.
- No se afirma soporte táctil de drag-and-drop; el flujo de clic/selector evita esa dependencia. La matriz visual de aceptación es de escritorio, hasta 1280×720.
- Se conserva el aviso de Vite por chunks grandes de la aplicación/Phaser; no es un fallo del build.
- Próximo paso recomendado: revisión de uso con jugadores y sustitución artística de iconos mediante el manifiesto. No se inicia otra fase.

## Estado Git

Entrega local en `codex/f0-p8e-item-hud`, con código y documentación de P8E en un commit dedicado. Las evidencias de navegador y logs están en `artifacts/p8e/` (ignorado). Las copias de recursos brutos de `Sprites/` y `TFPeru/`, necesarias para las pruebas de importación, permanecen sin seguimiento y fuera del commit; no se incorporan assets nuevos a esta fase. No hay push, merge a la integración ni despliegue.
