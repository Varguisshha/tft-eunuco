# Tienda y conservación del pool — f0p3-1

## Inventario finito

Pool por `definitionId`, coste obtenido del catálogo. Copias iniciales por personaje: coste1 **29**, coste2 **22**, coste3 **18**. Son parámetros propios y modificables, no tablas oficiales actuales. Cuatro IDs ficticios P2 conservados. El pool pertenece al estado de partida; no se crea un pool nuevo al renovar o pasar de ronda.

Invariante para cada definición:

`copias disponibles + ofertas reservadas + suma(copias de unidades poseídas) = copias iniciales`

Una unidad1★ consume1;2★ consume3;3★ consume9. La fusión cambia representación, nunca devuelve copias. Combatir o morir visualmente no destruye propiedad: la formación inicial vuelve en la siguiente preparación. Venta devuelve todas las copias. El rival de pruebas usa perfiles explícitos externos al inventario económico, no posee tienda ni consume copias del jugador.

El mismo servicio puro puede operar sobre un pool de partida ampliado a cuatro inventarios y cuatro tiendas; esa agregación y la identidad de jugador requieren un contrato posterior. No hay cuatro clientes simulados, red ni concurrencia implementados.

## Extracción

Cinco slots. Al generar tienda: devolver las reservas antiguas, vaciar slots, extraer uno por uno y descontar cada copia del pool inmediatamente. Oferta tiene ID monotónico estable hasta compra/renovación. Comprar transfiere reserva a propiedad; no vuelve a descontar pool. Slot comprado queda vacío hasta renovación. Comprar nuevamente ese offerId falla, aunque el cliente mande otra secuencia.

Por slot:

1. Tomar fila de probabilidades del nivel.
2. Excluir categorías sin copias o con peso0.
3. Elegir categoría proporcionalmente a los pesos restantes (normalización implícita por suma de pesos elegibles).
4. Elegir personaje de esa categoría ponderando por sus copias disponibles, en orden estable del catálogo.
5. Reservar una copia, emitir nuevo offerId y continuar.

Se usan dos salidas Mulberry32 por oferta: una categoría y una copia. Se usa módulo entero con su pequeño sesgo; no se usa Math.random. Cuando no queda categoría con peso positivo y copias, los slots restantes quedan `null` y no consumen RNG. No se desbloquea coste3 a nivel2 si solo queda esa categoría de peso0.

| Nivel | Coste1 | Coste2 | Coste3 |
| ----- | -----: | -----: | -----: |
| 2     |    80% |    20% |     0% |
| 3     |    60% |    35% |     5% |
| 4     |    40% |    45% |    15% |
| 5     |    25% |    45% |    30% |
| 6     |    15% |    40% |    45% |
| 7     |    10% |    30% |    60% |

Cada fila validada suma exactamente100. Subir nivel cambia la próxima extracción, no transforma ofertas ya reservadas.

## Bloqueo y atomicidad

Tienda desbloqueada se renueva gratuitamente al entrar a la nueva preparación, después de la XP pasiva. Bloqueada conserva ofertas, IDs, reservas y huecos comprados. El bloqueo persiste hasta desbloquearlo; el jugador puede renovar manualmente por2 sin desactivarlo. Bloquear/desbloquear no consume oro ni RNG.

`applyMatchAction` valida esquema, estado semántico, secuencia/revisión, fase y recursos. Trabaja sobre una copia privada. Si no puede alojar la compra después de combinar, se descarta toda la transacción: ni se cobra ni cambia oferta, pool o IDs. Un hueco transitorio privado permite comprar con banquillo lleno si la combinación inmediata libera espacio. Ningún estado con slot-1 se publica.

## Aleatoriedad separada

- Shop RNG inicial: `(seed XOR 0x9e3779b9) >>> 0`.
- Combat RNG inicial: `(seed XOR 0x85ebca6b) >>> 0`.
- Solo una extracción de shop avanza shop RNG; solo iniciar un combate avanza combat RNG y usa su salida como seed del motor P2.
- Selección, hover, zoom, navegación, guardado, pausa y velocidad no consumen ninguna fuente.
- Reproducir seed+configuración+acciones aceptadas produce tiendas, propiedad, economía y resultados iguales. No se modifica el PRNG ni las reglas f0p2-1 del combate.
