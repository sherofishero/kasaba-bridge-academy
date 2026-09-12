-- ============================================================================
-- KASABA BRIDGE HUB — Migration 0007
-- Masa tamamen boşalınca masa sohbet geçmişinin silinmesi
--
-- KURAL:
--   - Bir masanın 4 oyuncu koltuğunun (north/east/south/west) TAMAMI boşsa
--     masa "boş" sayılır ve o masaya ait sohbet geçmişi silinir.
--   - İzleyiciler (spectators) masanın doluluğunu ETKİLEMEZ.
--   - Yalnızca ilgili masanın (table_id) MASA / RAKİPLER / İZLEYİCİLER
--     kanalı mesajları silinir.
--   - SALON (table_id IS NULL) ve özel sohbet (conversations/messages)
--     tablolarına DOKUNULMAZ.
--   - Diğer masaların mesajlarına dokunulmaz.
--
-- KAPSAMA NEDEN TRIGGER:
--   Masanın boşalması iki yoldan olabilir:
--     1) leave_table_seat (manuel çıkış, 0001 B6)
--     2) remove_stale_players cron sweep (sessiz çıkış, 0001 B7)
--   Her ikisi de tables.state UPDATE üretir; trigger tüm yolları tek
--   noktadan kapsar. Client koduna güvenilmez, race condition yoktur.
--
-- RLS:
--   chat_messages için DELETE politikası AÇILMAZ (0005 sertleştirmesi
--   korunur); silme security definer fonksiyon üzerinden yapılır.
--
-- NOT: Bu dosya production'a otomatik uygulanmaz; Supabase Dashboard
-- (SQL Editor) üzerinden elle çalıştırılır (0001/0003/0005/0006 notuyla
-- aynı). Idempotenttir (drop if exists + create or replace).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) FONKSİYON
--    not: chat_messages.table_id ve tables.id metin tabanlıdır (0001 RPC'leri
--    p_table_id text kullanır); bu yüzden parametre tipi TEXT'tir.
-- ----------------------------------------------------------------------------
create or replace function public.clear_chat_if_table_empty(
  p_table_id text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_table_id is null or btrim(p_table_id) = '' then
    return;
  end if;

  -- Masa gerçekten var mı? Yoksa mesajları silme (kayıtsız silme riskini kır).
  if not exists (select 1 from public.tables t where t.id = p_table_id) then
    return;
  end if;

  -- Yalnızca masa gerçekten boşsa sil.
  -- 4 koltuğun hiçbirinde id dolu olan bir oyuncu bulunmamalı.
  -- Spectatorlar masanın doluluğunu etkilendirmez; kontrol edilmez.
  delete from public.chat_messages cm
   where cm.table_id = p_table_id
     and cm.channel in ('MASA', 'RAKİPLER', 'İZLEYİCİLER')
     and not exists (
       select 1
         from public.tables t
        where t.id = p_table_id
          and (
               coalesce(t.state -> 'northPlayer' ->> 'id', '') <> ''
            or coalesce(t.state -> 'eastPlayer'  ->> 'id', '') <> ''
            or coalesce(t.state -> 'southPlayer' ->> 'id', '') <> ''
            or coalesce(t.state -> 'westPlayer'  ->> 'id', '') <> ''
          )
     );
end;
$$;

revoke execute on function public.clear_chat_if_table_empty(text) from anon, authenticated;
grant execute on function public.clear_chat_if_table_empty(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 2) TRIGGER
--    tables.state her güncellendiğinde çalışır; silme yalnızca masa boşsa
--    gerçekleşir (fonksiyonun içindeki koşul). Boş olmayan masalarda
--    fonksiyon no-op'tur.
-- ----------------------------------------------------------------------------
drop trigger if exists trg_clear_chat_on_table_update on public.tables;

create trigger trg_clear_chat_on_table_update
after update of state on public.tables
for each row
execute function public.clear_chat_if_table_empty(NEW.id);
