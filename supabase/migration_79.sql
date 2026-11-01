-- =====================================================================
-- migration_79.sql -- V54. Se puede correr más de una vez. No borra ni
-- cambia datos que ya existan.
--
-- La campanita de Control Estudiantes ("62. si": aviso cuando alguien se
-- registra por el link, sube un comprobante o llega un interesado nuevo).
-- Las notificaciones (migration_77.sql) ahora pueden ser también del app
-- 'estudiantes'. Las agrega el servidor; cada quien ve y marca las suyas.
-- =====================================================================
do $$
begin
  if to_regclass('public.notificaciones') is null then
    raise notice 'Falta migration_77.sql (notificaciones): córrela primero.';
  else
    alter table public.notificaciones drop constraint if exists notificaciones_app_check;
    alter table public.notificaciones add constraint notificaciones_app_check
      check (app in ('interno', 'clientes', 'estudiantes'));
  end if;
end $$;
