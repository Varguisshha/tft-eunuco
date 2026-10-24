# F0-P6B.5-B — contrato de implementación

Fuente de verdad: `design-exploration/f0-p6b5a2/neon-playground/{screen-1920,inspector-1920,components-1920}.png` y `tokens.json`. El usuario ha aprobado Festival Pop C × Neon Playground. Royal Pop no se adopta.

## Dirección y composición

Juego PC con arena dominante, HUD superpuesto y acciones legibles. Reutilizar los paths originales C, Bungee local SIL OFL y DM Sans. Carta258×231, control230×70, economía246×231 e inspector360×654. Ajustes compacto65×61 de la misma familia. Preservar los64 colores semánticos aprobados, medallones, diagonales, tipografía, materiales y estados.

A1920×1080: fase586/18/650/87; clasificación24/133/220; participantes91px de alto; banquillo354/696/1164/104 con9 plazas; economía23/805/246/231; ofertas283/805/1375/231; controles1672/805/225/231; inspector1530/141/360/654. Son cajas de presentación, no coordenadas del juego.

## Integridad

No modificar paquetes core/shared/game-data/sprite-contract, calibración de56 hexágonos, cámara/proyección, estadísticas, economía, probabilidades, temporizadores, formatos ni recursos originales. Phaser y las animaciones reales siguen activos. Escala visual1.4, pies y límites de interacción intactos. Todas las acciones pasan por LocalSession y la autoridad existente. DEV conserva gating, guardado aparte y rechazo en recuperación normal.

Tienda5 y banquillo9 mantienen todos los estados, teclado, selección y arrastre. Inspector contextual con AD/AP/críticos, habilidades mixtas, pasivas y contadores reales; scroll interno permitido con cierre fijo y Escape. Lima para acción/intención, magenta para remates económicos/fase, semánticas originales para recursos y costes. Movimiento reducido y extensión onCue sin audio.

## Validación

Base614 pruebas. El primer pnpm check encontró56 errores de lint en prototipos históricos ajenos al bundle; excluir únicamente design-exploration del lint de aplicación permitió comprobar la base completa. Suite final619 pruebas/42 archivos, tipos/lint/build y verify:public correctos. Cinco viewports1280×720,1366×768,1440×900,1920×1080,2560×1440 sin scroll del documento.

Comparar pantalla1920, inspector VARGAS y componentes con las tres referencias; registrar discrepancias objetivas. Probar economía, bloqueo, selección, arrastre, fusión, fases, Overtime y herramientas DEV. No atribuir recorridos no ejecutados. Seis hallazgos del revisor fresco se corrigieron en bloque y recapturaron; veredicto ship limitado a esas correcciones en finish-verdict.md.

## Datos comparables y adaptaciones obligatorias

La muestra estática combina preparación18.4s con Iniciar activo, retrato DOLEA2★ para compra1★, contadores de combate antes de combatir y figuras fuera de centros legales. La implementación conserva autoridad, compras1★, contadores reales y casillas legales; no falsifica cifras para igualar una imagen.

El fixture DEV Cargar referencia Neon fija52 oro, nivel4, XP4/10, vida100/88, ronda3 y18.4s, con fuente de tiempo fija explícita. Cuatro unidades propias, tres en banquillo, cinco ofertas y los mismos cuatro perfiles rivales diagnósticos, con pool reservado y snapshot validado. No cambia partidas normales ni sus temporizadores. Las fases se pueden avanzar manualmente para diagnóstico.

Las cajas principales del HUD coinciden con la referencia. El arte queda aproximadamente en312.34/8/1395.33/785.29 frente a280/66/1460/821.875: la cámara protegida conserva las casillas encima del banquillo. La revisión independiente acepta esta adaptación. No se inventa una puntuación automática de similitud.

Informe completo: docs/NEON_PLAYGROUND_IMPLEMENTATION.md. Sin remoto ni push. Detener antes de F0-P7A.
