# Sistema de sinergias — F0-P6A

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
