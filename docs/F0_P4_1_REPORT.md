# Entrega F0-P4.1

DOLEA es jugable en Partida local y Arena. Los participantes se llaman Vargas y Florin. F0-P5 no se ha iniciado.

1. **Fuentes encontradas:**32PNG en `Sprites/`,16originales y16copias idénticas. Ocho ataques de nivel1(1254×1254) y ocho de nivel2(1086×1448). Nombres exactos, hashes y dimensiones en [SPRITE_IMPORT_REPORT.json](SPRITE_IMPORT_REPORT.json).
2. **Recursos procesados:**dos hojas transparentes de8frames (1024×128 y896×128), dos retratos estáticos, registro de manifiestos y cobertura. Originales inmutables.
3. **Anomalías:**espacios adicionales en nombres, duplicados, dimensiones distintas, alfa parcial y ruido casi transparente. El umbral configurable8 solo limpia derivados. El orden original contiene varias extensiones de puño; se mantiene sin multiplicar daño. Apoyos alineados y contenido visible dentro de las celdas.
4. **Pipeline:**`pnpm sprites:import`, scriptNode/sharp y config por personaje; descubrimiento por carpetas/orden numérico, validación de transparencia, normalización, generación y registro reproducibles. [Procedimiento](SPRITE_PIPELINE.md).
5. **Fallbacks:**estado solicitado de estrella actual → Attack actual → mismo estado/Attack en evoluciones inferiores → placeholder genérico. El resolver conserva solicitud y selección por separado.
6. **Integración:**tanque cuerpo a cuerpo de coste2, alcance1, etiqueta neutral; perfil/activa/pasiva provisionales compatibles con K-01. Pool22copias, compras/ventas/fusión1/3/9, sin alterar probabilidades o economía. Catálogo nuevo explícito y catálogo antiguo conservado para replay.
7. **Cobertura:**Attack1★ yAttack2★ disponibles. Resto con fallback.3★ reutiliza2★ conservando sus estadísticas. [Tabla completa](ANIMATION_COVERAGE.md).
8. **Pruebas:**200tests, incluidos los172anteriores intactos; tipos, lint, build y formato correctos. Pipeline reproducible y prueba de añadir Walk. [Resultados y límites](VALIDATION.md).
9. **Validación visual:**tienda, compra, banquillo, arrastre, fusión2★, cambios1/2/3★,16frames, muerte, overtime411→450, combate local ganado70, venta, recuperación de ambos catálogos y cinco tamaños de escritorio. Fusión3★ comprobada por tests; apariencia3★ en Arena.
10. **Git:**base1079713. Trabajo previoP4 identificado y conservado;P4.1 añadido como cambios locales. No se crean commits, remoto ni push. Fuentes `Sprites/` permanecen intactas y sin seguimiento, junto a los derivados nuevos pendientes de revisión.
11. **Limitaciones:**solo Attack real; demás estados son sustituciones visuales temporales. Impactos3/6 y ficha provisional. No hay arte propio3★. Escenas sintéticas de overtime/muerte son diagnósticas. Sigue la advertencia de tamaño del bundlePhaser. Guardados antiguos siguen con su roster original; para comprar DOLEA se inicia una partida nueva.
12. **Próximas incorporaciones:**añadir fuentes en `Sprites/<id>/starN/<estado>/frame-N.png`, registrar/configurar personaje, importar, revisar cobertura, validar y probar en Arena. Un Walk nuevo sustituye su fallback sin modificar combate. Para un roster comercial nuevo debe versionarse su catálogo, evitando reinterpretar guardados. [Guía con el ejemplo DOLEA](CHARACTER_INTEGRATION.md).

Se deja una demostración independiente en `http://localhost:4173/`: semilla360, DOLEA2★ desplegado, oro4, listo para combatir. El guardado anterior de `http://127.0.0.1:4173/` conserva ronda6 y oro15.
