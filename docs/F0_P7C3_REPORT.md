# F0-P7C.3 — Informe de implementación

## 1. Modelo competitivo

Identidad estable, avatar, HP y nivel públicos; `competitiveState` alive/eliminated independiente de `connected`; `spectating` como modo adicional del eliminado. Ronda de eliminación, HP previo, daño y puesto se conservan. Una desconexión no elimina ni una recarga resucita.

## 2. Eliminaciones

Se resuelven todos los duelos antes de confirmar el conjunto de HP cero. La liquidación utiliza un ID único por ronda; HP limitado a cero y eliminación irreversible. Las recompensas ordinarias de la ronda que termina se liquidan una vez, sin recompensa adicional por eliminación. No hay ingresos posteriores. [Reglas](ELIMINATION_RULES.md).

## 3. Desempates

Mayor HP previo, menor daño efectivo y puesto compartido si ambos coinciden. Sin identidad, conexión ni azar como criterio. Con daño limitado a HP, el segundo criterio suele ser redundante para eliminados. [Ejemplos](FINAL_STANDINGS.md).

## 4. Clasificación

Puestos autoritativos de competición, con huecos tras empates. Vivos primero; eliminados según ronda y criterio competitivo. React presenta los puestos del servidor. El final conserva copia de todos los participantes.

## 5. Reemparejamientos

Solo vivos: cuatro → dos duelos; tres → humano y fantasma de un superviviente; dos → duelo directo; uno o ninguno → final. Historial previo conservado. El fantasma no consume copias ni puede proceder de un eliminado.

## 6. Pool y economía

Devolución única de tablero, banquillo y ofertas reservadas; estrellas devuelven sus copias equivalentes. Se vacía inventario sin venta ni pago. Conservación comprobada, incluidos fusionados3★. Los eliminados quedan fuera de ofertas, compras, ventas, movimientos, XP y futuras liquidaciones.

## 7. Espectador

Entrada tras eliminación, selección de duelo humano/fantasma, clasificación y reloj globales, inspección de unidades y habilidades. Servidor valida sesión, eliminación, partida, fase, duelo y secuencia. Solo libera frames ya alcanzados, sin RNG, semilla ni traza futura. Cambio de duelo descarta frames antiguos. [Contrato y límites](SPECTATOR_MODE.md).

## 8. Resultados y experiencia

Panel de eliminación con puesto/ronda, Espectar y Salir; pantalla final con ganador y avatar, todos los puestos, HP, ronda de eliminación y puesto propio. Igualdad exacta se muestra como primer puesto compartido. Volver al menú probado con servidor conectado. Se conserva Neon Playground, sprites y Mar de Cristal. Se corrigió el cálculo de reserva de banquillo oculto y el ancho del botón final.

## 9. Red

`f0p7c3-1`: CompetitiveSnapshot, FinalResults, SpectateRequest y SpectateFrame. Los cambios de estado competitivo viajan en snapshot; `spectate_duel`, `spectate_snapshot` y `final_results` son mensajes nuevos. El evento final se envía una vez por conexión y su contenido sigue disponible en snapshots. El replay propio de vivos conserva su contrato anterior. [Protocolo](SERVER_PROTOCOL.md).

## 10. Automatización

Baseline previo: 760 tests/56 archivos, tipos, lint y build correctos. Suite ampliada: 773 tests/58 archivos. Incluye cierre2/3/4, ya eliminado a cero, clasificaciones compartidas, secuencia4→3→2→1, pool de fusionados/reservas, privacidad, cambio de duelo, rechazo de acciones, reloj detenido y resultado inmutable. Las pruebas existentes se mantienen; la expectativa del final provisional cambia al comportamiento competitivo solicitado. Sin cambios en motor de combate, balance ni daño.

## 11. Multijugador

Tres escenarios SDK independientes de2,3,4 clientes y reloj controlado recorren el cierre completo. En navegador, cuatro conexiones fixture jugaron seis rondas: Vargas4.º en ronda1, Florin3.º en ronda4, Nora2.ª en ronda6, Alex1.º con100HP. Se observaron ambos duelos a tres vivos, se inspeccionó DOLEA y se llegó al duelo final. Escenario adicional2 con muerte simultánea e igualdad exacta. Son fixtures locales con verificación de identidad inyectada, no cuatro cuentas reales Supabase ni cuatro amigos. La autenticación de producción no se sustituye.

## 12. Capturas y revisión

Evidencias en `.impeccable/review/p7c3/`:

| Archivo              | Contenido                                  | Tamaño    |
| -------------------- | ------------------------------------------ | --------- |
| elimination-1280.png | Eliminación y clasificación provisional    | 1280×720  |
| spectator-1280.png   | Selector y combate fantasma                | 1280×720  |
| inspection-1280.png  | Ficha de DOLEA observada                   | 1280×720  |
| final-duel-1280.png  | Dos supervivientes                         | 1280×720  |
| tie-1280.png         | Clasificación compartida                   | 1280×720  |
| tie-1366.png         | Clasificación compartida                   | 1366×768  |
| tie-1440.png         | Clasificación compartida                   | 1440×900  |
| victory-1920.png     | Victoria y clasificación de cuatro         | 1920×1080 |
| tie-2560.png         | Clasificación compartida                   | 2560×1440 |
| results-794.png      | Resultado del segundo, cobertura adicional | 794×850   |

Tamaños comprobados en los PNG; resultados en los cinco tamaños solicitados y sin scroll de documento medido. No se afirma que cada estado se haya probado en cada tamaño. El reloj de la fixture se adelanta y se congela manualmente: en capturas de duelo, la interpolación local puede mostrar tiempos que no corresponden a la duración normal. La simulación y autorización de frames usan el reloj del servidor. No se cambiaron tiempos normales para la prueba.

Detector de diseño: sin hallazgos. Revisor independiente: `ship` para las correcciones puntuadas (botón y matriz de capturas); no representa otra auditoría completa posterior. Documentador confirma extensión coherente y preserva DESIGN.md/sidecar. PRODUCT.md conserva una descripción de fase antigua detectada antes de esta tarea; se informa como desfase preexistente, sin repararlo fuera del alcance.

## 13. Limitaciones

Sin reconexión completa, persistencia tras reinicio, espectadores externos, ranking permanente, premios ni despliegue. Estado final disponible mientras vive la sala, con limpieza a cinco minutos y límite general de una hora. Espectadores reciben ticks, no replay completo; no hay recuperación del buffer al recargar. Las pruebas nuevas de red usan identidades fixture; no se repitió en esta fase el flujo de correo/contraseña de Supabase. El build conserva el aviso de chunks grandes de Phaser/aplicación.

## 14. Git y preservación

P7C.2 preservada mediante commit revisado `0f2dfaf`. P7C.3 queda como cambios locales revisables en `codex/f0-p7a-authoritative`. Recursos originales y archivos ajenos sin tocar. Sin remoto nuevo, push ni despliegue. Los cambios abarcan autoridad, contratos, cliente, HUD, pruebas y documentación. No se modifica el motor interno de combate.

## 15. Preparación para la siguiente fase

Quedan establecidos identificador de finalización, clasificación inmutable y frontera pública del espectador para ampliar después. F0-P7D no se ha iniciado. Reconexión, persistencia, operación pública y espectadores externos requieren un encargo posterior.
