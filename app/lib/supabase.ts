import { createClient } from "@supabase/supabase-js";
import { TableCommunication, TableEventHandler } from "./communication";
import { createDeck, dealHands } from "./deck";
import { TablePlayer, TableState, createTableState } from "./game";

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

    const nextState = {
      ...existingState,
      northPlayer: existingState.northPlayer ? existingState.northPlayer : { ...player, role: "North" },
      southPlayer: existingState.northPlayer
        ? existingState.southPlayer ?? (existingState.northPlayer.id !== player.id ? { ...player, role: "South" } : existingState.southPlayer)
        : existingState.southPlayer,
      spectators: existingState.northPlayer && existingState.southPlayer && existingState.northPlayer.id !== player.id && existingState.southPlayer.id !== player.id
        ? [...existingState.spectators, { ...player, role: "Spectator" }]
        : existingState.spectators,
    };

    return this.updateTableState(tableId, nextState);
  }

  async leaveTable(tableId: string, _player: TablePlayer): Promise<TableState> {
    const existingState = await this.getTableState(tableId);

    if (existingState) {
      return existingState;
    }

    return this.createTable(
      tableId,
      createTableState(tableId, dealHands(createDeck()))
    );
  }

  async publishTableState(tableId: string, state: TableState): Promise<TableState> {
    return this.updateTableState(tableId, state);
  }

  async updateTableState(tableId: string, state: TableState): Promise<TableState> {
    const { data, error } = await supabase
      .from("tables")
      .upsert({ id: tableId, state }, { onConflict: "id" })
      .select("state")
      .single();

    if (error) {
      throw error;
    }

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