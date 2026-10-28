# F0-P6B.3 — VARGAS y Modo Desarrollador

23 de octubre de 2026. Alcance exclusivo de esta fase. Nueva partida: catálogo `f0p6b3`, reglas `f0p6b3-1`. Las versiones anteriores permanecen disponibles.

## 1. Integración de VARGAS

VARGAS es jugable: coste 3, asesino físico cuerpo a cuerpo, alcance 1. Figura en tienda, compra, venta, banquillo, tablero, fusiones, inspector, combate y recuperación. Los escenarios de Arena permiten probar las tres estrellas y sus sinergias. No se añadieron otros personajes comerciales.

## 2. Estadísticas y escalados

| Base                          |        Valor |
| ----------------------------- | -----------: |
| Vida / AD / AP                | 700 / 70 / 0 |
| Ataques por segundo           |         0,80 |
| Armadura / resistencia mágica |      25 / 25 |
| Probabilidad / daño crítico   | 20 % / 150 % |
| Maná inicial / máximo         |       0 / 70 |

El escalado general de estrellas se aplica una vez: vida 700/1260/2268 y AD 70/126/226. Valores provisionales, no balance definitivo.

## 3. Copita Perhaps

Una habilidad mixta, presentada con pasiva y activa. **Resaca Controlada** gana una acumulación por básico confirmado, con +4 % AS por acumulación. A cinco consume todas, cura 5 % de vida máxima efectiva y concede +20 % AS durante 30 ticks. El nuevo ciclo puede coexistir con ese aumento temporal. El inspector muestra el estado efectivo. No hay excepciones por nombre de personaje en el motor.

## 4. Blackhaus RPP

Activa automática a 70 de maná. Daño físico de 280/420/700 % del AD efectivo; cura 15/20/30 % del daño realmente aplicado a vida, excluyendo escudos y exceso. Después del daño concede +25/35/50 % AS durante 30/40/50 ticks. Crítico desactivado por datos; no genera Resaca. La recuperación respeta muerte, vida máxima y Overtime.

## 5. UPM

Miembros distintos desplegados: 2 conceden +100 HP y +20 AP; 4 añaden curación del 4 % por activa natural; 6 potencian cada tercer lanzamiento individual al 150 % y ejecutan una repetición gratuita al 50 % original. Esta no consume/genera maná ni incrementa contadores ni desencadena recursión.

**Créditos** presenta el contador existente de lanzamientos naturales por unidad. Se registra desde el primer umbral activo, incluso sin reglas dinámicas elegibles. Los perfiles ficticios de diagnóstico quedan fuera del catálogo, pool y tienda.

## 6. EL DEPREDADOR

Se activa 1/1 al desplegar VARGAS; el banquillo no cuenta. Cada eliminación atribuida cura 5 % y concede +5 AD. Las eliminaciones posteriores a dos marcas curan otro 5 %; al alcanzar cuatro obtiene +15 AD una vez; las posteriores a seis pueden iniciar salto y básico inmediato. Por tanto, la curación adicional comienza en la tercera y el salto en la séptima. Los umbrales solicitados permanecen intactos. Se reutilizan presupuestos de linaje, reservas de ocupación y cancelaciones.

## 7–9. Importación, procedencia y fallbacks

**Los cinco fotogramas suministrados son oficialmente de Nivel 2 / 2★.** Son PNG RGBA de 1254 × 1254 con alfa real; ninguno de estos cinco tiene un damero opaco. No había archivos VARGAS anteriores en `Sprites/` ni una fuente denominada `Vargas_Atk_1y5.png`; no se inventó una interpretación de ese nombre.

Orden inspeccionado: guardia → anticipación → giro → extensión → recuperación. Se conservan los adjuntos originales y copias canónicas byte a byte, con correspondencia y SHA-256 en [PROVENANCE.json](../Sprites/vargas/PROVENANCE.json). No se generaron poses nuevas.

El pipeline produce una sola hoja y retrato nativos en `star2`. 1★ y 3★ referencian explícitamente esa apariencia; sus estadísticas siguen siendo las de su estrella lógica. Los estados pendientes idle/walk/ability/death resuelven al ataque disponible sin producir daño por animación. Los recursos nativos futuros tienen prioridad y solo requieren importar arte y actualizar metadatos. No cambia el fallback de DOLEA.

## 10. Evidencia visual

![VARGAS, inspector y HUD con herramientas plegadas](../artifacts/p6b3/final-1920.png)

Las capturas son evidencia local, ignorada por Git. Se capturó el [HUD anterior](../artifacts/p6b3/before-1920.png), el resultado nuevo y la [build pública sin acceso DEV](../artifacts/p6b3/public-without-dev.png).

| Resolución  | HUD y herramientas plegadas           | Panel DEV abierto                     | Ofertas / scroll de página |
| ----------- | ------------------------------------- | ------------------------------------- | -------------------------- |
| 1920 × 1080 | [HUD](../artifacts/p6b3/hud-1920.png) | [DEV](../artifacts/p6b3/dev-1920.png) | 5 / ninguno                |
| 1440 × 900  | [HUD](../artifacts/p6b3/hud-1440.png) | [DEV](../artifacts/p6b3/dev-1440.png) | 5 / ninguno                |
| 1366 × 768  | [HUD](../artifacts/p6b3/hud-1366.png) | [DEV](../artifacts/p6b3/dev-1366.png) | 5 / ninguno                |
| 1280 × 720  | [HUD](../artifacts/p6b3/hud-1280.png) | [DEV](../artifacts/p6b3/dev-1280.png) | 5 / ninguno                |
| 2560 × 1440 | [HUD](../artifacts/p6b3/hud-2560.png) | [DEV](../artifacts/p6b3/dev-2560.png) | 5 / ninguno                |

[Mediciones DOM](../artifacts/p6b3/viewport-measurements.json): documento igual al viewport; panel con scroll interno. La revisión visual independiente encontró un solapamiento del acceso DEV plegado con el cierre del inspector en tamaños pequeños. Se corrigió ubicándolo en navegación; la recomprobación de esa corrección terminó con disposición «ship». Ese veredicto es específico de la revisión visual, no una certificación general del motor.

Navegador real: oferta VARGAS, compra por 3 de oro y colocación; tres estrellas simultáneas; inspector y sinergia 1/1; oro/nivel y generación de 3★ desde DEV; combate automático, liquidación única y recuperación; diagnósticos y DOLEA. Evidencias adicionales:

- [Tres estrellas](../artifacts/p6b3/vargas-all-stars.png).
- [Consumo de Resaca](../artifacts/p6b3/resaca-threshold.png): cinco consumidas, curación y aumento temporal.
- [UPM 6 y repetición](../artifacts/p6b3/upm-six-repeat.png): tercer lanzamiento individual y Créditos.
- [Cadena de Depredador](../artifacts/p6b3/depredador-chain.png): ocho eliminaciones, AD 125 y salto.
- [Regresión DOLEA](../artifacts/p6b3/dolea-regression.png).

Se reprodujo un fallo real al recuperar DEV desde otra sesión: calibración antes de inicializar gráficos Phaser. La disponibilidad se vincula ahora a la identidad de la escena preparada. Cuatro recuperaciones normal→DEV y una vuelta Arena→local posteriores no produjeron errores nuevos; [registro](../artifacts/p6b3/lifecycle-check.json).

## 11. Modo Desarrollador

Acceso local discreto; crea o recupera una partida `dev-*` marcada permanentemente como prueba. Panel flotante plegable, con desplazamiento interno y botones del HUD. Permite oro (+10/+50, cantidad, máximo, inicial), nivel 2–7, XP, vida de ambos bandos, cualquier personaje/estrella del catálogo, banquillo/celda, retirada y formaciones; pausa/reanudación, avance seguro, duraciones de prueba, repetición y reinicio de semilla. Diagnóstico con versión, ID, fase, ronda, reloj, liquidación e historial de acciones identificadas.

Controlador separado con comandos tipados y validados, transacciones atómicas e invariantes; React no muta la partida. Auditoría con origen/resultado/revisión e idempotencia. Guardado y checkpoint aislados; volver a normal no importa cambios. La build pública elimina panel, controlador y contrato de comandos DEV, comprobado sobre sus JS generados. No se implementa autorización de servidor en esta fase.

## 12. Economía y pool

VARGAS conserva las 18 copias de coste 3 y las probabilidades existentes. Generación DEV reserva copias reales: 1/3/9 por estrella. Compra y ofertas también contabilizan reservas; fusión conserva copias; retirada/venta las devuelve. Se rechazan operaciones completas si no hay copias, hueco o capacidad. El ledger DEV requiere marca de prueba; los ajustes de vida se contabilizan sin falsificar daño de rondas. No se alteran oro inicial, costes, tiempos ni tablas de la partida normal.

## 13. Pruebas ejecutadas

Auditoría inicial: **531 pruebas correctas** y tipos, lint y build. Resultado final: **601 pruebas correctas en 40 archivos**, manteniendo las anteriores y añadiendo 70 casos. `pnpm check` completo correcto, `pnpm verify:public` correcto y build local de pruebas correcta. La prueba de importación física conserva sus aserciones y permite 20 segundos para procesar ahora tres clips/21 fotogramas.

Cobertura nueva: estadísticas/escalados, activa y daño efectivo, escudos/exceso/muerte, crítico/Overtime, ciclos de Resaca, UPM 2/4/6 y Créditos individuales, atribución/umbrales/salto/linaje, catálogo/compra/fusión/venta, procedencia/fallback futuro/sin duplicados y transacciones DEV/pool/guardado/idempotencia/vida/XP/rondas. El aislamiento se comprueba también sobre estados normales que no cambian al ejecutar comandos DEV.

## 14. Compatibilidad histórica

F0-P6B.2 ya estaba preservada en `ed09b3b`. Se capturaron 14 hashes de trazas B2 antes de modificar y siguen iguales; permanecen las regresiones previas. Catálogos y reglas históricos se conservan. El manifiesto DOLEA coincide con el original al comparar JSON. Una partida histórica se recuperó en el navegador; no recibió unidades ni recursos DEV. Su reloj avanzó naturalmente al reanudarla, por lo que esa observación no se presenta como igualdad byte a byte de almacenamiento normal.

## 15. Límites conocidos

- Balance provisional. UPM potencia importes, no duraciones, siguiendo B2; una repetición con la misma clave refresh puede reemplazar un aumento más fuerte por otro más débil. No se cambió esta política.
- Solo existe ataque nativo 2★ de VARGAS; faltan apariencias 1★/3★ y cuatro estados de animación. Las tres estrellas comparten temporalmente esos cinco fotogramas.
- UPM 2/4/6 requiere perfiles sintéticos en diagnóstico hasta ampliar el roster real.
- El overlay DEV abierto cubre parte del HUD derecho; plegarlo libera los controles normales. Edición económica/formación solo en preparación o antes de iniciar. Límite de auditoría: 10 000 intentos.
- La build conserva el aviso conocido de chunks grandes: aplicación pública ~562 kB y Phaser ~1367 kB antes de compresión. No es un error de compilación ni se abordó como fase de optimización.
- Validación visual de escritorio en los cinco tamaños indicados; no se afirma soporte móvil ni auditoría WCAG completa.

## 16. Git

Entrega mediante commit local `feat: integrate VARGAS and isolated developer mode`, en rama `codex/f0-p6b3-vargas-dev`. Sin push ni configuración de remoto. Se incluyen fuentes canónicas de VARGAS, derivados, código y documentación. Las imágenes originales sueltas y fuentes DOLEA previamente no seguidas se conservan fuera del staging. Capturas y registros locales permanecen ignorados.

## 17. Siguiente paso recomendado

Probar balance en partidas locales y preparar los recursos nativos pendientes de VARGAS 1★/3★. Su futura incorporación está documentada sin cambios en combate. No se inicia ninguna fase posterior.

Documentos de uso: [VARGAS_CHARACTER.md](VARGAS_CHARACTER.md) y [DEVELOPER_MODE.md](DEVELOPER_MODE.md). También se actualizaron los diez documentos técnicos solicitados y los informes generados del pipeline.
