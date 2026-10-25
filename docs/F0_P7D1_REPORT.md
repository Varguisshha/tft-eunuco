# F0-P7D.1 — Reconexión autenticada

## 1. Arquitectura

La plaza competitiva sobrevive al transporte. `AuthoritativeMatch.resume` transfiere el socket del participante existente; `RemoteCoordinator` reconstruye la presentación desde el estado del servidor. No se vuelve a simular el combate.

## 2. Identidad y sesiones

El servidor verifica Supabase, email confirmado y sesión válida mediante el adaptador existente. El UUID verificado identifica al usuario; participante, conexión, partida y generación son conceptos separados. La nueva conexión sustituye a la antigua de forma síncrona y la cierra con 4002. El código de invitación no autentica una recuperación.

## 3. Lobby

La pertenencia retenida recupera sala, anfitrión y destino. Listo se restablece según las reglas de presencia. La transición conserva su plazo de 25 segundos y crea una sola partida. El fragmento `#multiplayer` conserva la entrada online al recargar, sin guardar credenciales ni estado competitivo en la URL.

## 4. Preparación

El snapshot privado conserva tienda, bloqueo, oro, XP, nivel, banquillo y formación. El reloj usa el deadline original. La recuperación no compra, mueve, renueva ni concede tiempo adicional.

## 5. Combate

Se reutiliza la traza autorizada y el reproductor existente hace seek al tiempo autoritativo, también durante Overtime. Posiciones, vida, maná, escudos, estados y eventos se reconstruyen mediante la proyección existente. No se modifica el motor determinista.

## 6. Resolución

La liquidación permanece en el servidor y conserva sus guardas idempotentes. El cliente recibe resultados ya aplicados y el tiempo restante; no solicita otra recompensa.

## 7. Espectadores

Un eliminado conserva puesto y selección de duelo. Sigue sin acciones económicas o competitivas. Recibe únicamente frames públicos ya alcanzados, sin traza futura completa ni economía rival.

## 8. Resultados finales

La clasificación final se recupera durante los cinco minutos de retención. Después de destruir la sala se informa de partida no disponible; no se crea otra partida automáticamente.

## 9. Reintentos y errores

Cinco reintentos con esperas de 750, 1500, 3000, 6000 y 12000 ms, con variación del 15 %. Después se ofrece reintento manual. Salir, cerrar sesión y sustituir la conexión cancelan el proceso. Se toma la credencial actual en cada intento. Sesión inválida, acceso rechazado, conexión sustituida y sala inexistente detienen el bucle. Caducidad y revocación comparten un mensaje cuando el servidor no distingue su causa.

## 10. Contratos

Contrato estricto y versionado `f0p7d1-1`, solicitud de retorno y `resume_accepted` con partida, participante, conexión, generación, ronda, fase, duelo, revisión y próximas secuencias. Se reutilizan snapshots, trazas y mensajes de presencia existentes. Véase [SERVER_PROTOCOL](SERVER_PROTOCOL.md).

## 11. Seguridad e idempotencia

La autoridad comprueba el socket vigente y la fase. Las secuencias y recibos sobreviven al retorno; los comandos pendientes del navegador se descartan. Una conexión reemplazada no puede actuar ni marcar offline a su sucesora. Las cuatro plazas lógicas permanecen limitadas aunque el transporte admita sockets transitorios durante sustituciones.

## 12. Tests

Baseline conservada: 773 pruebas. Suite ampliada: 791 pruebas en 61 archivos; typecheck, lint y build. Cobertura nueva de transferencia de autoridad, snapshots, replay, Overtime, final, reintentos, cancelación y clientes independientes. La prueba antigua de rechazo de gateway duplicado se adapta explícitamente a la nueva política de sustitución, sin eliminar el caso. Build público comprobado sin herramientas DEV.

## 13. Pruebas multijugador

SDK con sockets independientes para 2, 3 y 4 participantes: recarga de gateway y transición, compra y retorno, usuario ajeno/revocado, todos desconectados, Overtime, resolución única, eliminado, espectador, final y sala destruida (código real 522 de Colyseus). Navegador con cuatro clientes de fixture: compra de DOLEA, oro 10→8, banquillo conservado tras recarga, retorno, agotamiento y reintento manual, sesión inválida simulada, espectador y resultado final.

Estas pruebas usan identidades verificadas por un adaptador controlado; no representan cuatro personas ni una nueva campaña con cuatro cuentas Supabase reales. La validación anterior de Supabase no se presenta como ejecutada otra vez en esta fase. El fixture visual usa un reloj controlado para capturar estados; el juego normal mantiene su reloj monotónico.

## 14. Capturas

Evidencias locales en `.impeccable/review/p7d1/`:

- `lost-1280.png`: conexión perdida, 1280×720.
- `retrying-1366.png`: reintento, 1366×768.
- `recovered-1440.png`: confirmación de recuperación, 1440×900.
- `expired-1920.png`: sesión inválida simulada, 1920×1080.
- `combat-resumed-1920.png`: Overtime retomado, 1920×1080.
- `spectator-resumed-1920.png`: espectador recuperado, 1920×1080.
- `final-2560.png`: resultado retenido, 2560×1440.

Se comprobó ausencia de scroll vertical del documento en las cinco resoluciones. El aviso desaparece del DOM al terminar y no deja una capa invisible. Se conservan arena, cartas, sprites y estructura del HUD.

## 15. Limitaciones

Solo funciona mientras vive el mismo proceso Node. No hay Redis, almacenamiento duradero ni recuperación tras reinicio. Se mantienen el límite de vida de sala de una hora y cinco minutos para el final; el lobby en espera conserva su gracia de desconexión y caducidad existentes. No se puede recuperar un estado destruido. PRODUCT.md contiene contexto histórico anterior a estas fases: se informa del desfase sin reescribirlo incidentalmente.

## 16. Git

P7C.3 preservada en `a236da6`. Cambios P7D.1 limitados a transporte, coordinación, contratos, pruebas, avisos y documentación. Recursos ajenos y originales intactos; sin remoto nuevo, push ni despliegue.

## 17. Preparación para P7D.2

Quedan explícitos identidad, generación, revisiones, secuencias, retención y contratos de restauración. Son puntos de integración futuros, no persistencia implementada. El trabajo se detiene en P7D.1.

### Cierre de validación

La última ejecución de `pnpm check` pasó 791/791 pruebas en 61 archivos, tipos, lint y builds. `pnpm build:local` y `pnpm verify:public` también pasaron. Persiste el aviso previo de Vite por tamaño de chunk, sin error de compilación. La revisión independiente marcó `ship` para las correcciones de borde, hover y foco; la revisión documental confirmó que la extensión utiliza los tokens existentes y preserva DESIGN.md y su registro. La recarga de `#multiplayer` se comprobó además en la aplicación normal servida en 4173 con la sesión ya disponible.
