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
  channelName: string
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

  const channelName =
    getChatChannelName(
      channel,
      tableId
    );

  const message: ChatMessage = {
    id: createChatMessageId(),
    userId,
    userName,
    text: cleanText,
    channel,
    tableId,
    timestamp:
      new Date().toISOString(),
  };

  const entry =
    acquireChatChannel(channelName);

  try {
    await entry.ready;

    const result =
      await entry.channel.send({
        type: "broadcast",
        event: "chat_message",
        payload: message,
      });

    if (result !== "ok") {
      throw new Error(
        `Chat mesajı gönderilemedi: ${String(
          result
        )}`
      );
    }

    console.log(
      "[CHAT] Mesaj gönderildi:",
      message
    );

    return message;
  } catch (error) {
    console.error(
      "[CHAT] Mesaj gönderilemedi:",
      error
    );

    throw error;
  } finally {
    releaseChatChannel(
      channelName
    );
  }
}

export function subscribeToChat(
  channel: ChatChannel,
  handler: ChatMessageHandler,
  tableId?: string
): () => void {
  const channelName =
    getChatChannelName(
      channel,
      tableId
    );

  const entry =
    acquireChatChannel(channelName);

  const broadcastHandler = ({
    payload,
  }: {
    payload: unknown;
  }) => {
    if (!payload) {
      return;
    }

    const message =
      payload as ChatMessage;

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

  entry.channel.on(
    "broadcast",
    {
      event: "chat_message",
    },
    broadcastHandler
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