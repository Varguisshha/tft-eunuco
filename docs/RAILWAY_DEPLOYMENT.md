# Railway Hobby — preparación F0-P9B-R0

Estado: configuración local; ningún proyecto, contrato, push, despliegue ni cambio Supabase remoto efectuado. Base exacta: `4e17a218ca93906278f75c38328ca7e929adda64`, rama `codex/f0-p9b-r0-railway-preparation`.

## Servicio único

Navegador → HTTPS/WSS Railway Edge → Node/Colyseus (frontend compilado, salas, Auth, RPC) → Supabase dedicado existente. Una réplica, sin Caddy, PostgreSQL Railway, volumen, autoscaling ni suspensión. El puerto Node no se publica como TCP. No añadir servicios que puedan alcanzar Node por la red privada del entorno. El perímetro de confianza es la red gestionada de Railway; las cabeceras no son credenciales.

La especificación `.railway/railway.ts` usa `railway/iac` 3.16.0 fijado en lockfile, validado sin acceder a ninguna cuenta. Declara raíz `/`, Railpack, build con instalación congelada, inicio directo Node, readiness, reinicios y recursos. **No ejecutar `config apply` en R0.** Según la documentación consultada el 26-10-2026, `railway.json/toml` queda reservado a servicios antiguos y se retira el 01-12-2026. Se usa el formato IaC actual: [flujo oficial](https://docs.railway.com/infrastructure-as-code), [referencia](https://docs.railway.com/infrastructure-as-code/reference).

## Construcción

Node 26.9.0 fijado en `RAILPACK_NODE_VERSION`; pnpm 11.25.0 en packageManager. Railpack detecta el workspace; el comando explícito vuelve a exigir `pnpm install --frozen-lockfile --prod=false` (incluye herramientas de build con NODE_ENV=production) y ejecuta `pnpm build && pnpm verify:public`. Build incluye Vite y esbuild con los paquetes compartidos empaquetados en servidor. Inicio **desde raíz**: `node apps/server/dist/main.js`; no pnpm supervisor, clúster ni segunda autoridad. `RAILPACK_NO_SPA=1` evita un servidor estático alternativo. [Contrato Node/Railpack](https://railpack.com/languages/node).

No se ejecuta el importador de arte en despliegue: consume los derivados versionados. `scripts/railway/audit-assets.mjs` compara bytes de public/dist, referencias de atlas, cuatro splash arts y licencia Bungee. Las carpetas de originales usadas por pruebas de importación no son requisitos de build. El SDK IaC es dependencia de desarrollo, no se importa en el proceso de juego.

## Orden futuro, exclusivamente con autorización P9B

1. Aprobar presupuesto, responsables, disponibilidad y dominio. Ver [preflight](RAILWAY_PREFLIGHT.md).
2. Crear proyecto Railway y seleccionar Hobby; un entorno privado y un servicio vacío `tft-eunuco`. No añadir base de datos. Desactivar autodeploys/suspensión/replicas adicionales/TCP proxy.
3. Instalar CLI vigente; autenticar fuera de logs y vincular al proyecto y entorno correctos. La preparación no ha iniciado sesión ni vinculado una cuenta Railway.
4. Generar dominio HTTPS para ese servicio; fijar origen exacto. No publicar ni arrancar antes de completar variables. Revisar aislamiento de red privada; no compartir el entorno con otros servicios.
5. Introducir variables de [RAILWAY_ENVIRONMENT](RAILWAY_ENVIRONMENT.md). `preserve()` mantiene valores ya introducidos; **no los crea**. No usar exportaciones con valores de secretos.
6. Revisar estado y copia de Supabase dedicado; aprobar y aplicar exclusivamente migraciones pendientes, con aplicación detenida. Configurar redirección Auth al origen exacto. Nada de esto sucede al arrancar Node.
7. Ejecutar `pnpm verify:railway` local. Solo entonces `railway config plan`, revisar un único servicio y ningún recurso destructivo. `railway config apply` requiere autorización de publicación ya concedida. El límite de memoria/CPU debe ser aceptado por el plan real; no se presupone disponible ni gratuito.
8. Para esta primera publicación usar CLI desde un contexto de release limpio: `railway up --service tft-eunuco --environment private`. Confirmar antes que `private` sea el nombre real vinculado. No subir el worktree con originales, artefactos, certificados o .env. No activar GitHub autodeploys en el piloto.
9. Esperar `/readyz` 200; verificar `/healthz`, TLS válido, WSS, rechazo de Origin/Host incorrecto, carga de fuentes y recursos. Railway comprueba readiness al desplegar; no es monitor continuo.
10. Registro/login/confirmación/recuperación/refresh reales supervisados; luego dos ordenadores y cuatro participantes. Supervisar métricas y coste. Si falla el perímetro o la persistencia, detener el deployment sin borrar datos.

## Actualizaciones y recuperación

`overlapSeconds=0` NO significa que el nuevo proceso arranque después de terminar el anterior. Railway espera salud del nuevo antes de retirar el antiguo. Por ello: cerrar admisión socialmente, esperar final o guardar checkpoint, detener deployment anterior y comprobar su salida; después arrancar el siguiente. No se promete zero-downtime. SIGTERM tiene 30 s internos y Railway concede 35 s.

Como defensa adicional, una concesión SQL de 60 s permite un único propietario. Arranque espera como máximo 80 s sin abrir puerto; heartbeat cada 10 s y límite monotónico local de 40 s. Cada commit comprueba propietario y plazo dentro de la transacción. Caída abrupta permite recuperar después del vencimiento; no se renuevan los deadlines de los finales. [Healthchecks](https://docs.railway.com/deployments/healthchecks), [teardown](https://docs.railway.com/deployments/deployment-teardown).

Rollback: detener nuevas incorporaciones, SIGTERM, confirmar salida y conservar todos los commits confirmados. Revisar fingerprints, formato y capacidad con preflight de lectura del release candidato. Restaurar solo un release compatible con la migración de autoridad y los catálogos persistidos, arrancar una vez y comprobar inventarios, clasificación/readiness y reentrada. P9A.1 **no** es un rollback operativo después de activar la concesión: sus escrituras sin propietario quedan rechazadas. No desactivar el fence ni borrar partidas para forzar una versión antigua. Si no hay versión compatible, mantener cerrado y preparar una corrección hacia delante.


## F0-P9B-R1 — ejecución autorizada (26-10-2026)

A ejecutada: proyecto TFT EUNUCO, entorno único private y servicio tft-eunuco; release estable 9450d26 y catálogo f0p8d-florin-1. IaC R0 aplicada, build y healthcheck correctos. Deployment c6f11898-a0dc-483a-b50f-4c4f8042eb57 llegó a SUCCESS y se retiró supervisadamente (REMOVED). Subdominio: https://tft-eunuco-private.up.railway.app. Sin P10A ni autodeploy. Actualmente no sirve el juego; C pendiente.

[Informe y evidencias](RAILWAY_FIRST_DEPLOYMENT_REPORT.md).

## C — actualización autorizada y verificada (26-10-2026)

C ya está completada: Site URL `https://tft-eunuco-private.up.railway.app/` y redirect HTTPS exacto añadidos; `http://127.0.0.1:4173/` conservado como redirect. Comparación de 243 campos Auth: solo site_url y uri_allow_list cambiaron. SMTP, usuarios, contraseñas y SQL sin modificaciones. Railway permanece detenido (REMOVED), sin nuevo despliegue y sin integrar P10A. Las menciones anteriores a C pendiente describen el cierre previo de A/B. [Verificación C](evidence/p9b-r1/auth-c-verification.json).
