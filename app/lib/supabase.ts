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

  async joinTable(tableId: string, _player: TablePlayer): Promise<TableState> {
    const existingState = await this.getTableState(tableId);

    if (existingState) {
      return existingState;
    }

    return this.createTable(
      tableId,
      createTableState(tableId, dealHands(createDeck()))
    );
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