-- ============================================================================
-- KASABA BRIDGE HUB — Migration 0011
-- publish_game_state: pendingAlertObligations alanını beyaz listeye ekle
--
-- KAPSAM:
--   ALERT açıklama isteği akışı, isteği masa state'indeki
--   `pendingAlertObligations` alanına yazar (TableState). Çok oyunculu
--   masada açıklama isteğinin hedef dekleranın oturumuna ANINDA ulaşması
--   için publish_game_state RPC'sinin v_allowed dizisine eklenmesi gerekir.
--   Aksi halde RPC bu anahtarı sessizce eler ve popup hedef oyuncuda
--   asla açılmaz.
--
--   0010'un idempotent yeniden yayımıdır; mevcut alanlar korunur.
--   Production'a Supabase Dashboard (SQL Editor) üzerinden elle uygulanır.
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
    'dealer','vulnerability','currentTurn','newBoardRequest','autoPass',
    'gamePhase','contract','declarer','dummy','openingLeader','playTurn',
    'originalDeal','currentTrick','completedTricks','playedCards',
    'undoRequest',
    'pendingAlertObligations'
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

-- search_path kilidi (0001 ile aynı güvenlik deseni)
alter function public.publish_game_state(text, jsonb)
  set search_path = pg_catalog, public;