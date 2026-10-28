# Laboratorio Railway local R0

Opt-in, nunca importado en `apps/server/src/main.ts` ni servido como ruta. Ejecutar desde raíz del worktree. Usa **el main de producción compilado**, proxy TLS local y emulación externa de endpoints Supabase sobre PostgreSQL real aislado. No crea usuarios ni cambia Supabase remoto. El firmante y service key se generan en memoria por ejecución; no se imprimen. No representa una validación del edge, Auth/SMTP o facturación reales del proveedor.

## Preparación

- Instalar lockfile. Mantener libres TLS 9447 (juego) y 9448 (fixture Supabase). Node usa puerto libre obtenido del SO y escucha 0.0.0.0. Los servicios normales 4173/2567 no se tocan.
- Crear bases **desechables** `tft_railway_test` y `tft_railway_fence_test` en PostgreSQL 127.0.0.1:55439. Copiar exclusivamente esquema de la base local `tft_remote_test` de P9A, sin datos, conservando grants; aplicar `202610260002_authority_lease.sql` a ambas. No aplicar esa migración a las bases históricas de regresión.
- Preparar CA local como en `scripts/remote/README.md`. Firmar certificado de laboratorio para `DNS:game.p9b.test,DNS:localhost,IP:127.0.0.1`; guardar `server.key/server.pem` en `artifacts/p9b-r0`. El preload `dns.cjs` resuelve únicamente `game.p9b.test` hacia loopback dentro del proceso; no cambia `/etc/hosts`.
- `NODE_EXTRA_CA_CERTS` debe señalar `artifacts/p9a/tls/ca.pem`. No desactivar TLS. Para Chrome, perfil desechable `artifacts/p9b-r0/chrome-profile` con **esa CA de laboratorio** confiada; nunca perfil personal. La resolución del dominio en Chrome usa un argumento del proceso, no DNS global.
- Construir cliente con `VITE_APP_ENV=private`, `VITE_SUPABASE_URL=https://localhost:9448` y `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_p9b_local_only`; servidor con build habitual. Son valores públicos de fixture, no de Supabase real.

```sh
node --require ./scripts/diagnostics/p9b/dns.cjs --import ./apps/server/node_modules/tsx/dist/loader.mjs scripts/diagnostics/p9b/lab.mjs
```

El harness trunca SOLO `tft_railway_test` al iniciar. Crea cuatro identidades, usa rutas Auth y RPC reales desde el servidor, compra/despliega, combina/equipa y vende desde ronda siete mediante comandos normales. No advance ni cambio del reloj. Ronda cuatro: reconexión y SIGTERM/recuperación activa, comparación de inventarios. Final: SIGKILL, espera de concesión y comparación del deadline. También rechaza segundo servidor, JWT/origen incorrectos, assets inexistentes y verifica TTF. Las pruebas de fence independientes usan la segunda base, nunca la partida de este guion.

Cuando imprima `P9B_BROWSER_READY`, ejecutar `browser.mjs` con `P9B_PLAYWRIGHT_PATH` al módulo instalado y, si corresponde, `P9B_CHROME_PATH` al ejecutable Chrome. Este script carga una sesión fixture en almacenamiento del navegador, abre el **cliente público compilado** en `/#multiplayer`, recupera el final desde el lobby real, recarga y comprueba FontFace FestivalPop, respuestas TTF, errores JS y recursos fallidos. No escribe contraseñas. Termina creando `browser-done` para continuar el cierre; limpiar ese marcador y `browser-session.json` antes de una repetición.

Los archivos de sesión, snapshots, certificados, perfiles y logs brutos permanecen en `artifacts/` ignorado. Publicar solo agregados depurados y captura sin tokens. Medir CPU/RAM aquí no sería comparable a P9A.1 si simultáneamente corre la suite: este guion demuestra comportamiento, no capacidad Railway.

Para provisionar la confianza del perfil inicializado y cerrado, ejecutar `python3 scripts/diagnostics/p9b/prepare-browser-trust.py`: restringe la CA a localhost y game.p9b.test. No omite errores TLS. Si el navegador necesita repetirse dentro de los cinco minutos del final, `P9B_RESUME_BROWSER=1` con el mismo comando del laboratorio restaura exclusivamente una partida aún retenida; no trunca datos, renueva deadlines ni repite el ensayo. El modo falla si ya expiró. Limpiar antes los dos marcadores mencionados.
