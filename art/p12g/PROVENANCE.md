# Procedencia — EUNUCO Neon RPG P12G

Fecha de producción y revisión: 2026-10-29. Encargo expreso del propietario de TFT EUNUCO: crear y preparar para distribución 44 ilustraciones originales.

## Producción

- Herramienta: generador integrado `image_gen.imagegen` de OpenAI, modo generación de pixel art con referencia visual privada individual. No CLI ni servicios de terceros añadidos.
- 44 imágenes pixel art finales generadas individualmente en cuatro lotes. Sustituyen 46 generaciones pictóricas previas, conservadas solo como borradores locales ignorados.
- Se inspeccionó y proporcionó cada referencia privada al generador para conservar la identidad conceptual, silueta y colores reconocibles. Se solicitó geometría, composición y decoración distintas. Los hashes de referencia se registran en el catálogo; sus binarios no forman parte de esta entrega.
- Conceptos, paletas, prompts finales, IDs reales, recetas y hashes de origen/maestro/exportación: `specs/catalog.json`.
- Maestros de entrega: 512×512 WebP lossless. Exportaciones del juego: 128×128 WebP lossless. Originales completos del generador conservados además en el almacenamiento local de imágenes de esta conversación, identificados por nombre y hash en el catálogo.
- Único procesado de las imágenes finales: reducción proporcional nearest-neighbor y codificación WebP sin pérdida mediante Sharp. Sin trazado, recortes de referencias, montaje de componentes, SVG ni recursos descargados.

## Condiciones y alcance

Se registra este paquete como arte original generado para el proyecto, apto para incorporarse a sus builds públicos conforme al encargo del propietario. La aprobación abarca exclusivamente los 44 hashes del manifiesto `pack.json`; no concede permiso sobre las referencias TFT privadas.

Se consultaron los [Términos europeos de OpenAI](https://openai.com/policies/eu-terms-of-use/) el 29-10-2026, sección Content: atribuyen al usuario los derechos sobre la salida que correspondan entre usuario y OpenAI, dentro de lo permitido por la ley. También aclaran que las salidas pueden no ser únicas y que deben respetarse derechos ajenos. Esto acredita la procedencia y la base de uso del generador; no es una garantía de exclusividad, protección por copyright o inexistencia de derechos de terceros.

La revisión artística de esta entrega es realizada por el agente: sin textos, logos de Riot, marcas de agua visibles ni reproducción directa detectada de una composición oficial. No se presenta como una aprobación humana independiente. Los nombres, recetas e IDs de compatibilidad son los preexistentes del juego; no forman parte de la autoría de las ilustraciones.

No se publica una licencia general para terceros ni se autorizan las imágenes oficiales de Riot. No se ha realizado push ni despliegue.
