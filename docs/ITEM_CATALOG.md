> **Contrato vigente P11H:** contenido/economía `f0p11h-1`, combate `f0p11h-1`, objetos `f0p11h-18.5-1`. 32 completos disponibles y cuatro bloqueados. [Auditoría y límites](ITEM_FIDELITY_AUDIT.md), [arte individual](ITEM_ICON_ASSET_MANIFEST.md), [entrega y tooltips/compras](F0_P11H_REPORT.md). El cuerpo siguiente es histórico y conserva las reglas de su versión; no describe por sí solo el catálogo vigente.

# Catálogo de objetos · F0-P8B

Versión `f0p8b-14.1-1`. Referencia congelada TFT 14.1. Ocho componentes y 36 resultados únicos; no hay recetas placeholder. [Fuentes y diferencias](ITEM_BALANCE_REFERENCE.md). [Capacidades y P8C](ITEM_EFFECT_COMPATIBILITY.md).

## Disponibilidad

Los ocho componentes tienen semántica ejecutable, pero no se reparten automáticamente. Los **36 objetos completos están desactivados en competitivo**. Solo `item-forge-health--health` está disponible en el laboratorio explícito `f0p8b-14.1-lab-1`; no contiene efectos especiales. Ningún objeto con efectos reservados se concede o combina.

`content.definition` indica definición terminada, `combat` compatibilidad completa o pendiente, `laboratory` elegibilidad para laboratorio y `competitive: false` la puerta cerrada de esta fase. `availability` decide la concesión real. `visibleName: null`; `internalName` y `accessibleLabel` permanecen disponibles para código y accesibilidad. `icon` es la clave sustituible de un recurso original, sin dependencia mecánica.

## Componentes

| ID                     | Estadística                   | IconKey                      |
| ---------------------- | ----------------------------- | ---------------------------- |
| component-ad           | +10 % AD                      | forge-component-ad           |
| component-attack_speed | +10 % velocidad de ataque     | forge-component-attack_speed |
| component-ap           | +10 AP                        | forge-component-ap           |
| component-mana         | +15 maná inicial              | forge-component-mana         |
| component-armor        | +20 armadura                  | forge-component-armor        |
| component-magic_resist | +20 resistencia mágica        | forge-component-magic_resist |
| component-health       | +150 vida                     | forge-component-health       |
| component-critical     | +20 % probabilidad de crítico | forge-component-critical     |

AD y velocidad usan porcentajes relativos sobre el perfil preparado, después de estrellas y Kilómetros. Crítico añade puntos porcentuales (límite 100 %), sin conversión del exceso. Maná es **inicial**, se suma y limita al máximo una vez al preparar el combate; no es regeneración ni reaparece tras lanzar. Valores planos no vuelven a escalar por estrellas.

## Matriz de 36 recetas

Cada entrada usa el sufijo de `item-forge-`; se omite la mitad simétrica. Las parejas dobles consumen dos instancias distintas.

| Categoría    | ad     | attack_speed               | ap               | mana               | armor               | magic_resist               | health               | critical               |
| ------------ | ------ | -------------------------- | ---------------- | ------------------ | ------------------- | -------------------------- | -------------------- | ---------------------- |
| ad           | ad--ad | ad--attack_speed           | ad--ap           | ad--mana           | ad--armor           | ad--magic_resist           | ad--health           | ad--critical           |
| attack_speed | —      | attack_speed--attack_speed | ap--attack_speed | attack_speed--mana | armor--attack_speed | attack_speed--magic_resist | attack_speed--health | attack_speed--critical |
| ap           | —      | —                          | ap--ap           | ap--mana           | ap--armor           | ap--magic_resist           | ap--health           | ap--critical           |
| mana         | —      | —                          | —                | mana--mana         | armor--mana         | magic_resist--mana         | health--mana         | critical--mana         |
| armor        | —      | —                          | —                | —                  | armor--armor        | armor--magic_resist        | armor--health        | armor--critical        |
| magic_resist | —      | —                          | —                | —                  | —                   | magic_resist--magic_resist | health--magic_resist | critical--magic_resist |
| health       | —      | —                          | —                | —                  | —                   | —                          | health--health       | critical--health       |
| critical     | —      | —                          | —                | —                  | —                   | —                          | —                    | critical--critical     |

## Definiciones completas

Los valores mostrados son totales del objeto completo: **no se vuelven a sumar sus componentes**. Duraciones e intervalos se almacenan en ticks de 100 ms. Duración nula significa sin expiración programada durante el combate, salvo condiciones explícitas de aura/objetivo. El registro fuente es solo trazabilidad interna, nunca un nombre visible. No se promete ejecución competitiva.

### 1. item-forge-ad--ad

- Receta: component-ad + component-ad. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: physical. IconKey: `forge-ad-ad`.
- Estadísticas: +55 % AD.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_Deathblade`.
- **effect-1**: Inicio de combate: +8 % de daño. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `independent`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 2. item-forge-ad--ap

- Receta: component-ad + component-ap. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: support. IconKey: `forge-ad-ap`.
- Estadísticas: +15 % AD · +15 AP.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_HextechGunblade`.
- **effect-1**: Al causar daño: Cura al portador 22 % del daño causado y también al aliado con menor porcentaje de vida. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `lowest_hp_ally_and_self`. Política: `independent`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 3. item-forge-ad--armor

- Receta: component-ad + component-armor. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-ad-armor`.
- Estadísticas: +10 % AD · +20 armadura.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); una copia por unidad. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_GuardianAngel`.
- **effect-1**: Umbral de vida: Al 60 % de vida, limpia efectos negativos y no puede ser objetivo durante 1 s, una vez por combate. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `unique`. Capacidad: `new_mechanic`.
- **effect-2**: Umbral de vida: +15 % de velocidad de ataque. Después de la misma activación única de intangibilidad; dura hasta fin de combate. Objetivo: `self`. Política: `unique`. Capacidad: `extend_effect`. Condición estructurada: `{"healthAtOrBelowMilli":600,"afterEffectId":"effect-1","oncePerCombat":true}`.
- Campos fuente no interpretados: `DamageReduction`. Se conservan para auditoría, sin convertirlos en efectos.

### 4. item-forge-ad--attack_speed

- Receta: component-ad + component-attack_speed. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: hybrid. IconKey: `forge-ad-attack_speed`.
- Estadísticas: +30 % AD · +10 % velocidad de ataque · +20 AP.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_MadredsBloodrazor`.
- **effect-1**: Al causar daño: +25 % de daño contra objetivos con más de 1600 de vida máxima. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `current_enemy`. Política: `independent`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 5. item-forge-ad--critical

- Receta: component-ad + component-critical. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: physical. IconKey: `forge-ad-critical`.
- Estadísticas: +35 % AD · +35 % probabilidad de crítico.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_InfinityEdge`.
- **effect-1**: Inicio de combate: Las habilidades pueden hacer crítico; si ya podían, +10 % de multiplicador crítico. Permite crítico de habilidad; si ya puede, +10 puntos de multiplicador crítico. No convierte exceso de probabilidad. Objetivo: `self`. Política: `independent`. Capacidad: `new_mechanic`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 6. item-forge-ad--health

- Receta: component-ad + component-health. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-ad-health`.
- Estadísticas: +15 % AD · +200 vida.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_SteraksGage`.
- **effect-1**: Umbral de vida: Al 60 % de vida: +20 % de vida máxima y +35 % de AD, una vez por combate. Vida actual al ampliar vida máxima y orden de umbral requieren decisión. Bonificaciones hasta fin de combate. Objetivo: `self`. Política: `unique`. Capacidad: `needs_specification`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 7. item-forge-ad--magic_resist

- Receta: component-ad + component-magic_resist. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-ad-magic_resist`.
- Estadísticas: +20 % AD · +15 AP · +20 resistencia mágica.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_Bloodthirster`.
- **effect-1**: Al causar daño: Cura al portador 20 % del daño causado. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `independent`. Capacidad: `extend_effect`.
- **effect-2**: Umbral de vida: Escudo de 25 % de vida máxima al alcanzar 40 % de vida; una vez por combate. Duración: 5 s. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `unique`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 8. item-forge-ad--mana

- Receta: component-ad + component-mana. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: hybrid. IconKey: `forge-ad-mana`.
- Estadísticas: +20 % AD · +20 AP · +15 maná inicial.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_SpearOfShojin`.
- **effect-1**: Al atacar: +5 maná por ataque. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `independent`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 9. item-forge-ap--ap

- Receta: component-ap + component-ap. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: magic. IconKey: `forge-ap-ap`.
- Estadísticas: +50 AP.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_RabadonsDeathcap`.
- **effect-1**: Inicio de combate: +20 % de daño. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `independent`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 10. item-forge-ap--armor

- Receta: component-ap + component-armor. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-ap-armor`.
- Estadísticas: +20 AP · +20 armadura · +100 vida.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_Crownguard`.
- **effect-1**: Inicio de combate: Escudo de 30 % de vida máxima; una vez por combate. Duración: 8 s. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `unique`. Capacidad: `extend_effect`.
- **effect-2**: Al expirar el escudo: +35 AP. Distinguir rotura anticipada de expiración natural antes de implementar; AP permanece hasta fin de combate. Objetivo: `self`. Política: `unique`. Capacidad: `needs_specification`.
- Campos fuente no interpretados: `ChillDuration`, `HexRange`. Se conservan para auditoría, sin convertirlos en efectos.

### 11. item-forge-ap--attack_speed

- Receta: component-ap + component-attack_speed. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: magic. IconKey: `forge-ap-attack_speed`.
- Estadísticas: +15 % velocidad de ataque · +10 AP.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_GuinsoosRageblade`.
- **effect-1**: Al atacar: +5 % de velocidad de ataque por acumulación; sin límite publicado. Sin límite de acumulaciones publicado; permanece el límite global EUNUCO de 5 ataques/s. Objetivo: `self`. Política: `add`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 12. item-forge-ap--critical

- Receta: component-ap + component-critical. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: magic. IconKey: `forge-ap-critical`.
- Estadísticas: +35 AP · +35 % probabilidad de crítico.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_JeweledGauntlet`.
- **effect-1**: Inicio de combate: Las habilidades pueden hacer crítico; si ya podían, +10 % de multiplicador crítico. Permite crítico de habilidad; si ya puede, +10 puntos de multiplicador crítico. No convierte exceso de probabilidad. Objetivo: `self`. Política: `independent`. Capacidad: `new_mechanic`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 13. item-forge-ap--health

- Receta: component-ap + component-health. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-ap-health`.
- Estadísticas: +15 % velocidad de ataque · +25 AP · +150 vida.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); una copia por unidad. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_Morellonomicon`.
- **effect-1**: Daño de ataque o habilidad: Quema 1 % de la vida máxima del objetivo por segundo como daño verdadero y reduce 33 % su curación. Duración: 10 s. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `damaged_enemy`. Política: `nonstacking_debuff`. Capacidad: `new_mechanic`.
- Campos fuente no interpretados: `MonsterCap`. Se conservan para auditoría, sin convertirlos en efectos.

### 14. item-forge-ap--magic_resist

- Receta: component-ap + component-magic_resist. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: support. IconKey: `forge-ap-magic_resist`.
- Estadísticas: +15 AP · +25 resistencia mágica · +200 vida.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_IonicSpark`.
- **effect-1**: Aura durante el combate: Reduce 30 % la resistencia mágica en radio de 2 hexágonos; no acumula el debilitamiento. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `enemies_in_radius`. Política: `nonstacking_debuff`. Capacidad: `extend_effect`.
- **effect-2**: Al lanzar un enemigo: Daño mágico de 160 % del maná máximo del enemigo que lanza, en radio de 2 hexágonos. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `casting_enemy`. Política: `independent`. Capacidad: `new_mechanic`.
- Campos fuente no interpretados: `Damage`. Se conservan para auditoría, sin convertirlos en efectos.

### 15. item-forge-ap--mana

- Receta: component-ap + component-mana. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: magic. IconKey: `forge-ap-mana`.
- Estadísticas: +20 AP · +15 maná inicial.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_ArchangelsStaff`.
- **effect-1**: Periódico: +30 AP. Intervalo: 5 s. Primer incremento tras 5 s de combate; se conserva hasta finalizar. Objetivo: `self`. Política: `add`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 16. item-forge-armor--armor

- Receta: component-armor + component-armor. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-armor-armor`.
- Estadísticas: +55 armadura · +5 % vida.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_BrambleVest`.
- **effect-1**: Inicio de combate: Reduce 8 % el daño de ataques. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `independent`. Capacidad: `extend_effect`.
- **effect-2**: Al recibir un ataque: 100 de daño mágico a enemigos adyacentes al recibir un ataque. Enfriamiento: 2 s. Al recibir un ataque, no al realizarlo. Daño idéntico en las tres estrellas. No genera ataques ni procs recursivos. Objetivo: `enemies_in_radius`. Política: `independent`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: `{6688a0d5}`, `{b5c2a66b}`. Se conservan para auditoría, sin convertirlos en efectos.

### 17. item-forge-armor--attack_speed

- Receta: component-armor + component-attack_speed. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-armor-attack_speed`.
- Estadísticas: +10 % velocidad de ataque · +20 armadura.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_TitansResolve`.
- **effect-1**: Al atacar o recibir daño: +2 % de AD y +2 AP por acumulación, máximo 25; al máximo +20 armadura y +20 resistencia mágica. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `add`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 18. item-forge-armor--critical

- Receta: component-armor + component-critical. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-armor-critical`.
- Estadísticas: +20 armadura · +250 vida · +20 % probabilidad de crítico.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_NightHarvester`.
- **effect-1**: Inicio de combate: Reduce 8 % el daño de todas las fuentes; pasa a 15 % por encima de 50 % de vida. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `independent`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 19. item-forge-armor--health

- Receta: component-armor + component-health. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-armor-health`.
- Estadísticas: +20 armadura · +250 vida.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); una copia por unidad. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_RedBuff`.
- **effect-1**: Periódico: Quema 1 % de la vida máxima del objetivo por segundo como daño verdadero y reduce 33 % su curación; objetivo a 2 hexágonos. Duración: 10 s. Intervalo: 2 s. Enfriamiento: 2 s. Seleccionar un enemigo en radio cada 2 s; desempate pendiente de P8C. Quemadura sobre vida máxima del objetivo, sin recursión. Objetivo: `nearby_enemy`. Política: `nonstacking_debuff`. Capacidad: `new_mechanic`.
- Campos fuente no interpretados: `MonsterCap`. Se conservan para auditoría, sin convertirlos en efectos.

### 20. item-forge-armor--magic_resist

- Receta: component-armor + component-magic_resist. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-armor-magic_resist`.
- Estadísticas: +35 armadura · +35 resistencia mágica · +100 vida.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_GargoyleStoneplate`.
- **effect-1**: Cambio de objetivos: +10 de armadura y +10 de resistencia mágica por enemigo que elija al portador como objetivo. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `add`. Capacidad: `new_mechanic`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 21. item-forge-armor--mana

- Receta: component-armor + component-mana. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-armor-mana`.
- Estadísticas: +20 armadura · +30 maná inicial.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_FrozenHeart`.
- **effect-1**: Umbral de vida: Escudo de 25 % de vida máxima al alcanzar 40 % de vida; una vez por combate. Duración: 5 s. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `unique`. Capacidad: `extend_effect`.
- **effect-2**: Umbral de vida: +20 de armadura y +20 de resistencia mágica. Misma activación única que el escudo, al 40 % de vida. Resistencias hasta terminar combate. Objetivo: `self`. Política: `unique`. Capacidad: `extend_effect`. Condición estructurada: `{"healthAtOrBelowMilli":400,"afterEffectId":"effect-1","oncePerCombat":true}`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 22. item-forge-attack_speed--attack_speed

- Receta: component-attack_speed + component-attack_speed. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: physical. IconKey: `forge-attack_speed-attack_speed`.
- Estadísticas: +40 % velocidad de ataque.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_RapidFireCannon`.
- **effect-1**: Inicio de combate: +6 % de daño. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `independent`. Capacidad: `extend_effect`.
- **effect-2**: Daño de ataque o habilidad: Quema 1 % de la vida máxima del objetivo por segundo como daño verdadero y reduce 33 % su curación. Duración: 5 s. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `damaged_enemy`. Política: `nonstacking_debuff`. Capacidad: `new_mechanic`.
- Campos fuente no interpretados: `HexRangeIncrease`, `{9f5117db}`. Se conservan para auditoría, sin convertirlos en efectos.

### 23. item-forge-attack_speed--critical

- Receta: component-attack_speed + component-critical. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: physical. IconKey: `forge-attack_speed-critical`.
- Estadísticas: +15 % AD · +25 % velocidad de ataque · +20 % probabilidad de crítico.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); una copia por unidad. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_LastWhisper`.
- **effect-1**: Al causar daño físico: Reduce 30 % la armadura; no acumula el debilitamiento. Duración: 3 s. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `damaged_enemy`. Política: `nonstacking_debuff`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 24. item-forge-attack_speed--health

- Receta: component-attack_speed + component-health. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-attack_speed-health`.
- Estadísticas: +10 % velocidad de ataque · +30 AP · +150 vida.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_Leviathan`.
- **effect-1**: Al lanzar habilidad: +40 % de velocidad de ataque. Duración: 5 s. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `refresh`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 25. item-forge-attack_speed--magic_resist

- Receta: component-attack_speed + component-magic_resist. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-attack_speed-magic_resist`.
- Estadísticas: +25 % AD · +10 % velocidad de ataque · +20 resistencia mágica.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_RunaansHurricane`.
- **effect-1**: Al atacar: Un proyectil a 1 enemigo(s) cercano(s) causa 50 % del AD como daño físico; procs pendientes de validación. Críticos y elegibilidad del objetivo secundario pendientes de P8C; nunca replicar pasivas por recursión. Objetivo: `nearby_enemy`. Política: `independent`. Capacidad: `new_mechanic`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 26. item-forge-attack_speed--mana

- Receta: component-attack_speed + component-mana. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: magic. IconKey: `forge-attack_speed-mana`.
- Estadísticas: +20 % velocidad de ataque · +15 AP · +15 maná inicial.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_StatikkShiv`.
- **effect-1**: Al atacar: Cada 3 ataques: 30 de daño mágico a 4 enemigos y 30 % de reducción de resistencia mágica. Duración: 5 s. Cada tercer ataque: cuatro objetivos, 30 daño mágico y reducción de RM. Orden determinista de selección pendiente. Objetivo: `enemies_in_radius`. Política: `nonstacking_debuff`. Capacidad: `new_mechanic`.
- Campos fuente no interpretados: `{12a15e9e}`, `{15144cec}`, `{79e2ec7b}`. Se conservan para auditoría, sin convertirlos en efectos.

### 27. item-forge-critical--critical

- Receta: component-critical + component-critical. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: utility. IconKey: `forge-critical-critical`.
- Estadísticas: +150 vida · +20 % probabilidad de crítico.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 3 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_ThiefsGloves`.
- **effect-1**: Inicio de ronda: Equipa 2 objetos aleatorios; ocupa 3 ranuras. Pool pendiente de especificación. Ocupa las tres ranuras. Pool elegible y exclusiones requieren especificación antes de activarlo. Objetivo: `self`. Política: `unique`. Capacidad: `needs_specification`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 28. item-forge-critical--health

- Receta: component-critical + component-health. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-critical-health`.
- Estadísticas: +20 % velocidad de ataque · +10 AP · +150 vida · +20 % probabilidad de crítico.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_PowerGauntlet`.
- **effect-1**: Al dañar un escudo: +25 % de daño. Duración: 3 s. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `refresh`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 29. item-forge-critical--magic_resist

- Receta: component-critical + component-magic_resist. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-critical-magic_resist`.
- Estadísticas: +30 % velocidad de ataque · +20 resistencia mágica · +20 % probabilidad de crítico.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); una copia por unidad. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_Quicksilver`.
- **effect-1**: Inicio de combate: Inmunidad al control de masas. Duración: 14 s. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `independent`. Capacidad: `new_mechanic`.
- **effect-2**: Periódico: +4 % de velocidad de ataque por acumulación; sin límite publicado. Duración: 14 s. Intervalo: 2 s. Solo acumula durante los primeros 14 s. Inclusión del instante final y persistencia posterior requieren P8C. Objetivo: `self`. Política: `add`. Capacidad: `needs_specification`. Condición estructurada: `{"duringFirstTicks":140}`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 30. item-forge-critical--mana

- Receta: component-critical + component-mana. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: hybrid. IconKey: `forge-critical-mana`.
- Estadísticas: +15 maná inicial · +20 % probabilidad de crítico · +15 % AD · +15 AP.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_UnstableConcoction`.
- **effect-1**: Al causar daño: Cura al portador 15 % del daño causado. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `independent`. Capacidad: `extend_effect`.
- **effect-2**: Inicio de ronda: Sortea un extra de 15 % AD y 15 AP, o 15 % omnivampirismo; probabilidades pendientes. Dobla AD/AP o bien omnivampirismo. Pesos no publicados; no asumir 50/50. Objetivo: `self`. Política: `independent`. Capacidad: `needs_specification`.
- Campos fuente no interpretados: `{a60806db}`. Se conservan para auditoría, sin convertirlos en efectos.

### 31. item-forge-health--health

- Receta: component-health + component-health. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-health-health`.
- Estadísticas: +600 vida · +8 % vida.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate compatible; laboratorio sí, solo explícito; competitivo no.
- Fuente interna: `TFT_Item_WarmogsArmor`.
- Sin efectos especiales. Vida = base preparada + 600 + floor(base preparada × 0,08), más otras fuentes independientes. No se multiplica el +600.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 32. item-forge-health--magic_resist

- Receta: component-health + component-magic_resist. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: support. IconKey: `forge-health-magic_resist`.
- Estadísticas: +20 resistencia mágica · +150 vida.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_SpectralGauntlet`.
- **effect-1**: Aura durante el combate: Reduce 30 % la armadura en radio de 2 hexágonos; no acumula el debilitamiento. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `enemies_in_radius`. Política: `nonstacking_debuff`. Capacidad: `extend_effect`.
- **effect-2**: Inicio de combate: +25 de armadura y +25 de resistencia mágica. Duración: 10 s. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `independent`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 33. item-forge-health--mana

- Receta: component-health + component-mana. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: support. IconKey: `forge-health-mana`.
- Estadísticas: +150 vida · +15 maná inicial.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_Redemption`.
- **effect-1**: Periódico: Cura 15 % de vida perdida, máximo 1000, en radio de 1 hexágono(s). Intervalo: 5 s. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `allies_in_radius`. Política: `independent`. Capacidad: `extend_effect`.
- **effect-2**: Periódico: Reduce 10 % el daño de todas las fuentes. Duración: 5 s. Intervalo: 5 s. Mismos aliados a 1 hexágono que la curación. Reducción no acumulable durante 5 s. Objetivo: `allies_in_radius`. Política: `strongest`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.

### 34. item-forge-magic_resist--magic_resist

- Receta: component-magic_resist + component-magic_resist. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-magic_resist-magic_resist`.
- Estadísticas: +55 resistencia mágica · +10 % vida.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_DragonsClaw`.
- **effect-1**: Periódico: Cura 5 % de vida máxima. Intervalo: 2 s. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `independent`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: `ICD`. Se conservan para auditoría, sin convertirlos en efectos.

### 35. item-forge-magic_resist--mana

- Receta: component-magic_resist + component-mana. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: defense. IconKey: `forge-magic_resist-mana`.
- Estadísticas: +15 AP · +20 resistencia mágica · +15 maná inicial.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); varias copias permitidas dentro de las ranuras. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_AdaptiveHelm`.
- **effect-1**: Inicio de combate: Al inicio, primeras 2 filas: +40 armadura, +40 resistencia mágica y +1 maná por ataque recibido; filas traseras: +20 AP y +10 maná cada 3 s. Posición al inicio: dos filas delanteras o dos traseras. Fijar traducción a filas lógicas EUNUCO. Objetivo: `self`. Política: `independent`. Capacidad: `needs_specification`.
- Campos fuente no interpretados: `{d357c9f2}`. Se conservan para auditoría, sin convertirlos en efectos.

### 36. item-forge-mana--mana

- Receta: component-mana + component-mana. Versión de definición: 1; catálogo: f0p8b-14.1-1.
- Categoría: hybrid. IconKey: `forge-mana-mana`.
- Estadísticas: +20 % AD · +20 AP · +20 maná inicial.
- Restricciones: 1★ mínimo; sin exclusiones de personaje; 1 ranura(s); una copia por unidad. Estadísticas de copias válidas se suman.
- Estado: definición completa; combate pending; laboratorio no; competitivo no.
- Fuente interna: `TFT_Item_BlueBuff`.
- **effect-1**: Inicio de combate: Reduce 10 el maná máximo; mínimo pendiente de especificación. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `independent`. Capacidad: `needs_specification`.
- **effect-2**: Participación en eliminación: +8 % de daño. Duración: 8 s. Diseño reservado: no se ejecuta hasta F0-P8C. Objetivo: `self`. Política: `refresh`. Capacidad: `extend_effect`.
- Campos fuente no interpretados: ninguno. Se conservan para auditoría, sin convertirlos en efectos.


## Actualización F0-P8C · 26-10-2026

Los 36 resultados de la tabla histórica pasan a estar disponibles exclusivamente en `EXECUTABLE_ITEM_CATALOG` (`f0p8c-1`), con las mismas recetas y estadísticas. `STANDARD_ITEM_CATALOG` continúa congelado y bloqueado. El manifiesto explícito de validación impide habilitar automáticamente futuros registros.

Detalle: [ejecutor](ITEM_EFFECT_EXECUTOR.md), [decisiones](ITEM_EFFECT_EVENT_ORDER.md) y [matriz de pruebas](ITEM_EFFECT_TEST_MATRIX.md).


## F0-P8D · 26-10-2026

`DROP_ITEM_CATALOG` (`f0p8d-1`) contiene exactamente las mismas definiciones y recetas que P8C. Solo cambia la identidad que activa la política de reparto. Las familias y huellas P8A/B/C permanecen congeladas.

Contrato, recuperación y límites: [ITEM_DROP_DESIGN](ITEM_DROP_DESIGN.md).
