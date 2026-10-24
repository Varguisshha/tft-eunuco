# Registro por invitación

Registro siempre privado, sin variable de apertura accidental en producción. Aplicar primero `supabase/migrations/202610240001_accounts.sql`. La barrera está en el trigger AFTER INSERT de auth.users; llamar directamente al endpoint signup no la evita. Una creación administrativa sin invitación también será rechazada: la CLI emite invitaciones, no cuentas saltándose la regla.

La CLI `pnpm --filter @tft/server exec tsx src/invite.ts` genera 32 bytes aleatorios criptográficos, devuelve 64 caracteres hexadecimales y guarda solo SHA-256 mediante RPC privilegiada. Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno privado del proceso. `INVITE_HOURS` (1–720, por defecto 48), `INVITE_USES` (1–100, por defecto 1), `INVITE_EMAIL` opcional. La salida es el secreto que debe entregarse por un canal privado al invitado: no ejecutar en CI con logs ni pegarlo en Git. El programa no envía mensajes.

Tablas privadas no accesibles a anon/authenticated: registration_invitations y invitation_uses. Se registra hash, vencimiento, límite, usos y fecha; el uso registra UUID/fecha. `UPDATE ... WHERE uses < max_uses AND expires_at > now()` bloquea y consume atómicamente. Si falla el username, perfil o creación de Auth, toda la transacción revierte. El token se elimina de raw_user_meta_data tras utilizarlo. Email opcional se compara en minúsculas, sin alias heurísticos.

Una invitación se consume al crear la cuenta, antes de verificar email; reenviar verificación no la consume de nuevo. Eliminar la cuenta no devuelve usos. No hay reembolso automático ni pantalla de administración. Los operadores pueden revocar una invitación cambiando expires_at en SQL administrativo. Los códigos futuros de salas P7B.2 serán otro concepto y no reutilizarán estos secretos.

La fixture de PostgreSQL demuestra consumo único con 8 conexiones simultáneas. Las cuentas de desarrollo también se crean mediante invitaciones; no se introduce un interruptor de registro público. La API pública de signup y el SMTP reales quedan por validar cuando se configure Supabase.
