# F0-P6B.4 — Game Experience & Visual Polish

## 1. Dirección aplicada

Carbón, jade profundo, latón envejecido y marfil. Se evoluciona el HUD existente mediante geometría original, capas metálicas y jerarquía de juego de PC. Referencias visuales reales TFT PC y Songs of Conquest analizadas; fuentes y criterios en [GAME_VISUAL_SYSTEM.md](GAME_VISUAL_SYSTEM.md). Mar de Cristal conserva la imagen, encuadre, proyección y banquillo superpuesto.

## 2. Componentes

Nuevos GameCounter, GameIconButton y CombatCounter v1; ampliados GameFrame y GameIcon, reutilizado GameButton y sus confirmaciones. Shop, TraitRail, UnitInspector, economía, clasificación, reloj y consola comparten acabado. Sin bibliotecas visuales nuevas.

## 3. Tarjetas

Cinco fichas simultáneas, arte proporcional dominante, sinergias inferiores sobre el nombre y precio derecho con moneda. Una/dos sinergias según datos. DOLEA/VARGAS usan sus recursos existentes; prototipos señalan rasgos provisionales. Estados de reserva, compra, intención, saldo insuficiente y fase cerrada conservan la lógica anterior.

## 4. Botones

Silueta escalonada, SVG de doble marco, remates, placa interior y pictogramas originales. Hover ilumina; pressed desplaza discretamente; foco combina borde/subrayado; active representa reserva. Se conserva extensión onCue sin audio. Compra, XP y renovación mantienen confirmaciones breves; reduced-motion evita movimiento no esencial. Zoom/cierre reutilizan GameIconButton.

## 5. Contadores

Eliminaciones atribuidas, lanzamientos naturales, stacks, progreso UPM y activaciones de pasivas proceden del snapshot. Resaca presenta 0–5, bonus por acumulación y bonus temporal con duración; Depredador separa kills, acumulaciones y membresía, muestra hitos2/4/6 y sus efectos. Valor7 no se representa como7/6: objetivo visual y máximo son campos diferentes. Futuras fuentes de ataques/cargas se conectan al adaptador cuando existan datos autoritativos; el renderer es común.

## 6. Escala

Comparación original/+20/+30/+40, con pies constantes y formación igual. Elegida +40% para sprites reales en Mar de Cristal. Ambos cuerpos ya están normalizados a64 en el pipeline; el mismo factor es adecuado para estos dos recursos, no una obligación para futuros personajes. Sin crecimiento por estrellas. Huellas de input anteriores, profundidad, orientación y proporción preservadas; barras/sombras adaptadas. No cambian hexágonos, targeting, alcance ni A\*.

## 7. Capturas

Evidencia local en `artifacts/p6b4/`, ignorada por Git:

| Evidencia                    | Archivo                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Antes1920                    | before-1920.png                                                                |
| Después, cinco tamaños       | after-1280.png, after-1366.png, after-1440.png, after-1920.png, after-2560.png |
| Comparación de escalas       | scale-1.png, scale-1.2.png, scale-1.3.png, scale-1.4.png                       |
| Comparación densa            | dense-1.png, dense-1.2.png, dense-1.3.png, dense-1.4.png                       |
| Densidad y combate           | dense-final.png, dense-combat.png, combat-4v4.png                              |
| Inspector local seleccionado | vargas-inspector.png, combat-1280.png, combat-1366.png                         |
| Consumo/salto/overtime       | resaca-consumption.png, depredador-jump.png, overtime.png                      |
| Controles                    | controls-locked.png, control-pressed.png, dev-controls.png                     |
| Medidas finales              | layout-measurements.json                                                       |

Las capturas de Arena son páginas técnicas con scroll, no el HUD jugable. Las cinco capturas after corresponden al HUD sin scroll de página. Los escenarios sintéticos de overtime conservan valores diagnósticos propios; no son cambios de balance. Las primeras comparativas de escala muestran etapas intermedias de etiquetas; las capturas actuales de contadores prevalecen.

## 8. Densidad y navegación

Fixtures4v4 y8v8 con perfiles reales DOLEA/VARGAS y tirador provisional: simulación válida, sin celdas duplicadas. Revisados combate cercano, barra/escudo, reproducción, salto y overtime. El escenario8v8 no aumenta el límite de unidades de la partida. Hay oclusión natural entre filas agrupadas; no se cambian coordenadas para ocultarla. A720p se accede a todas las sinergias mediante desplazamiento interno, independiente de participantes y avisos. A1366×768 caben las cuatro filas durante el combate capturado. Arrastre de VARGAS confirmado por «Formación actualizada»; selección abre inspector sin reencuadrar arena.

## 9. DOLEA

Arte, clips, perfiles, escudo y habilidad preservados. Retrato real comprobado en tienda; compra con bloqueo conservado y selección contextual. Se mantienen apariencias/fallbacks históricos. No se modifica contenido ni estadísticas.

## 10. VARGAS

Arte real, estrellas y habilidad preservados. Traza Depredador: tick49 registra consumo0/5 y+20% durante3.0s; tick64 registra7 eliminaciones, umbrales2/4/6 alcanzados y salto en curso. Inspector del HUD y del laboratorio muestran lecturas del estado. Los overlays no producen daño ni activaciones.

## 11. DEV

Prueba con guardado aislado, formación mixta, oro, compra/XP, control de fase, pausa y recuperación. XP60→56 oro; compra DOLEA56→54; renovación54→52. Bloqueo confirmado activo y compra permitida. Consola conserva herramientas existentes. verify:public confirma ausencia del controlador, panel, esquema de comandos y almacenamiento aislado en bundle público. Se recuperó el guardado normal existente; no hubo migración de formato.

## 12. Resultados

Baseline:601 pruebas en40 archivos. Final: **614 pruebas en41 archivos**, con typecheck, lint y build correctos. Las601 previas no fueron modificadas.13 nuevas verifican contadores, consumo/duración, atribución, UPM, render semántico, tarjetas y escalas/fixtures. Verificación pública correcta; build local correcto; git diff --check correcto. Consola del navegador consultada sin errores.

Matriz real1280×720,1366×768,1440×900,1920×1080,2560×1440: cinco tarjetas y altura de documento igual al viewport. Interacciones probadas: compra, XP, renovación, bloqueo, selección, arrastre, apertura/cierre y pulsación de control. Los estilos hover/pressed/focus se inspeccionaron en código y la pulsación real se capturó; no se declara una auditoría completa por combinación de control y estado.

Revisión independiente inicial: `fix` por lateral720p, evidencia de combate incompleta y documentación obsoleta. Tras correcciones y recapturas: `ship`, los tres hallazgos puntuados resueltos. Este veredicto cubre las correcciones, no constituye una segunda auditoría completa. Detector mecánico: sin hallazgos; revisión21st: información sobre colores literales, sin bloqueo.

## 13. Límites

Validado en el navegador integrado de escritorio; sin matriz Safari/Firefox ni dispositivos físicos. Reduced-motion verificado en implementación, sin modificar la preferencia del sistema operativo. No hay benchmark exhaustivo de rendimiento. Persiste aviso conocido de bundles grandes. En pantalla baja el inspector y sinergias pueden requerir scroll interno; la página no. Las apariencias/clips artísticos pendientes de P6B.3 siguen pendientes, sin inventar recursos. El roster provisional conserva diferencias de acabado frente a DOLEA/VARGAS.

## 14. Git

Base auditada a80a8ab. Rama local `codex/f0-p6b4-game-experience`. Se incluyen exclusivamente código y documentación de esta fase; originales PNG ajenos y archivos locales de herramientas no se incorporan indiscriminadamente. Sin configuración de remoto ni push. Reglas/catálogo siguen f0p6b3-1/f0p6b3. El hash del cierre se comunica junto al informe.

## 15. Próximo paso

Probar partidas con el HUD terminado y recoger preferencias concretas de legibilidad; después priorizar los recursos artísticos pendientes. No se inicia ninguna fase posterior, multijugador, objetos, aumentos ni cambios de balance.
