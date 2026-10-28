# Dominio Railway — operación autorizada aplicada

Verificado el 26-10-2026. Proyecto TFT EUNUCO `80f46bb2-efc2-449d-adfe-1c387acb7a96`, entorno private `8e819935-1601-4579-abb5-293d8beecef8`, servicio tft-eunuco `fafc4774-f71a-4726-ae2a-48fec33d7e2d`, workspace existente varguisshha's Projects.

Disponibilidad revalidada antes de escribir. Dominio `acc09954-c7db-42de-8782-2937e32f570e` renombrado de `tft-eunuco-private.up.railway.app` a **tfteunuco.up.railway.app**, puerto 8080, syncStatus ACTIVE. Lectura posterior de la API de dominios confirma la asignación y sustitución. El export de configuración del entorno conserva la etiqueta histórica de networking del despliegue retirado; no se forzó un despliegue para actualizarla.

Solo dos variables modificadas usando `--skip-deploys`:

- `TFT_PUBLIC_URL=https://tfteunuco.up.railway.app`
- `TFT_ALLOWED_ORIGINS=https://tfteunuco.up.railway.app`

Comparación completa de variables y configuración del entorno: diferencias limitadas a esos valores; límites, réplicas, secretos y catálogo intactos. Deployment único `c6f11898-a0dc-483a-b50f-4c4f8042eb57`, REMOVED antes/después. No build ni nueva release remota. Una réplica configurada, 2 GiB, 2 vCPU; servicio apagado.

Supabase exclusivamente `tft-eunuco-dev`, `qiombjvkaolllnjqzspz`:

- Site URL: `https://tfteunuco.up.railway.app/`.
- Redirects: `http://127.0.0.1:4173/` y `https://tfteunuco.up.railway.app/`.
- Redirect antiguo retirado después de confirmar dominio y cero operaciones pendientes de confirmación/recuperación/cambio de correo en ventana de 24 h.
- Relectura completa: solo `site_url` y `uri_allow_list` cambian entre los 243 campos comparados.
- Hashes acotados anteriores/posteriores de usuarios y partidas idénticos; cero partidas activas y lease liberado.

Evidencia sin secretos: [verificación](evidence/domain-pool/remote-verification.json). Copias completas anteriores/posteriores permanecen exclusivamente en archivos privados ignorados `artifacts/domain-pool`, permisos restringidos para Auth.

## Reversión acotada si se autoriza

Revalidar dominio y configuración actual, disponibilidad del nombre anterior y ausencia de actividad. Renombrar el mismo ID al dominio anterior, restaurar las dos variables al origen anterior con skip-deploys, y restaurar Site URL/redirect HTTPS anterior manteniendo localhost. Comparar todos los campos nuevamente. No reiniciar, desplegar ni recuperar otros campos de una copia antigua.

## Límite operativo

HTTPS, WSS y autenticación desde el nuevo dominio **no se declaran operativos**: el servidor está apagado. La prueba requiere una reactivación supervisada autorizada. No se modificaron SMTP, usuarios, contraseñas, SQL, RLS, recursos ni P10A. El nuevo pool es trabajo local independiente.
