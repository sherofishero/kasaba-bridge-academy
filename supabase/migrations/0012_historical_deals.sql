-- ============================================================================
-- KASABA BRIDGE HUB — Migration 0012
-- Tarihî turnuva deal havuzu (historical_deals)
--
-- AMAÇ:
--   RealBridge'in kamuya açık Full PBN sonuç dosyalarından içe aktarılan
--   gerçek turnuva board'larını saklamak. Her satır, kaynak turnuvadaki bir
--   (dealer + zon + 52 kartlı tam deal + board numarası) kombinasyonudur.
--   Aynı deal aynı board'da birden fazla masada oynandıysa tüm masa
--   sonuçları `results` (traveller) jsonb dizisinde toplanır.
--
--   `deal` alanı mevcut app/lib/deck 'in Deal tipiyle aynı JSON şeklindedir
--   ({ north, east, south, west : Card[] }). Dealer/Vulnerability alanları
--   mevcut game.ts tipleriyle uyumludur. Böylece ileride tarihî board'lar
--   mevcut oyun masasına (normal oyun / Takım Maçı) sorunsuz dağıtılabilir.
--
-- duplicate kontrolü:
--   `deal_key` kolonu deterministiktir. Aynı (tam deal + dealer + zon +
--   kaynak turnuva + kaynak dosya + board numarası) => aynı anahtar.
--   Farklı masa sonuçları aynı anahtara düşer ve tek satırda toplanır.
--   Supabase upsert (onConflict deal_key) bunu idempotent yapar.
--
-- RLS:
--   SELECT: herkes (misafir dahil) okuyabilir — tarihî havuz geneldir.
--   INSERT: anon + authenticated (import scripti anon key ile çalışır).
--   UPDATE/DELETE politikası YOK (yalnızca import akışı INSERT kullanır).
--   NOT: Production'a otomatik uygulanmaz; Supabase Dashboard (SQL Editor)
--   üzerinden elle çalıştırılır. Idempotenttir.
-- ============================================================================

create table if not exists public.historical_deals (
  id              text        primary key,        -- KSB-000001 ...
  deal_key        text        not null unique,    -- deterministik duplicate anahtarı

  -- Asıl el
  deal            jsonb       not null,           -- { north, east, south, west : Card[] }
  dealer          text        null,
  vulnerability   text        null,

  -- Kaynak
  source_name     text        not null,
  source_url      text        null,
  source_file     text        not null,
  source_license  text        null,
  usage_note      text        null,

  -- Turnuva / seans
  tournament_name text        null,
  tournament_date text        null,
  session         text        null,
  scoring_type    text        null,
  country         text        null,
  organiser       text        null,
  first_board     int         null,
  total_boards    int         null,
  total_tables    int         null,

  -- Board & masa
  board_number    int         null,
  table_number    int         null,
  round           int         null,
  room            text        null,
  home_team       text        null,
  visit_team      text        null,

  -- Referans (ilk) masa oyuncuları ve oyun bilgileri
  north_player    text        null,
  east_player     text        null,
  south_player    text        null,
  west_player     text        null,
  contract        text        null,
  declarer        text        null,
  opening_lead    text        null,
  auction         jsonb       null,
  auction_raw     text        null,
  has_auction     boolean     not null default false,
  play            jsonb       null,
  play_raw        text        null,
  has_play        boolean     not null default false,
  tricks          int         null,
  score           text        null,
  ns_score        int         null,

  -- Traveller: aynı deal'i oynayan TÜM masaların sonuçları
  results         jsonb       not null default '[]'::jsonb,

  -- Ek metadata (%RBDATA / %RBIMPORT vb.)
  metadata        jsonb       not null default '{}'::jsonb,

  imported_at     timestamptz not null default now(),
  verified        boolean     not null default false,

  constraint historical_deals_board_positive
    check (board_number is null or board_number >= 1)
);

create index if not exists historical_deals_deal_key_idx
  on public.historical_deals (deal_key);

create index if not exists historical_deals_tournament_idx
  on public.historical_deals (tournament_name);

create index if not exists historical_deals_board_idx
  on public.historical_deals (board_number);

create index if not exists historical_deals_source_idx
  on public.historical_deals (source_file);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.historical_deals enable row level security;

drop policy if exists historical_deals_select_all on public.historical_deals;
create policy historical_deals_select_all
  on public.historical_deals
  for select
  using (true);

drop policy if exists historical_deals_insert_all on public.historical_deals;
create policy historical_deals_insert_all
  on public.historical_deals
  for insert
  to anon, authenticated
  with check (
    char_length(btrim(id)) > 0
    and id like 'KSB-%'
    and char_length(btrim(deal_key)) > 0
    and deal_key like 'HD-%'
  );

-- ----------------------------------------------------------------------------
-- Import scripti için yardımcı RPC: mevcut en büyük KSB sıra numarası
-- ----------------------------------------------------------------------------
create or replace function public.historical_deals_max_seq()
returns int
language sql
stable
set search_path = pg_catalog, public
as $$
  select coalesce(max(
    case
      when id ~ '^KSB-([0-9]+)$' then (regexp_match(id, '^KSB-([0-9]+)$'))[1]::int
      else 0
    end
  ), 0)
  from public.historical_deals;
$$;

revoke execute on function public.historical_deals_max_seq() from anon, authenticated;
grant execute  on function public.historical_deals_max_seq() to authenticated;