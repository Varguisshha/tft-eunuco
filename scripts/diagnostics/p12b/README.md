# Laboratorio visual P12B

Entorno descartable, exclusivamente loopback. No usa Supabase, Railway ni cuentas reales. Reutiliza `MatchRoom`, `AuthoritativeMatch`, el coordinador remoto y el renderer de producción. El servidor usa cuatro identidades sintéticas y la configuración P12B; el reloj avanza desde controles visibles de laboratorio.

1. Desde la raíz, ejecutar `apps/server/node_modules/.bin/tsx scripts/diagnostics/p12b/server.mjs` con Node 24.
2. Crear `apps/web/artifacts/p12b/`, copiar `browser.jsx.fixture` como `browser.jsx` y añadir un `index.html` con `root` y el módulo `/browser.jsx`.
3. Servir esa carpeta con Vite y React, `publicDir: '../../public'`, `__DEVTOOLS__: false`, `import.meta.env.VITE_GAME_SERVER_URL: 'http://127.0.0.1:2578'`, y `server.fs.allow` apuntando a la ruta absoluta del repositorio. Proxy `/control` a `http://127.0.0.1:2579`, eliminando el prefijo.
4. Abrir el navegador en `127.0.0.1:4184` y pulsar «Preparar ejércitos» una sola vez. Se despliegan DOLEA/VARGAS y se llena la bolsa para observar Pendientes.
5. Avanzar a resolución 1 y luego a preparación 2. «Preparar eliminación» elige un perdedor anterior, prepara salud baja en una copia validada con la conservación del pool compartido y vende legalmente su ejército. Esta operación solo se admite antes del combate.
6. Avanzar combate/resolución 2: quedan tres supervivientes. Avanzar a combate 3 y pulsar «Ver clon». El renderer presenta el replay real calculado por la autoridad. El reloj manual no sirve para medir duración de las animaciones.
7. Resolver la ronda 3: aparece el aviso de componentes y removedor. Una carga inicial de inventario se reconoce sin repetirlo; cada aviso dura ocho segundos.
8. En preparación 4, volver a preparar una eliminación y resolver la ronda: quedan dos. La siguiente ronda presenta un duelo real sin clon.
9. Cerrar las pestañas y parar ambos procesos. Los puertos 2578/2579/4184 no pertenecen a producción.

Las capturas se generan desde el navegador; no se alteran imágenes ni se incluyen en el bundle público. Los controles pequeños de la parte superior pertenecen a este laboratorio y no al HUD distribuido.

Las primeras versiones del control de preparación se rechazaron por intentar cambiar salud después de congelar combate o por validar una economía compartida sin sus reservas externas. Se corrigió el laboratorio usando la conservación autoritativa, una copia previa y ventas normales antes del combate. No se modificaron las reglas del juego para aceptar esos estados.
