-- =====================================================================
-- migration_65.sql -- V33. Correr después de migration_63.sql y
-- migration_64.sql. Se puede correr más de una vez sin problema.
--
-- "Registrar regreso de varios" (pedido explícito: "aquí necesito que se
-- puedan recibir varios tanques, no de uno en uno así como está"; maqueta
-- V33 sección 4, "ok"): una sola llamada registra el regreso de varios
-- tanques que estaban afuera en prueba hidrostática. La fecha de regreso y
-- el mes/año de la prueba son los mismos para todos; el resultado y la
-- nota son de cada tanque.
--
-- Todo o nada: si uno falla (por ejemplo, alguien ya le registró el
-- regreso), no se guarda ninguno. Cada tanque pasa por
-- registrar_prueba_hidrostatica() (migration_63.sql), así que hace lo mismo
-- que el regreso de uno en uno: anota la prueba, cierra el envío, anota la
-- inspección visual si sale aprobada, y si sale rechazada el tanque se
-- inactiva solo.
--
-- p_items: [{"envio_id": "...", "resultado": "Aprobado"|"Rechazado", "nota": "..."}]
-- =====================================================================

create or replace function public.registrar_regresos_hidrostatica(
  p_fecha_regreso date,
  p_fecha_prueba date,
  p_items jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_envio public.envios_hidrostatica;
  v_n integer := 0;
begin
  if auth.uid() is null or not public.puede_registrar_hidrostatica() then
    raise exception 'No tienes permiso para registrar pruebas hidrostáticas.';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Marca al menos un tanque.';
  end if;
  if p_fecha_regreso is null or p_fecha_prueba is null then
    raise exception 'Falta la fecha de regreso o la de la prueba.';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_envio from public.envios_hidrostatica where id = (v_item->>'envio_id')::uuid;
    if v_envio.id is null then
      raise exception 'Uno de los envíos ya no existe. Vuelve a abrir la pantalla.';
    end if;
    if v_envio.fecha_regreso is not null then
      raise exception 'El tanque % ya tiene registrado su regreso. Vuelve a abrir la pantalla.', v_envio.tanque_codigo_snapshot;
    end if;
    perform public.registrar_prueba_hidrostatica(
      v_envio.tanque_id,
      p_fecha_prueba,
      v_item->>'resultado',
      nullif(trim(coalesce(v_item->>'nota', '')), ''),
      v_envio.id,
      p_fecha_regreso
    );
    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

grant execute on function public.registrar_regresos_hidrostatica(date, date, jsonb) to authenticated;
