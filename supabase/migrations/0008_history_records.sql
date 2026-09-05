-- ============================================================================
-- KASABA BRIDGE HUB — Migration 0008
-- History: ortak geçmiş kayıt tablosu (tüm oyun türleri)
--
-- KAPSAM:
--   - Tamamlanmış board'ların snapshot kaydı (deal, auction, players,
--     dealer, vulnerability). Skorlama alanları (contract, declarer,
--     result, score, play_record) nullable; skorlama motoru gelince
--     doldurulur — şimdilik NULL.
--   - Takım maçı: other_table_ref; turnuva: round + board_sequence.
--
-- TEMİZLİK / YAŞAM DÖNGÜSÜ:
--   - Masa boşalınca (4 koltuk boş) o masanın history_records kayıtları
--     otomatik silinir (0007 chat deseniyle aynı trigger yaklaşımı).
--   - Gelecekteki SIFIRLA için clear_table_history(text) RPC'si sunulur
--     (security definer; yalnızca authenticated çağırabilir).
--
-- RLS:
--   SELECT: TÜM kullanıcılar (anon misafir dahil) okuyabilir. KASABA masaları
--   varsayılan olarak misafir (guestName) tabanlı çok oyunculudur ve oyuncu
--   kimliği oturum (auth.uid()) ile değil, masa state'inde koltuk id'si olarak
--   taşınır. Anon kullanıcının server tarafında kimliği doğrulanamadığı için
--   user_is_at_table() anon'da her zaman FALSE döner; bu da history'nin yalnızca
--   giriş yapmış oyuncularda görünmesine yol açıyordu. INSERT zaten anon'a açık
--   olduğundan okuma da aynı erişim açıklığıyla eşitlenir (masa geçmişi tüm
--   katılımcılarda aynı tableId ile görünür). Güvenlik tarafında history kayıtları
--   yalnızca tamamlanmış board durumlarıdır; silme (clear_table_history) hâlâ
--   authenticated-only user_is_at_table() ile korunur.
--   INSERT anon + authenticated (misafirler de masa oynar).
--   UPDATE/DELETE politikası YOK (temizlik RPC/trigger ile; DELETE
--   kapsamı her iki yolda da user_is_at_table ile sınırlıdır).
--
-- NOT: Production'a otomatik uygulanmaz; Supabase Dashboard (SQL Editor)
-- üzerinden elle çalıştırılır. Idempotenttir.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) TABLO
-- ----------------------------------------------------------------------------
create table if not exists public.history_records (
  id             text primary key, -- deterministik: hist:{type}:{tableId}:board:{n}[:seqK]
  game_type      text        not null,
  table_id       text        not null,
  board_number   int         not null,
  round          int         null,
  board_sequence int         null,
  players        jsonb       not null,
  deal           jsonb       not null,
  auction        jsonb       not null,
  dealer         text        null,
  vulnerability  text        null,
  contract       text        null,
  declarer       text        null,
  result         text        null,
  score          int         null,
  play_record    jsonb       null,
  other_table_ref text       null,
  completion_state text      not null default 'COMPLETED',
  completed_at   timestamptz not null default now(),

  constraint history_records_game_type_valid
    check (game_type in ('GAME', 'TRAINING', 'EDUCATION', 'TEAM_MATCH', 'TOURNAMENT')),
  constraint history_records_board_valid
    check (board_number >= 1)
);

create index if not exists history_records_table_board_idx
  on public.history_records (table_id, board_number);

create index if not exists history_records_game_type_idx
  on public.history_records (game_type);

-- ----------------------------------------------------------------------------
-- 2) ÜYELİK DOĞRULAMA (SECURITY DEFINER)
--
-- History temizliğinin (clear_table_history RPC) güvenlik kaynağı:
--   - Çağıran kullanıcı, hedef masanın ŞU ANDA oyuncusu vEYA izleyicisi ise
--     true döner (masadaki oyuncu/izleyici kimliği = username).
--   - Üye username'i auth.uid() üzerinden get_member_display_name() ile
--     çözülür (0005). Misafirler (anon) için auth.uid() yoktur -> her zaman
--     false döner; yani anon, bu fonksiyonla doğrulama gerektiren
--     silme işlemlerini gerçekleştiremez (okuma artık public'tir).
--   - SECURITY DEFINER: public.tables üzerindeki olası RLS'i baypas eder
--     (0005 username_is_member deseniyle aynı) ve yalnızca boolean
--     döndürdüğünden masa içeriği sızmaz.
-- ----------------------------------------------------------------------------
create or replace function public.user_is_at_table(p_table_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_username text := public.get_member_display_name();
  v_state    jsonb;
begin
  if v_username is null or btrim(v_username) = '' then
    return false;
  end if;

  select t.state
    into v_state
    from public.tables t
   where t.id::text = p_table_id;

  if v_state is null then
    return false;
  end if;

  -- Oyuncu koltukları (4'ünün de kimliği = username).
  if lower(coalesce(v_state -> 'northPlayer' ->> 'id','')) = lower(btrim(v_username))
     or lower(coalesce(v_state -> 'eastPlayer'  ->> 'id','')) = lower(btrim(v_username))
     or lower(coalesce(v_state -> 'southPlayer' ->> 'id','')) = lower(btrim(v_username))
     or lower(coalesce(v_state -> 'westPlayer'  ->> 'id','')) = lower(btrim(v_username)) then
    return true;
  end if;

  -- İzleyiciler (id alanı da username tutar).
  if exists (
        select 1
          from jsonb_array_elements(coalesce(v_state -> 'spectators','[]'::jsonb)) s
         where lower(coalesce(s ->> 'id','')) = lower(btrim(v_username))
     ) then
    return true;
  end if;

  return false;
end;
$$;

revoke execute on function public.user_is_at_table(text) from anon;
grant execute  on function public.user_is_at_table(text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3) RLS
-- ----------------------------------------------------------------------------
alter table public.history_records enable row level security;

drop policy if exists history_records_select_all on public.history_records;
-- Tüm masa katılımcıları (misafir dahil) aynı tableId ile geçmişi görebilir.
create policy history_records_select_all
  on public.history_records
  for select
  using (true);

drop policy if exists history_records_insert_all on public.history_records;
create policy history_records_insert_all
  on public.history_records
  for insert
  to anon, authenticated
  with check (
    game_type in ('GAME', 'TRAINING', 'EDUCATION', 'TEAM_MATCH', 'TOURNAMENT')
    and board_number >= 1
    and char_length(btrim(table_id)) > 0
    and char_length(btrim(id)) > 0
    and id like 'hist:%'
  );

-- ----------------------------------------------------------------------------
-- 4) MASA BOŞALINCA OTOMATİK TEMİZLİK (0007 deseni)
--    4 oyuncu koltuğu boşaldığında o masanın history kayıtları silinir.
--    spectators dikkate alınmaz. Trigger, leave_table_seat (manuel çıkış)
--    ve remove_stale_players (cron sweep) yollarının ikisini de kapsar.
-- ----------------------------------------------------------------------------
create or replace function public.clear_history_if_table_empty()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  delete from public.history_records hr
   where hr.table_id = new.state ->> 'id'
     and not exists (
       select 1
         from public.tables t
        where t.id = new.state ->> 'id'
          and (
               coalesce(t.state -> 'northPlayer' ->> 'id', '') <> ''
            or coalesce(t.state -> 'eastPlayer'  ->> 'id', '') <> ''
            or coalesce(t.state -> 'southPlayer' ->> 'id', '') <> ''
            or coalesce(t.state -> 'westPlayer'  ->> 'id', '') <> ''
          )
     );

  return new;
end;
$$;

drop trigger if exists trg_clear_history_on_table_update on public.tables;

create trigger trg_clear_history_on_table_update
after update of state on public.tables
for each row
execute function public.clear_history_if_table_empty();

-- ----------------------------------------------------------------------------
-- 5) SIFIRLA ALTYAPISI (buton bu sürümde YOK; RPC üyelik-kontrollü)
-- ----------------------------------------------------------------------------
-- Yalnızca hedef masanın ŞU ANKI oyuncusu/izleyicisi çağırabilir
-- (user_is_at_table). Başka bir authenticated kullanıcı, başka bir
-- table_id vererek o masanın geçmişini SİLEMEZ. Misafir (anon) çağıramaz.
-- Masanın son oyuncusu çıktıktan SONRA çağrılırsa üyelik kalmaz, silme
-- yapılmaz; o durumda otomatik temizlik zaten 4) bölümündeki trigger ile
-- gerçekleşir (client tabanlı silmeye gerek yoktur).
create or replace function public.clear_table_history(
  p_table_id text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if public.user_is_at_table(p_table_id) then
    delete from public.history_records
     where table_id = p_table_id;
  end if;
end;
$$;

revoke execute on function public.clear_table_history(text) from anon;
grant execute  on function public.clear_table_history(text) to authenticated;
