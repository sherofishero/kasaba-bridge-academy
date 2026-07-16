import { createClient } from "@supabase/supabase-js";
import { TableCommunication, TableEventHandler } from "./communication";
import { createDeck, dealHands } from "./deck";
import { TablePlayer, TableState, createTablePlayer, createTableState, removePlayerFromSeats } from "./game";

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

export class SupabaseTableCommunication implements TableCommunication {
  private createDefaultTableState(tableId: string): TableState {
    return createTableState(tableId, dealHands(createDeck()), [], "N");
  }

  private async getTableState(tableId: string): Promise<TableState | null> {
    const { data, error } = await supabase
      .from("tables")
      .select("state")
      .eq("id", tableId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data?.state as TableState | null) ?? null;
  }

  async createTable(tableId: string, initialState: TableState): Promise<TableState> {
    const { data, error } = await supabase
      .from("tables")
      .upsert({ id: tableId, state: initialState }, { onConflict: "id" })
      .select("state")
      .single();

    if (error) {
      throw error;
    }

    return (data?.state as TableState) ?? initialState;
  }

  async getTable(tableId: string): Promise<TableState | null> {
    return this.getTableState(tableId);
  }

  async joinTable(tableId: string, player: TablePlayer): Promise<TableState> {
    const existingState = await this.getTableState(tableId);

    if (!existingState) {
      const initialState = this.createDefaultTableState(tableId);
      const createdState = await this.createTable(tableId, initialState);
      return this.updateTableState(tableId, {
        ...createdState,
        northPlayer: createdState.northPlayer ?? { ...player, role: "North" },
      });
    }

    let nextState: TableState = { ...existingState };

    if (!nextState.northPlayer) {
      nextState = {
        ...nextState,
        northPlayer: createTablePlayer(player.name, "North", player.id),
      };
    } else if (!nextState.southPlayer && nextState.northPlayer.id !== player.id) {
      nextState = {
        ...nextState,
        southPlayer: createTablePlayer(player.name, "South", player.id),
      };
    } else if (nextState.northPlayer.id !== player.id && nextState.southPlayer?.id !== player.id) {
      nextState = {
        ...nextState,
        spectators: [...nextState.spectators, createTablePlayer(player.name, "Spectator", player.id)],
      };
    }

    return this.updateTableState(tableId, nextState);
  }

  async leaveTable(tableId: string, player: TablePlayer): Promise<TableState> {
    const existingState = await this.getTableState(tableId);

    if (!existingState) {
      return this.createDefaultTableState(tableId);
    }

    const nextState = removePlayerFromSeats(existingState, player);
    return this.updateTableState(tableId, nextState);
  }

  async publishTableState(tableId: string, state: TableState): Promise<TableState> {
    return this.updateTableState(tableId, state);
  }

  async updateTableState(tableId: string, state: TableState): Promise<TableState> {
    console.log("[SYNC] Supabase upsert started", { tableId, state });
    const { data, error } = await supabase
      .from("tables")
      .upsert({ id: tableId, state }, { onConflict: "id" })
      .select("state")
      .single();

    if (error) {
      console.log("[SYNC] Supabase upsert failed", error);
      throw error;
    }

    console.log("[SYNC] Supabase upsert succeeded", { tableId, data });
    return (data?.state as TableState) ?? state;
  }

  subscribeToTable(tableId: string, handler: TableEventHandler): () => void {
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
          const nextState = payload.new?.state as TableState | undefined;

          if (nextState) {
            handler(nextState);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const supabaseTableCommunication = new SupabaseTableCommunication();