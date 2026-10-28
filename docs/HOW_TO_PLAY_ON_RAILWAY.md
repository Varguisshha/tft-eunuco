# Jugar con amigos en Railway

Estado actual (27-10-2026): **apagado / REMOVED**. Dominio asignado: `https://tfteunuco.up.railway.app/`. La versión P11I con valores calculados de habilidades se publicó, verificó y retiró supervisadamente. Mientras esté retirado, la web no estará operativa. [Informe de la release](ABILITY_SCALING_RELEASE.md).

## Encender (requiere autorización operativa y supervisión)

1. Railway → TFT EUNUCO → entorno private → servicio tft-eunuco → Deployments.
2. Identifica **`P11I + dynamic ability values 039ae13`**, deployment `f1b8c326-1548-43b0-9154-6475ef307242`, commit `039ae132bb130905cd68aa9243f39bc03545c81a`, catálogo de nuevas partidas `f0p11h-1`. Las entradas antiguas P9B son históricas; no sirven como rollback automático de guardados P11H.
3. Su menú ofrece **Redeploy** aunque esté REMOVED (comprobado en R2). No selecciones otra rama ni `Deploy latest`; no conectes GitHub.
4. Revisa variables y dominio canónico antes de activar. Redeploy conserva el código de esa release; la configuración vigente debe ser compatible. No restaura automáticamente variables antiguas.
5. Espera despliegue satisfactorio, `/readyz` = HTTP200 `ready`, HTTPS y conexión WSS. Verifica exactamente una autoridad y un lease. No jugar si readiness falla.

Si Railway deja de ofrecer Redeploy, no improvisar: preparar checkout limpio del commit exacto, repetir gates, verificar backup y compatibilidad y pedir autorización para subir ese mismo release.

## Reunir al grupo

Abre la URL vigente e inicia sesión. Crea sala privada de 2–4 participantes. Comparte en privado la URL y el código de ocho caracteres (o «Copiar invitación»). Cada amigo inicia sesión o sigue el registro existente, confirma su correo, introduce el código y marca Ready. El anfitrión también marca Ready y pulsa Iniciar. Las cuentas diagnósticas LOCAL no sirven online.

El registro abierto P11D sigue preparado únicamente en LOCAL. No se cambian restricciones de registro ni SMTP. La existencia de formulario de registro no autoriza crear cuentas ajenas. Login, renovación y recuperación conservan el flujo Supabase; los correos dependen del SMTP existente. Las pruebas con personas reales se harán en una sesión remota supervisada posterior.

## Apagar

Cuando finalicen todas las partidas, espera las escrituras pendientes y comprueba que no queda ninguna activa. En el menú del deployment activo usa **Remove** (no Delete service/project). Verifica estado REMOVED/offline, cierre del proceso y liberación del lease. Conserva proyecto, dominio, variables y snapshots. Si no se libera el lease, investiga antes de volver a encender; nunca desactives el fence.

El propietario debe permanecer disponible para detenerlo. La política anterior era piloto máximo 24 h, aviso 3 USD y parada 5 USD incrementales, umbrales orientativos supervisados, no topes automáticos. R2 no autoriza otro piloto ni reactiva esa ventana. Antes de encender, acordar duración, presupuesto y responsable de parada. No dejarlo funcionando sin control.
