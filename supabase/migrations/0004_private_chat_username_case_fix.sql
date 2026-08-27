-- ============================================================================
-- KASABA BRIDGE HUB — Migration 0004
-- Özel Sohbet: username çözümlemesi harf duyarsızlığı (bug fix)
--
-- SORUN:
--   0003 ile eklenen get_profile_id_by_username fonksiyonu birebir (=)
--   eşitlik kullanıyordu. Uygulamanın geri kalanı kullanıcı adlarını
--   harf duyarsız kabul eder (örn. login'deki get_email_by_username,
--   canlı doğrulamada 'own' / 'Own' / 'OWN' hepsi profili buluyor).
--   Kayıt ve girişte farklı harf düzeni kullanan üyeler için
--   profil satırı mevcutken çözümleme NULL dönüyor ve özel sohbet
--   karşı tarafı hatalı biçimde "misafir" ilan ediyordu.
--
-- ÇÖZÜM:
--   Karşılaştırma lower(...) = lower(btrim(...)) ile yapılır.
--   Fonksiyon imzası, yetkileri ve tüm tablo/RLS yapısı DEĞİŞMEDİ.
--
-- Uygulama: Supabase SQL Editor üzerinde elle çalıştırılır.
-- Idempotenttir (create or replace).
-- ============================================================================

create or replace function public.get_profile_id_by_username(p_username text)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select pr.user_id
    from public.profiles pr
   where lower(pr.username) = lower(btrim(p_username))
   limit 1;
$$;

revoke execute on function public.get_profile_id_by_username(text) from anon;
revoke execute on function public.get_profile_id_by_username(text) from public;
grant execute  on function public.get_profile_id_by_username(text) to authenticated;
