# Operación de persistencia — F0-P7D.2

## Entorno real identificado

Proyecto Supabase de desarrollo `tft-eunuco-dev`, ref `qiombjvkaolllnjqzspz`, región eu-west-1, organización `xreevrfhfpwmhtggfhry`. Se inspeccionaron migraciones 202610240001/202610240002 antes de aplicar 202610250001. Migración aditiva aplicada: tres migraciones, dos perfiles existentes conservados. Sin reset, eliminación de invitaciones, despliegue ni activación de pagos.

Verificación remota: RLS true; cero policies; anon/authenticated sin lectura de tablas ni ejecución de commit/load; service_role sin lectura directa y con ejecución de RPC. `authority_load` funciona desde backend. Además se ejecutó un smoke remoto de commit, compra, lectura y restauración exacta; los dos registros sintéticos creados durante la comprobación quedaron cerrados y excluidos de recuperación, sin tocar perfiles ni invitaciones. La campaña de caídas usa PostgreSQL local aislado, no cuatro cuentas humanas de Supabase; distinguir ambos niveles de evidencia.

## Arranque normal

La configuración privada de Node requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY; no usar prefijo VITE. Conservar la clave fuera de Git y del navegador. El arranque falla si falta configuración o no puede recuperar/validar estado. El frontend sigue usando únicamente la clave publicable y Auth.

Arrancar con el entorno privado habitual y `pnpm dev:server`; web local en 4173, Node en 2567. Si se ejecuta Node directamente, cargar el archivo de entorno del backend explícitamente. SIGTERM/SIGINT solicita checkpoint; reiniciar con la misma base y versión compatible. Después autenticar usuarios y comprobar Match ID, fase y economía.

## Migración / incidente

1. Confirmar nombre, ref y organización de destino; revisar migraciones pendientes.
2. Conservar backup/export seguro según el procedimiento del entorno. Nunca imprimir snapshots privados en logs compartidos.
3. Aplicar migración aditiva; comprobar grants/RLS y lectura RPC con rol backend.
4. Ante corrupción o incompatibilidad, parar arranque e inspeccionar el registro con operador privilegiado. No borrar/reparar unidades automáticamente ni restaurar con reglas nuevas.
5. Ante indisponibilidad, reparar conexión/servicio. Si la sala agotó cinco reintentos, reiniciar Node. La revisión SQL decide qué operación llegó a persistirse.
6. Si se revierte código, mantener tablas y migración. La versión anterior no recupera estos registros: no reanudar una misma partida con dos autoridades.

No se implementa recuperación ante pérdida de PostgreSQL, restauración de backups externos, failover ni concurrencia de varios servidores. CAS protege escrituras antiguas, no coordina procesos.

## Limpieza

`public.authority_cleanup()` solo está disponible al rol backend. El operador registra fecha, entorno y número devuelto. Elimina como máximo 100 registros expirados hace más de 24 h y sus membresías por FK; no perfiles ni invitaciones. No hay cron automático en esta fase. Revisar necesidad y ejecutar de forma controlada; no usar reset remoto.

## Repetir pruebas reales aisladas

PostgreSQL 17 en 127.0.0.1:55439, base exclusiva `tft_persistence_test`. Crear roles anon/authenticated/service_role y schema private, aplicar la migración nueva. Esta base no contiene datos de usuarios.

```sh
PERSISTENCE_TEST_URL=postgresql://127.0.0.1:55439/tft_persistence_test pnpm check
```

La prueba comprueba el destino antes de truncar SOLO tablas de esta base aislada, lanza Node en 2582/control loopback 2583, crea 2/3/4 participantes de fixture, envía compras, mata con SIGKILL y compara recuperaciones. Puertos de diagnóstico y control no son importados por main productivo. Sin esa variable las cuatro pruebas PostgreSQL se omiten explícitamente; no reportarlas como ejecutadas.

La revisión visual usa diagnóstico aislado en 4174 y capturas en `.impeccable/review/p7d2/`: reentrada, servidor caído, almacenamiento caído/recuperado, Overtime recuperado, final restaurado y partida expirada. No introducir JWT ni claves en capturas.

## Límites operativos

Snapshot completo cada segundo y por acción: medir tráfico/escrituras antes de ampliar escala. Límite 16 MiB/registro; trazas grandes provocan fallo cerrado, no truncado silencioso. Carga inicial de todos los registros retenidos y validación de trazas pueden retrasar arranque. Recibos limitados a 128; secuencias antiguas no se vuelven a ejecutar. Retención 1 h activa / 5 min final, tiempo real. No historial permanente, migrador de snapshots ni recuperación automática de versiones incompatibles. F0-P7D.3 no está implementada.
