import { Deal, Seat } from "./deck";
import { Bid } from "./auction";

export type TablePlayer = {
  id: string | null;
  name: string;
};

export type TableState = {
  tableId: string;
  northPlayer: TablePlayer | null;
  southPlayer: TablePlayer | null;
  spectators: TablePlayer[];
  currentDeal: Deal;
  currentAuction: Bid[];
  currentTurn: Seat;
};

export type GameState = {
  deal: Deal;
  auction: Bid[];
  turn: Seat;
};

export function createTableState(
  tableId: string,
  currentDeal: Deal,
  currentAuction: Bid[] = [],
  currentTurn: Seat = "N"
): TableState {
  return {
    tableId,
    northPlayer: null,
    southPlayer: null,
    spectators: [],
    currentDeal,
    currentAuction,
    currentTurn,
  };
}