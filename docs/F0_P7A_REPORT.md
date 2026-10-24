# F0-P7A — Informe de entrega

## 1. Arquitectura del servidor

Node/Colyseus en apps/server. MatchRoom controla transporte y lifecycle; AuthoritativeMatch posee participantes, pool, reloj y traza; game-core ejecuta las reglas. Una partida real de dos conexiones independientes. [Detalle](MULTIPLAYER_ARCHITECTURE.md).

## 2. Tecnologías y versiones

Node26.9.0; TypeScript5.9; Colyseus core0.18.23, ws-transport0.18.4, SDK0.18.6, tsx4.23.15 y esbuild0.28.2. API vigente verificada antes de instalar. Versiones fijadas/lock actualizado. Sin Redis, PostgreSQL, Supabase ni servicio externo.

## 3. Contratos de red

Protocolo f0p7a-1 estricto en shared. Intenciones, recibos, snapshots privados, traza identificada, ping/pong. Sin state_patch por ahora; se publica una traza completa y snapshots económicos al cambiar estado. [Mensajes](SERVER_PROTOCOL.md).

## 4. Autoridad

El servidor decide compras, ventas, XP, movimientos, fases, semillas, simulación, recompensas y salud. El cliente solo pide acciones; ni el tiempo de Phaser ni una respuesta cliente puede liquidar. Identidad vinculada al socket. Whitelist sin comandos DEV o resultado.

## 5. Público y privado

Público: nombres, IDs, vida, nivel, conexión y formación desplegada. Privado: economía propia, tienda, inventario y ledgers. Pool, RNG, historial interno y banquillo rival no se envían. Resultado de combate precalculado inspeccionable en payload antes de mostrarse: límite conocido.

## 6. Economía

Se reutiliza applyMatchAction mediante una entrada de composición applySharedEconomy, con externalCopies calculado por autoridad. No se duplican precios ni fórmulas. Se conservan todos los tests históricos.

## 7. Pool

Un pool central; reservas de dos tiendas e inventarios suman las cantidades existentes. Validación tras cada transacción. Pruebas de compras concurrentes, agotamiento, fusiones2★/3★ y devolución de3/9copias. IDs con prefijo evitan usar accidentalmente una oferta/unidad rival.

## 8. Reloj

MatchClock en servidor: preparación30s, combate hasta45s más600ms de cola, resolución5s. Ping/pong e interpolación visual. Deadline comprobado en recepción. Un navegador lento busca el tick vigente y no ralentiza al otro. La pausa DEV local no alcanza el servidor.

## 9. Combate

Una simulación runCombat con ambas formaciones y seed servidor; traza canónica idéntica en ambos sockets. Florin aplica una rotación visual involutiva para mantener mitad propia abajo. Misma liquidación económica, estrellas reales y daño coincidente. Tests de DOLEA, VARGAS, pasivas, habilidades y sinergias; suite histórica conserva Overtime y mecánicas avanzadas.

## 10. Cliente remoto

RemoteCoordinator y pantalla funcional Multijugador de prueba, compartiendo HUD/Phaser. LocalSession.authority selecciona lectura/envío; coordinator local conserva persistencia/DEV. No se duplicó el HUD, ni se cambiaron CSS, arena, escala de sprites o recursos. La proyección remota no es un guardado válido ni contiene un pool cliente.

## 11. Prueba visual real

Dos pestañas independientes del navegador integrado, cada una con su propio socket y estado. Sesión `-FtpugWzj`, identidades Vargas/Florin:

- Tiendas distintas observadas: Vargas K-01/R-03; Florin DOLEA/V-02/K-01.
- Compras confirmadas por servidor: K-01 de Vargas y DOLEA de Florin; colocadas por controles accesibles.
- Reloj preparación7.6s en ambos; combate32.3s en ambos; Overtime9.3s en ambos.
- Ronda2: Vargas100HP/Florin97HP en las dos clasificaciones; oro12 y10 respectivamente.
- Ronda3: Vargas100HP/Florin94HP; oro18 y15; preparación12.2s simultánea.
- Sin errores de consola detectados en esa prueba.
- Capturas en artifacts/p7a. Prueba a1920×1080; no rediseño visual.

Al editar módulos durante la prueba, HMR dejó una vista antigua detenida. Se añadió cierre explícito del adaptador y se desactivó la reconexión automática del SDK, fuera de alcance. Para comprobar el producto compilado se reinició Node desde dist/main.js y se crearon otras dos conexiones reales; ambas llegaron a estado preparado2/2. El entorno está en memoria: reiniciar elimina sesiones, como está documentado.

No se afirma prueba entre dos motores de navegador, dos equipos físicos, LAN o Internet. Son dos clientes reales independientes en el mismo navegador, además de clientes SDK independientes en tests.

## 12. Pruebas y resultados

Baseline: pnpm check, **619tests/42archivos** correctos. Tras P7A: **644tests/44archivos** correctos, incluyendo25 nuevos. Typecheck, lint, build cliente y build servidor pasan. El servidor compilado arranca y acepta dos navegadores. verify:public confirma ausencia del controlador/panel/schema/almacenamiento DEV en el bundle público.

Red: conexiones SDK reales sobre TCP/WebSocket. Tercero rechazado, identidad, proyecciones privadas, compras concurrentes, duplicados, identidad falsificada, mensaje DEV, desconexión y límite de frecuencia. La prueba de ronda completa usa los tiempos reales (aprox81s), compara ambas trazas completas, salud, settlementId y deadline siguiente, y verifica el rechazo de una intención tardía. No se acortan30/45/5s para simular esta evidencia.

Formato: todos los archivos nuevos/modificados de esta entrega se comprueban con Prettier. El comando global format:check detecta67 archivos preexistentes de .21st/design-exploration fuera de la fase. Se preservan; **no se afirma que el formato global pase**. Advertencia de bundle grande de Vite permanece.

## 13. Problemas encontrados y corregidos

El pool histórico asumía un propietario: se añadió contexto de reservas externas sin alterar la ruta local. La selección strict de campos privados rechazaba el objeto interno completo: se proyecta por lista explícita antes de validar. Los snapshots se envían tras sync para que los handlers SDK estén registrados. remainingMs cambia ligeramente entre envíos, por lo que la consistencia se verifica con deadline/phaseSequence, no igualdad del instante de muestreo. El inspector usa nombres relativos del receptor. HMR/disposición remota limpia temporizadores; reconexión SDK desactivada.

## 14. Limitaciones

Solo loopback y memoria. Sin cuentas, tokens de identidad persistentes, reconexión, recuperación tras reinicio, espectadores, invitaciones definitivas, matchmaking público o despliegue. La traza completa ocupa más que un stream comprimido y revela resultado futuro. No se probaron latencia WAN/pérdida de paquetes ni abuso distribuido. Máximos de sesión: espera5min, vida1h, final60s. Desconectado conserva formación mientras continúe otro cliente.

## 15. Git

Base revisada2268cb2, rama de trabajo codex/f0-p7a-authoritative. Archivos originales PNG/Sprites y .21st sin seguimiento preservados. Se revisa y guarda exclusivamente la implementación P7A y su evidencia en commit local. Sin remoto configurado ni push.

## 16. Preparación para F0-P7B

Quedan definidos transporte, identidad temporal, proyecciones, frontera de intenciones, reloj y combate autoritativos. Las siguientes fases podrán extender participantes/autenticación/persistencia sobre esos límites. **F0-P7B no se inicia.**
