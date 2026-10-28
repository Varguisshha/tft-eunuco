# F0-P11E · recuperación del control sin recargar

Intervención prioritaria durante P11A, autorizada por la ampliación del encargo. Evidencia de reproducción previa: `artifacts/p11/audit/p11e-reproduction.log`, test pendiente=true después de error de protocolo. No hay telemetría de los paquetes de la partida real; no se atribuye sin pruebas su desencadenante concreto a este defecto.

## Defectos reproducidos

El cliente mantenía un booleano pending tras `protocol_error`, sin plazo de confirmación. Una respuesta perdida podía dejarlo indefinidamente bloqueado. También aceptaba cualquier recibo sin correlacionarlo con la solicitud en curso y, tras un rechazo de secuencia, seguía incrementando su secuencia local sin adoptar la del servidor. La recarga reconectaba y adoptaba la secuencia canónica, explicando por qué esa recuperación manual podía liberar el control.

## Corrección

Se correlacionan requestId y sequence; duplicados atrasados no liberan una acción nueva. Ocho segundos sin recibo o sin estado confirmado provocan sincronización. Un rechazo de protocolo/secuencia requiere recibir `resume_accepted` y después un snapshot canónico antes de habilitar de nuevo las acciones. Nunca se reenvía automáticamente una compra o movimiento de resultado incierto. Los rechazos semánticos normales liberan su solicitud y solicitan estado; una excepción de transporte tampoco deja pending anclado. Reconexión/desconexión y dispose limpian sus temporizadores.

## Pruebas

25/25 pruebas pasan en RemoteCoordinator y recovery, incluidas cinco regresiones nuevas: protocolo, payload inválido real rechazado por AuthoritativeMatch, desajuste real de secuencia, confirmación perdida con aplicación previa en servidor y recibo duplicado tardío, y excepción al enviar. Los escenarios vuelven a desplegar desde banquillo al tablero con la secuencia canónica, sin reconstruir el coordinador ni recargar. Se comprueba la conservación del pool y no se repite el primer comando.

No cambia ninguna regla de colocación, fase, propiedad, revisión ni idempotencia del servidor. La inspección de selección/drag y la validación conjunta continúan en P11F; esta corrección cierra las rutas reproducidas, no afirma haber observado el paquete original del incidente. Cambios exclusivamente locales, sin Railway, Supabase remoto ni datos reales.

## Consolidación P11E tras P11C/D

Se auditó la cadena de interacción completa: selección de banquillo, drag DOM→canvas, salida del puntero, pérdida de foco, cambio de fase, revisión, comando pendiente, recibo, secuencia y snapshot. Los manejadores existentes cancelan el gesto al perder foco, terminar un arrastre externo o cerrar la escena; una fase no editable impide desplegar. No se ha reproducido otro bloqueo permanente originado por el arrastre y no se modifica ese código por conjetura.

`p11-placement-recovery.test.ts` ejercita **la misma instancia de LocalSession** con AuthoritativeMatch P11C: rechazo semántico, recibo aceptado sin su snapshot, gesto recibido al cruzar el plazo de preparación y respuesta de sincronización perdida una vez. Tras cada recuperación se acepta un despliegue nuevo, sin reconstruir la sesión ni recargar. El resultado incierto no se reenvía; una respuesta de sincronización perdida se vuelve a pedir después de ocho segundos. Conservación del pool, secuencia y ubicación verificadas.

Estas cuatro regresiones complementan las 25 pruebas del coordinador y recuperación. La verificación del navegador en P11F cubre el arrastre nativo sobre la interfaz real y la recuperación de conexión; no convierte esas pruebas controladas en una reproducción retrospectiva de la partida original. La causa exacta de aquel incidente sigue sin atribuirse porque no hay registro de sus paquetes.
