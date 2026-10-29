# F0-P12G — Iconografía pixel art y equipamiento visible

Fecha: 2026-10-29. Rama de trabajo: `codex/f0-p12g-original-item-art`.

## Entrega

44 ilustraciones terminadas: ocho componentes y 36 objetos. Generadas individualmente, con referencia visual privada por objeto para conservar identidad y colores, y con instrucciones de reinterpretar geometría y composición. La revisión del agente cubre los cuatro lotes y la legibilidad pequeña; queda abierta la valoración artística del propietario. No se presenta como una revisión humana independiente.

Los borradores pictóricos anteriores se conservan únicamente en `artifacts/p12g/painted-drafts`, fuera de Git. La entrega utiliza las nuevas generaciones pixel art, no un filtro aplicado a esos borradores.

- Maestros: `art/p12g/masters`, 44 WebP lossless de 512×512.
- Juego: `apps/web/public/items/p12g`, 44 WebP lossless de 128×128 (aproximadamente 1,1 MiB total).
- Identidad y hashes: `art/p12g/pack.json`, `art/p12g/specs/catalog.json` y el manifiesto de `ItemIcon`.
- Procedencia y alcance: `art/p12g/PROVENANCE.md`.
- Galería: entrada exclusivamente DEV `/p12g-lab.html?gallery`; arena con equipamiento: `/p12g-lab.html`.

## Integración

`ItemIcon` utiliza las imágenes P12G como arte EUNUCO. Conserva los 44 identificadores, las correspondencias existentes y los iconos anteriores como segunda alternativa antes del SVG. El paquete privado TFT permanece disponible únicamente cuando su configuración LOCAL lo permite. El tema predeterminado es EUNUCO en ambos entornos.

El tablero ya no recibe solo la categoría «componente/completo»: recibe las definiciones reales equipadas. Phaser muestra una imagen por instancia, incluidos objetos que consumen varias ranuras. Comparte la resolución del HUD, caché de solicitudes y texturas; no reconstruye imágenes si el equipamiento no cambia. Las respuestas tardías se descartan al cambiar equipamiento o destruir la unidad. Si fallan todas las imágenes, muestra iniciales. Las imágenes no capturan eventos de ratón.

No se cambian reglas, IDs, recetas, disponibilidad, estadísticas, economía, combate ni persistencia. Los cuatro objetos bloqueados permanecen bloqueados. El removedor conserva su icono propio y comportamiento existentes; no cuenta entre las 44 recetas/componentes.

## Revisión visual

Capturas locales en `artifacts/p12g`: galería a 32, 40, 48, 64 y 128 px; arena a 1280×720, 1440×900, 1920×1080, 2560×1440 y 3840×2160. Se comprobaron los iconos del inventario, el equipamiento del tablero y banquillo y el tooltip de Espadón. Se ejecutó un removedor sobre FLORIN: el inventario pasó de 46 a 47 instancias, el removedor de uno a cero y el equipo quedó vacío; después se equipó Espadón y la ficha mostró una ranura ocupada con su imagen. Las capturas de arena no muestran scroll vertical. Los 44 iconos de la galería cargan; comprobación final sin imágenes rotas. El laboratorio conserva marcas DEV y reloj fijo y no pertenece al bundle público.

## Colección

| Lote | Objeto | Estado |
|---|---|---|
| A | Espadón | Terminado · pixel art |
| A | Chaleco de cadenas | Terminado · pixel art |
| A | Cinturón de gigante | Terminado · pixel art |
| A | Vara innecesariamente grande | Terminado · pixel art |
| A | Capa negatrón | Terminado · pixel art |
| A | Arco curvo | Terminado · pixel art |
| A | Guantes de combate | Terminado · pixel art |
| A | Lágrima de la diosa | Terminado · pixel art |
| B | Yelmo adaptable | Terminado · pixel art |
| B | Bastón del arcángel | Terminado · pixel art |
| B | Sanguinaria | Terminado · pixel art |
| B | Mejora azul | Terminado · pixel art |
| B | Chaleco de zarzas | Terminado · pixel art |
| B | Regiaguardia | Terminado · pixel art |
| B | Filo mortal | Terminado · pixel art |
| B | Garra de dragón | Terminado · pixel art |
| B | Promesa del protector | Terminado · pixel art |
| B | Protector pétreo de gárgola | Terminado · pixel art |
| B | Filo de la noche | Terminado · pixel art |
| B | Hoja de furia de Guinsoo | Terminado · pixel art |
| C | Sable-pistola hextech | Terminado · pixel art |
| C | Filo infinito | Terminado · pixel art |
| C | Chispa iónica | Terminado · pixel art |
| C | Guantelete enjoyado | Terminado · pixel art |
| C | Últimas palabras | Terminado · pixel art |
| C | Diente de Nashor | Terminado · pixel art |
| C | Verdugo de gigantes | Terminado · pixel art |
| C | Morellonomicón | Terminado · pixel art |
| C | Corazón resuelto | Terminado · pixel art |
| C | Mangual del guerrero | Terminado · pixel art |
| C | Fajín de mercurio | Terminado · pixel art |
| C | Sombrero mortal de Rabadon | Terminado · pixel art |
| D | Mejora roja | Terminado · pixel art |
| D | Capa de fuego solar | Terminado · pixel art |
| D | Rostro espiritual | Terminado · pixel art |
| D | Furia del kraken | Terminado · pixel art |
| D | Lanza de Shojin | Terminado · pixel art |
| D | Mortaja de la quietud | Terminado · pixel art |
| D | Bastón del Vacío | Terminado · pixel art |
| D | Calibrador de Sterak | Terminado · pixel art |
| D | Guantes de ladrón | Terminado · pixel art |
| D | Resolución titánica | Terminado · pixel art |
| D | Mano de la justicia | Terminado · pixel art |
| D | Armadura de Warmog | Terminado · pixel art |

## Validación técnica

- TypeScript y ESLint correctos.
- Regresiones específicas iniciales: 27/27. Tras actualizar los dobles de renderizado y el tamaño esperado: 18/18 adicionales.
- Primer pase completo: 1811 aprobadas, seis fallos de laboratorio (cuatro por el doble Phaser sin `container`, uno por esperar 64 px en vez de 128 y uno por la ruta del Excel original). Se corrigieron sin reducir aserciones ni cobertura. El Excel privado se enlaza localmente y no se incorpora a Git.
- Segundo pase completo: **1817 aprobadas, cero fallos, una opt-in omitida**, 149 archivos aprobados; 559,71 segundos. `pnpm check` terminó con código cero, incluidos TypeScript, ESLint y ambos builds. Evidencia: `artifacts/p12a-r2/p12g-final.log`.
- Builds público y LOCAL correctos; LOCAL también con la raíz privada de referencias existente.
- `verify:public`: 44 originales, cero paquetes oficiales/locales y sin herramientas DEV en el bundle.
- `verify:railway`: intención IaC verificada offline, sin llamadas al proveedor.
- 18 fingerprints históricos comparados: sin cambios. El código de catálogos, motor y snapshots, incluido P12F, no presenta diferencias frente a la base.
- La prueba opt-in de arranque/parada LOCAL se mantiene separada: el puerto 4173 está ocupado por un servicio preexistente ajeno a esta validación. No se ha interrumpido ese servicio para ejecutar la prueba.
- Rendimiento del pase final: simulación 7v7 de 771,88 ms; p95 de reproducción de 13,38 ms. Los límites permanecen en 5000 y 16,7 ms respectivamente.
- Manifiesto aprobado original comprobado contra los bytes: 44 asociaciones y 44 archivos válidos. Auditoría previa al commit de los 113 archivos preparados: cero detecciones de secretos o recursos oficiales.
- Los avisos no bloqueantes de Vite sobre chunks grandes y futura carga nativa de configuración permanecen; no se han ocultado.

## Commit y auditoría final

Implementación: `894199bf2d15d52db3bb7a890dcf79a34da4df0f`. Validación completa local aprobada con el código de esta implementación; después solo se corrigió la ruta predeterminada del exportador de borradores y se completó documentación. ESLint se repitió tras esa corrección.

`verify:release` sobre el commit de implementación: cero detecciones de secretos y cero iconos oficiales en el historial. `git diff --check` correcto. Las referencias privadas, archivos de prueba enlazados, capturas y diagnósticos permanecen fuera de Git. Los enlaces de fixtures de esta ejecución se conservaron bajo `artifacts/p12g/fixture-links`; para repetir las pruebas de fuentes, enlazar ese directorio como `TFPeru` y configurar la raíz privada de referencias.

Candidata local: `release/p12g-public-safe`, preparada sin push. El commit de cierre documental no cambia el código validado. No hay cambios en `packages/game-core`, `packages/game-data`, `packages/shared`, servidor ni IaC.

## Publicación

No se ha hecho push, despliegue, encendido de Railway ni cambios en Supabase. Los binarios oficiales privados no se incluyen en la entrega. La procedencia documenta el uso del generador; no concede una licencia sobre imágenes de Riot ni garantiza derechos de terceros.
