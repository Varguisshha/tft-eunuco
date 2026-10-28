> **Contrato vigente P11H:** contenido/economía `f0p11h-1`, combate `f0p11h-1`, objetos `f0p11h-18.5-1`. 32 completos disponibles y cuatro bloqueados. [Auditoría y límites](ITEM_FIDELITY_AUDIT.md), [arte individual](ITEM_ICON_ASSET_MANIFEST.md), [entrega y tooltips/compras](F0_P11H_REPORT.md). El cuerpo siguiente es histórico y conserva las reglas de su versión; no describe por sí solo el catálogo vigente.

# Ejecutor universal de objetos · F0-P8C

## Contrato y disponibilidad

`f0p8c-1` es una versión nueva: ocho componentes y 36 objetos completos disponibles. Las partidas nuevas locales y modernas del servidor usan `EFFECT_ITEMS_ECONOMY_CONFIG`. Las existentes conservan su configuración y huella. El laboratorio P8B continúa siendo histórico y explícito; las pruebas P8C crean su propia configuración. No hay reparto, orbes, nuevos comandos públicos ni cambios económicos.

`VALIDATED_ITEM_SOURCES` enumera los 36 registros validados: añadir un registro a la referencia no lo habilita automáticamente. Cada operación se resuelve por tipo, nunca mediante excepciones por nombre del objeto. `items-executable.ts` transforma una copia del catálogo congelado, sin modificar las definiciones históricas. Operaciones desconocidas provocan un fallo explícito.

## Arquitectura

1. El selector de formación copia estadísticas y un loadout versionado con identidad de instancia, ronda y semilla de partida; no modifica la unidad persistente ni Kilómetros.
2. `CombatEngine` crea `ItemEffectExecutor` únicamente para loadouts P8C. El ejecutor llama al pipeline existente de efectos, daño, maná y cancelación. No simula otro combate.
3. Las señales proceden de lanzamiento lógico, daño efectivo, expiración, ticks y geometría axial. El lanzamiento adicional de habilidad se observa desde el mismo evento lógico que el original.
4. El estado `items` guarda entradas, contadores, enfriamientos, decisiones aleatorias, contribuyentes a eliminaciones e identificadores ya liquidados. Estados y proyectiles conservan `itemSource`.
5. `itemSource` identifica unidad, definición, instancia, operación, señal, tick, clase de daño y causa. `parentEvent` apunta a un evento previo; los periódicos y cambios geométricos tienen raíz de reloj y no inventan un padre. `item_signal` identifica la liberación de ataque; `item_effect`, daño, curación y estados registran sus consecuencias.
6. El máximo de 512 activaciones derivadas por tick es adicional a los presupuestos del motor. Un exceso falla la simulación; no se silencian objetos para producir un resultado parcial.

## Operaciones

| Operación              | Ejecución y límite                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| damage_amp             | Suma de amplificaciones; condición de vida máxima del objetivo o ventana tras daño a escudo/eliminación.                               |
| ability_critical       | Habilita crítico de activa; una concesión adicional aporta 100 milésimas al multiplicador. No da crítico a daño secundario de objetos. |
| shield                 | Vida máxima efectiva, duración y activación única; absorción en el pipeline compartido.                                                |
| resists                | Armadura/RM planas temporales o hasta fin de combate.                                                                                  |
| heal                   | Vida máxima o faltante; radio y cap propios; herida antes del factor de overtime.                                                      |
| damage_reduction       | Copias independientes multiplican; protección aliada usa el mayor valor; condición por umbral.                                         |
| random_items           | Dos completos disponibles distintos, sin guantes ni autorreferencia; hijos solo del runtime y tres ranuras del objeto padre.           |
| attack_speed_stacks    | Acumulación al liberar ataque o intervalo; límite global de 5 ataques/s; QSS solo seis incrementos.                                    |
| resistance_reduction   | Mayor reducción por estadística, sin suma entre fuentes; aura viva o duración renovable.                                               |
| cast_punishment        | Daño mágico basado en maná máximo del lanzador enemigo dentro del radio.                                                               |
| health_ad_surge        | Umbral no letal: AD porcentual y máximo de vida, sumando diferencia a vida actual una sola vez.                                        |
| targeting_resists      | Recuento de enemigos vivos apuntando al portador; recalculado sin acumulación permanente.                                              |
| retaliation            | Recibir básico primario, enemigos adyacentes, cooldown; daño secundario sin nuevos ataques.                                            |
| burn_wound             | Quemadura verdadera sobre máximo de vida, tick cada 10; aplicación y daño son relojes distintos. Herida no acumulable.                 |
| omnivamp               | Solo pérdida real de HP, sin escudos ni overkill; aliado distinto del portador cuando corresponde.                                     |
| round_random_bonus     | Elección AD/AP u omnivampirismo 50/50 EUNUCO, versionada y reproducible.                                                               |
| untargetable_cleanse   | Limpia stun, modificadores negativos, shred, quemadura y herida; cancela acción propia. No concede inmunidad al daño ya comprometido.  |
| attack_speed           | Aumento tras lanzamiento; refresca una ventana por instancia.                                                                          |
| dual_power_stacks      | Ataques y daño recibido; tope 25, AD/AP y resistencias al alcanzar el tope.                                                            |
| secondary_bolt         | Otro enemigo por distancia/ID; proyectil con origen y destino; sin crítico, maná básico ni procs de personaje.                         |
| ability_power          | AP periódico acumulado o AP único tras terminar un escudo.                                                                             |
| attack_mana            | Maná adicional una vez por liberación; nunca repone maná inicial.                                                                      |
| positional_bonuses     | Filas iniciales fijan rol; frontal recibe resistencias/maná por golpe y trasera AP/maná periódico.                                     |
| max_mana_reduction     | Reduce máximo y coste activo, limita inicial/actual; mínimo activo 10. No crea activa a una pasiva.                                    |
| crowd_control_immunity | Rechaza stun durante la ventana; no oculta la unidad ni evita daño.                                                                    |
| chain_magic            | Cada tercer básico, hasta cuatro objetivos distintos, daño y reducción de RM sin recursión.                                            |

Las cifras siguen `ITEM_CATALOG.md` y la referencia 14.1. Las interpretaciones propias están en `ITEM_EFFECT_EVENT_ORDER.md`. La etiqueta histórica de diseño no se utiliza para describir una operación ya ejecutable.

## Interacciones y precedencia

- Los ataques extra de personajes conservan su política previa: no se convierten automáticamente en nuevas liberaciones de objetos. El daño de objetos sí admite omnivampirismo, herida recibida, reducción física y efectos defensivos del receptor; no genera otras quemaduras ni ataques extra.
- Los lanzamientos repetidos válidos activan efectos de lanzamiento; no vuelven a gastar ni regalar maná inicial.
- Quemadura puede continuar con fuente muerta y conserva atribución; un muerto nunca se cura. El asesinato pertenece al responsable real. Las pasivas de cadena de eliminación no se reactivan desde daño secundario de objeto.
- Para el beneficio por takedown, EUNUCO considera a los contribuyentes de daño a HP de esa víctima durante el combate, vivos al morir esta. Se registra una vez por víctima. No se concede por dañar solo escudos.
- Daño letal no activa defensa de umbral ni AP por rotura de escudo. Aumentar vida máxima no resucita. La pasiva de DOLEA y el heal de Blackhaus pasan por el mismo pipeline; los datos base de personajes permanecen intactos.
- Daño a escudo activa Guardbreaker; aplicar quemadura exige daño a HP primario. La reducción aliada de Redemption usa el contrato P8B de daño general, una interpretación EUNUCO explícita, no una afirmación de equivalencia literal con TFT.
- La semilla de elección combina semilla de partida, instancia y ronda; no consume el flujo del combate ni de la tienda. Una copia fantasma conserva esa elección. El resultado permanece en snapshots y no se vuelve a sortear al restaurar.

## Persistencia y presentación

La autoridad mantiene el replay canónico calculado por adelantado. Reconectar, observar o restaurar no ejecuta nuevamente efectos. La nueva huella incluye catálogo, configuración y política; se mantienen los cuatro hashes anteriores.

P8C comprime únicamente `authority.duels` al cruzar el repositorio: gzip determinista, versión 1, longitud declarada y SHA-256. El envoltorio mantiene identidad, CAS, miembros y recibos. Lectura verifica formato, huella, longitud y límite de descompresión antes de validar el esquema completo. Se aceptan los documentos antiguos sin compresión. No cambia SQL ni su límite de 16 MiB; el bloque base64 tiene límite de 12 MiB y el resultado descomprimido de 128 MiB. Fallos conservan la política de pausa y recuperación de P7D.2.

Phaser solo muestrea resultados. Un proyectil de objeto usa el efecto genérico existente, no el cigarro ni el sprite corporal de Jaramillo. No se cambian sprites, arena, iconos ni HUD. Las pruebas a 1×/2× y 30/60/144 FPS comparan el mismo estado y el muestreo de espectadores.
