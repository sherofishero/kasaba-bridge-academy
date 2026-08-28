-- ============================================================================
-- KASABA BRIDGE HUB — Migration 0006
-- profiles: authenticated kullanıcının kendi profilini okuması
--
-- SORUN:
--   sendChatMessage() (app/lib/supabase.ts), 0005 güvenlik sertleştirmesi
--   gereği üye mesajlarında user_name'i sunucu tarafında doğrular:
--     profiles.user_id = auth.uid()  ->  username
--   public.profiles tablosunda authenticated için SELECT policy YOKTU;
--   sorgu hata vermeden BOŞ döndüğü için profileRow null oluyor ve mesaj
--   INSERT edilmeden throw atılıyordu ("Üye profili çözümlenemedi").
--   (Aynı zamanda özel sohbetteki getUsernameByAuthId de bu sebeple
--   "Üye" yedeğine düşüyordu.)
--
-- ÇÖZÜM:
--   Authenticated kullanıcının SADECE KENDİ profil satırını okuyabilmesi
--   için RLS SELECT policy'si. Başka üyelerin satırları hâlâ kapalıdır;
--   mevcut security definer fonksiyonlar (get_profile_id_by_username,
--   get_member_display_name, username_is_member) etkilenmez.
--
-- NOT: Bu dosya production'a otomatik uygulanmaz; Supabase Dashboard
-- (SQL Editor) üzerinden elle çalıştırılır (0001/0003/0005 notuyla aynı).
--
-- Private chat tablolarına (conversations / messages) DOKUNULMAZ.
-- Idempotenttir (drop policy if exists + create policy).
-- ============================================================================

drop policy if exists profiles_select_self on public.profiles;

create policy profiles_select_self
  on public.profiles
  for select
  to authenticated
  using (user_id = auth.uid());
