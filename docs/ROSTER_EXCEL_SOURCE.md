# F0-P10A · origen verificable del roster

Fuente real: `/Users/vargas/Downloads/Copia de TFPeru.xlsx`. Copia íntegra de auditoría: `TFPeru/Copia de TFPeru.xlsx`.

SHA-256: `101728c60d45312cd98776087ba17f3636e798ab2e0265ed0f65b26ece6791eb`.

Se leyó la única hoja, Hoja1, incluidas sus filas vacías/formateadas. Los encabezados B1:AI1 contienen 34 personas. A3:A18 define 16 colectivas y B3:AI18 las 544 celdas Si/No. A27:B30 contiene cuatro atributos únicos. No hay asignaciones vacías, valores inesperados ni IDs duplicados en estas regiones. Las filas separadoras vacías no son errores de pertenencia.

`packages/game-data/src/roster-excel-source.json` conserva todas las coordenadas, valores originales, pertenencias y propietarios de únicas. El importador lee todas las hojas y rechaza fórmulas, asignaciones inesperadas, propietarios ausentes y IDs duplicados. Usa únicamente la biblioteca estándar de Python, sin modificar el libro:

```sh
python3 scripts/roster/import_excel.py --check
# Regeneración explícita después de sustituir/revisar una fuente:
python3 scripts/roster/import_excel.py --source 'TFPeru/Copia de TFPeru.xlsx'
```

La ruta de procedencia registrada corresponde al archivo recibido en esta fase; `--source` cambia la entrada de lectura, no la atribución histórica. Toda actualización del Excel requiere revisar el manifiesto y crear una nueva versión; nunca alterar el catálogo histórico.

Datos del Excel: identidades, etiquetas, membresías y cuatro únicas. Decisiones de la tarea: Erik→jaramillo, nombres visibles DOLEA/VARGAS/JARAMILLO/FLORIN, IDs normalizados, umbrales, separación de borradores y migración provisional 3→4. El Excel no aporta estadísticas, costes ni habilidades.

El antiguo `TFPeru.xlsx` de 18 personas no es la fuente P10A. No se modifica ningún original, sprite, splash art ni Mar de Cristal.
