-- ============================================================================
-- KASABA BRIDGE HUB — Masa yaşam döngüsü SQL katmanı (BASELINE)
-- Migration 0001
--
-- Amaç: Supabase Dashboard üzerinden uygulanmış olan masa yaşam döngüsü
-- altyapısının Git'e kaydı. Tüm ifadeler idempotenttir (create or replace /
-- if not exists); canlı veritabanında yeniden çalıştırılması güvenlidir.
--
-- İçerik:
--   B1) pg_cron extension
--   B2) Yardımcılar: kasaba_is_stale, kasaba_still_present,
--       purge_stale_from_state, reassign_host (NULL-fix dahil)
--   B3) heartbeat_table_player RPC
--   B4) tables.version / updated_at kolonları + publish_game_state RPC
--   B5) join_table_seat RPC
--   B6) leave_table_seat RPC
--   B7) remove_stale_players RPC
--   B8) pg_cron job (idempotent kurulum)
--   B9) Yetkiler ve search_path kilitleri
--
-- NOT: Bu dosya production'a otomatik uygulanmaz; referans/kayıt amaçlıdır.
-- ============================================================================

-- ============================================================================
-- B1: EXTENSION
-- ============================================================================
create extension if not exists pg_cron;

-- ============================================================================
-- B2.a: Oyuncu stale mi?
-- NULL/eksik lastSeenAt => stale (eski yapışık kayıtlar ilk sweep'te temizlenir).
-- text->timestamptz cast'i DateStyle'a bagli oldugundan IMMUTABLE DEGIL, STABLE.
-- ============================================================================
create or replace function public.kasaba_is_stale(
  p_player jsonb,
  p_cutoff timestamptz
) returns boolean
language sql
stable
as $$
  select p_player ? 'id'
     and (
       coalesce(p_player ->> 'lastSeenAt', '') = ''
       or (p_player ->> 'lastSeenAt')::timestamptz < p_cutoff
     );
$$;

-- ============================================================================
-- B2.b: Oyuncu id'si hâlâ masada mı? (4 koltuk + spectators)
-- ============================================================================
create or replace function public.kasaba_still_present(
  p_state jsonb,
  p_player_id text
) returns boolean
language sql
stable
as $$
  select exists (
    select 1
    where p_state -> 'northPlayer' ->> 'id' = p_player_id
       or p_state -> 'eastPlayer'  ->> 'id' = p_player_id
       or p_state -> 'southPlayer' ->> 'id' = p_player_id
       or p_state -> 'westPlayer'  ->> 'id' = p_player_id
       or exists (
            select 1
            from jsonb_array_elements(coalesce(p_state -> 'spectators', '[]'::jsonb)) sp
            where sp ->> 'id' = p_player_id
          )
  );
$$;

-- ============================================================================
-- B2.c: State'ten stale oyuncuları temizle.
-- Koltuklar jsonb null'a çekilir, spectators filtrelenir,
-- joinOrder'da masada olmayanlar çıkarılır.
-- Alan yoksa YENİ ALAN EKLENMEZ (eski masa verisi bozulmaz,
-- gereksiz UPDATE/Realtime eventi üretilmez).
-- ============================================================================
create or replace function public.purge_stale_from_state(
  p_state jsonb,
  p_cutoff timestamptz
) returns jsonb
language plpgsql
stable
as $$
declare
  v_state jsonb := p_state;
  v_seat  jsonb;
  v_key   text;
  v_specs jsonb;
begin
  foreach v_key in array array['northPlayer','eastPlayer','southPlayer','westPlayer']
  loop
    v_seat := v_state -> v_key;
    if v_seat is not null
       and jsonb_typeof(v_seat) = 'object'
       and public.kasaba_is_stale(v_seat, p_cutoff) then
      v_state := jsonb_set(v_state, array[v_key], 'null'::jsonb, true);
    end if;
  end loop;

  if v_state ? 'spectators'
     and jsonb_typeof(v_state -> 'spectators') = 'array'
     and jsonb_array_length(v_state -> 'spectators') > 0 then
    select coalesce(jsonb_agg(sp), '[]'::jsonb)
      into v_specs
      from jsonb_array_elements(v_state -> 'spectators') sp
     where jsonb_typeof(sp) = 'object'
       and not public.kasaba_is_stale(sp, p_cutoff);

    if v_specs is distinct from (v_state -> 'spectators') then
      v_state := jsonb_set(v_state, array['spectators'], v_specs, true);
    end if;
  end if;

  if v_state ? 'joinOrder'
     and jsonb_typeof(v_state -> 'joinOrder') = 'array' then
    v_state := jsonb_set(
      v_state,
      array['joinOrder'],
      coalesce((
        select jsonb_agg(oid order by ord)
        from jsonb_array_elements_text(v_state -> 'joinOrder')
             with ordinality as t(oid, ord)
        where public.kasaba_still_present(v_state, t.oid)
      ), '[]'::jsonb),
      true
    );
  end if;

  return v_state;
end;
$$;

-- ============================================================================
-- B2.d: Host devri — KASABA kuralı:
--   1) Mevcut host hâlâ masadaysa DOKUNMA
--   2) joinOrder'da hâlâ masada olan İLK oyuncu (giriş hiyerarşisi)
--   3) Fallback (joinOrder yok/eski masa): spectators[0] → N → E → S → W
--   4) Kimse kalmadıysa hostPlayerId = null
--
-- NULL BUG NOTU (0002 migration'da da belgelenmiştir):
-- to_jsonb STRICT'tir; v_next NULL iken to_jsonb(NULL) = SQL NULL,
-- jsonb_set de STRICT olduğundan fonksiyon NULL döner ve
-- "null value in column state violates not-null constraint" (23502)
-- üretilirdi. coalesce(..., 'null'::jsonb) ile düzeltildi.
-- ============================================================================
create or replace function public.reassign_host(
  p_state jsonb
) returns jsonb
language plpgsql
stable
as $$
declare
  v_state jsonb := p_state;
  v_host  text;
  v_next  text;
begin
  v_host := v_state ->> 'hostPlayerId';

  if v_host is not null
     and v_host <> ''
     and public.kasaba_still_present(v_state, v_host) then
    return v_state;
  end if;

  v_next := null;

  if v_state ? 'joinOrder'
     and jsonb_typeof(v_state -> 'joinOrder') = 'array' then
    select t.oid
      into v_next
      from jsonb_array_elements_text(v_state -> 'joinOrder')
           with ordinality as t(oid, ord)
     where public.kasaba_still_present(v_state, t.oid)
     order by t.ord
     limit 1;
  end if;

  if v_next is null then
    v_next := coalesce(
      case when jsonb_typeof(coalesce(v_state -> 'spectators','[]'::jsonb)) = 'array'
                and jsonb_array_length(coalesce(v_state -> 'spectators','[]'::jsonb)) > 0
           then v_state -> 'spectators' -> 0 ->> 'id' end,
      nullif(v_state -> 'northPlayer' ->> 'id', ''),
      nullif(v_state -> 'eastPlayer'  ->> 'id', ''),
      nullif(v_state -> 'southPlayer' ->> 'id', ''),
      nullif(v_state -> 'westPlayer'  ->> 'id', '')
    );
  end if;

  v_state := jsonb_set(
    v_state,
    array['hostPlayerId'],
    coalesce(to_jsonb(v_next), 'null'::jsonb),
    true
  );

  return v_state;
end;
$$;

-- ============================================================================
-- B3: heartbeat_table_player(table_id, player_id, role)
-- Koltuk sahipliği WHERE ile doğrulanır; yalnızca <seat>.lastSeenAt güncellenir.
-- Satır bazlı UPDATE -> sweep/publish ile aynı satır kilidinde serileşir.
-- ============================================================================
create or replace function public.heartbeat_table_player(
  p_table_id  text,
  p_player_id text,
  p_role      text
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_seat_key text;
begin
  if p_role = 'North' then v_seat_key := 'northPlayer';
  elsif p_role = 'East'  then v_seat_key := 'eastPlayer';
  elsif p_role = 'South' then v_seat_key := 'southPlayer';
  elsif p_role = 'West'  then v_seat_key := 'westPlayer';
  else
    raise exception 'invalid seat: %', p_role;
  end if;

  update public.tables
     set state = jsonb_set(
           state,
           array[v_seat_key, 'lastSeenAt'],
           to_jsonb(to_char(now() at time zone 'utc',
                    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
           true)
   where id = p_table_id
     and state -> v_seat_key ->> 'id' = p_player_id;
end;
$$;

-- ============================================================================
-- B4 ÖN KOŞUL: idempotent kolon ekleme (optimizasyon/sıra numarası)
-- ============================================================================
alter table public.tables
  add column if not exists version int not null default 1;
alter table public.tables
  add column if not exists updated_at timestamptz not null default now();

-- ============================================================================
-- B4: publish_game_state(table_id, patch)
-- Yalnızca beyaz listedeki OYUN alanları mevcut satır üzerine merge edilir.
-- Koltuk/kimlik alanları patch'ten ZORLA elenir -> stale oyuncu diriltilemez.
-- Tek UPDATE + satır kilidi = atomik.
-- ============================================================================
create or replace function public.publish_game_state(
  p_table_id text,
  p_patch    jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_allowed constant text[] := array[
    'activeTrainingDeal','boardNumber','currentDeal','currentAuction',
    'dealer','vulnerability','currentTurn','newBoardRequest','autoPass'
  ];
  v_clean jsonb;
  v_new   jsonb;
begin
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
    into v_clean
    from jsonb_each(p_patch)
   where key = any (v_allowed);

  if v_clean = '{}'::jsonb then
    raise exception 'publish_game_state: patch contains no allowed keys';
  end if;

  update public.tables
     set state      = state || v_clean,
         version    = version + 1,
         updated_at = now()
   where id = p_table_id
  returning state into v_new;

  if not found then
    raise exception 'table not found: %', p_table_id;
  end if;

  return v_new;
end;
$$;

-- ============================================================================
-- B5: join_table_seat(table_id, player_id, name, role)
-- Satır kilidi altında boş koltuk kontrolü + oturtma TEK işlemde.
-- Aynı oyuncu kendi koltuğundaysa idempotent restore (F5).
-- joinOrder yoksa '[]' ile başlatılır; host boşsa ilk giren host olur.
-- ============================================================================
create or replace function public.join_table_seat(
  p_table_id  text,
  p_player_id text,
  p_name      text,
  p_role      text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state    jsonb;
  v_seat_key text;
  v_existing jsonb;
  v_now      text;
begin
  if p_role = 'North' then v_seat_key := 'northPlayer';
  elsif p_role = 'East'  then v_seat_key := 'eastPlayer';
  elsif p_role = 'South' then v_seat_key := 'southPlayer';
  elsif p_role = 'West'  then v_seat_key := 'westPlayer';
  else
    raise exception 'invalid seat: %', p_role;
  end if;

  v_now := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  select state into v_state
    from public.tables
   where id = p_table_id
   for update;

  if not found then
    raise exception 'table not found: %', p_table_id;
  end if;

  v_existing := v_state -> v_seat_key;

  if v_existing is not null
     and jsonb_typeof(v_existing) = 'object'
     and v_existing ->> 'id' = p_player_id then
    v_state := jsonb_set(v_state,
      array[v_seat_key, 'lastSeenAt'], to_jsonb(v_now), true);

  elsif v_existing is not null
        and jsonb_typeof(v_existing) = 'object' then
    raise exception '% seat is occupied', p_role;

  else
    v_state := jsonb_set(v_state,
      array[v_seat_key],
      jsonb_build_object(
        'id',         p_player_id,
        'name',       p_name,
        'role',       p_role,
        'lastSeenAt', v_now),
      true);

    if not (v_state ? 'joinOrder'
            and jsonb_typeof(v_state -> 'joinOrder') = 'array') then
      v_state := jsonb_set(v_state, array['joinOrder'],
                           jsonb_build_array(p_player_id), true);
    elsif not exists (
      select 1 from jsonb_array_elements_text(v_state -> 'joinOrder') oid
       where oid = p_player_id
    ) then
      v_state := jsonb_set(v_state, array['joinOrder'],
        (v_state -> 'joinOrder') || to_jsonb(p_player_id), true);
    end if;
  end if;

  if coalesce(v_state ->> 'hostPlayerId', '') = '' then
    v_state := jsonb_set(v_state, array['hostPlayerId'],
                         to_jsonb(p_player_id), true);
  end if;

  update public.tables
     set state = v_state, version = version + 1, updated_at = now()
   where id = p_table_id;

  return v_state;
end;
$$;

-- ============================================================================
-- B6: leave_table_seat(table_id, player_id)
-- Tek transaction: koltuk + spectators + joinOrder temizliği,
-- ardından reassign_host ile KASABA hiyerarşisine göre host devri.
-- ============================================================================
create or replace function public.leave_table_seat(
  p_table_id  text,
  p_player_id text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state jsonb;
  v_key   text;
  v_specs jsonb;
begin
  select state into v_state
    from public.tables
   where id = p_table_id
   for update;

  if not found then
    raise exception 'table not found: %', p_table_id;
  end if;

  foreach v_key in array array['northPlayer','eastPlayer','southPlayer','westPlayer']
  loop
    if v_state -> v_key ->> 'id' = p_player_id then
      v_state := jsonb_set(v_state, array[v_key], 'null'::jsonb, true);
    end if;
  end loop;

  if coalesce(v_state -> 'spectators', '[]'::jsonb) <> '[]'::jsonb then
    select coalesce(jsonb_agg(sp), '[]'::jsonb)
      into v_specs
      from jsonb_array_elements(v_state -> 'spectators') sp
     where sp ->> 'id' <> p_player_id;

    v_state := jsonb_set(v_state, array['spectators'], v_specs, true);
  end if;

  if v_state ? 'joinOrder'
     and jsonb_typeof(v_state -> 'joinOrder') = 'array' then
    v_state := jsonb_set(v_state, array['joinOrder'],
      coalesce((
        select jsonb_agg(oid order by ord)
        from jsonb_array_elements_text(v_state -> 'joinOrder')
             with ordinality as t(oid, ord)
        where t.oid <> p_player_id
      ), '[]'::jsonb),
      true);
  end if;

  v_state := public.reassign_host(v_state);

  update public.tables
     set state = v_state, version = version + 1, updated_at = now()
   where id = p_table_id;

  return v_state;
end;
$$;

-- ============================================================================
-- B7: remove_stale_players(stale_seconds default 150)
-- Tüm masaları FOR UPDATE ile kilitli gezer; stale koltuk/spectator/
-- joinOrder temizler, host devreder. Değişiklik yoksa UPDATE yapmaz.
-- Tek masadaki hata tüm sweep'i bloklamaz (warning).
-- ============================================================================
create or replace function public.remove_stale_players(
  p_stale_seconds int default 150
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  r        record;
  v_cutoff timestamptz := now() - make_interval(secs => p_stale_seconds);
  v_new    jsonb;
begin
  for r in
    select id, state
      from public.tables
     order by id
       for update
  loop
    begin
      v_new := public.reassign_host(
                 public.purge_stale_from_state(r.state, v_cutoff));

      if v_new is distinct from r.state then
        update public.tables
           set state      = v_new,
               version    = version + 1,
               updated_at = now()
         where id = r.id;
      end if;
    exception when others then
      raise warning '[kasaba-sweep] table % skipped: %', r.id, sqlerrm;
    end;
  end loop;
end;
$$;

-- ============================================================================
-- B8: pg_cron job (idempotent — aynı isim varsa önce iptal edilir)
-- ============================================================================
do $do$
begin
  if exists (select 1 from cron.job where jobname = 'kasaba-stale-player-sweep') then
    perform cron.unschedule('kasaba-stale-player-sweep');
  end if;
  perform cron.schedule(
    'kasaba-stale-player-sweep',
    '30 seconds',
    $job$select public.remove_stale_players(150);$job$
  );
end;
$do$;

-- ============================================================================
-- B9: search_path kilitleri (SECURITY DEFINER hijack koruması)
-- ============================================================================
alter function public.kasaba_is_stale(jsonb, timestamptz)         set search_path = pg_catalog, public;
alter function public.kasaba_still_present(jsonb, text)           set search_path = pg_catalog, public;
alter function public.purge_stale_from_state(jsonb, timestamptz)  set search_path = pg_catalog, public;
alter function public.reassign_host(jsonb)                        set search_path = pg_catalog, public;
alter function public.heartbeat_table_player(text, text, text)    set search_path = pg_catalog, public;
alter function public.publish_game_state(text, jsonb)             set search_path = pg_catalog, public;
alter function public.join_table_seat(text, text, text, text)     set search_path = pg_catalog, public;
alter function public.leave_table_seat(text, text)                set search_path = pg_catalog, public;
alter function public.remove_stale_players(int)                   set search_path = pg_catalog, public;

-- İstemcinin (anon key) çağıracağı RPC'ler:
grant execute on function public.heartbeat_table_player(text, text, text) to anon, authenticated;
grant execute on function public.publish_game_state(text, jsonb)          to anon, authenticated;
grant execute on function public.join_table_seat(text, text, text, text)  to anon, authenticated;
grant execute on function public.leave_table_seat(text, text)             to anon, authenticated;

-- Yardımcılar ve sweep istemciye açılmaz:
revoke execute on function public.kasaba_is_stale(jsonb, timestamptz)        from anon, authenticated;
revoke execute on function public.kasaba_still_present(jsonb, text)          from anon, authenticated;
revoke execute on function public.purge_stale_from_state(jsonb, timestamptz) from anon, authenticated;
revoke execute on function public.reassign_host(jsonb)                       from anon, authenticated;
revoke execute on function public.remove_stale_players(int)                  from anon, authenticated;



