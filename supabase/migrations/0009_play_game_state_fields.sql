-- ============================================================================
-- KASABA BRIDGE HUB — Migration 0009
-- publish_game_state: kart oynama (play) alanlarını beyaz listeye ekle
--
-- KAPSAM:
--   Ortak briç kart oynama motoru (app/lib/play.ts) TableState'e şu
--   alanları ekledi: gamePhase, contract, declarer, dummy, openingLeader,
--   playTurn, originalDeal, currentTrick, completedTricks, playedCards.
--
--   Bu alanların çok oyunculu masada senkronize olabilmesi için sunucu
--   tarafındaki publish_game_state RPC'sinin v_allowed (beyaz liste)
--   dizisine eklenmesi gerekir. Aksi halde RPC bu anahtarları eler ve
--   state yalnızca istemcide kalır.
--
--   Mevcut alanlar korunur; RPC davranışı yalnızca GENİŞLETİLİR.
--   create or replace + idempotent olduğundan yeniden çalıştırılması
--   güvenlidir.
--
-- NOT: Production'a otomatik uygulanmaz; Supabase Dashboard (SQL Editor)
-- üzerinden elle çalıştırılır.
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
    'originalDeal','currentTrick','completedTricks','playedCards'
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