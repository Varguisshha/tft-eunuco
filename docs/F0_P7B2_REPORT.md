# F0-P7B.2 — Informe de implementación y validación

Fecha: 24 de octubre de 2026. Alcance cerrado antes de F0-P7C.

## 1. Arquitectura de salas

LobbyHub mantiene en memoria participantes, códigos, presencia y transiciones; LobbyRoom expone un canal privado autenticado por cuenta. El lobby no ejecuta economía ni combate. PrivateMatch reutiliza MatchRoom y AuthoritativeMatch. Véase [PRIVATE_LOBBIES.md](PRIVATE_LOBBIES.md).

## 2. Contratos y protocolo

Contratos compartidos Zod estrictos, versión `f0p7b2-1`, requestId UUID y snapshots con revisión. Acciones: crear, unirse, cambiar capacidad, marcar Listo, abandonar, cerrar, iniciar y sincronizar. Se rechazan campos extra, identidad proporcionada por el cliente y comandos DEV. Los últimos 128 recibos por usuario evitan repetir efectos; reutilizar un ID con otro contenido falla.

## 3. Formato y seguridad de códigos

Ocho caracteres criptográficos, alfabeto de 32 símbolos sin caracteres ambiguos, presentación XXXX-XXXX y normalización de espacios/guiones/mayúsculas. Unicidad entre salas activas y revocación al cerrar. Son independientes de las invitaciones de registro. Se limitan creación/unión por UUID incluso tras reconectar. No hay listado público. Detalle en [LOBBY_SECURITY.md](LOBBY_SECURITY.md).

## 4. Creación y unión

Una cuenta autenticada crea sala de 2/3/4 plazas o introduce el código. El servidor comprueba identidad, pertenencia única, estado y aforo. La interfaz muestra errores de código cerrado, aforo, permisos y conexión. Se puede copiar el código o el texto de invitación; copiar no envía mensajes a terceros.

## 5. Anfitrión

Solo el anfitrión cambia capacidad, cierra e inicia. Su salida transfiere el puesto al participante conectado más antiguo, o al más antiguo restante. Una sala vacía se limpia. La transferencia y el cierre se probaron con Vargas y Florin.

## 6. Estado Listo

Cada usuario establece exclusivamente su booleano de preparación. Repetir una solicitud no alterna su estado. Cambios relevantes de participantes o capacidad invalidan preparación. La pérdida de conexión marca ausencia y elimina Listo; la plaza tiene 30 segundos de gracia.

## 7. Transición a partida

El inicio reserva `starting` antes de esperar y congela la lista de UUID. El servidor crea un destino privado con permiso efímero interno y whitelist. Ambos participantes entran y sincronizan antes del arranque automático. Un plazo de 25 segundos recupera waiting si falla; destinos tardíos se cancelan y callbacks antiguos no afectan a nuevos intentos. Véase [LOBBY_TO_MATCH.md](LOBBY_TO_MATCH.md).

## 8. Pantallas

Menú Jugar, creación, unión, lobby con perfiles/avatares/presencia, código, capacidad, Listo, permisos, salida/cierre y transición automática. Festival Pop × Neon Playground conserva marcos e iconos originales y las fuentes existentes. Ancho máximo de 1220px; móvil apilado con desplazamiento vertical. Se reservó espacio para evitar que Opciones tape Mi cuenta a 1280×720. No se rediseñó el HUD de combate.

## 9. Concurrencia y caducidad anteriores

En PostgreSQL aislado, las dos migraciones y ocho transacciones concurrentes aceptaron exactamente un registro; autorización y redacción de metadatos pasaron. El fixture antiguo necesitó aplicar la migración 0002 antes de repetir estas comprobaciones. Esto no equivale a ocho altas GoTrue remotas.

Con Supabase real, cerrar una sesión nueva de Florin expulsó su socket activo con 4001 dentro del intervalo de revalidación de 15 segundos y rechazó reconexión con el JWT revocado. No se revocaron las sesiones del propietario. Expiración, sesión ausente y cambio de UUID también se prueban mediante verificador controlado y transporte real. No se afirma haber esperado la expiración natural de un JWT de Supabase.

## 10. Automatización

- Baseline antes de editar: `pnpm check`, 689 pruebas en 49 archivos.
- Resultado final: `pnpm check` correcto, **712 pruebas en 51 archivos**, tipos, lint y compilación correctos.
- Nuevas pruebas: 19 de LobbyHub y 4 de transporte, incluyendo concurrencia, aforo, permisos, códigos, expiración, presencia, reintentos, timeout y callbacks tardíos.
- `pnpm verify:public`: correcto. Compilación local actualizada y servidor reiniciado con el resultado final.
- La compilación conserva el aviso de tamaño de bundles; no es un error y no se abordó como refactor ajeno al alcance.

## 11. E2E con cuentas reales

Vargas en Safari y Florin en el navegador integrado: creación/unión por código, perfiles correctos, ambos listos, inicio del anfitrión y entrada automática. Ambos compraron y desplegaron unidades. Se observó juego hasta ronda 8, incluyendo combate y Overtime; ambas vistas coincidían en la vida de cada jugador (Florin 89 / Vargas 75 en ronda 8).

En otra sala se cambió capacidad a cuatro: ambos perdieron Listo y el inicio quedó bloqueado con explicación de F0-P7C. Florin abandonó, Vargas recibió el rol de anfitrión, cerró la sala y un nuevo intento de unión rechazó su código. Las salas temporales quedaron cerradas. El aforo de cuatro y las carreras de unión se verificaron automáticamente; no se simulan cuatro cuentas reales en esta evidencia.

## 12. Capturas

Evidencias locales en `.impeccable/review/p7b2/` (directorio de revisión ignorado por Git):

- `menu-1280.png`, `menu-1920.png`, `menu-2560.png`, `menu-390.png`.
- `lobby-1280.png`, `lobby-1920.png`, `lobby-2560.png`, `lobby-390.png`, `lobby-390-controls.png`.
- `empty-1920.png`, `four-seats-1920.png`, `closed-code-error.png`.
- `real-match.png` y `real-round-8.png`.

Resoluciones revisadas: 1280×720, 1920×1080, 2560×1440 y 390×844. Medición DOM sin desbordamiento horizontal en las cuatro. La revisión independiente aprobó la corrección de cabecera; no quedaron incidencias visuales materiales solicitadas.

## 13. Limitaciones

Partidas completas exclusivamente de dos. Salas de tres/cuatro preparadas pero inicio bloqueado. Estado en memoria de un único servidor; reiniciar elimina salas y partidas. Sin reconexión de combate, persistencia de lobby, cuotas distribuidas ni despliegue público. El servicio local en loopback no permite que un amigo desde otro ordenador entre solo con el código. La revalidación de revocación es periódica, no instantánea.

## 14. Git y ejecución

Rama `codex/f0-p7a-authoritative`; cambios de esta fase en el árbol de trabajo, sin commit ni push. Se preservaron los recursos originales y archivos ajenos preexistentes. No se configuró remoto, contrató servicios, borró usuarios, cambió RLS/SMTP remoto ni desplegó públicamente.

Web local: http://127.0.0.1:4173/ . Servidor: http://127.0.0.1:2567/ . Las instrucciones reproducibles están en PRIVATE_LOBBIES.md. Credenciales y sesiones no forman parte del informe ni de las capturas.

## 15. Preparación para F0-P7C

Quedan separados el roster social, permisos y ciclo de lobby de la simulación de dos jugadores. Capacidad y contratos admiten cuatro plazas sin presentar ese combate como funcional. F0-P7C deberá definir emparejamientos, perspectiva, rondas y resultados multijugador antes de habilitar inicio de tres/cuatro. No se ha iniciado esa fase.
