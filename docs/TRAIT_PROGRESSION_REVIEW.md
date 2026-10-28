# F0-P10A · progresión y riesgos de diseño

Los umbrales proceden de la propuesta del usuario, no del Excel. Capacidad máxima existente: 7. No se amplía el nivel ni el tablero. Solo cuatro identidades son jugables; varias copias de la misma no suman miembros. Una afinidad puede mostrar progreso sin conceder efectos.

| Colectiva             | Miembros Excel | Jugables actuales | Umbrales propuestos | Recompensas implementadas   |
| --------------------- | -------------: | ----------------: | ------------------- | --------------------------- |
| Fumón                 |             13 |                 1 | 2/4/6/8/10          | 2 conservado; antiguo 3 → 4 |
| Gym                   |              9 |                 2 | 2/4/6/8             | Ninguna: pending_effects    |
| Ruman Trinity         |              3 |                 2 | 2/3                 | 2/3 conservados             |
| UPM                   |             13 |                 3 | 2/4/6/8/10          | 2/4/6 conservados           |
| Pardillo              |             10 |                 1 | 2/4/6/8             | Ninguna: pending_effects    |
| Hortaleza             |             12 |                 2 | 2/4/6/8/10          | 2 conservado; antiguo 3 → 4 |
| Rata                  |              6 |                 0 | 2/4/6               | Ninguna: pending_effects    |
| Fantasy               |              9 |                 2 | 2/4/6/8             | Ninguna: pending_effects    |
| Perdidos por el mundo |              9 |                 2 | 2/4/6/8             | 2 conservado; antiguo 3 → 4 |
| Pancho                |              9 |                 2 | 2/4/6/8             | Ninguna: pending_effects    |
| Valo                  |             11 |                 2 | 2/4/6/8/10          | Ninguna: pending_effects    |
| BlackHaus             |              7 |                 0 | 2/4/6               | Ninguna: pending_effects    |
| Shisheros             |              9 |                 0 | 2/4/6/8             | Ninguna: pending_effects    |
| Mus                   |              0 |                 0 | 2/4                 | Ninguna: pending_effects    |
| PSOE                  |              7 |                 1 | 2/4/6               | Ninguna: pending_effects    |
| Lenceria              |              2 |                 0 | 2                   | Ninguna: pending_effects    |

Cada escalón calcula su reserva: >7 por capacidad; >miembros del Excel por falta de asignaciones; >miembros jugables por borradores. Las razones están en los datos y el inspector. Una reserva describe la alcanzabilidad, no habilita trampas ni efectos. Los niveles 8/10 quedan reservados. MUS tiene 0 miembros, solo 2/4, todo pendiente y reservado. En una prueba de diagnóstico con tres identidades mantiene el progreso 2; con cuatro llega a 4, sin bonus en ambos casos. No se inventan miembros para hacerlo alcanzable.

## Migración explícita provisional

- Hortaleza: antiguo 2→2 (+100 vida), antiguo 3→4 (+220 vida y +15 armadura). Sustitutivo, no +320 vida.
- Perdidos por el mundo: antiguo 2→2 (+10 % vida), antiguo 3→4 (+18 % vida y cura del 8 % al bajar del 40 %, una vez). Conserva cifras, cambia explícitamente el requisito de la cura a 4.
- Fumón: antiguo 2→2 (8 % reducción de armadura), antiguo 3→4 (15 % y primera aplicación 60 % AD). La regla baja se restringe a 2–3 miembros en esta versión para no duplicar la recompensa sustitutiva de 4. No se modifica su catálogo anterior.
- UPM: 2/4/6 conserva recompensas acumulativas e IDs; 8/10 no añade ninguna.
- Ruman Trinity: 2/3 conserva recompensas sustitutivas. No se cambia el escudo ni sus cifras.
- El Depredador y Mano de Obra conservan todos sus efectos y reglas 1/1. Jew y Todo al rojo son únicas 1/1 pendientes sin mecánicas.

El análisis expone por separado `progressionThresholds` y recompensas implementadas. Si se alcanza un escalón superior pendiente, se conserva la última recompensa existente, sin conceder una nueva ni sumar niveles sustitutivos. No hay activación mecánica para una sinergia totalmente pendiente. La UI indica «Efectos pendientes» y nunca «Activa» para ella.

## Concentración y meta actual

Los cuatro juntos suman 22 afiliaciones (DOLEA 5, VARGAS 6, FLORIN 4, JARAMILLO 7). Alcanzan Ruman 2, UPM 2, Hortaleza 2, Perdidos 2 y las dos únicas existentes: seis efectos de afinidad simultáneos, además de habilidades y objetos. Gym/Fantasy/Pancho/Valo alcanzan progreso 2 sin recompensa. UPM tiene tres miembros; Fumón solo JARAMILLO y no activa. No se añade un segundo fumón ficticio.

Peibol tiene ocho afinidades; Agus, Ruben y JARAMILLO, siete. La superposición puede crear activaciones fáciles cuando entren borradores; faltan costes y estadísticas para evaluar su fuerza. El diseño futuro debe revisar recompensas, coste de oportunidad y frecuencia de tienda antes de admitir nuevos jugables. No se compensa esa incertidumbre con bonus inventados.

El pool moderno contiene solo DOLEA/VARGAS/FLORIN/JARAMILLO. No hay personaje de coste 1: el algoritmo existente descarta buckets vacíos y renormaliza los pesos disponibles, sin cambiar la tabla de probabilidades. Por ello las probabilidades nominales del HUD no equivalen a la distribución efectiva del roster incompleto. Es una limitación visible de esta fase; no se inventa un coste 1 para disimularla. La IA local heredada conserva sus unidades de prueba, sin afiliaciones P10A y fuera de tienda/pool moderno. PvP usa el pool de cuatro; no se altera la economía ni el catálogo de objetos.
