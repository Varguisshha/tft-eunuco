# Sistema de sinergias — F0-P6B.1

## Fuentes estadísticas en reglas avanzadas

En `f0p6b1-1`, las bonificaciones de sinergia se representan como estados modificadores con `origin: trait`, `sourceId` de la sinergia, `mode` plano/porcentual y `expiresTick: null`. Se aplican antes de inicializar HP, conservando los perfiles base por estrellas. El cálculo efectivo suma planos y porcentajes de la base; Overtime multiplica al final la velocidad. El camino histórico conserva sus perfiles preparados originales.

Hortaleza y Llama de Pádel mantienen sus valores, política `highest`, conteo distinto y exclusión del banquillo. Cada ronda reconstruye sus fuentes. El contrato permite bonificar AD, AP, probabilidad y multiplicador crítico además de las estadísticas previas; no se añade una sinergia nueva en esta fase. Un umbral de un solo miembro ya es expresable, sin implementar El Depredador. Véase [ADVANCED_STATS.md](ADVANCED_STATS.md).

## Diagnóstico comprobado en P6A.1

Sin cambios de balance. Arena añade `hortaleza-2/3` y `padel-1/2/3`, además de conservar `traits-2/3`, habilidades por estrellas y pasiva en Overtime. Semilla de referencia: **42**. Las membresías ficticias solo existen en la entrada de diagnóstico, fuera de tienda y roster jugable. En diagnósticos aislados los acompañantes y el rival no infligen daño para permitir observar la cadencia; DOLEA conserva sus estadísticas base.

| Formación   | Vida máxima de DOLEA 1★ | Armadura | Ataques/s |
| ----------- | ----------------------: | -------: | --------: |
| Un miembro  |                     600 |       45 |       0,8 |
| Hortaleza 2 |                     700 |       45 |       0,8 |
| Hortaleza 3 |                     820 |       60 |       0,8 |
| Llama 2     |                     600 |       45 |     0,896 |
| Llama 3     |                     600 |       45 |         1 |
| Ambas 2     |                     700 |       45 |     0,896 |
| Ambas 3     |                     820 |       60 |         1 |

La cadencia se verifica con eventos `attack_start`, no solo con una etiqueta: primeros inicios `[1,14,26,39]`, `[1,13,24,35]` y `[1,11,21,31]` para 1/2/3 miembros de Llama. La carga sobrante se conserva. Overtime reduce el intervalo medio en los tres escenarios; el inspector técnico muestra la velocidad efectiva con su modificador actual.

Las pruebas comprueban duplicados por definición, exclusión de banquillo, retirada 3→2→1, no acumulación de umbrales y repetición desde los datos base sin mutación. El navegador confirma estadísticas efectivas en los escenarios aislados y combinados. Véase [informe](F0_P6A1_REPORT.md).

`TraitDefinition` v1 contiene ID, nombre, descripción, icono, información visual, destinatarios, política de acumulación y umbrales ordenados. Definiciones validadas en shared; valores provisionales centralizados en game-data. Un perfil admite cero, una o dos membresías distintas; no exige dos.

## Formación y aplicación

`analyzeTraits` en game-core calcula contribuidores únicos por `definitionId` entre unidades desplegadas. Banquillo excluido; duplicados y estrellas no multiplican conteo; una unidad contribuye a cada membresía. Devuelve conteo, contribuidores, umbrales aplicables, nivel, estado y próximo umbral. `matchTraits` adapta la formación local; React solo representa el resultado.

`prepareTraitProfiles` separa equipos, clona perfiles escalados por estrellas y aplica bonificaciones antes de crear vida actual. La formación de entrada no muta. Cada ronda parte de los datos base y calcula de nuevo: no guarda incrementos permanentes. `highest` selecciona solo el mayor umbral; `cumulative` acumula únicamente si se declara. `members` beneficia miembros; `team`, a todo el equipo.

Bonificaciones planas o `percent_milli` para las estadísticas modificables. El porcentaje usa la estadística original ya escalada por estrellas; no compone accidentalmente otros porcentajes. Los umbrales también admiten listas de efectos reutilizables de inicio. Una activación emite `trait_activate` con equipo, conteo, umbral y destinatarios ordenados.

## Balance inicial

| Sinergia       | 2 distintos               | 3 distintos                     | Destinatarios |
| -------------- | ------------------------- | ------------------------------- | ------------- |
| Hortaleza      | +100 vida máxima          | +220 vida máxima y +15 armadura | Miembros      |
| Llama de Pádel | +12 % velocidad de ataque | +25 % velocidad de ataque       | Miembros      |

Ambas usan `highest`; nivel 3 no suma nivel 2. DOLEA es el único miembro permanente. Los escenarios `traits-2` y `traits-3` asignan membresías a K-01/V-02 solo dentro de una entrada de diagnóstico; nunca cambian catálogo, pool, probabilidades ni rivales locales. En esos escenarios DOLEA 1★ pasa a 700HP/45armadura/0,896ataques/s o 820HP/60armadura/1ataque/s.

## Representación

`TraitRail` comparte la columna flotante izquierda con Vargas/Florin sin reservar otra columna de arena. Presenta sinergias con al menos un contribuidor, nombre, icono, conteo/próximo umbral, estado y nivel. El tooltip propio contiene todos los umbrales, destacados activos, progreso, contribuidores y aviso de balance provisional. Se abre con hover, foco o clic; Escape lo cierra. Se posiciona respecto al viewport, con límites y scroll interno si hace falta.

`ContentIcon` es el registro visual independiente del combate. Recursos originales SVG 32×32 con geometría urbana, pala/llama y fuerza: `hortaleza.svg`, `llama-de-padel.svg`, `volumen-sucio.svg`; `trait-unknown.svg` es fallback. La misma referencia aparece en lateral, tooltip, tienda e inspector. Activación cambia color/opacidad y tiene transición breve con reducción de movimiento respetada. Sonido fuera de esta fase.

## Añadir una sinergia

1. Definir ID estable y `TraitDefinitionSchema.parse(...)` en game-data; umbrales estrictamente crecientes, descripción coherente y destinatarios explícitos.
2. Registrar membresía en los perfiles del catálogo nuevo; máximo dos por personaje. Mantener versiones históricas.
3. Crear icono original independiente y mapear su ID en `ContentIcon`.
4. Probar duplicados, banquillo, estrellas, ambos equipos, máximo umbral y regeneración desde base en otra ronda.
5. Verificar lateral, foco/clic/Escape, tienda e inspector en cinco tamaños de escritorio.

## Sinergias únicas y progresivas — F0-P6B.2

Los umbrales de un miembro ya son compatibles con el análisis por definiciones desplegadas distintas: un personaje con copias o más estrellas sigue mostrando 1/1; el banquillo no activa la sinergia. La novedad es `progress: {version: 1, scope, rules}`. Cada regla declara un `memberThreshold` existente. Las estadísticas iniciales permanecen en los umbrales normales; contadores y reglas dinámicas viven en el estado de combate.

`scope: unit` separa runtime y contadores de cada receptor; `team` los comparte por sinergia/bando. Una señal conserva su ordinal para distinguir el tercer lanzamiento aunque varios coincidan en tick. La membresía se fija al iniciar; progreso y eliminaciones no añaden miembros. El lateral y los tooltips muestran ambos conceptos. Los casos 1/1 y 2/4/6 son exclusivamente ficticios, fuera del catálogo jugable. [Contrato completo](ADVANCED_MECHANICS.md).

## Integración F0-P6B.3

El catálogo B3 añade UPM colectiva acumulativa2/4/6 y EL DEPREDADOR única1/1. Las definiciones históricas siguen congeladas. UPM:100HP/20AP; cura4 % por cast natural desde4; cada tercero150 % y repetición50 % desde6. Créditos nombra los contadores existentes, individuales, sin añadir stack ni miembro. B3 registra progreso desde el primer umbral activo aunque no haya reglas dinámicas todavía elegibles; B2 conserva su ejecución exacta. Depredador:5AD/5 %cura por kill; curaextra desde kill3,15AD una vez en4 y salto desde kill7. Conteos distintos desplegados, bench excluido. Iconos originales; diagnósticos con miembros ficticios fuera del roster. [Detalle](VARGAS_CHARACTER.md).
