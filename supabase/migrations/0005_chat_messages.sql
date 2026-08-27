-- ============================================================================
-- KASABA BRIDGE HUB — Migration 0005
-- ChatBox genel sohbeti: kalıcı mesaj geçmişi
--
-- Amaç:
--   Genel sohbet (SALON / MASA / RAKİPLER / İZLEYİCİLER) mesajları artık
--   ephemeral Realtime broadcast yerine public.chat_messages tablosunda
--   kalıcı tutulur. Sayfa yenilendiğinde geçmiş yeniden yüklenebilir.
--
-- Kanal değerleri, app/lib/supabase.ts içindeki ChatChannel tipiyle
-- BİREBİR aynıdır ('SALON' | 'MASA' | 'RAKİPLER' | 'İZLEYİCİLER').
--   - SALON:        genel salon, table_id NULL.
--   - MASA:         masa sohbeti, table_id zorunlu.
--   - RAKİPLER:     masa bazlı, table_id zorunlu.
--   - İZLEYİCİLER:  masa bazlı, table_id zorunlu.
--
-- ÖNEMLİ: Bu dosya production'a otomatik uygulanmaz. Supabase Dashboard
-- (SQL Editor) üzerinden elle çalıştırılır (0001/0003 notuyla aynı).
--
-- Özel sohbet tablolarına (conversations / messages) DOKUNULMAZ.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) TABLO
-- ----------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id         uuid primary key,
  -- Client üretir (createChatMessageId) ve gönderir; dedup için korunur.
  channel    text        not null,
  table_id   text        null, -- masa sohbetlerinde masa kimliği (string)
  user_id    text        not null,
  user_name  text        not null,
  text       text        not null,
  created_at timestamptz not null default now(),

  constraint chat_messages_channel_valid
    check (channel in ('SALON', 'MASA', 'RAKİPLER', 'İZLEYİCİLER')),
  constraint chat_messages_text_valid
    check (char_length(btrim(text)) > 0 and char_length(text) <= 2000),
  constraint chat_messages_user_valid
    check (
      char_length(btrim(user_id)) > 0
      and char_length(btrim(user_id)) <= 64
      and char_length(btrim(user_name)) > 0
      and char_length(btrim(user_name)) <= 30
    ),
  -- SALON dışındaki tüm kanallar masa bazlıdır; table_id zorunludur.
  constraint chat_messages_table_id_required
    check (channel = 'SALON' or table_id is not null)
);

create index if not exists chat_messages_channel_created_idx
  on public.chat_messages (channel, created_at desc);

create index if not exists chat_messages_table_created_idx
  on public.chat_messages (table_id, created_at desc)
  where table_id is not null;

-- ----------------------------------------------------------------------------
-- 2) KİMLİK DOĞRULAMA FONKSİYONLARI (SECURITY DEFINER)
--
-- Policy içindeki tablo alt sorguları çağıran kullanıcının yetkilerine ve
-- hedef tablonun RLS'sine tabidir; profiles RLS'si anon'u engellediği için
-- doğrulamalar security definer fonksiyonlarla yapılır (0003 C4 deseni).
-- search_path kilitli (B9/0003 hijayne karşı koruma).
-- ----------------------------------------------------------------------------

-- Giriş yapmış üyenin profiles'taki gerçek nick'i.
create or replace function public.get_member_display_name()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select pr.username
    from public.profiles pr
   where pr.user_id = auth.uid()
   limit 1;
$$;

-- Verilen nick kayıtlı bir üyeye mi ait? (misafir politikası için)
create or replace function public.username_is_member(p_name text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
      from public.profiles pr
     where lower(pr.username) = lower(btrim(p_name))
     limit 1
  );
$$;

revoke execute on function public.get_member_display_name() from anon;
revoke execute on function public.username_is_member(text)   from anon;
grant execute  on function public.get_member_display_name() to authenticated;
grant execute  on function public.username_is_member(text)   to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3) RLS
--
-- Misafir (guest) sistemi Auth kullanmaz: ChatInput localStorage'daki
-- chatUserId + guestName ile anon key üzerinden mesaj gönderir. Bu yüzden
-- anon'a SELECT + INSERT vermek mevcut davranış için ZORUNLUDUR.
--
-- KİMLİK SAHTECİLİĞİ ENGELLEMESİ:
--   - authenticated: user_id = auth.uid() ZORUNLU; user_name sunucuda
--     profiles'tan çözülen gerçek nick ile (harf duyarsız) eşleşmek zorunda.
--     Client kimseye ait olmayan bir nick/UUID gönderemez.
--   - anon (misafir): kayıtlı üye nick'i KULLANILAMAZ (username_is_member
--     engeller) -> misafir, üyeyi taklit edemez. Kendi misafir adıyla
--     yazmaya devam eder; mevcut misafir davranışı korunur.
--
-- UPDATE/DELETE politikası bilinçli olarak YOKTUR (mesajlar
-- değiştirilemez/silinemez).
--
-- TODO(rate-limiting): anon INSERT için hız sınırı (Supabase Edge Function
-- gateway veya DB trigger tabanlı throttle) ayrı bir iş olarak eklenecek.
-- ----------------------------------------------------------------------------
alter table public.chat_messages enable row level security;

drop policy if exists chat_messages_select_all on public.chat_messages;
create policy chat_messages_select_all
  on public.chat_messages
  for select
  using (true);

-- Ortak satır kuralları (kanal beyaz listesi, metin, masa zorunluluğu).
-- CHECK constraint'ler tablo seviyesinde de aynı kuralları uygular.

drop policy if exists chat_messages_insert_member on public.chat_messages;
create policy chat_messages_insert_member
  on public.chat_messages
  for insert
  to authenticated
  with check (
    user_id = auth.uid()::text
    and lower(btrim(user_name)) = lower(btrim(public.get_member_display_name()))
    and char_length(btrim(user_name)) <= 30
    and channel in ('SALON', 'MASA', 'RAKİPLER', 'İZLEYİCİLER')
    and char_length(btrim(text)) > 0
    and char_length(text) <= 2000
    and (channel = 'SALON' or table_id is not null)
  );

drop policy if exists chat_messages_insert_guest on public.chat_messages;
create policy chat_messages_insert_guest
  on public.chat_messages
  for insert
  to anon
  with check (
    char_length(btrim(user_id)) > 0
    and char_length(btrim(user_id)) <= 64
    and char_length(btrim(user_name)) > 0
    and char_length(btrim(user_name)) <= 30
    and not public.username_is_member(user_name)
    and channel in ('SALON', 'MASA', 'RAKİPLER', 'İZLEYİCİLER')
    and char_length(btrim(text)) > 0
    and char_length(text) <= 2000
    and (channel = 'SALON' or table_id is not null)
  );

-- ----------------------------------------------------------------------------
-- 4) REALTIME
-- chat_messages tablosunu supabase_realtime yayınına ekle (idempotent).
-- Böylece istemciler postgres_changes INSERT eventleriyle yeni mesajları
-- alır; RLS select politikası herkese açık olduğundan tüm kullanıcılar
-- genel sohbeti görür.
-- ----------------------------------------------------------------------------
do $do$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname    = 'supabase_realtime'
       and schemaname = 'public'
       and tablename  = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end;
$do$;
