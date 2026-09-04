import { createClient } from "@supabase/supabase-js";
import { TableCommunication, TableEventHandler } from "./communication";
import { createDeck, dealHands } from "./deck";
import {
  TablePlayer,
  TableRole,
  TableState,
  createTableState,
} from "./game";

export const supabase = createClient(
  "https://iczbrmbrvpdwzyustgry.supabase.co",
  "sb_publishable_iM8pdwTuV73_p0EQBLmxTw_eL1P1v8w",
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

/* =========================================================
   CHAT
   ========================================================= */

export type ChatChannel =
  | "SALON"
  | "MASA"
  | "RAKİPLER"
  | "İZLEYİCİLER";

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  channel: ChatChannel;
  tableId?: string;
  timestamp: string;
};

type ChatMessageHandler = (
  message: ChatMessage
) => void;

/*
 * public.chat_messages satırı (migration 0005).
 */
type ChatMessageRow = {
  id: string;
  channel: string;
  table_id: string | null;
  user_id: string;
  user_name: string;
  text: string;
  created_at: string;
};

function rowToChatMessage(
  row: ChatMessageRow
): ChatMessage {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    text: row.text,
    channel: row.channel as ChatChannel,
    tableId: row.table_id ?? undefined,
    timestamp: row.created_at,
  };
}

type ChatChannelEntry = {
  channel: ReturnType<typeof supabase.channel>;
  refCount: number;
  ready: Promise<void>;
};

const chatChannels = new Map<
  string,
  ChatChannelEntry
>();

function getChatChannelName(
  channel: ChatChannel,
  tableId?: string
): string {
  if (channel === "SALON") {
    return "chat:salon";
  }

  if (!tableId) {
    throw new Error(
      `${channel} sohbeti için tableId gereklidir.`
    );
  }

  return `chat:table-${tableId}`;
}

function createChatMessageId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function acquireChatChannel(
  channelName: string,
  /* postgres_changes vb. listener'lar channel.subscribe()
     ÇAĞRILMADAN ÖNCE eklenmelidir; aksi halde Supabase
     "cannot add postgres_changes callbacks after subscribe()"
     hatası verir. Bu setup callback'i tam o amaçla vardır. */
  setup?: (channel: ReturnType<typeof supabase.channel>) => void
): ChatChannelEntry {
  const existing =
    chatChannels.get(channelName);

  if (existing) {
    existing.refCount += 1;
    return existing;
  }

  const channel = supabase.channel(
    channelName,
    {
      config: {
        broadcast: {
          self: true,
          ack: true,
        },
      },
    }
  );

  /* Listener'lar subscribe() ÖNCESİNE eklenir. */
  setup?.(channel);

  let resolveReady!: () => void;
  let rejectReady!: (
    reason?: unknown
  ) => void;

  const ready = new Promise<void>(
    (resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    }
  );

  const entry: ChatChannelEntry = {
    channel,
    refCount: 1,
    ready,
  };

  chatChannels.set(
    channelName,
    entry
  );

  channel.subscribe(
    (status, error) => {
      if (status === "SUBSCRIBED") {
        console.log(
          `[CHAT] Kanal bağlandı: ${channelName}`
        );

        resolveReady();
        return;
      }

      if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT"
      ) {
        console.error(
          `[CHAT] Kanal bağlantı hatası: ${channelName}`,
          status,
          error
        );

        rejectReady(
          error ??
            new Error(
              `Chat kanalı bağlanamadı: ${channelName}`
            )
        );
      }
    }
  );

  return entry;
}

function releaseChatChannel(
  channelName: string
): void {
  const entry =
    chatChannels.get(channelName);

  if (!entry) {
    return;
  }

  entry.refCount -= 1;

  if (entry.refCount > 0) {
    return;
  }

  chatChannels.delete(channelName);

  void supabase.removeChannel(
    entry.channel
  );

  console.log(
    `[CHAT] Kanal kapatıldı: ${channelName}`
  );
}

export async function sendChatMessage({
  userId,
  userName,
  text,
  channel,
  tableId,
}: {
  userId: string;
  userName: string;
  text: string;
  channel: ChatChannel;
  tableId?: string;
}): Promise<ChatMessage> {
  const cleanText = text.trim();

  if (!cleanText) {
    throw new Error(
      "Boş mesaj gönderilemez."
    );
  }

  /* SALON dışındaki tüm kanallar masa bazlıdır. */
  if (channel !== "SALON" && !tableId) {
    throw new Error(
      `${channel} sohbeti için tableId gereklidir.`
    );
  }

  /*
   * Üye kimliği override'ı (0005 RLS):
   * Authenticated oturum açıksa user_id = auth.uid() ve user_name =
   * profiles.username zorunludur; aksi halde INSERT politikası reddeder.
   * Misafirlerde oturum olmadığından localStorage kimliği aynen kullanılır
   * (misafir davranışı değişmez). Profile okunamıyorsa hata yükseltilir;
   * böylece üye adına sahte/uyumsuz kimlikle kayıt atılmaz.
   */
  let effectiveUserId = userId;
  let effectiveUserName = userName;

  const { data: sessionData } =
    await supabase.auth.getSession();
  const sessionUser =
    sessionData?.session?.user ?? null;

  if (sessionUser) {
    const { data: profileRow, error: profileError } =
      await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", sessionUser.id)
        .maybeSingle();

    if (profileError || !profileRow?.username) {
      console.error(
        "[CHAT] Üye profili çözümlenemedi:",
        profileError?.message
      );
      throw new Error(
        "Üye kimliği doğrulanamadı; mesaj gönderilemedi."
      );
    }

    effectiveUserId = sessionUser.id;
    effectiveUserName = profileRow.username as string;
  }

  const message: ChatMessage = {
    id: createChatMessageId(),
    userId: effectiveUserId,
    userName: effectiveUserName,
    text: cleanText,
    channel,
    tableId,
    timestamp: new Date().toISOString(),
  };

  /*
   * Kalıcı kayıt: ephemeral broadcast yerine DB insert.
   * id client'ta üretilir ve aynen saklanır; böylece
   * ChatMessages'taki id bazlı dedup davranışı korunur.
   * Görüntüleme, subscribeToChat'taki postgres_changes
   * INSERT eventiyle (gönderen dahil tüm abonelere)
   * gerçekleşir.
   */
  const { error } = await supabase
    .from("chat_messages")
    .insert({
      id: message.id,
      channel: message.channel,
      table_id: message.tableId ?? null,
      user_id: message.userId,
      user_name: message.userName,
      text: message.text,
    });

  if (error) {
    console.error(
      "[CHAT] Mesaj kaydedilemedi:",
      error
    );

    throw new Error(
      `Chat mesajı kaydedilemedi: ${error.message}`
    );
  }

  console.log(
    "[CHAT] Mesaj kaydedildi:",
    message
  );

  return message;
}

/*
 * Kanalın kalıcı geçmişini yükler (en yeni 100 mesaj, eskiden yeniye).
 */
export async function loadChatHistory(
  channel: ChatChannel,
  tableId?: string
): Promise<ChatMessage[]> {
  if (channel !== "SALON" && !tableId) {
    throw new Error(
      `${channel} sohbeti için tableId gereklidir.`
    );
  }

  let query = supabase
    .from("chat_messages")
    .select("*")
    .eq("channel", channel)
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  if (channel !== "SALON") {
    query = query.eq(
      "table_id",
      tableId as string
    );
  }

  const { data, error } =
    await query;

  if (error) {
    console.error(
      "[CHAT] Geçmiş yüklenemedi:",
      error
    );

    throw new Error(
      `Chat geçmişi yüklenemedi: ${error.message}`
    );
  }

  const rows =
    (data as ChatMessageRow[]) ?? [];

  return rows
    .map(rowToChatMessage)
    .reverse();
}

export function subscribeToChat(
  channel: ChatChannel,
  handler: ChatMessageHandler,
  tableId?: string
): () => void {
  if (channel !== "SALON" && !tableId) {
    throw new Error(
      `${channel} sohbeti için tableId gereklidir.`
    );
  }

  const channelName =
    getChatChannelName(
      channel,
      tableId
    );

  /*
   * postgres_changes listener'ları kanal subscribe edilmeden
   * ÖNCE eklenmelidir (yoksa "cannot add postgres_changes
   * callbacks after subscribe()" hatası). Bu yüzden .on()
   * kayıtları acquireChatChannel'e setup callback'i olarak
   * verilir; kanal ilk kez oluşturulurken subscribe'tan
   * önce bağlanır.
   *
   * Filtre: SALON için kanal; masa bazlı kanallar
   * (MASA / RAKİPLER / İZLEYİCİLER) için table_id
   * (table_id masa kimliğini tek başına belirlediğinden
   * masalar birbirine karışmaz).
   */
  const insertHandler = (payload: {
    new: ChatMessageRow | Record<string, unknown>;
  }) => {
    const row = payload?.new;

    if (!row || !("id" in row)) {
      return;
    }

    const message =
      rowToChatMessage(row as ChatMessageRow);

    if (
      !message.id ||
      !message.userId ||
      !message.userName ||
      !message.text ||
      !message.channel
    ) {
      return;
    }

    handler(message);
  };

  acquireChatChannel(
    channelName,
    (realtimeChannel) => {
      if (channel === "SALON") {
        realtimeChannel.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: "channel=eq.SALON",
          },
          insertHandler
        );
      } else {
        realtimeChannel.on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `table_id=eq.${
              tableId as string
            }`,
          },
          insertHandler
        );
      }
    }
  );

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;

    releaseChatChannel(
      channelName
    );
  };
}

/* =========================================================
   MASA İLETİŞİMİ
   ========================================================= */

export class SupabaseTableCommunication
  implements TableCommunication
{

  private createDefaultTableState(
    tableId: string
  ): TableState {
    return createTableState(
      tableId,
      dealHands(createDeck()),
      [],
      undefined,
      1
    );
  }

  private async getTableState(
    tableId: string
  ): Promise<TableState | null> {
    const { data, error } =
      await supabase
        .from("tables")
        .select("state")
        .eq("id", tableId)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return (
      (data?.state as
        | TableState
        | null) ?? null
    );
  }

  async createTable(
    tableId: string,
    initialState: TableState
  ): Promise<TableState> {
    const { data, error } =
      await supabase
        .from("tables")
        .upsert(
          {
            id: tableId,
            state: initialState,
          },
          {
            onConflict: "id",
          }
        )
        .select("state")
        .single();

    if (error) {
      throw error;
    }

    return (
      (data?.state as TableState) ??
      initialState
    );
  }

  async getTable(
    tableId: string
  ): Promise<TableState | null> {
    return this.getTableState(
      tableId
    );
  }

  async joinTable(
    tableId: string,
    player: TablePlayer,
    role: TableRole
  ): Promise<TableState> {
    console.log("[SEAT] JOIN RPC", {
      tableId,
      playerId: player.id,
      role,
    });

    /*
     * Koltuga oturma artik sunucu RPC'si ile atomik yapilir:
     * - bos koltuk kontrolu + oturtma ayni satir kilidinde
     * - joinOrder'a ekleme sunucuda yapilir (istemci elle yazmaz)
     * - host bossa ilk giren host olur (KASABA kurali)
     */
    const { data, error } = await supabase.rpc(
      "join_table_seat",
      {
        p_table_id: tableId,
        p_player_id: player.id ?? "",
        p_name: player.name,
        p_role: role,
      }
    );

    if (error) {
      console.error("[SEAT] JOIN RPC FAILED", error);
      throw error;
    }

    return data as TableState;
  }

  async leaveTable(
    tableId: string,
    player: TablePlayer
  ): Promise<TableState> {
    console.log("[LEAVE] RPC", {
      tableId,
      playerId: player.id,
      playerName: player.name,
    });

    /*
     * Cikis artik sunucu RPC'si ile atomik yapilir:
     * - koltuk + spectators + joinOrder temizligi ayni satir kilidinde
     * - host dustuysa devir reassign_host ile KASABA hiyerarsisine gore
     *   yapilir (joinOrder -> spectators[0] -> N -> E -> S -> W)
     */
    const { data, error } = await supabase.rpc(
      "leave_table_seat",
      {
        p_table_id: tableId,
        p_player_id: player.id ?? "",
      }
    );

    if (error) {
      console.error("[LEAVE] RPC FAILED", error);

      // Masa yoksa eski davranisla uyumlu sekilde default don.
      if (
        typeof error.message === "string" &&
        error.message.includes("table not found")
      ) {
        return this.createDefaultTableState(tableId);
      }

      throw error;
    }

    return data as TableState;
  }

  async publishTableState(
    tableId: string,
    state: TableState
  ): Promise<TableState> {
    return this.updateTableState(tableId, state);
  }

  /*
   * Yalnizca oyun alanlari sunucuya patch olarak gider.
   * Koltuk/kimlik alanlari (northPlayer, ..., joinOrder, hostPlayerId)
   * ne burada ne de sunucuda asla yazilamaz -> stale oyuncu
   * diriltilemez. Yazim tek atomik RPC ile gerceklesir.
   */
  private static readonly GAME_FIELDS = [
    "activeTrainingDeal",
    "boardNumber",
    "currentDeal",
    "currentAuction",
    "dealer",
    "vulnerability",
    "currentTurn",
    "newBoardRequest",
    "autoPass",
    "gamePhase",
    "contract",
    "declarer",
    "dummy",
    "openingLeader",
    "playTurn",
    "originalDeal",
    "currentTrick",
    "completedTricks",
    "playedCards",
  ] as const;

  /*
   * Heartbeat: yalnizca oyuncunun KENDI koltugunun lastSeenAt alanini
   * sunucu tarafinda gunceller. Oyuncu koltuktan dusmussa RPC hicbir
   * sey yapmaz (WHERE dogrulamasi SQL tarafinda).
   */
  async heartbeatTablePlayer(
    tableId: string,
    playerId: string,
    role: TableRole
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc(
        "heartbeat_table_player",
        {
          p_table_id: tableId,
          p_player_id: playerId,
          p_role: role,
        }
      );

      if (error) {
        console.error("[HEARTBEAT] FAILED", error);
      }
    } catch (error) {
      console.error("[HEARTBEAT] ERROR", error);
    }
  }

  /*
   * PAGEHIDE icin best-effort cikis: keepalive fetch ile sekme
   * kapandiktan SONRA da istek tamamlanmaya calisir. Garanti
   * degildir; calismazsa cron sweep temizligi devreye girer.
   */
  leaveTableKeepalive(
    tableId: string,
    playerId: string
  ): void {
    try {
      void fetch(
        "https://iczbrmbrvpdwzyustgry.supabase.co/rest/v1/rpc/leave_table_seat",
        {
          method: "POST",
          keepalive: true,
          headers: {
            "Content-Type": "application/json",
            apikey:
              "sb_publishable_iM8pdwTuV73_p0EQBLmxTw_eL1P1v8w",
            Authorization:
              "Bearer sb_publishable_iM8pdwTuV73_p0EQBLmxTw_eL1P1v8w",
          },
          body: JSON.stringify({
            p_table_id: tableId,
            p_player_id: playerId,
          }),
        }
      ).catch(() => {
        // best-effort; yutulur
      });
    } catch {
      // best-effort; yutulur
    }
  }

  async updateTableState(
    tableId: string,
    state: TableState
  ): Promise<TableState> {
    const patch: Record<string, unknown> = {};

    for (
      const field of SupabaseTableCommunication.GAME_FIELDS
    ) {
      const value = (
        state as unknown as Record<string, unknown>
      )[field];

      if (value !== undefined) {
        patch[field] = value;
      }
    }

    if (Object.keys(patch).length === 0) {
      console.warn("[SYNC] publish skipped: empty game patch");
      return state;
    }

    console.log("[SYNC] PUBLISH_GAME_STATE", {
      tableId,
      fields: Object.keys(patch),
    });

    const { data, error } = await supabase.rpc(
      "publish_game_state",
      {
        p_table_id: tableId,
        p_patch: patch,
      }
    );

    if (error) {
      console.error(
        "[SYNC] publish_game_state failed",
        error
      );

      throw error;
    }

    return (data as TableState) ?? state;
  }

  subscribeToTable(
  tableId: string,
  handler: TableEventHandler
): () => void {
  const channel = supabase
    .channel(`table:${tableId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "tables",
        filter: `id=eq.${tableId}`,
      },
      (payload) => {
        const nextState =
          payload.new?.state as
            | TableState
            | undefined;

        if (nextState) {
          handler(nextState);
        }
      }
    )
    .subscribe();

  /*
   * =========================================================
   * TABLE PRESENCE (yalnizca hizli UI destegi)
   * =========================================================
   *
   * Presence artik DB'den oyuncu SILMEZ.
   * Nihai otorite sunucu tarafindaki cron sweep'tir
   * (remove_stale_players). Her masa istemcisi
   * kosulsuz olarak track edilir.
   */
  const presenceChannel = supabase.channel(
    `presence:table-${tableId}`,
    {
      config: {
        presence: {
          key:
            typeof window !== "undefined"
              ? localStorage.getItem(
                  "guestName"
                ) ?? crypto.randomUUID()
              : crypto.randomUUID(),
        },
      },
    }
  );

  /*
   * Presence olaylari yalnizca bilgi amacli; DB temizligi YAPILMAZ.
   */
  presenceChannel.on(
    "presence",
    {
      event: "sync",
    },
    () => {
      console.log(
        "[PRESENCE] sync",
        Object.keys(presenceChannel.presenceState())
      );
    }
  );

  /*
   * Mevcut istemciyi kosulsuz track et (misafir dahil).
   * Kopma tespiti sunucu tarafindaki heartbeat/sweep ile yapilir.
   */
  presenceChannel.subscribe(
    async (status) => {
      if (
        status !== "SUBSCRIBED"
      ) {
        return;
      }

      const username =
        typeof window !== "undefined"
          ? localStorage.getItem(
              "guestName"
            )
          : null;

      try {
        const result =
          await presenceChannel.track({
            playerId:
              username ??
              `anon-${crypto.randomUUID()}`,
            name: username ?? "misafir",
          });

        if (result !== "ok") {
          console.error(
            "[PRESENCE] Track basarisiz:",
            result
          );
        } else {
          console.log(
            "[PRESENCE] tracked:",
            {
              tableId,
              username,
            }
          );
        }
      } catch (error) {
        console.error(
          "[PRESENCE] track error:",
          error
        );
      }
    }
  );

  return () => {
    void supabase.removeChannel(
      channel
    );

    void supabase.removeChannel(
      presenceChannel
    );
  };
}
}
export const supabaseTableCommunication =
  new SupabaseTableCommunication();