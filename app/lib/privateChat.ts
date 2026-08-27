/*
 * =========================================================
 * PRIVATE CHAT — VERİ KATMANI
 * =========================================================
 *
 * Özel sohbet yalnızca kayıtlı üyeler arasında çalışır.
 * Kimlik modeli:
 *   nick (username)  --RPC-->  profiles.user_id (= Supabase Auth UUID)
 *
 * Tüm okuma/yazma RLS ile korunur; gönderen kimliği sunucuda
 * auth.uid() ile doğrulanır (bkz. supabase/migrations/0003_private_chat.sql).
 */

import { supabase } from "./supabase";

export type PrivateChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  message: string;
  createdAt: string;
};

type ConversationRow = {
  id: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

function toModel(row: MessageRow): PrivateChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    message: row.message,
    createdAt: row.created_at,
  };
}

/**
 * Giriş yapan kullanıcının Auth UUID'si. Misafirlerde null döner.
 *
 * getSession() yerel depodan okur; oturum verisi kaymış/bozulmuşsa
 * sunucu doğrulamalı getUser() ile yeniden denenir.
 */
export async function getCurrentUserAuthId(): Promise<
  string | null
> {
  const { data } =
    await supabase.auth.getSession();

  const sessionUser =
    data.session?.user?.id;

  if (sessionUser) {
    return sessionUser;
  }

  try {
    const { data: userData } =
      await supabase.auth.getUser();

    return userData?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Nick -> Auth UUID. Misafirler ve olmayan nickler için null döner.
 */
/**
 * Nick -> Auth UUID. Misafirler ve olmayan nickler için null döner.
 */
export async function getProfileIdByUsername(
  username: string
): Promise<string | null> {
  const clean = username.trim();

  if (!clean) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "get_profile_id_by_username",
    { p_username: clean }
  );

  if (error) {
    console.error(
      "[PRIVATE_CHAT] Kullanıcı kimliği çözümlenemedi:",
      error.message
    );
    return null;
  }

  return typeof data === "string" && data ? data : null;
}

/*
 * Katılımcı sırası deterministik: (küçük, büyük) lowercase uuid.
 */
function orderedParticipants(
  userA: string,
  userB: string
): [string, string] {
  const a = userA.toLowerCase();
  const b = userB.toLowerCase();

  return a < b ? [a, b] : [b, a];
}

/**
 * Aynı ikili için TEK konuşma döndürür; yoksa oluşturur.
 */
export async function getOrCreateConversation(
  userA: string,
  userB: string
): Promise<string | null> {
  const [participant1, participant2] =
    orderedParticipants(userA, userB);

  const findExisting =
    async (): Promise<string | null> => {
      const { data } = await supabase
        .from("conversations")
        .select("id")
        .eq("participant_1", participant1)
        .eq("participant_2", participant2)
        .maybeSingle();

      return (
        (data as ConversationRow | null)?.id ?? null
      );
    };

  const existing = await findExisting();

  if (existing) {
    return existing;
  }

  /*
   * Yarış durumu: eşzamanlı insert'te unique pair ihlali
   * (23505) beklenir; bu durumda mevcut satır seçilir.
   */
  const { error } = await supabase
    .from("conversations")
    .insert({
      participant_1: participant1,
      participant_2: participant2,
    });

  if (error && error.code !== "23505") {
    console.error(
      "[PRIVATE_CHAT] Konuşma oluşturulamadı:",
      error.message
    );
    return null;
  }

  return findExisting();
}

/**
 * Geçmiş mesajları eskiden yeniye yükler.
 */
export async function fetchConversationMessages(
  conversationId: string
): Promise<PrivateChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error(
      "[PRIVATE_CHAT] Geçmiş yüklenemedi:",
      error.message
    );
    throw error;
  }

  return ((data ?? []) as MessageRow[]).map(toModel);
}

/**
 * Mesaj gönderir; sunucu RLS ile sender_id == auth.uid()
 * olduğunu doğrular. Başka biri adına gönderim reddedilir.
 */
export async function sendPrivateMessage(
  conversationId: string,
  senderId: string,
  message: string
): Promise<PrivateChatMessage> {
  const clean = message.trim();

  if (!clean) {
    throw new Error("Mesaj boş.");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId.toLowerCase(),
      message: clean.slice(0, 2000),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return toModel(data as MessageRow);
}

/**
 * Konuşmaya gelen yeni mesajlara realtime abonelik
 * (postgres_changes; RLS sayesinde sadece katılımcılar alır).
 */
export function subscribeToPrivateMessages(
  conversationId: string,
  onMessage: (message: PrivateChatMessage) => void
): () => void {
  const channelName =
    `private-chat:${conversationId}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter:
          `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const next = payload.new as
          | MessageRow
          | undefined;

        if (!next?.id) {
          return;
        }

        onMessage(toModel(next));
      }
    )
        .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Auth UUID -> kullanıcı adı (nick).
 *
 * Gelen DM'de gönderen UUID'si vardır ama nick yoktur; alıcı
 * penceresinin başlığını çözmek için kullanılır.
 *
 * profiles okuma RLS'ye bağlıdır: erişim reddedilirse null döner
 * (pencere hâlâ açılır; gösterim "Üye" yedeği kullanır). 0003
 * migrationu get_profile_id_by_username RPC'sini nickname->UUID
 * çözümlemek için kullandığından, profil satırının doğrudan
 * select'inin her zaman izinli olmadığını varsayıp hata sonrası
 * yedeklemeye güveniyoruz.
 */
export async function getUsernameByAuthId(
  authId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("user_id", authId)
    .maybeSingle();

  if (error) {
    console.error(
      "[PRIVATE_CHAT] Username çözümlenemedi:",
      error.message
    );
    return null;
  }

  const username =
    (data as { username?: string } | null)
      ?.username;

  const trimmed =
    typeof username === "string"
      ? username.trim()
      : "";

  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Alıcı-tarafı bildirim: kullanıcı için RLS ile sadece katılımcı
 * olduğu conversation'lara ait `messages` INSERT'lerini yaşar.
 *
 * Filtre (conversation_id=eq.X) vermiyoruz çünkü alıcı henüz
 * o conversationId'yi bilmiyor olabilir (mesaj gelinceye kadar
 * konuşma yoktu / pencere açılmadı). 0003 C3 select politikası
 * (messages_select_participants) ve C5 notu ("Katılımcı olmayanlar
 * RLS select politikası nedeniyle eventi göremez") sayesinde,
 * RLS bu subscription'ı kendiliğinden yalnızca katıldığım
 * conversation'lardan mesajlara kısıtlar.
 */
export function subscribeToInboxMessages(
  onMessage: (message: PrivateChatMessage) => void
): () => void {
  const channelName = "private-chat:inbox";

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        const next = payload.new as
          | MessageRow
          | undefined;

        if (!next?.id) {
          return;
        }

        onMessage(toModel(next));
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
