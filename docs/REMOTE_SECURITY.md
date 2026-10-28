# Seguridad remota F0-P9A

## Controles efectivos

- HTTP y WS validan Host exacto, Origin permitido y proxy loopback exacto con X-Forwarded-Proto=https. Cabeceras reenviadas desde otro origen no son confiables. La configuración Caddy sobrescribe cabeceras y no publica el puerto Node.
- La guardia HTTP envuelve el router final antes de escuchar. Esto importa: la versión instalada de Colyseus atiende OPTIONS y refleja Origin antes del middleware Express convencional. Se impide ese bypass, wildcard y Access-Control-Allow-Credentials.
- Matchmaking solo admite métodos/rutas necesarios. `/test_match`, rutas DEV, ficheros ocultos, traversal, artefactos e introspección no se sirven en el runtime remoto. GET estático sirve solo extensiones conocidas; no publica el repositorio.
- Matchmaking HTTP limitado a 240 solicitudes/minuto por dirección de conexión; detrás del proxy es deliberadamente un límite agregado. Payload de matchmaking 4 KiB, sin transferencia chunked. WS mantiene 4 KiB y 30 mensajes/s por cliente; sin compresión WS. HTTP headers/request 10 s; keepalive HTTP 5 s; ping WS remoto 10 s con tres fallos. No cambian tiempos de partida.
- Supabase valida identidad y sesión; salas privadas validan roster/permisos, comandos, revisiones e idempotencia. No basta conocer un código de sala para saltarse Auth. La proyección pública no contiene inventarios privados, semillas ni journal.
- CSP permite solo scripts propios, conexiones al origen del juego/Supabase y recursos gráficos propios/data/blob; no objetos ni framing. Estilos inline se conservan porque los usa el HUD. nosniff, no-referrer y DENY; HSTS en el proxy después de TLS.
- El cliente servido por HTTPS rechaza HTTP/WS, incluso a localhost. La configuración privada exige HTTPS y build sin DEV.
- La aplicación no crea cookies: no necesita SameSite/Secure para una cookie de juego inexistente. No se añade autorización basada en cookies. La sesión Supabase guardada en el navegador exige proteger contra XSS; nunca compartir perfiles de navegador.

## Secretos y logs

Secrets solo en fichero de entorno privado 0600 o almacén de secretos equivalente, fuera de releases. Los ejemplos no contienen credenciales. `verify:public` amplía detección de secretos/cadenas PostgreSQL y código diagnóstico en el build público; el build rechaza claves VITE secret/service-role. Esto complementa revisión, no sustituye un escáner universal de secretos.

Logs estructurados de eventos fijos y números: arranque/parada, conexiones, salas, reconexión, restauración, checkpoint, Auth aceptada/rechazada, fallo/recuperación de almacenamiento, RSS/heap/CPU/latencia del bucle. No serializan excepciones, JWT, URL de petición, inventarios, semillas, perfiles ni cadenas de conexión. DEBUG se rechaza remotamente. El proxy no debe registrar query strings: Colyseus puede transmitir el JWT en el upgrade WSS. Nunca habilitar access logs sin redacción verificada.

## Límites

Origin no sustituye autenticación: un cliente nativo puede fabricar su Origin. La defensa decisiva es el JWT, la sesión y los permisos. No hay mitigación DDoS distribuida ni una certificación de seguridad. Se requiere firewall, parches, acceso administrativo restringido y rotación de secretos en el proveedor elegido. No activar varios workers ni escalado horizontal. No se ha cambiado RLS de usuarios ni configuración Supabase real.


## F0-P9B-R0 — Railway Hobby

Railway exige Host y X-Forwarded-Host canónicos, proto https y cabeceras críticas no duplicadas; ignora XFF para identidad/límites. La confianza requiere edge como único ingreso, sin TCP proxy ni pares privados. Excepción GET exacta de sondas healthcheck.railway.app, sin acceso a rutas de juego. SQL serializa la concesión con cada commit y bloquea escritores antiguos una vez activada. Ningún cambio remoto aplicado.

[Despliegue](RAILWAY_DEPLOYMENT.md) · [Variables](RAILWAY_ENVIRONMENT.md) · [Operación](RAILWAY_OPERATIONS.md) · [Preflight](RAILWAY_PREFLIGHT.md).


## F0-P9B-R1 — ejecución autorizada (26-10-2026)

A/B autorizadas: las dos migraciones de autoridad se aplicaron transaccionalmente; tablas aisladas y RPC solo para service_role, commit interno privado sin acceso directo. Secretos transmitidos a Railway por stdin, no a Git ni logs. Origen ajeno rechazado HTTP 403 / WSS 401; origen canónico hizo upgrade 101. Tras parar, lease sin propietario y protección de escritor antiguo activa. Auth, SMTP y usuarios intactos; C pendiente.

[Informe y evidencias](RAILWAY_FIRST_DEPLOYMENT_REPORT.md).

## C — actualización autorizada y verificada (26-10-2026)

C ya está completada: Site URL `https://tft-eunuco-private.up.railway.app/` y redirect HTTPS exacto añadidos; `http://127.0.0.1:4173/` conservado como redirect. Comparación de 243 campos Auth: solo site_url y uri_allow_list cambiaron. SMTP, usuarios, contraseñas y SQL sin modificaciones. Railway permanece detenido (REMOVED), sin nuevo despliegue y sin integrar P10A. Las menciones anteriores a C pendiente describen el cierre previo de A/B. [Verificación C](evidence/p9b-r1/auth-c-verification.json).
