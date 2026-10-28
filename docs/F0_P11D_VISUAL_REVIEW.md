# F0-P11D — Revisión visual del registro local

**Veredicto recibido del revisor: SHIP, limitado a la superficie visual local de AccountPortal.** La extensión presenta registro sin invitación con correo, usuario, contraseña y confirmación. El aviso de vista local y la explicación de verificación pendiente acompañan al envío deshabilitado; la pantalla no promete un alta operativa.

Se conserva Festival Pop C × Neon Playground: fondo azul noche, paneles y marcos azules angulares, FestivalPop para títulos y acciones, DM Sans para campos y explicación, lima para acción y foco, y colores existentes para avisos y controles deshabilitados. Es una extensión del sistema vigente; no introduce un mundo nuevo ni justifica regenerar `DESIGN.md` o `.impeccable/design.json`.

Evidencia entregada: `artifacts/p11/d/register-{1280,1440,1920,2560,3840}.png` y `browser-metrics.json`. Las métricas de los cinco tamaños registran ausencia de invitación, presencia de correo/usuario/contraseña, envío bloqueado y dimensiones del documento iguales al viewport; no registran errores ni solicitudes externas. En 1280 × 720 el contenido continúa mediante desplazamiento interno de la superficie de cuenta, previsto para ventanas bajas; no hay desbordamiento global. Se han contrastado las capturas de 1280 y 1920 con `AccountPortal.tsx`, `RegistrationChallenge.tsx` y `auth.css`, además de `PRODUCT.md`, `DESIGN.md` y su sidecar.

El alcance no valida apertura pública, seguridad completa de GoTrue ni entrega de correo. Según `F0_P11D_REPORT.md`, las comprobaciones funcionales corresponden a contratos y un fixture local PostgreSQL; no se ejecutó alta real de Supabase, envío/confirmación de correo ni CAPTCHA real de extremo a extremo. Estos límites siguen pendientes antes de cualquier apertura remota.

No se canoniza ni repara deriva previa del sistema: queda fuera de P11D. El scroll interno de la ventana baja documenta el comportamiento observado y no crea una regla nueva para otras pantallas.
