## Consolidación F0-P8F · 26-10-2026

P8F añade SIGKILL en Overtime, comparación de continuación con control sin interrupción, reinicio del final retenido y reinicio de un eliminado con supervivientes. La suite conserva rollback de repartos y recuperación de equipo/estados de personajes. No hay migraciones ni cambios de repositorio o Supabase.

[Informe, evidencias, comandos y límites](F0_P8F_STABILIZATION_REPORT.md). Los apartados siguientes se conservan como historial.

---

# Persistencia autoritativa — F0-P7D.2

## Contrato

Colyseus es la autoridad en ejecución; PostgreSQL conserva el último estado duradero. `AuthoritativeMatch.exportState/restore` separa el modelo serializable del runtime. `MatchRepository` aísla almacenamiento; `SupabaseMatchRepository` usa RPC parametrizadas; `DurableMatch` serializa mutaciones y publica solo candidatos confirmados. No hay SQL ni dependencias PostgreSQL en game-core.

Cada operación sigue este orden: recibida → validada por la autoridad → aplicada a un candidato privado → persistida transaccionalmente → publicada y confirmada mediante recibo. Si falla la validación, el recibo negativo también puede conservarse. Si falla almacenamiento, no se envía recibo de éxito y la memoria pública conserva el estado anterior. No existe un segundo ledger económico.

## SQL

Migración aditiva `202610250001_authority_persistence.sql`:

| Tabla privada     | Contenido                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------- |
| authority_matches | UUID, revisión CAS, commit UUID, estado, caducidad, actualización y snapshot JSONB completo |
| authority_members | Match UUID + UUID autenticado, clave compuesta e índice por usuario                         |

La fase, ronda y todos los detalles internos están en JSONB, sin duplicarlos en columnas. El sobre separa metadatos de autoridad y lobby. Límite SQL: 16 MiB por snapshot. Cada commit guarda economía, pool, reservas, formaciones, trazas y liquidaciones como una unidad indivisible. La pertenencia se sustituye en la misma transacción.

`authority_commit(expected, document)` bloquea por match mediante advisory lock transaccional y fila FOR UPDATE, exige revisión esperada + 1 y rechaza escrituras antiguas, partidas cerradas o expiradas. Repetir exactamente el último commit UUID y documento devuelve éxito sin volver a aplicar nada. Una violación de restricciones revierte toda la transacción. Es un único escritor de runtime por partida; CAS no convierte esto en infraestructura distribuida.

## Snapshot y journal

Versión de esquema 1; versión de reglas del catálogo competitivo; huella SHA-256 de configuración económica y catálogo. Cambiar reglas o catálogo exige una estrategia explícita futura: esta fase rechaza los incompatibles, no los reinterpreta. Se validan estructura, config normal, conservación del pool, propietarios y versiones de duelos, fase y final.

Se conservan estado RNG uint32, semillas de emparejamiento y duelos, historial, IDs de ronda/combat/completion/settlement, liquidaciones, eliminaciones, liberación de copias, puestos y final. La fuente RNG normal es serializable; las fuentes inyectadas de fixtures no constituyen un contrato de recuperación productiva.

Se guardan los últimos 128 recibos por participante y su secuencia. La identidad de socket del payload se normaliza al UUID del participante después de comprobar la conexión vigente. Una reconexión puede recuperar el recibo original aunque cambie el socket; una secuencia antigua fuera de la ventana no se ejecuta de nuevo. Los ledger de liquidación y duelos completados son los existentes.

No se almacenan JWT, sockets, timers, instancias gráficas ni deadlines de `performance.now()`. Los IDs de conexión son solo metadatos, nunca autorización.

## Seguridad

RLS habilitado sin políticas en ambas tablas; sin grants directos a PUBLIC, anon, authenticated ni service_role. Solo service_role ejecuta las tres RPC acotadas (commit/load/cleanup). SECURITY DEFINER con search_path vacío y referencias cualificadas. La clave privilegiada se carga exclusivamente en Node; nunca se incluye en variables VITE, snapshots públicos ni logs.

El verificador Supabase sigue autenticando JWT y perfil. Restaurar un lobby no autoriza por código de invitación: se comprueba UUID contra roster congelado. Los protocolos de perspectiva, espectador y entrega parcial de trazas siguen filtrando desde la autoridad; el snapshot persistido completo nunca cruza al navegador.

## Coste y alcance

Checkpoints de reloj cada segundo y commits en acciones críticas, fases, conexiones y selección de espectador. Se guarda snapshot completo, incluidas trazas canónicas: sencillo de auditar, pero con amplificación de escritura. La carga inicial recupera todos los registros retenidos; adecuada para desarrollo de un proceso, pendiente paginación/capacidad antes de escala pública. Sin Redis, hosting, servicio de pago ni historial competitivo permanente.

Referencias primarias: [bloqueos PostgreSQL](https://www.postgresql.org/docs/17/explicit-locking.html), [aislamiento transaccional](https://www.postgresql.org/docs/18/transaction-iso.html), [seguridad de funciones Supabase](https://supabase.com/docs/guides/database/functions).


## F0-P8A · Componentes y objetos (26/10/2026)

P8A incluye inventario, equipo, pendientes y registros en el JSONB existente, sin migración SQL ni almacenamiento paralelo. La huella ITEM_CATALOG_HASH incorpora configuración nueva, catálogo de personajes, componentes/recetas/políticas y diseño de reparto. Las huellas P7D.2 y P6C conservan exactamente sus fórmulas previas. Restaurar el catálogo nuevo exige la versión de objetos y los propietarios correctos; los guardados históricos siguen sin inventario. Prueba específica con PostgreSQL + SIGKILL conserva componente equipado, pendientes y recibo repetido tras autenticarse de nuevo. [ITEM_INVENTORY](ITEM_INVENTORY.md).


## Actualización F0-P8C · 26-10-2026

Nueva huella P8C incluye política y catálogo, conservando las cuatro anteriores. La ampliación de trazas excedía el límite SQL en 4 jugadores; `codec.ts` comprime duels con gzip, SHA-256 y longitud verificada. Límites: 12 MiB codificados, 128 MiB descomprimidos, SQL sigue en 16 MiB. No hay migración. Restore no recalcula los replays. Pruebas reales SIGKILL 2/3/4 y comparación sin interrupción.

Detalle: [ejecutor](ITEM_EFFECT_EXECUTOR.md), [decisiones](ITEM_EFFECT_EVENT_ORDER.md) y [matriz de pruebas](ITEM_EFFECT_TEST_MATRIX.md).


## F0-P8D · 26-10-2026

El snapshot opcional `itemDrops` existe exclusivamente en la huella P8D y guarda semilla y journal global. Restauración valida el sorteo y sus enlaces con inventarios. DurableMatch conserva la publicación posterior al commit. La compresión admite P8D además de P8C; SQL y límites no cambian.

Contrato, recuperación y límites: [ITEM_DROP_DESIGN](ITEM_DROP_DESIGN.md).

## FLORIN y splash arts — 26/10/2026

Se añade `FLORIN_CATALOG_HASH`, sin modificar fingerprints anteriores. Incluye perfiles, rasgos y tuning de Florin; el codec existente admite su hash para replays comprimidos. Suela y recuperación usan UnitMechanics/progreso de rasgos dentro de snapshots existentes. La campaña Florin de SIGKILL se ejecuta solo en una base PostgreSQL local aislada.


## Consolidación P8D + FLORIN — 2026-10-26

Nuevo fingerprint explícito; siete históricos intactos. Sin migración. SIGKILL validado en PostgreSQL.

Versiones, fingerprints, conflictos, pruebas, capturas y límites: [INTEGRATION_P8D_FLORIN.md](INTEGRATION_P8D_FLORIN.md).

## F0-P9A — disponibilidad y operación

No se cambia el formato de snapshots, CAS, journals, compresión ni recibos. La RPC aditiva `authority_health()` permite una sonda de lectura exclusiva de service_role; preparada y probada en PostgreSQL local, pendiente de autorización remota. El proceso no escucha hasta restaurar; un fallo de escritura marca indisponibilidad. SIGTERM drena y solicita checkpoint; SIGKILL recupera último commit validado. El despliegue debe parar la instancia anterior antes de arrancar otra y comprobar compatibilidad del catálogo. [Preflight](REMOTE_PREFLIGHT.md), [fallos y rollback](REMOTE_OPERATIONS.md).


## F0-P9A.1 — Memoria y retención

Los checkpoints de un segundo se mantienen solo mientras la partida necesita avanzar; un final confirmado no se reescribe por inactividad ni al restaurarlo. Nuevas conexiones y acciones siguen confirmándose después de PostgreSQL. `expiresAt` se ancla al primer final y se conserva al reiniciar. `permit.saved` se libera tras hidratar. La disposición de un final no lo marca cerrado ni borra su fila. Formatos, compresión, CAS, recibos y fallos ambiguos conservan sus contratos.

[Perfil de memoria](SERVER_MEMORY_PROFILE.md) · [Política de retención](MATCH_RETENTION_POLICY.md) · [Mediciones y validación](SERVER_PERFORMANCE_BASELINE.md).


## F0-P10A · reconciliación del roster

ROSTER_CATALOG_HASH incorpora configuración, cuatro perfiles, traits, registro y manifiesto Excel además de políticas/catálogo existentes de objetos/reparto. Los ocho fingerprints anteriores tienen assertions exactas contra la base 4e17a21. Codec acepta el nuevo hash con los mismos límites. SIGKILL P10A cubre commit bloqueado, recuperación y reparto exactamente una vez hasta ronda 6. Los diagnósticos TLS aceptan nombres tft_remote_test_<sufijo> exclusivamente en loopback: permite crear una base propia sin truncar la de otro chat.
