-- =====================================================================
-- carga_datos_v32.sql -- Carga de los datos reales de la hoja de cálculo
-- (tabla aprobada en la maqueta V32, sección 10: "sii, nítido").
--
-- Correr en Supabase › SQL Editor DESPUÉS de migration_63.sql y
-- migration_64.sql. Es TODO O NADA: si algo falla, no se guarda nada.
--
-- Qué carga:
--   * App Equipos de clientes: 15 clientes, sus 21 equipos y 21 órdenes
--     (02160 a 02200, en orden de número para que el próximo No. de orden
--     sugerido sea 02201), con su seguimiento (envío a PH, listo,
--     verificado por Pipe, notificado, entrega, factura FACT-2002,
--     cotización COT-0700). Todo queda registrado a nombre del Titular.
--   * App Interno: los tanques T-24, T-53, T-54 y T-58 (si no existen se
--     crean como "Tanque 60 cf aluminio", serie vacía) y su envío a prueba
--     hidrostática del 19/10/2026.
--
-- Seguro de correr dos veces: no repite clientes (mismo nombre), equipos
-- (mismo cliente, tipo y serie), órdenes (mismo No. de orden), tanques
-- (mismo código activo) ni envíos (si el tanque ya está afuera).
-- Los servicios NO se crean: usa los que ya existen en Base de datos ›
-- Servicios ("Prueba hidrostática", "Mantenimiento", "Chequeo", sin
-- importar mayúsculas ni tildes). Si falta alguno, se detiene y avisa.
-- =====================================================================

do $$
declare
  v_titular uuid;
  v_nombre text;
  v_srv_ph text;
  v_srv_mant text;
  v_srv_cheq text;
  v_cliente uuid;
  v_equipo uuid;
  v_tanque uuid;
  v_n int := 0;
  r record;
  c_clientes int := 0;
  c_equipos int := 0;
  c_ordenes int := 0;
  c_saltadas int := 0;
  c_tanques int := 0;
  c_envios int := 0;
begin
  -- Titular (Pipe) ------------------------------------------------------
  select id, full_name into v_titular, v_nombre
  from public.profiles where es_titular order by created_at limit 1;
  if v_titular is null then
    raise exception 'No encontré al Titular en profiles.';
  end if;

  -- Servicios existentes (no se crea ninguno) ---------------------------
  select nombre into v_srv_ph from public.servicios_catalogo
   where lower(translate(trim(nombre), 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) = 'prueba hidrostatica'
   order by activo desc limit 1;
  select nombre into v_srv_mant from public.servicios_catalogo
   where lower(translate(trim(nombre), 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) = 'mantenimiento'
   order by activo desc limit 1;
  select nombre into v_srv_cheq from public.servicios_catalogo
   where lower(translate(trim(nombre), 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) = 'chequeo'
   order by activo desc limit 1;
  if v_srv_ph is null or v_srv_mant is null or v_srv_cheq is null then
    raise exception 'Falta un servicio en Base de datos › Servicios (Prueba hidrostática: %, Mantenimiento: %, Chequeo: %). No se cargó nada.',
      coalesce(v_srv_ph, 'NO ESTÁ'), coalesce(v_srv_mant, 'NO ESTÁ'), coalesce(v_srv_cheq, 'NO ESTÁ');
  end if;

  -- Clientes -------------------------------------------------------------
  for r in
    select * from (values
      ('Juan Federico Garcia', '809-545-1061'),
      ('Kean Group', '809-383-1291'),
      ('Algenis Frias', '829-566-9035'),
      ('ITM Red Port (Martin Serrano)', '809-481-4133'),
      ('Jose Abraham Paniagua', '829-519-9648'),
      ('Rafael Miranda', '809-931-9917'),
      ('J. Fortuna', '829-649-4923'),
      ('Roger Avalos (Info. Gustavo)', '849-917-5730'),
      ('Armada R.D. (Junior Rodriguez)', '829-367-1689'),
      ('Guillermo Carrasco', '829-222-9903'),
      ('Raul Novoa', '829-649-5155'),
      ('Alvaro Martinez', '809-480-1824'),
      ('Carlos Piola', '809-747-3105'),
      ('Emil Simon', '809-383-9608'),
      ('Tomas Checo', '809-222-4522')
    ) as t(nombre, telefono)
  loop
    if not exists (select 1 from public.clientes_equipos where lower(trim(nombre)) = lower(r.nombre)) then
      v_n := v_n + 1;
      insert into public.clientes_equipos (nombre, telefono, user_id, nombre_usuario_snapshot, created_at)
      values (r.nombre, r.telefono, v_titular, v_nombre, now() + v_n * interval '1 second');
      c_clientes := c_clientes + 1;
    end if;
  end loop;

  -- Equipos y órdenes (en orden de No.) ------------------------------------
  -- servicio: PH / MANT / CHEQ
  for r in
    select * from (values
      ('02160', 'Juan Federico Garcia',           'Tanques',     null,       null,     '816625-E780', '80 cf', 'Acero',    'PH',   date '2026-08-14', null::date,        null::date,        null::text, null::date,        null::text, null::date,        null::text, null::text),
      ('02162', 'Kean Group',                     'Reguladores', 'Oceanic',  null,     '212095',      null,    null,       'MANT', date '2026-08-17', null,              date '2026-09-01', 'Pipe',      date '2026-09-28', 'Elvis',     date '2026-10-17', 'FACT-2002', null),
      ('02178', 'Algenis Frias',                  'Tanques',     null,       null,     'P696835',     '80 cf', 'Aluminio', 'PH',   date '2026-08-31', date '2026-09-30', null,              null,        null,              null,        null,              null,        null),
      ('02179', 'Algenis Frias',                  'Tanques',     null,       null,     'AS176912',    '80 cf', 'Aluminio', 'PH',   date '2026-08-31', date '2026-09-30', null,              null,        null,              null,        null,              null,        null),
      ('02182', 'ITM Red Port (Martin Serrano)',  'Tanques',     'Catalina', null,     'AS0832793',   '80 cf', 'Aluminio', 'PH',   date '2026-09-15', date '2026-09-30', null,              null,        null,              null,        null,              null,        'COT-0700'),
      ('02183', 'ITM Red Port (Martin Serrano)',  'Tanques',     'Catalina', null,     'AS0903571',   '80 cf', 'Aluminio', 'PH',   date '2026-09-15', date '2026-09-30', null,              null,        null,              null,        null,              null,        'COT-0700'),
      ('02185', 'Jose Abraham Paniagua',          'Tanques',     null,       null,     'P375886',     '80 cf', 'Aluminio', 'PH',   date '2026-09-18', date '2026-09-30', null,              null,        null,              null,        null,              null,        null),
      ('02186', 'Rafael Miranda',                 'Reguladores', 'Oceanic',  null,     'P0204506',    null,    null,       'MANT', date '2026-09-26', null,              date '2026-10-02', 'Pipe',      date '2026-10-02', null,        null,              null,        null),
      ('02187', 'J. Fortuna',                     'Tanques',     null,       null,     'AS8403108',   '80 cf', 'Aluminio', 'PH',   date '2026-09-29', date '2026-10-01', null,              null,        null,              null,        null,              null,        null),
      ('02188', 'J. Fortuna',                     'Tanques',     null,       null,     'P708238',     '80 cf', 'Aluminio', 'PH',   date '2026-09-29', date '2026-10-01', null,              null,        null,              null,        null,              null,        null),
      ('02190', 'Roger Avalos (Info. Gustavo)',   'Computadora', 'Mares',    null,     null,          null,    null,       'CHEQ', date '2026-10-01', null,              null,              null,        null,              null,        null,              null,        null),
      ('02191', 'Armada R.D. (Junior Rodriguez)', 'Tanques',     null,       null,     'AS0841253',   '80 cf', 'Aluminio', 'PH',   date '2026-10-14', null,              null,              null,        null,              null,        null,              null,        null),
      ('02193', 'Guillermo Carrasco',             'Reguladores', 'Cressi',   null,     'C1625B0021',  null,    null,       'MANT', date '2026-10-19', null,              null,              null,        null,              null,        null,              null,        null),
      ('02194', 'Guillermo Carrasco',             'Reguladores', 'Cressi',   null,     'M1122520045', null,    null,       'MANT', date '2026-10-19', null,              null,              null,        null,              null,        null,              null,        null),
      ('02195', 'Raul Novoa',                     'Reguladores', 'Aqualung', null,     'B025320',     null,    null,       'MANT', date '2026-10-19', null,              null,              null,        null,              null,        null,              null,        null),
      ('02196', 'Alvaro Martinez',                'Reguladores', 'Scubapro', 'MK20',   '500500698',   null,    null,       'MANT', date '2026-10-19', null,              null,              null,        null,              null,        null,              null,        null),
      ('02197', 'Carlos Piola',                   'Reguladores', 'Oceanic',  'FDX 10', '61440321',    null,    null,       'MANT', date '2026-10-19', null,              null,              null,        null,              null,        null,              null,        null),
      ('02198', 'Emil Simon',                     'Reguladores', 'Mares',    'Abyss',  'EE19639',     null,    null,       'MANT', date '2026-10-19', null,              null,              null,        null,              null,        null,              null,        null),
      ('02199', 'Tomas Checo',                    'Reguladores', 'Oceanic',  null,     '51430787',    null,    null,       'MANT', date '2026-10-19', null,              null,              null,        null,              null,        null,              null,        null),
      ('02200', 'Tomas Checo',                    'Reguladores', 'Aqualung', null,     'A046313',     null,    null,       'MANT', date '2026-10-19', null,              null,              null,        null,              null,        null,              null,        null)
    ) as t(no_orden, cliente, tipo, marca, modelo, serie, tamano, material, servicio, ingreso,
           envio_ph, listo, verificado, notificado, recibe, entrega, factura, cotizacion)
    order by no_orden
  loop
    select id into v_cliente from public.clientes_equipos where lower(trim(nombre)) = lower(r.cliente)
      order by created_at limit 1;

    -- Equipo: el mismo cliente + tipo + serie (o, sin serie, + marca).
    select id into v_equipo from public.equipos_del_cliente
     where cliente_id = v_cliente and tipo_equipo = r.tipo
       and (case when r.serie is not null then lower(trim(serie)) = lower(r.serie)
                 else serie is null and coalesce(lower(marca), '') = coalesce(lower(r.marca), '') end)
     order by created_at limit 1;
    if v_equipo is null then
      v_n := v_n + 1;
      insert into public.equipos_del_cliente
        (cliente_id, tipo_equipo, marca, modelo, serie, tamano, material, regulador_componentes_detalle,
         user_id, nombre_usuario_snapshot, created_at)
      values
        (v_cliente, r.tipo, r.marca, r.modelo, r.serie, r.tamano, r.material,
         case when r.tipo = 'Reguladores' then '{}'::jsonb else null end,
         v_titular, v_nombre, now() + v_n * interval '1 second')
      returning id into v_equipo;
      c_equipos := c_equipos + 1;
    end if;

    -- Orden (se salta si ese No. ya existe).
    if exists (select 1 from public.ordenes_equipos where trim(no_orden_fisico) = r.no_orden) then
      c_saltadas := c_saltadas + 1;
      continue;
    end if;

    v_n := v_n + 1;
    insert into public.ordenes_equipos (
      user_id, nombre_usuario_snapshot, no_orden_fisico,
      cliente_id, cliente_nombre_snapshot,
      equipo_id, tipo_equipo, equipo_marca_snapshot, equipo_modelo_snapshot,
      que_se_hara, fecha, estado,
      fecha_envio_hidrostatica, fecha_listo_entrega, verificado_por,
      notificaciones_cliente, fecha_notificacion_cliente,
      fecha_entrega_cliente, nombre_recibe, factura, cotizacion, bitacora_orden,
      regulador_componentes, created_at, updated_at
    ) values (
      v_titular, v_nombre, r.no_orden,
      v_cliente, r.cliente,
      v_equipo, r.tipo, r.marca, r.modelo,
      case r.servicio when 'PH' then v_srv_ph when 'MANT' then v_srv_mant else v_srv_cheq end,
      r.ingreso,
      -- Mismo cálculo que el app (lib/ordenes-estado.js).
      case
        when r.entrega is not null then 'Entregado'
        when r.listo is not null then 'Pendiente por despachar'
        when r.envio_ph is not null then 'En proceso'
        else 'Pendiente por trabajar'
      end,
      r.envio_ph, r.listo, r.verificado,
      -- La hoja no dice por qué medio se avisó: queda como "Otro".
      case when r.notificado is not null
           then jsonb_build_array(jsonb_build_object('fecha', r.notificado, 'medio', 'Otro', 'notas', null))
           else '[]'::jsonb end,
      r.notificado,
      r.entrega, r.recibe, r.factura, r.cotizacion,
      case when r.cotizacion is not null
           then jsonb_build_array(jsonb_build_object(
                  'fecha', to_char(current_date, 'YYYY-MM-DD'), 'tipo', 'cotizacion',
                  'texto', 'Cotización agregada: ' || r.cotizacion, 'usuario', v_nombre))
           else '[]'::jsonb end,
      '{}'::jsonb,
      now() + v_n * interval '1 second', now() + v_n * interval '1 second'
    );
    c_ordenes := c_ordenes + 1;
  end loop;

  -- App Interno: T-24, T-53, T-54, T-58 y su envío a PH del 19/10/2026 ----
  for r in select unnest(array['T-24', 'T-53', 'T-54', 'T-58']) as codigo loop
    select id into v_tanque from public.tanques_alquiler where codigo = r.codigo and activo limit 1;
    if v_tanque is null then
      insert into public.tanques_alquiler (codigo, descripcion, activo)
      values (r.codigo, 'Tanque 60 cf aluminio', true)
      returning id into v_tanque;
      c_tanques := c_tanques + 1;
    end if;
    if not exists (select 1 from public.envios_hidrostatica where tanque_id = v_tanque and fecha_regreso is null) then
      insert into public.envios_hidrostatica
        (tanque_id, tanque_codigo_snapshot, fecha_envio, user_id, nombre_usuario_snapshot)
      values (v_tanque, r.codigo, date '2026-10-19', v_titular, v_nombre);
      c_envios := c_envios + 1;
    end if;
  end loop;

  raise notice 'Listo: % clientes, % equipos y % órdenes nuevos (% órdenes ya existían y se saltaron); % tanques nuevos en App Interno y % envíos a PH.',
    c_clientes, c_equipos, c_ordenes, c_saltadas, c_tanques, c_envios;
end $$;

-- Para revisar después (solo lectura):
-- select no_orden_fisico, cliente_nombre_snapshot, tipo_equipo, que_se_hara, fecha, estado
--   from public.ordenes_equipos order by no_orden_fisico;
