# F0-P8B · Informe de cierre

## 1. Git y base

Rama `codex/f0-p8b-item-catalog`, creada desde `f3cb2f0` (F0-P8A). Se conservaron los archivos personales sin seguimiento, imágenes originales, `Sprites/`, `.21st/` y `output/`. No se ha hecho push ni despliegue; tampoco se reiniciaron los servicios normales del usuario.

Se auditaron contratos, inventario, estadísticas, recetas, política de reparto, snapshots y autoridad. Baseline ejecutado: **867 correctas y 6 omitidas** por no pasar inicialmente la URL de PostgreSQL; total previo 873. La validación final sí utiliza la base aislada y ejecuta las pruebas de persistencia.

## 2. Referencia fijada

**TFT 14.1 / Set 10**, notas publicadas 09/01/2024. Selección verificada de ocho componentes estadísticos y 36 combinaciones en datos de cliente archivados. [Fuentes, procedencia, hash y diferencias](ITEM_BALANCE_REFERENCE.md). Se congelan hechos numéricos; no hay sincronización posterior ni recursos gráficos copiados.

## 3. Ocho componentes

| Categoría          | Bonificación            |
| ------------------ | ----------------------- |
| AD                 | +10 % relativo          |
| Velocidad          | +10 % relativo          |
| AP                 | +10                     |
| Maná               | +15 inicial             |
| Armadura           | +20                     |
| Resistencia mágica | +20                     |
| Vida               | +150                    |
| Crítico            | +20 puntos porcentuales |

AD/velocidad no son planos; maná no es regeneración. Crítico se limita a 100 %, sin conversión de exceso.

## 4. Matriz de recetas

36 pares no ordenados, ocho dobles, 36 resultados únicos y ningún placeholder en el catálogo P8B. A+B y B+A tienen la misma clave; A+A exige dos instancias distintas. [Matriz completa](ITEM_CATALOG.md#matriz-de-36-recetas).

## 5. Definiciones de objetos

Cada resultado `item-forge-*` declara receta, estadísticas totales, categoría funcional, operaciones y condiciones, temporización, objetivos, acumulación, restricciones, versión, iconKey y etiqueta accesible. Las descripciones son originales y generadas desde los datos. No se muestran nombres oficiales. [Las 36 fichas técnicas](ITEM_CATALOG.md#definiciones-completas).

## 6. Efectos y restricciones

Operaciones de diseño tipadas, separadas de la ejecución: escudos, curas, críticos de habilidad, maná, resistencias, daño condicionado, quemadura/herida, auras, acumulaciones, proyectiles, inmunidad, intangibilidad y objetos aleatorios. Política por efecto separada de unicidad del objeto y suma de estadísticas. Los resultados de tres ranuras siguen bloqueados hasta implementar esa restricción especial.

No se conectan efectos especiales al combate ni a Phaser. Se distinguen recepción de ataque, daño propio, aura mantenida e intervalo de aplicación frente al de daño de quemadura.

## 7. Compatibilidad del motor

[Tabla por objeto](ITEM_EFFECT_COMPATIBILITY.md): directo, configuración, ampliación de efectos, nueva mecánica o decisión pendiente. Los componentes son compatibles; el resultado de vida pura usa modificadores existentes. Los otros 35 objetos requieren trabajo adicional.

## 8. Pendientes P8C

Ejecutor genérico con fuentes, señales y protección de recursión; precedencia de escudos/umbrales/muerte; maná máximo; auras y reducción de resistencias; crítico de habilidades; quemadura/herida; ataques secundarios; selección determinista; inmunidad y limpieza. Se mantienen explícitas las ambigüedades de pool/pesos aleatorios, expiración de escudo, ajuste de vida, filas y límite temporal de acumulación. No se han inventado valores para resolverlas.

## 9. Integración con P8A

Se conservan dos bandejas de 16, pendientes, tres ranuras, propiedad, concesiones, IDs, componentes consumidos, equipamiento, fusiones, ventas, journal y recibos. Solo se cambia la resolución explícita del catálogo y la preparación del maná inicial. Intentar conceder o fabricar un resultado bloqueado no consume materiales ni cambia el estado.

## 10. Versionado y persistencia

Nuevas partidas locales/DEV/privadas: `f0p8b-14.1-1`. Laboratorio explícito: `f0p8b-14.1-lab-1`. Configuración y versión de inventario deben pertenecer a la misma familia. Versiones desconocidas y cruces se rechazan, sin fallback silencioso.

Huella autoritativa P8B: `082b6bdf5fb3d91865720fa0b919fd3222347d92e8ad96f8e52b532c24267d72`.

Las tres huellas históricas P6B3/P6C/P8A están fijadas por pruebas literales y permanecen intactas. No se añaden tablas ni migraciones. Pruebas de roundtrip de autoridad para P8A y P8B; recuperación real de inventario P8B con PostgreSQL y SIGKILL, conservando equipo, pendientes y recibos duplicados.

## 11. DOLEA, VARGAS y JARAMILLO

Pruebas de AD porcentual y maná inicial con los tres personajes; consumo tras lanzamiento sin reentregar maná inicial, perfiles originales sin mutación y combate determinista. Kilómetros se aplica una vez antes del porcentaje de objeto. No cambia el balance de los personajes ni la ejecución de sus escudos, pasivas, saltos, proyectiles, FUMÓN o Trotamundos. Crítico y velocidad conservan sus límites.

## 12. Validación final

- `PERSISTENCE_TEST_URL=postgresql://127.0.0.1:55439/tft_persistence_test pnpm check`: correcto.
- TypeScript y ESLint: correctos.
- **1004/1004 pruebas correctas**, 74 archivos, **0 omitidas**, 81,26 s de tests. Incluye seis pruebas PostgreSQL aisladas y recuperación real tras SIGKILL.
- 131 pruebas nuevas: componentes, recetas, cifras de las 36 operaciones, temporización, disponibilidad, atomicidad, personajes, porcentajes, maná, laboratorio, fuentes y snapshots históricos.
- Build cliente y servidor: correctos. Aviso no bloqueante de tamaño de chunks documentado.
- `pnpm verify:public`: correcto; sin controlador, panel, esquema de comandos ni almacenamiento DEV en el bundle público.
- Evidencias locales: `artifacts/p8b/check.log`, `public.log`, `baseline.log`, `validation.json` y `catalog.json`, excluidas de Git por la política existente.

## 13. Problemas y límites encontrados

- El JSON de referencia contiene claves antiguas/no usadas; se registran como no interpretadas en vez de convertirlas en habilidades ficticias.
- Los identificadores históricos de Riot no siempre describen la mecánica de 14.1; se usan exclusivamente para trazabilidad interna.
- La fórmula existente de porcentajes de vida se conserva. En laboratorio, vida pura es `base + 600 + floor(base × 0,08)`, diferencia declarada frente a otras posibles composiciones.
- No se afirma equivalencia ejecutable completa con TFT: los efectos especiales están reservados y las decisiones pendientes son visibles.
- Vite mantiene el aviso de tamaño de chunks superior a 500 kB; la compilación termina correctamente. No se ha emprendido una reorganización de bundles fuera del alcance.

## 14. Disponibilidad competitiva

**Los 36 objetos completos están desactivados por defecto.** Solo el objeto estático de vida está disponible en laboratorio local explícito, junto a los componentes. Ningún resultado incompleto se puede recibir como funcional. El reparto 2/3 componentes, 50/50, cada tres rondas continúa desactivado y no consume RNG.

## 15. Siguiente paso exacto

F0-P8C: cerrar las decisiones documentadas, implementar y probar la ejecución universal de efectos, y habilitar de forma versionada solo objetos íntegros. El reparto queda para P8D. **No se ha iniciado ninguna de esas fases.**
