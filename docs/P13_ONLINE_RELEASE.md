# Integración P13 para ONLINE

El propietario autoriza trasladar todos los cambios LOCAL a Railway el
04-11-2026. Se integra en `release/p13-public-safe`, partiendo de P12J
`d38f18bb8e0c4279c9ac92883942200225f0cb94`, sin fusionar genealogías LOCAL.

Fuentes conservadas:

- P13B B0/B1: `88c06fbf16b7a6d9a4ac1eea23cdfaf507f4c63b`.
- P13S: `f80e6143cf54f6ecb17f0e58c045187666dd6455`.
- P13T/P13T.1 y escala JARAMILLO: `f06e9c9`.

La composición nueva `P13_ECONOMY_CONFIG` usa `characterPolicy: f0p13t-1`
y `synergyPolicy: f0p13s-1`. Tiene reglas `f0p13-1` y fingerprint propio,
encadenado a las huellas históricas P13S y P13T.1. Los catálogos anteriores
conservan sus reglas y huellas. La producción crea partidas mediante
`PublishedMatchRoom`; restaurar una partida conserva su configuración guardada.

El único pagador Jew de la composición es el diario completo de sinergias.
La política acotada `jewPolicy` de P13T.1 sigue disponible para sus guardados;
el schema rechaza combinarla con el diario completo para impedir pagos dobles.
Las estadísticas, habilidades, recetas y probabilidades aprobadas en las ramas
de origen se mantienen. No se añaden personajes ni parámetros de balance.

UPM conserva el bloqueo explícito de la invocación CARRASCO: faltan su perfil
base y habilidades. Esta publicación no presenta esa invocación como terminada.
Los iconos oficiales siguen excluidos. Se publican los 44 originales EUNUCO,
ambas arenas y los derivados propios de personajes.

El propietario autorizó expresamente interrumpir y descartar la partida activa.
Se retiró el deployment anterior y se cerró solo esa partida mediante la RPC
existente, con autoridad exclusiva, comparación de revisión y liberación del
lease. No se inventó una clasificación final ni se modificaron otros usuarios.
La revisión posterior encontró cero partidas activas o recuperables; RLS y
permisos siguen restringidos. Sin migraciones, cambios de Auth o SMTP.

La campaña de validación y los datos exactos de publicación se registrarán al
completar los controles; este documento no declara aún un despliegue realizado.
