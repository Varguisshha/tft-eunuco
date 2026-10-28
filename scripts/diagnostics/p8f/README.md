# P8F — laboratorio reproducible

Servidor/control exclusivos 2592/2593, Vite 4188. No usar simultáneamente otra ejecución de estos guiones. No se conecta a Supabase. Las identidades fixture solo son aceptadas por el verificador de `apps/server/src/diagnostics/p8f.ts`.

Desde la raíz del repositorio:

```sh
mkdir -p apps/web/artifacts/p8f artifacts/p8f/scripts
cp scripts/diagnostics/p8f/network.jsx.fixture apps/web/artifacts/p8f/network.jsx
cp scripts/diagnostics/p8f/index.html.fixture apps/web/artifacts/p8f/index.html
cp scripts/diagnostics/p8f/play.mjs.fixture artifacts/p8f/scripts/play.mjs
cp scripts/diagnostics/p8f/inventory-browser.mjs.fixture artifacts/p8f/scripts/inventory-browser.mjs
cp scripts/diagnostics/p8f/edge-interactions.mjs.fixture artifacts/p8f/scripts/edge-interactions.mjs
```

El servidor arranca en una terminal dedicada:

```sh
node --import ./apps/server/node_modules/tsx/dist/loader.mjs apps/server/src/diagnostics/p8f.ts
```

Y el cliente, en otra:

```sh
VITE_GAME_SERVER_URL=http://127.0.0.1:2592 pnpm --filter @tft/web exec vite --host 127.0.0.1 --port 4188
```

Ejecutar secuencialmente:

```sh
node artifacts/p8f/scripts/play.mjs
node artifacts/p8f/scripts/inventory-browser.mjs
node artifacts/p8f/scripts/edge-interactions.mjs
```

Los dos últimos usan fixtures DEV **aisladas**, mientras `play.mjs` usa una partida remota normal. No confundir sus resultados. `play.mjs` necesita un proceso de laboratorio recién iniciado porque crea cuatro cuentas fixture con una única sala por identidad; detener/reiniciar únicamente ese proceso entre repeticiones. Nunca reiniciar 4173/2567. `refresh` reautentica el cliente tras cada salto del reloj artificial para volver a sincronizar el muestreo visual; la prueba de recuperación además cierra un socket real y espera el reintento normal del adaptador.

Las plantillas apuntan a la instalación de Chrome y Playwright utilizada en esta máquina. En otro equipo ajustar exclusivamente esas rutas y el directorio de evidencias. No instalar dependencias de diagnóstico en producción. Las fuentes JSX se copian a una carpeta ignorada y no se importan desde la entrada pública. El hook de escena solo expone lectura de sprites para comprobar cuerpo/proyectil; la congelación del fotograma usa una traza autoritativa, sin conceder unidades ni alterar daño.

Pruebas mantenidas por Vitest:

- `apps/server/src/stabilization-network.test.ts`: 2/3/4 clientes con economía normal, retardo de intenciones, reenvíos y desconexión simultánea.
- `apps/server/src/persistence/crash.test.ts`: incluye reinicio Overtime/final y eliminado con supervivientes, además de las campañas previas de persistencia.
- `packages/game-core/src/items/stabilization.test.ts`: estrés integrado 7v7.

Ver `docs/F0_P8F_STABILIZATION_REPORT.md` para cobertura y límites.
