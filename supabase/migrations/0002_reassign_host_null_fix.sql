-- ============================================================================
-- KASABA BRIDGE HUB — Migration 0002
-- reassign_host() NULL bug fix
--
-- SORUN:
--   Masadaki SON oyuncu çıktığında (veya cron sweep son oyuncuyu
--   temizlediğinde) host devri için aday bulunamaz (v_next = NULL).
--   PostgreSQL'de to_jsonb STRICT'tir: to_jsonb(NULL) = SQL NULL.
--   jsonb_set de STRICT olduğundan fonksiyon tümüyle NULL döner:
--     leave_table_seat -> UPDATE ... SET state = NULL
--     -> 23502: null value in column "state" violates not-null constraint
--   Sonuç: tek kişilik masadan çıkış yapılamıyor, sweep sessizce atlanıyor.
--
-- ÇÖZÜM:
--   to_jsonb(v_next) STRICT'ten geçmeden önce coalesce edilerek
--   JSON null sabitine çevrilir; state asla NULL olmaz.
--
-- Canlı doğrulama: üye/misafir leave, tarayıcı kapatma temizliği,
-- Çalışma Odası anlık güncelleme — tamamı başarılı.
--
-- Idempotenttir (create or replace); production DB'de zaten uygulanmıştır.
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
  -- Kural 1: mevcut host hâlâ masadaysa dokunma
  v_host := v_state ->> 'hostPlayerId';

  if v_host is not null
     and v_host <> ''
     and public.kasaba_still_present(v_state, v_host) then
    return v_state;
  end if;

  v_next := null;

  -- Kural 2: giriş hiyerarşisi (joinOrder sırası)
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

  -- Kural 3: fallback sabit sıra (spectators[0] -> N -> E -> S -> W)
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

  -- *** BUG FIX ***
  -- Eski: v_state := jsonb_set(v_state, array['hostPlayerId'], to_jsonb(v_next), true);
  -- v_next NULL iken to_jsonb(NULL) = SQL NULL -> jsonb_set -> NULL (23502).
  -- coalesce(to_jsonb(v_next), 'null'::jsonb) ile JSON null sabiti garanti edilir.
  v_state := jsonb_set(
    v_state,
    array['hostPlayerId'],
    coalesce(to_jsonb(v_next), 'null'::jsonb),
    true
  );

  return v_state;
end;
$$;

-- search_path kilidi korunur (B9 ile aynı):
alter function public.reassign_host(jsonb) set search_path = pg_catalog, public;
