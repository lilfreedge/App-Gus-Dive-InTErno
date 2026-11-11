-- migration_95.sql
--
-- Aviso de cuenta nueva (V70, pedido explícito, 11-nov-2026: "quiero que
-- me llegue un correo a felipe@gusdivecenter.com cada vez que alguien se
-- cree una cuenta ... para yo aprobarlo") -- mismo patrón que el aviso de
-- Solicitudes al almacén (migration_52.sql): una lista de correos en
-- app_config, configurable en Administración > Correos automáticos >
-- "Aviso de cuentas nuevas".
--
-- Se deja sembrado con felipe@gusdivecenter.com, pero solo si la columna
-- todavía está vacía (para no pisar si esto ya se corrió antes, o si
-- Administración ya se usó para cambiarlo).
--
-- Independiente de todo lo demás. Se puede correr más de una vez.

alter table public.app_config
  add column if not exists nuevas_cuentas_correos text[] not null default '{}';

update public.app_config
  set nuevas_cuentas_correos = array['felipe@gusdivecenter.com']
  where nuevas_cuentas_correos = '{}';
