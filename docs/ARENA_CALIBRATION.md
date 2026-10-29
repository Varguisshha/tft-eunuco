# Calibración de arenas — F0-P12I

La geometría lógica sigue siendo odd-r 7×8: 56 hexágonos, coordenadas axiales, vecinos y distancias del core. La homografía solo transforma su representación. El fondo se escala uniformemente; no se estira ni recibe hexágonos pintados.

## Cafetería UPM — ETSISI, configuración 1

Imagen original: `Plaza soleada de la cafetería UPM.png`, 1672×941, relación 1672/941. Maestro: `art/arenas/cafeteria-upm-etsisi.png`. SHA-256: `5b484c800b04fc69c33d6d1e7fcb8b3858c1c682a0da0b14a650b922927598ba`. La conversión principal conserva exactamente sus píxeles; la miniatura no es el maestro.

Coordenadas en píxeles del original, orden fondo/derecha/frente/izquierda:

| Punto     | Perímetro seguro del asfalto | Control de homografía |
| --------- | ---------------------------- | --------------------- |
| Fondo     | 826,352                      | 826,385               |
| Derecha   | 1500,510                     | 1425,513              |
| Frente    | 900,865                      | 900,822               |
| Izquierda | 194,510                      | 270,513               |

El perímetro evita edificios, aceras y árboles. Los controles dejan margen para las esquinas de todas las celdas: se comprueban 336 vértices, convexidad, orientación, inversa y ausencia de horizonte proyectivo dentro del tablero. No son las coordenadas de Mar de Cristal.

La cámara usa `contain`, foco 836,470, margen superior 8, inferior 12, lateral del HUD 172, derecho 16 y espacio de cabezas 90. Los límites 0,85–1,15 regulan el ajuste base. El zoom del jugador de P12F se aplica después: 80–180 %. A 100 % se prioriza la ilustración completa; al acercar se recorta deliberadamente el encuadre, sin mover unidades respecto a sus hexágonos. HUD, tienda e inspector no reciben ese zoom.

Personajes: escala base 1,12; interpolación uniforme 0,94–1,06 entre Y=400 y Y=810. El manifiesto de cada sprite fija el origen de sus pies. Sombras y profundidad conservan el pipeline existente.

## Verificación

- `registry.test.ts`: 56 centros y 336 esquinas por arena; inversa en 80/100/120/180 %, identidad del maestro y píxeles del WebP.
- `arena.test.ts`, parametrizada para ambas: fronteras compartidas a ambos lados, vértices interiores, puntos exteriores, cámara/DPR, destinos válidos/prohibidos, intercambios y restauración sin cambios lógicos.
- `visualIntegration.test.ts`: DOLEA 1/2/3 estrellas en ambas, ocho fotogramas de ataque, caminar, morir, origen de pies, escala uniforme y profundidad.
- Inspección manual del perímetro y centro con cuadrícula, cinco tamaños de pantalla, cuatro niveles de zoom, selección y arrastre real desde/hacia banquillo en Cafetería.
- Campaña visual de tres clientes hasta ronda 31, clones y final; combate 7v7 y animaciones en ambos fondos. Las campañas de red de 2/3/4 clientes usan el mismo protocolo real.

Las capturas están en `artifacts/p12i/`, excluidas de Git. Los nombres indican arena, fase, tamaño o zoom. La prueba visual usa identidades sintéticas, puerto 2594 y reloj real; permite alargar la preparación y avanzar fases mediante un control solo de laboratorio. No es una demostración de los tiempos de producción.

## Ajustes futuros

Editar exclusivamente la definición de la arena o usar la herramienta local de calibración. Revisar cuatro extremos y centro, ejecutar todas las comprobaciones anteriores y subir `configVersion` al aprobar una nueva calibración. Un cambio visual no permite alterar celdas, alcances, trayectorias lógicas o posiciones válidas. No introducir guardados de calibración personales como configuración automática de una partida online.
