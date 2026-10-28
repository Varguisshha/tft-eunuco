> **Contrato vigente P11H:** contenido/economía `f0p11h-1`, combate `f0p11h-1`, objetos `f0p11h-18.5-1`. 32 completos disponibles y cuatro bloqueados. [Auditoría y límites](ITEM_FIDELITY_AUDIT.md), [arte individual](ITEM_ICON_ASSET_MANIFEST.md), [entrega y tooltips/compras](F0_P11H_REPORT.md). El cuerpo siguiente es histórico y conserva las reglas de su versión; no describe por sí solo el catálogo vigente.

# Compatibilidad de efectos · F0-P8B

Esta matriz describe el trabajo necesario, no una habilitación. El motor tiene escudos, curas, modificadores, señales de ataques/lanzamientos, stacks y proyectiles; todavía no existe un ejecutor de efectos de objetos. Ningún efecto reservado se ejecuta en Phaser ni en el núcleo.

- `direct`: estadística soportada sin nueva mecánica.
- `configuration`: semántica existente conectable por configuración.
- `extend_effect`: hace falta conectar señales/fuentes y ampliar políticas existentes.
- `new_mechanic`: nueva operación de combate.
- `needs_specification`: falta cerrar una decisión antes de ejecutar.

Todos los objetos admiten sus estadísticas directas; la tabla clasifica el resto. El caso de vida pura es compatible por configuración del modificador existente.

| ID                                    | Capacidades de efectos             | Laboratorio | Competitivo |
| ------------------------------------- | ---------------------------------- | ----------- | ----------- |
| item-forge-ad--ad                     | extend_effect                      | No          | No          |
| item-forge-ad--ap                     | extend_effect                      | No          | No          |
| item-forge-ad--armor                  | new_mechanic, extend_effect        | No          | No          |
| item-forge-ad--attack_speed           | extend_effect                      | No          | No          |
| item-forge-ad--critical               | new_mechanic                       | No          | No          |
| item-forge-ad--health                 | needs_specification                | No          | No          |
| item-forge-ad--magic_resist           | extend_effect                      | No          | No          |
| item-forge-ad--mana                   | extend_effect                      | No          | No          |
| item-forge-ap--ap                     | extend_effect                      | No          | No          |
| item-forge-ap--armor                  | extend_effect, needs_specification | No          | No          |
| item-forge-ap--attack_speed           | extend_effect                      | No          | No          |
| item-forge-ap--critical               | new_mechanic                       | No          | No          |
| item-forge-ap--health                 | new_mechanic                       | No          | No          |
| item-forge-ap--magic_resist           | extend_effect, new_mechanic        | No          | No          |
| item-forge-ap--mana                   | extend_effect                      | No          | No          |
| item-forge-armor--armor               | extend_effect                      | No          | No          |
| item-forge-armor--attack_speed        | extend_effect                      | No          | No          |
| item-forge-armor--critical            | extend_effect                      | No          | No          |
| item-forge-armor--health              | new_mechanic                       | No          | No          |
| item-forge-armor--magic_resist        | new_mechanic                       | No          | No          |
| item-forge-armor--mana                | extend_effect                      | No          | No          |
| item-forge-attack_speed--attack_speed | extend_effect, new_mechanic        | No          | No          |
| item-forge-attack_speed--critical     | extend_effect                      | No          | No          |
| item-forge-attack_speed--health       | extend_effect                      | No          | No          |
| item-forge-attack_speed--magic_resist | new_mechanic                       | No          | No          |
| item-forge-attack_speed--mana         | new_mechanic                       | No          | No          |
| item-forge-critical--critical         | needs_specification                | No          | No          |
| item-forge-critical--health           | extend_effect                      | No          | No          |
| item-forge-critical--magic_resist     | new_mechanic, needs_specification  | No          | No          |
| item-forge-critical--mana             | extend_effect, needs_specification | No          | No          |
| item-forge-health--health             | direct / configuration             | Sí          | No          |
| item-forge-health--magic_resist       | extend_effect                      | No          | No          |
| item-forge-health--mana               | extend_effect                      | No          | No          |
| item-forge-magic_resist--magic_resist | extend_effect                      | No          | No          |
| item-forge-magic_resist--mana         | needs_specification                | No          | No          |
| item-forge-mana--mana                 | needs_specification, extend_effect | No          | No          |

## Frontera exacta de P8C

1. Crear un ejecutor genérico de operaciones tipadas, sin ramas por personaje, icono o nombre de objeto. Enlazar señales con fuente de instancia, propietario, objetivo y límite de recursión.
2. Resolver daño amplificado/reducido, omnivampirismo sobre daño aplicado, curas, escudos, umbrales únicos y expiración. Fijar prioridad de escudo/vida/muerte y no reactivar efectos por el daño que ellos mismos generan.
3. Implementar auras dinámicas con entrada/salida, reducción de resistencias no acumulable y daño condicionado a escudos/vida máxima. No confundir reducción con penetración.
4. Integrar maná por ataques/golpes, reducción de maná máximo, crítico de habilidades, inmunidad a CC e intangibilidad/limpieza. Conservar límite de maná, probabilidad crítica y velocidad.
5. Implementar quemadura, herida, rayos y cadenas con selección determinista, atribución y procs explícitos. No duplicar proyectiles de JARAMILLO ni cadenas de pasivas.
6. Cerrar las decisiones enumeradas abajo, probar cada efecto y entonces versionar disponibilidad. Habilitar solo objetos íntegros; no basta con cambiar `availability` ni eliminar la guarda del esquema.

## Decisiones abiertas, sin valores inventados

- Dos objetos aleatorios: pool, exclusiones, pesos y reservas de tres ranuras. El contrato P8A cuenta instancias; antes de habilitar este objeto, el ejecutor deberá respetar el coste de tres ranuras declarado en `content.slotCost`.
- Bono aleatorio AD/AP frente a omnivampirismo: pesos no especificados por el tooltip congelado.
- Aumento temporal de vida máxima: ajuste de vida actual y orden del umbral.
- Escudo inicial seguido de AP: rotura anticipada frente a expiración natural.
- Reducción de maná máximo: suelo válido para activas y comportamiento de unidades pasivas.
- Bonos por fila: correspondencia de las cuatro filas lógicas según propietario, fijada al inicio.
- Inmunidad de 14 s: incluir o excluir el instante final del intervalo de 2 s; persistencia de velocidad posterior.
- Selección/ties de objetivos de aura, proyectil secundario y cadena; reglas de crítico y procs de daño secundario.
- Las políticas `independent`, `add`, `refresh`, `strongest`, `unique` y `nonstacking_debuff` definen la intención por instancia; precedencias entre copias/fuentes distintas deben tener pruebas de P8C antes de activar.

## Compatibilidad de personajes

**DOLEA:** componentes de vida/armadura son fuentes independientes. Su escudo, activa y pasiva no cambian. P8C debe distinguir daño a escudo de daño a vida y evitar activar dos veces supervivencia/umbrales.

**VARGAS:** AD porcentual después de estrellas, crítico acotado y velocidad máxima vigente. Maná inicial no se convierte en curación ni se reinicia tras lanzar. Curación por objetos y eliminaciones requieren atribución única; saltos y ataques potenciados no deben generar cadenas recursivas.

**JARAMILLO:** Kilómetros se aplica una vez antes del porcentaje de objeto, conservando progresión permanente. FUMÓN, Trotamundos, proyectiles compuestos y reducción de armadura mantienen sus reglas. P8C debe distinguir ataque raíz, proyectil secundario, daño periódico y activación de sinergia.

Las pruebas de esta fase cubren estadísticas y maná de los tres personajes; no pretenden validar efectos especiales aún ausentes.

## Actualización F0-P8C · 26-10-2026

Las operaciones reservadas de P8B tienen ahora implementación `executable-v1`: 26 tipos reutilizables y 36 objetos verificados. Las decisiones pendientes de pool, pesos, mínimo de maná y procs se resuelven solo en la versión nueva. La tabla anterior documenta el cierre P8B, no el estado ejecutable actual.

Detalle: [ejecutor](ITEM_EFFECT_EXECUTOR.md), [decisiones](ITEM_EFFECT_EVENT_ORDER.md) y [matriz de pruebas](ITEM_EFFECT_TEST_MATRIX.md).
