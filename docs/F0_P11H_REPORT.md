# F0-P11H · Objetos, tooltips y compras en combate

Entrega exclusivamente LOCAL. Base de cierre P11G: `15a24cce1a0db57f02d4838ecd217557ec5c4d2a`. Rama aislada `codex/f0-p11h-item-completion`, worktree `/Users/vargas/.codex/worktrees/p11h-item-completion/TFT EUNUCO`. Se conserva el trabajo previo; no se inicia otra fase.

## Resultado y alcance de fidelidad

Contenido/economía `f0p11h-1`, combate `f0p11h-1`, objetos `f0p11h-18.5-1`, fingerprint autoritativo propio. Conserva personajes, sinergias, recetas, odds, reparto3/6/9, pool, Mar de Cristal, splash arts y HUD Festival Pop × Neon Playground. Se comparan las12 huellas históricas con la base y se añaden regresiones literales B/C/G; se mantienen lectores, fingerprints y reglas B/C/G; no hay migración destructiva de partidas históricas.

**32 de36 completos habilitados.** Mejora roja y Verdugo de gigantes se resuelven mediante deltas oficiales y reconstrucción documentada. Sterak, Guantes de ladrón, Mangual y Sable-pistola siguen bloqueados: faltan respectivamente curva, distribución, refresco/expiración y conflicto de curación. El arte no los habilita. [Auditoría individual36, valores, fuentes y diferencias](ITEM_FIDELITY_AUDIT.md).

No se declara fidelidad íntegra al servidor propietario de TFT18.5. Se hacen explícitas las decisiones de anfitrión sobre ticks, verdadero, procs secundarios, curación, pesos de Mano de la justicia, mínimo de maná y precedencia personal de crítico. No se inventa curva de Sterak ni pool de Guantes para completar una cifra.

## Ejecución y descripciones

- Chispa iónica muestra150 % del maná gastado, coherente con el ejecutor y lanzamientos gratuitos.
- Filo de la noche muestra15 % de vida perdida; H conserva quemaduras al limpiar control, según cambio oficial16.1. Las versiones históricas mantienen su ejecución.
- Precisión H respeta `canCrit:false` explícito. La prohibición propia de VARGAS no se ignora por llevar Filo infinito/Guantelete enjoyado.
- Regiaguardia muestra rotura o expiración del escudo. AP una vez por instancia, sin activación por muerte.
- Verdadero no recibe una reinterpretación global. Auditoría y límites se detallan por separado.
- `itemPresentation` y `plannedItemEffectDescription` derivan cifras, condiciones, duraciones y restricciones de los datos. Sin copia manual de cifras en cada interfaz. Los bloqueados muestran estado y motivo, sin afirmar ejecución.

## Tooltips y superposiciones

`ContextTooltip` es el componente común de inventario, ranuras equipadas, sinergias y afinidades. Aparece con hover o foco, desaparece al salir, permite atravesar el pequeño espacio hasta el texto para leer/desplazar, y admite clic fijado en dispositivos sin hover. Escape o clic fuera cierra la descripción fijada; no hay X ni modal. Escape de una descripción no cierra accidentalmente el inspector. Dragstart cierra la descripción, sin capturar el arrastre del objeto. Respeta movimiento reducido.

Un propietario global permite solo una descripción contextual visible. La descripción inactiva permanece oculta y enlazada por `aria-describedby` para conservar accesibilidad y renderizado estático; al activarse se sustituye por el portal. Las listas de navegación de afinidades no se convierten en descripciones acumuladas. Portal al body fuera de contextos de apilado del HUD; coordenadas fixed calculadas sobre viewport, margen8px y obstáculos de inventario/inspector. Cambia de lado cuando procede y limita altura con scroll interno para texto largo. No es un mero incremento de z-index.

Ruman Trinity se reproduce en navegador junto a la barra: completo, fuera de ella y dentro de pantalla en1280×720,1440×900,1920×1080,2560×1440,3840×2160. Inventario112px/dos columnas, rueda/teclado y scrollbar oculta. Se preservan selección, pendientes, recuperación, combinación, equipo y removedor. La selección deja solo acciones compactas; la receta es una consulta explícita sin panel persistente obligatorio.

Equipamiento verificado con DOLEA,VARGAS,JARAMILLO,FLORIN y Peibol. Los iconos compactos del banquillo siguen siendo decorativos, sin controles anidados; las tres ranuras interactivas comparten tooltip. El tooltip no promete una pasiva para componentes de solo estadísticas.

## Arte

44 ilustraciones originales distintas:8 componentes+36completos. WebP lossless64px; revisión visual a32/40/48/64. Cero glifos provisionales en camino normal. Overrides por clave y fallback SVG propio ante error de carga, comprobado en navegador. Nombres accesibles fuera de la imagen decorativa. [Dirección artística](ITEM_ICON_ART_DIRECTION.md), [mapa44/hash/estado](ITEM_ICON_ASSET_MANIFEST.md). El mapa gráfico no participa en fórmulas ni RNG.

## Compra durante combate y fusiones

Solo H amplía `buy_unit` a preparación y combate. Venta de banquillo y bloqueo de tienda conservan P11C. Renovar,XP,equipar y despliegue mantienen sus restricciones.

La compra pasa por el mismo comando autoritativo, propietario,requestId,sequence,revisión,oferta reservada,oro,stock y capacidad. No hay concesión optimista ni endpoint nuevo de juego. Solo después de ACK/snapshot aparece la compra confirmada. Desconexión,servicio no listo,pending,eliminación y resultado final bloquean acciones del cliente.

Durante combate, la compra llega al banquillo. Solo pueden fusionarse copias del banquillo excluidas del input congelado; se conservan copias y equipo. Si una fusión necesita una copia combatiente se difiere al siguiente `next_round`, antes de refrescar tienda. La formación, perfiles, sinergias, objetivos, resultado y replay del combate existente no cambian. Banquillo lleno sin fusión válida rechaza atómicamente; oro insuficiente/oferta agotada también. Repetir requestId devuelve recibo sin nuevo cargo. Intentar desplegar durante combate se rechaza.

Pruebas autoritativas en2/3/4 jugadores comparan input/replay antes y después; restauración y reconexión conservan inventario. PostgreSQL+SDK con SIGKILL después del ACK conserva compra, recibo idempotente, simulaciones y duelos. La fixture H equipa Mejora roja y Verdugo de gigantes y comprueba efectos reales de objeto en el replay y conservación del equipo. Los métodos de diagnóstico solo viven en la fixture de tests, fuera del servidor de producción.

## Evidencias reproducibles

En `artifacts/p11h/` del worktree:

- `visual/ruman-{1280,1440,1920,2560,3840}.png`, `final-metrics.json`: cinco tamaños, documento sin overflow, una descripción, barra112px.
- `visual/component.png`, `completed.png`, `equipped-{dolea,vargas,jaramillo,florin,peibol}.png`, `combat-buy-bench.png`, `interactions.json`: descripción real, equipo, compra en combate, drag/Escape y fallback sin errores JS.
- `visual/icons-{32,40,48,64}.png`, `icon-manifest.json`, `art-generation.json`, `icon-sources/`: revisión, hashes y producción original.
- `capture-final.cjs`, `interactions.cjs`, `icons-qa.cjs`: reproducción de diagnóstico mediante controles DEV existentes.
- `tests-h-items.log`, `tests-h-purchase.log`, `tests-sigkill.log`: regresiones dirigidas. Los errores iniciales de fixtures y la captura previa a restaurar CSS están conservados como evidencia de trabajo, no se anuncian como validación final.

Revisión independiente visual: **ship** en ilustraciones/tooltips/HUD de las capturas nombradas. No certifica compras, fidelidad mecánica ni persistencia. Documentación de extensión: `P11H_DESIGN_EXTENSION.md`.

## Quality gates y cierre

Resultados finales:

| Comprobación | Resultado |
|---|---|
| `pnpm check`, Node 24.19.0,un worker | Exit0:122 archivos aprobados,1 archivo opt-in omitido;1663 pruebas aprobadas,1 opt-in omitida;510,93s. Incluye PostgreSQL aislado y HTTPS/WSS2/3/4. |
| Ciclo LOCAL opt-in |1 prueba aprobada por separado; puertos ocupados, arranque y cierre de procesos propios. |
| Regresión final de presentación/configuración, inventario, arte y ACK |50 pruebas aprobadas en4 archivos tras el ajuste de descripción configurable; misma semántica mecánica. |
| TypeScript y ESLint tras último cambio |Aprobados sin errores ni avisos de lint. |
| Builds público,servidor y LOCAL |Aprobados. Vite conserva aviso de chunks grandes; no se aumenta su umbral. |
| `verify:public` |Aprobado: sin controlador,panel,esquemas DEV ni almacenamiento aislado en bundle público. |
| `verify:railway` |Aprobado localmente,sin aprovisionamiento ni llamadas de red. |
| `git diff --check` |Aprobado. |
| Matriz visual |5 tamaños,sin overflow;barra112px;un overlay activo. Ratón/foco/Escape,arrastre,equipo5 personajes,fallback,touch,receta y bloqueo verificados sin errores JS. |
| Históricos |12 fingerprints idénticos a la base;regresiones B/C/G fijadas. |

La ejecución inicial con Node 26 no quedó aprobada por tiempos anómalos en escenarios largos; la validación final usa Node 24 LTS del runtime integrado. No se amplían timeouts ni se eliminan escenarios. Se restauraron permisos de las bases de diagnóstico copiadas sin ACL y se incorporaron fuentes gráficas/Excel verificadas que no estaban en el nuevo checkout. Se corrigió antes del cierre una inclusión accidental de datos H en el hash G, ahora protegida por regresión literal.

Los logs completos y las ejecuciones fallidas iniciales se conservan en `artifacts/p11h/`; el resultado final está en `check-final.log`, `tests-lifecycle.log`, `tests-presentation-final.log`, `typecheck-final.log`, `lint-final.log` y los logs de build/verificadores. La prueba táctil adicional está en `visual/touch.json` y sus capturas; muestra movimiento reducido sin animación, fijación/cierre correctos y cero scroll de página. No se eliminaron pruebas ni se relajaron límites. El único ajuste operativo de ejecución es un worker para evitar contención de procesos de diagnóstico, usando la opción de Vitest, sin cambiar configuración ni aserciones.

No push, despliegue, reactivación Railway ni cambios Supabase remoto. Las bases nuevas son exclusivamente de test en127.0.0.1:55439 con nombres P11H. No se leen secretos remotos ni se imprimen credenciales. P10A y el worktree P11G no se editan. Para las pruebas se copian79 fuentes gráficas/Excel al worktree aislado, con hashes idénticos; permanecen fuera del commit, sin alterar los originales. No se afirma que el online esté actualizado: publicar requiere otra autorización.
