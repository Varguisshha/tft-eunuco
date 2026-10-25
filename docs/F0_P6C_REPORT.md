# F0-P6C · Informe de integración de JARAMILLO

Validación final: 25 de octubre de 2026. Base estable P7D.2 `4b67386`; rama `codex/f0-p7a-authoritative`. Implementación local, sin remoto nuevo ni push.

1. **Definición jugable.** `jaramillo`, tercer personaje propio, coste 2, tirador de apoyo y alcance 3. Incluido en tienda, Arena, DEV y nuevas salas autoritativas mediante catálogo `f0p6c` y reglas `f0p6c-1`.
2. **Estadísticas y escalados.** 1★: 550 vida, 48 AD, 0 AP, 0,75 ataques/s, 20 armadura, 20 resistencia mágica, 10 % crítico y 150 % daño crítico, 0/70 maná. Escalado general existente por estrellas; bonificación de Kilómetros aplicada una sola vez.
3. **Trotamundos.** Victoria competitiva desplegado: +1 Kilómetro y +3 % AD, hasta 8/+24 %. Excluye empate, derrota, banquillo, DEV y victorias contra fantasmas.
4. **Progreso persistente.** Contrato v1 por instancia, idempotencia por ronda, fusión máximo con identidad superviviente, conservación en banquillo y limpieza al final. Snapshot P7D.2, JSONB y recuperación autenticada; sin otra tabla ni sistema paralelo.
5. **Cortina de Humo.** Proyectil activo a 70 maná: 160/240/400 % AD físico, sin crítico; reducción 15/20/30 % durante 40 ticks al impactar. Objetivo muerto antes de llegada: sin daño ni nube ficticia. Overtime usa el pipeline general.
6. **FUMÓN.** Icono original violeta y cigarro. Con 2 miembros: básicos reducen 8 % armadura durante 30 ticks. Con 3: 15 % y golpe adicional 60 % AD una vez por enemigo/combate, compartido por atacantes y sin recursión.
7. **Hortaleza.** DOLEA + JARAMILLO activa +100 vida (JARAMILLO 650 en inspector); valores anteriores preservados. El lateral indica Nivel 1 activo y 2/3 hacia el siguiente umbral.
8. **Pipeline.** Importación reproducible, 40 frames en 10 clips totales del proyecto, incluido cuerpo, recuperación y VFX de JARAMILLO. Alfa real, nearest-neighbor, límites de lienzo, anclajes y hashes verificados. Fuentes canónicas y procedencia en `Sprites/jaramillo`.
9. **Separación visual.** Cuerpo, cigarro y humo son entidades distintas. El cuerpo vuelve a recuperación/Idle mientras vuela el cigarro. Los frames 05–07 nunca se asignan al cuerpo. El reloj se muestrea; Phaser no emite daño.
10. **Capturas.** Secuencia real pausada desde Arena, semilla 42: Idle, Walk (150 ms), preparación (500), emisión (625), vuelo (700), impacto (825), retorno (1125), muerte (25925) y activa (6625). Galería enlazada debajo. Los tiempos sirven para este fixture, no son tiempos globales del juego.
11. **Pruebas.** `PERSISTENCE_TEST_URL=… pnpm check`: **831/831 pruebas, 67 archivos, cero omitidas**. TypeScript, ESLint y builds correctos. Incluye cinco pruebas PostgreSQL: SIGKILL con 2–4 jugadores, transacciones/permisos y progreso de seis Kilómetros recuperado con repositorio nuevo. `pnpm verify:public` confirma ausencia de herramientas DEV en el bundle público. Detector UI aplicado a inspector/controles: sin hallazgos. Queda el aviso de tamaño de chunk de Vite ya existente, sin error de build.
12. **Multijugador.** Reutiliza autoridad, comandos, liquidación y snapshots. Fingerprint histórico P7D.2 preservado exactamente, probado aparte; nuevas partidas usan el nuevo catálogo y guardados anteriores conservan sus reglas. No se cambia emparejamiento, reloj, economía individual, arena ni estadísticas de DOLEA/VARGAS.
13. **Validación y límites.** HUD revisado a 1440×900, 1920×1080 y 2560×1440, sin scroll del documento. Compra y venta real desde UI DEV: 999→997→999 oro, paso por banquillo; guardado normal conservado. Consola del diagnóstico sin errores. Arena técnica puede desplazar su página, por ser laboratorio. FUMÓN solo tiene un miembro real: umbrales 2/3 cubiertos con fixtures sintéticos. El contrato de entrega activa actual admite efectos core directos, no área/saltos/empoderamientos de proyectil; área y saltos se rechazan en la definición.
14. **Git y ejecución.** Cambios de esta fase preparados en la rama existente y registrados en commit local; fotos sueltas previas, .21st y otros archivos del usuario permanecen fuera. Web disponible en `http://127.0.0.1:4173`; servidor actualizado en 2567. Sin push ni inicio de otra fase.
15. **Recursos pendientes.** Confirmar evolución nativa de la apariencia y aportar evoluciones específicas 2★/3★ y Ability definitiva. Las tres poses limpiadas son derivados generativos, no copias exactas de píxeles. Se usan tres poses reales recibidas más recuperación, sin inventar la cuarta propuesta originalmente.

## Evidencias locales

Los PNG están en el directorio local de validación, excluido de Git conforme a la política existente del proyecto.

| Estado                      | Captura                                                |
| --------------------------- | ------------------------------------------------------ |
| Idle                        | [01](../artifacts/p6c/01-idle.png)                     |
| Walk                        | [02](../artifacts/p6c/02-walk.png)                     |
| Preparación                 | [03](../artifacts/p6c/03-preparacion.png)              |
| Emisión                     | [04](../artifacts/p6c/04-emision.png)                  |
| Cuerpo y proyectil en vuelo | [05](../artifacts/p6c/05-vuelo.png)                    |
| Impacto independiente       | [06](../artifacts/p6c/06-impacto.png)                  |
| Retorno a Idle              | [07](../artifacts/p6c/07-idle-retorno.png)             |
| Death                       | [08](../artifacts/p6c/08-death.png)                    |
| Cortina de Humo             | [09](../artifacts/p6c/09-cortina.png)                  |
| Inspector y Kilómetros      | [10](../artifacts/p6c/10-inspector-1920.png)           |
| Oferta comprable            | [11](../artifacts/p6c/11-tienda-activa.png)            |
| Hortaleza activa            | [12](../artifacts/p6c/11-tienda-12-hortaleza-1920.png) |
| Compra y banquillo          | [Compra](../artifacts/p6c/compra-banquillo.png)        |
| HUD portátil                | [1440×900](../artifacts/p6c/hud-1440.png)              |
| HUD monitor                 | [2560×1440](../artifacts/p6c/hud-2560.png)             |

Documentación principal: [personaje](JARAMILLO_CHARACTER.md), [ataques compuestos](COMPOSITE_ATTACK_ANIMATIONS.md), [progreso entre rondas](MATCH_PERSISTENT_UNIT_STACKS.md).
