# Trabajar en el Mac

Desde el worktree que contiene estos scripts, con Node >=22.12, pnpm y PostgreSQL 17 (`initdb` y `postgres` en PATH), dependencias instaladas:

```sh
pnpm dev:local
pnpm status:local
pnpm stop:local
```

El primer comando permanece abierto; los otros se ejecutan en otra terminal del mismo worktree. Ctrl-C también cierra Vite, Node y PostgreSQL propios. No usa killall ni mata procesos encontrados en un puerto. Si un puerto está ocupado, informa el puerto y el comando `lsof` para identificarlo; resuelve la colisión antes de repetir.

Abre `http://127.0.0.1:4173/`. «Salas privadas» presenta Vargas, Florin, Nora y Alex LOCAL. Usa identidades diferentes en pestañas diferentes; crear sala, introducir código, Ready e iniciar funciona como el protocolo real. «Partida local» permite el laboratorio DEV. Estas identidades caducan en una hora: vuelve al portal para obtener otra sesión; tras reiniciar Node, vuelve a seleccionar la identidad. No uses cuentas personales en este portal.

Para ejecutar P10A sin modificar su worktree, desde el worktree R2:

```sh
pnpm stop:local
pnpm dev:local --worktree '/Users/vargas/.codex/worktrees/p10a-roster-synergies/TFT EUNUCO'
```

No cambia ramas ni copia código. Necesita las dependencias instaladas en el destino. Los temporales, caché Vite, bundle del servidor y bases se guardan exclusivamente bajo `artifacts/local/` de R2, ignorado por Git. El registro privado de control es `artifacts/local-session.json` (0600). No compartirlo: contiene el secreto de sesión local.

UI/CSS/assets admiten HMR. Los cambios detectados en packages o servidor detienen LOCAL para exigir reinicio explícito. No aplicar HMR al motor ni catálogo de una partida activa. Un catálogo cambiado produce otro almacenamiento; iniciar una partida nueva. Cambios de esquema requieren revisión y migración exclusiva de diagnóstico, nunca `supabase db push/reset` sobre el proyecto remoto.

Si se pierde la terminal, `stop:local` solicita cierre autenticado y espera confirmación. Si el registro está obsoleto o el propietario no responde, falla sin matar PIDs. Inspecciona puertos y registros; no borres bases ni detengas procesos ajenos. Una terminación forzada de todo el sistema puede exigir recuperar PostgreSQL en el siguiente arranque.

El servidor normal `dev:server/start` ya no acepta entornos development/diagnostic: usa este lanzador. No exportes variables VITE, SUPABASE, Railway o DATABASE_URL en la terminal LOCAL; el arranque las rechaza.
