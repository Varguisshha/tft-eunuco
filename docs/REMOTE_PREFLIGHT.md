# Preflight de solo lectura

Ejecutar desde la raíz de una release construida, cargando variables sin imprimirlas. La entrada `apps/server/src/remote/preflight.ts` no contiene escrituras, limpieza, DDL ni cambios Auth.

```sh
pnpm --filter @tft/server preflight
pnpm --filter @tft/server preflight --check-storage
```

Primero valida solo configuración; el segundo contacta los destinos configurados, llama `authority_health`, carga y decodifica snapshots existentes y consulta salud de Auth. No ejecutarlo contra Supabase real hasta autorizar el acceso. Su salida contiene solo booleanos y cantidad de partidas, nunca datos internos. La restauración del servidor vuelve a comprobar catálogo/membresía antes de escuchar.

La migración aditiva `202610260001_authority_health.sql` prepara una función estable de lectura restringida a service_role. **No se ha aplicado remotamente.** Si falta, readiness/preflight fallan: no ocultar el error ni conceder permisos amplios.

## Antes del primer despliegue autorizado

- [ ] Aprobar proveedor, presupuesto, dominio y responsables.
- [ ] Confirmar Node compatible con engines y pnpm fijado en packageManager; proceso persistente, sin suspensión.
- [ ] Elegir una sola instancia y restringir puerto Node a loopback; firewall 80/443 y administración autorizada.
- [ ] Compilar con variables públicas del proyecto correcto; `verify:public` correcto; ningún fixture/DEV/secret en release.
- [ ] Revisar copia/restauración de datos y migraciones pendientes; autorizar aplicación a Supabase dedicado.
- [ ] Configurar redirecciones exactas Auth y SMTP; no cambiar cuentas reales para probar.
- [ ] Instalar configuración proxy con dominio aprobado; verificar cadena TLS, renovación y redirección.
- [ ] Instalar secretos fuera del repo; evitar comandos que los impriman o logs de URL completas.
- [ ] Ejecutar preflight de lectura, health/readiness y prueba de rechazo de Origin ajeno.
- [ ] Dos ordenadores/redes distintas: registro/invitación, login, recuperación y partida real supervisada.
- [ ] Ensayar reconexión, parada controlada y rollback compatible; revisar costes/almacenamiento.

No hay script de push, aprovisionamiento o despliegue automático en esta fase. Estos pasos requieren autorización explícita posterior.


## F0-P9A.1 — Memoria y retención

La configuración valida también `TFT_FINAL_RETENTION_MS`. Antes de abrir pruebas remotas comprobar reconexión dentro de la ventana y rechazo después, memoria tras varios finales, margen para replays grandes y ausencia de inspector/control diagnóstico. La carga de lectura no elimina registros. Los resultados locales no constituyen una garantía de capacidad de un proveedor.

[Perfil de memoria](SERVER_MEMORY_PROFILE.md) · [Política de retención](MATCH_RETENTION_POLICY.md) · [Mediciones y validación](SERVER_PERFORMANCE_BASELINE.md).
