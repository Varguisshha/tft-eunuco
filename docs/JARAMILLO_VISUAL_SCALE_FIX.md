# JARAMILLO — ajuste visual local

Se reduce un 20 % la escala del cuerpo de JARAMILLO en sus tres evoluciones.
La normalización común de 384 píxeles trataba sus poses anchas y agachadas como
si fueran las siluetas erguidas de referencia. El ajuste de presentación pasa
de 64 a 51,2 píxeles de altura corporal de referencia, antes de perspectiva,
zoom y multiplicador visual del tablero.

El importador conserva esta calibración al regenerar los recursos. El
manifiesto actual aplica la misma escala al ataque, recuperación y poses de
respaldo. El origen del lanzamiento se reduce proporcionalmente alrededor del
apoyo de los pies. No cambian los píxeles originales, los atlas derivados, el
tamaño del proyectil, sus tiempos ni el anclaje de impacto.

Los manifiestos de los demás personajes y el manifiesto histórico permanecen
idénticos. No se modifican reglas, estadísticas, alcance, partidas guardadas ni
fingerprints. Sin operaciones en Railway, GitHub o Supabase.

Validación:

- 31 pruebas de assets, reproducción compuesta y adaptador real de renderizado.
- Regresión del tamaño visible en todos los fotogramas y los tres niveles.
- Pies, perspectiva, escala uniforme y orientación en ambas arenas, incluyendo
  ataque, habilidad, recuperación y poses de respaldo.
- TypeScript, ESLint y build LOCAL correctos.
- Comparación en navegador de los tres niveles en Mar de Cristal y Cafetería,
  a 1280 × 720, con cuerpos y proyectiles visibles durante el combate pausado.
- Capturas locales ignoradas en `artifacts/jaramillo-scale/`.

La revisión visual utiliza una partida de laboratorio aislada; no altera la
partida que el usuario tenga abierta.
