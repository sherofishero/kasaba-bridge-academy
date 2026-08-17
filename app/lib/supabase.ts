import { createClient } from "@supabase/supabase-js";
import { TableCommunication, TableEventHandler } from "./communication";
import { createDeck, dealHands } from "./deck";
import {
  TablePlayer,
  TableRole,
  TableState,
  createTablePlayer,
  createTableState,
  removePlayerFromSeats,
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

/*
 * Aynı chat kanalını tekrar tekrar oluşturup kapatmak yerine
 * yaşayan channel bağlantılarını burada tutuyoruz.
 */
const chatChannels = new Map<
  string,
  ChatChannelEntry
>();

function getChatChannelName(
  channel: ChatChannel,
  tableId?: string
): string {
  /*
   * SALON herkesin ortak sohbetidir.
   */
  if (channel === "SALON") {
    return "chat:salon";
  }

  /*
   * MASA, RAKİPLER ve İZLEYİCİLER
   * aynı masanın Realtime kanalını kullanır.
   *
   * Mesajın gerçek hedefi ChatMessage.channel
   * alanından anlaşılır.
   */
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

/*
 * Chat channel'ını oluşturur ve SUBSCRIBED durumunu bekler.
 *
 * Aynı kanal zaten açıksa yeni channel oluşturmaz.
 */
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

/*
 * Chat channel kullanımını bırakır.
 *
 * Channel'ın gerçekten artık kullanılmadığı durumda
 * Supabase bağlantısını kapatır.
 */
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

/**
 * Chat mesajını Supabase Realtime Broadcast ile yayınlar.
 *
 * Mesajlar veritabanına yazılmaz.
 * Mevcut tables tablosuna dokunulmaz.
 *
 * MASA, RAKİPLER ve İZLEYİCİLER aynı masa
 * Realtime kanalını kullanır.
 */
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

  /*
   * Channel zaten ChatMessages tarafından açıksa
   * aynı channel kullanılacak.
   *
   * Açık değilse burada açılacak ve gönderim bitince
   * kapatılacak.
   */
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

/**
 * Chat kanalına bağlanır ve gelen mesajları dinler.
 *
 * SALON:
 *   chat:salon
 *
 * MASA:
 *   chat:table-{tableId}
 *
 * RAKİPLER:
 *   chat:table-{tableId}
 *
 * İZLEYİCİLER:
 *   chat:table-{tableId}
 *
 * MASA, RAKİPLER ve İZLEYİCİLER aynı masa kanalını
 * kullanır.
 *
 * Mesajın türü ChatMessage.channel alanından anlaşılır.
 */
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

    /*
     * Listener kullanımını bir kez bırakıyoruz.
     */
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
      "N"
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
    const existingState =
      await this.getTableState(
        tableId
      );

    if (!existingState) {
      const initialState =
        this.createDefaultTableState(
          tableId
        );

      const createdState =
        await this.createTable(
          tableId,
          initialState
        );

      return this.updateTableState(
        tableId,
        {
          ...createdState,
          northPlayer:
            createdState.northPlayer ?? {
              ...player,
              role: "North",
            },
        }
      );
    }

    let nextState: TableState = {
      ...existingState,
    };

    if (role === "North") {
      if (nextState.northPlayer) {
        throw new Error(
          "North seat is occupied"
        );
      }

      nextState = {
        ...nextState,
        northPlayer:
          createTablePlayer(
            player.name,
            "North",
            player.id
          ),
      };
    } else if (role === "East") {
      if (nextState.eastPlayer) {
        throw new Error(
          "East seat is occupied"
        );
      }

      nextState = {
        ...nextState,
        eastPlayer:
          createTablePlayer(
            player.name,
            "East",
            player.id
          ),
      };
    } else if (role === "South") {
      if (nextState.southPlayer) {
        throw new Error(
          "South seat is occupied"
        );
      }

      nextState = {
        ...nextState,
        southPlayer:
          createTablePlayer(
            player.name,
            "South",
            player.id
          ),
      };
    } else if (role === "West") {
      if (nextState.westPlayer) {
        throw new Error(
          "West seat is occupied"
        );
      }

      nextState = {
        ...nextState,
        westPlayer:
          createTablePlayer(
            player.name,
            "West",
            player.id
          ),
      };
    } else {
      nextState = {
        ...nextState,
        spectators: [
          ...nextState.spectators,
          createTablePlayer(
            player.name,
            "Spectator",
            player.id
          ),
        ],
      };
    }

    if (!nextState.hostPlayerId) {
      nextState = {
        ...nextState,
        hostPlayerId: player.id,
      };
    }

    return this.updateTableState(
      tableId,
      nextState
    );
  }

  async leaveTable(
    tableId: string,
    player: TablePlayer
  ): Promise<TableState> {
    const existingState =
      await this.getTableState(
        tableId
      );

    if (!existingState) {
      return this.createDefaultTableState(
        tableId
      );
    }

    const nextState =
      removePlayerFromSeats(
        existingState,
        player
      );

    if (
      existingState.hostPlayerId ===
      player.id
    ) {
      const nextHost =
        nextState.spectators[0] ??
        nextState.northPlayer ??
        nextState.eastPlayer ??
        nextState.southPlayer ??
        nextState.westPlayer ??
        null;

      nextState.hostPlayerId =
        nextHost?.id ?? null;
    }

    console.log("[LEAVE]", {
      existingState,
      player,
      nextState,
    });

    return this.updateTableState(
      tableId,
      nextState
    );
  }

  async publishTableState(
    tableId: string,
    state: TableState
  ): Promise<TableState> {
    return this.updateTableState(
      tableId,
      state
    );
  }

  async updateTableState(
    tableId: string,
    state: TableState
  ): Promise<TableState> {
    console.log("[SYNC] UPSERT", {
      north: state.northPlayer,
      south: state.southPlayer,
      east: state.eastPlayer,
      west: state.westPlayer,
    });

    const { data, error } =
      await supabase
        .from("tables")
        .upsert(
          {
            id: tableId,
            state,
          },
          {
            onConflict: "id",
          }
        )
        .select("state")
        .single();

    if (error) {
      console.log(
        "[SYNC] Supabase upsert failed",
        error
      );

      throw error;
    }

    console.log(
      "[SYNC] Supabase upsert succeeded",
      {
        tableId,
        data,
      }
    );

    return (
      (data?.state as TableState) ??
      state
    );
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

    return () => {
      void supabase.removeChannel(
        channel
      );
    };
  }
}

export const supabaseTableCommunication =
  new SupabaseTableCommunication();