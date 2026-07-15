import { TableState, TablePlayer } from "./game";

export type TableEventHandler = (state: TableState) => void;

export interface TableCommunication {
  createTable(tableId: string, initialState: TableState): Promise<TableState>;
  getTable(tableId: string): Promise<TableState | null>;
  joinTable(tableId: string, player: TablePlayer): Promise<TableState>;
  leaveTable(tableId: string, player: TablePlayer): Promise<TableState>;
  publishTableState(tableId: string, state: TableState): Promise<TableState>;
  updateTableState(tableId: string, state: TableState): Promise<TableState>;
  subscribeToTable(tableId: string, handler: TableEventHandler): () => void;
}
