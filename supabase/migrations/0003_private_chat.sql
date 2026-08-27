-- ============================================================================
-- KASABA BRIDGE HUB — Migration 0003
-- Özel Sohbet (Direct Messages) altyapısı
--
-- Amaç:
--   Kayıtlı üyeler arası kalıcı, RLS ile korunmuş özel sohbet.
--   - conversations: iki katılımcı arasında TEK konuşma (unique pair).
--   - messages:      konuşmaya ait kalıcı mesajlar.
--
-- ÖNEMLİ: Bu dosya production'a otomatik uygulanmaz. Supabase Dashboard
-- (SQL Editor) üzerinden elle uygulanmalıdır; baseline (0001) notuyla aynıdır.
--
-- Güvenlik hedefleri:
--   1) Konuşmayı ve mesajları YALNIZCA katılımcılar okuyabilir/yazabilir
--      (yönetici dahil normal uygulama erişimi göremez).
--   2) Gönderen kimliği sunucu tarafında doğrulanır: messages.sender_id,
--      policy'lerde auth.uid() ile zorlanır; client kendi ID'sini yazamaz.
--   3) username -> Auth UUID çözümlemesi hassas kolon (email) açmadan yapılır.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- C1) CONVERSATIONS
-- Katılımcı sırası deterministik tutulur (participant_1 < participant_2),
-- böylece aynı ikili için her zaman tek satır/konuşma kullanılır.
-- ----------------------------------------------------------------------------
create table if not exists public.conversations (
  id            uuid primary key default gen_random_uuid(),
  participant_1 uuid not null,
  participant_2 uuid not null,
  created_at    timestamptz not null default now(),
  constraint conversations_pair_ordered check (participant_1 < participant_2),
  constraint conversations_no_self      check (participant_1 <> participant_2),
  constraint conversations_unique_pair  unique (participant_1, participant_2)
);

-- ----------------------------------------------------------------------------
-- C2) MESSAGES
-- created_at veritabanı saatiyle yazılır (güvenilir tarih/saat kaydı;
-- ileride tarih aralığı sorguları ve moderasyon/şikayet akışları için temel).
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null,
  message         text not null,
  created_at      timestamptz not null default now(),
  constraint messages_text_valid
    check (char_length(btrim(message)) > 0 and char_length(message) <= 2000)
);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create index if not exists messages_created_idx
  on public.messages (created_at);

-- ----------------------------------------------------------------------------
-- C3) RLS
-- ----------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

-- Okuma: sadece katılımcılar.
drop policy if exists conversations_select_participants on public.conversations;
create policy conversations_select_participants
  on public.conversations
  for select
  using (
    auth.uid() = participant_1
    or auth.uid() = participant_2
  );

-- Oluşturma: iki katılımcıdan biri auth.uid() olmalı.
drop policy if exists conversations_insert_participants on public.conversations;
create policy conversations_insert_participants
  on public.conversations
  for insert
  with check (
    auth.uid() = participant_1
    or auth.uid() = participant_2
  );

-- Mesaj okuma: yalnızca ait olduğu konuşmanın katılımcıları.
drop policy if exists messages_select_participants on public.messages;
create policy messages_select_participants
  on public.messages
  for select
  using (
    exists (
      select 1
        from public.conversations c
       where c.id = messages.conversation_id
         and (auth.uid() = c.participant_1 or auth.uid() = c.participant_2)
    )
  );

-- Mesaj yazma: sender_id sunucuda auth.uid() ile ZORLANIR.
-- İstemci başka biri adına gönderemez (policy ihlali -> 42501).
drop policy if exists messages_insert_participant_sender on public.messages;
create policy messages_insert_participant_sender
  on public.messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
        from public.conversations c
       where c.id = messages.conversation_id
         and (auth.uid() = c.participant_1 or auth.uid() = c.participant_2)
    )
  );

-- Not: UPDATE/DELETE politikası bilinçli olarak TANIMLANMADI.
-- Mesajlar değiştirilemez/silinemez (denetim izi bütünlüğü).

-- Yetkiler: anon kapatılır, authenticated'e okuma+yazma.
revoke all on public.conversations from anon;
revoke all on public.messages      from anon;

grant select, insert on public.conversations to authenticated;
grant select, insert on public.messages      to authenticated;

-- ----------------------------------------------------------------------------
-- C4) USERNAME -> AUTH UUID ÇÖZÜMLEME
--
-- Login'de kullanılan get_email_by_username deseninin güvenli versiyonu:
-- SECURITY DEFINER + sadece user_id döndürür; email gibi hassas kolonlar
-- asla dışarı sızmaz. Sadece authenticated çağırabilir.
-- ----------------------------------------------------------------------------
create or replace function public.get_profile_id_by_username(p_username text)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select pr.user_id
    from public.profiles pr
   where pr.username = btrim(p_username)
   limit 1;
$$;

revoke execute on function public.get_profile_id_by_username(text) from anon;
revoke execute on function public.get_profile_id_by_username(text) from public;
grant execute  on function public.get_profile_id_by_username(text) to authenticated;

-- ----------------------------------------------------------------------------
-- C5) REALTIME
-- messages tablosunu realtime yayın katmanına ekle (idempotent).
-- Katılımcı olmayanlar RLS select politikası nedeniyle eventi göremez.
-- ----------------------------------------------------------------------------
do $do$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname   = 'supabase_realtime'
       and schemaname = 'public'
       and tablename  = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$do$;


