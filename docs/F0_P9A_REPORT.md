# F0-P9A — infraestructura multijugador privada

Fecha: 26/10/2026. Alcance: preparación y laboratorio local equivalente al remoto; sin publicación, contratación, push ni mutación Supabase real.

## 1. Base y rama

Base real de cierre P8F: `10fbc9b113ea6cd9f0cc54d417c8cc4458892316`. Baseline repetido antes de modificar: 1.307 pruebas en 88 archivos, sin skips, TypeScript/ESLint/build correctos (99,02 s). Worktree original conserva su HEAD y cero cambios tracked.

Rama `codex/f0-p9a-remote-infrastructure`, worktree `/Users/vargas/.codex/worktrees/p9a-remote-infrastructure/TFT EUNUCO`. Originales de arte copiados para el test de importación permanecen sin seguimiento; no pertenecen a esta entrega.

## 2. Arquitectura y alternativas

B: un proceso Node/Colyseus sirve frontend compilado bajo un origen HTTPS, detrás de Caddy local, con Auth y PostgreSQL mediante RPC Supabase existentes. A, hosting estático y servidor separados, sigue siendo viable pero requiere dos releases/URLs y CORS cruzado. Comparación de diez criterios y diagrama en [arquitectura](REMOTE_DEPLOYMENT_ARCHITECTURE.md).

## 3. Entornos y transporte

Desarrollo, diagnóstico, privado y producción futura tienen contrato explícito. Host local, puerto válido, origen exacto, proxy local de confianza y HTTPS fuera de desarrollo. Cliente compilado usa mismo origen por defecto y rechaza conexiones inseguras desde HTTPS. Proxy preparado con Upgrade, redirección y límites; ping 10 s / tres reintentos en runtime remoto. No cambia el reloj competitivo.

## 4. Seguridad y Auth

Guardia anterior al router final de Colyseus; protege OPTIONS y upgrade, Host, Origin y proto. Sin wildcard ni cookies de juego. JWT Supabase sigue validando identidad, sesión activa y perfil. Claves privadas rechazadas en VITE; verificación de bundle ampliada. Cuatro builds con configuraciones públicas inseguras se rechazaron antes de compilar; el preflight sin flag de almacenamiento validó configuración sin contactar ninguna red. Diagnóstico firmado solo en entrada aislada, nunca importada por main. Logs numéricos/eventos sin tokens, inventarios ni URLs de petición. [Auditoría](REMOTE_SECURITY.md).

No se ha probado nuevamente correo/login Supabase real ni modificado sus usuarios, RLS o redirecciones. Cambios manuales pendientes descritos en [entornos](REMOTE_ENVIRONMENT.md).

## 5. Persistencia y disponibilidad

Se conservan CAS, snapshots, journals, recibos, compresión e integridad. Readiness consulta dependencias y la restauración se completa antes de escuchar. Fallo de escritura detiene publicación del estado; parada controlada solicita checkpoint. Sonda aditiva `authority_health()` probada solo en PG desechable: retorna true; anon/authenticated sin permiso, service_role con permiso. No aplicada a Supabase real.

## 6. Scripts y operación

CA de siete días, proxy TLS local, confianza Node por proceso y Chrome limitada a localhost en perfil desechable. Sin bypass TLS. Plantillas Caddy/systemd y preflight de lectura. Caddy oficial 2.11.7 valida la plantilla y pasó un smoke real en loopback: HTTPS confiable, readiness 200, dos clientes WSS autenticados y Origin ajeno 403. No se construyó Docker ni se instaló systemd (host macOS). [Reproducción](../scripts/remote/README.md), [operación/rollback](REMOTE_OPERATIONS.md).

## 7. Validación de red y juego

Campañas HTTPS/WSS de 2/3/4 clientes con invitación, Ready, compras, despliegue, XP, componentes, combinaciones, equipamiento, combate, eliminación y clasificación. Ghost con tres participantes. Cuatro jugadores: corte real TCP del PG diagnóstico, comando durante indisponibilidad sin cambio publicado, recuperación y SIGKILL durante combate seguido de restauración.

Recorrido Chrome: 31 acciones verificadas, sin excepciones de página; resultado final en ronda 16 y clasificación de cuatro participantes. Jaramillo conserva cuerpo mientras vuela el proyectil; splash arts y objetos visibles. Reconexión real por cierre del socket mantiene oro/unidades/objetos. Cinco cartas y sin scroll vertical a 1280×720, 1440×900, 1920×1080, 2560×1440 y 3840×2160. Son componentes compilados reales con cuatro identidades diagnósticas; no es una prueba entre ordenadores remotos.

## 8. Incidencias resueltas

- El CORS de Colyseus precede Express: se envuelve el manejador definitivo para impedir el bypass.
- El cliente compilado apuntaba por defecto al loopback HTTP: ahora usa mismo origen y rechaza mixed content.
- Una sonda pendiente podía marcar ready tras comenzar el cierre: se impide reabrir durante drenaje y se cubre con prueba.
- El primer ensayo de caída esperaba un recibo, pero el contrato comunica indisponibilidad: corregida la aserción, conservando comprobación de estado intacto.
- La primera suite completa obtuvo 1.336 PASS y un timeout en la campaña TLS de cuatro (240 s). El guion reconstruía la autoridad y sus replays por cada compra y acumulaba salas de campañas previas. Se construye ahora el mismo mensaje desde el snapshot, se fija semilla diagnóstica y se aísla cada campaña en su base desechable. No se amplió el timeout ni se cambió la economía o combate. La retención de finales restaurados conserva un coste real que requiere medición en P9B.
- El primer guion visual intentaba reentrar después del cierre de la sala final: ahora conserva el resultado recibido; la reconexión durante partida se prueba por separado.

## 9. Rendimiento, coste y límites

Recorrido acelerado Chrome: RSS máximo muestreado 661,8 MiB, 423 checkpoints (mediana 8,92 ms), 338,3 MB de salida WS y p95 event loop hasta 583,53 ms. Las sincronizaciones artificiales y el avance acelerado impiden extrapolar a producción. Medir velocidad normal y reconexiones antes de aumentar carga. [Medidas y fuentes de precios](REMOTE_COST_ESTIMATE.md).

Referencia de VM CX23: 5,49 €/mes sin IVA/IPv4 según tarifa oficial consultada; sumar dominio/backups/operación. Supabase Free tiene límites y suspensión por inactividad; Pro desde 25 USD/mes. No se contrató nada. Una partida de cuatro como ensayo inicial; ninguna garantía de alta disponibilidad o muchas salas.

## 10. Siguiente paso autorizado

[Checklist de despliegue](REMOTE_PREFLIGHT.md): aprobar proveedor/dominio/coste, revisar backup y aplicar migración autorizada, configurar Auth/redirecciones/SMTP, instalar secretos fuera de release, arrancar una sola autoridad y verificar TLS/readiness. F0-P9B debe probar dos ordenadores y redes distintas, luego 3/4 amigos, a velocidad normal, con supervisión de tráfico/CPU y procedimiento de recuperación.

No se han reiniciado 4173/2567 ni modificado reglas, balance, HUD, objetos, reparto o recursos gráficos.

## 11. Validación final y evidencias

- `pnpm check` con las dos bases PostgreSQL aisladas y `P9A_TLS_TESTS=1`: **1.337/1.337 pruebas, 91/91 archivos, 0 omitidas**, 318,16 s. Incluye las 16 pruebas PG históricas y las cuatro nuevas TLS/PG.
- TypeScript, ESLint y builds cliente/servidor correctos; `pnpm verify:public` correcto. Se conserva el aviso existente de chunks >500 kB, sin relajar su umbral.
- Último endurecimiento de la URL diagnóstica: cuatro destinos incorrectos rechazados antes de conectar, sin mostrar sus valores; arranque válido comprobado y TypeScript/ESLint repetidos. No modifica el runtime público.
- Campañas TLS: 2 jugadores, 242 comandos, 19 rondas; 3 jugadores, 236 comandos, 15 rondas con ghost; 4 jugadores, 402 comandos, 20 rondas con ghost, corte PG y SIGKILL recuperados. Todas con clasificación final y reparto en rondas 3/6.
- Build público sin imports de entrada diagnóstica; sin cambios de recursos, catálogo ni motor. `git diff --check` y revisión de staged sin originales/credenciales.

Evidencias locales ignoradas, no publicadas: `artifacts/p9a/baseline.log`, `final-check.log`, `verify-public.log`, `tls-campaign-{2,3,4}.json`, `tls-summary.json`, `browser-summary.json`, `caddy-smoke.json`, `health-migration.log`, `public-config-negative.json`, `diagnostic-guard-check.json`; capturas `hud-1920.png`, `equipped.png`, `jaramillo-flight.png`, `recovered.png`, `final.png`, `victory.png`. Los snapshots detallados del laboratorio no son contenido público.

La entrega queda en un commit local de la rama P9A; sin push. El worktree original P8F permanece en la base indicada y sin cambios tracked. Los originales de arte sin seguimiento se conservan fuera del commit.

Reposo vacío: ~125 MiB RSS; reposo con final restaurado: 585–699 MiB y CPU apreciable por checkpoints. Laboratorios detenidos al cerrar, certificados/tokens limitados a carpetas ignoradas; no se cambiaron perfiles de navegador personales ni confianza del sistema.
