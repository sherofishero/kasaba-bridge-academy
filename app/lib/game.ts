import { Deal, Seat } from "./deck";
import { Bid } from "./auction";
import { trainingBoards } from "./trainingDeals";
import { TableCommunication } from "./communication";

export type TableRole = "North" | "East" | "South" | "West" | "Spectator";
export type TrainingDealKey = keyof typeof trainingBoards;

export type TablePlayer = {
  id: string | null;
  name: string;
  role: TableRole;
};

export type TableState = {
  tableId: string;
  northPlayer: TablePlayer | null;
  eastPlayer: TablePlayer | null;
  southPlayer: TablePlayer | null;
  westPlayer: TablePlayer | null;
  spectators: TablePlayer[];
  hostPlayerId: string | null;
  activeTrainingDeal: TrainingDealKey | null;
  currentDeal: Deal;
  currentAuction: Bid[];
  currentTurn: Seat;
  newBoardRequest: {
  requestedBy: string;
  approvals: string[];
  rejections: string[];
} | null;
  autoPass: boolean;
};

export type GameState = {
  deal: Deal;
  auction: Bid[];
  turn: Seat;
};

export type TableStateContext = {
  communication?: TableCommunication;
};

export function createTablePlayer(
  name: string,
  role: TableRole,
  id: string | null = null
): TablePlayer {
  return { id, name, role };
}

export function createTableState(
  tableId: string,
  currentDeal: Deal,
  currentAuction: Bid[] = [],
  currentTurn: Seat = "N"
): TableState {
  return {
  tableId,
  northPlayer: null,
  eastPlayer: null,
  southPlayer: null,
  westPlayer: null,
  spectators: [],
  hostPlayerId: null,
    activeTrainingDeal: null,
    newBoardRequest: null,
    currentDeal,
    currentAuction,
    currentTurn,
    autoPass: true,
  };
}

export function selectTrainingDeal(
  state: TableState,
  dealKey: TrainingDealKey
): TableState {
  return {
    ...state,
    activeTrainingDeal: dealKey,
    currentDeal: trainingBoards[dealKey][0],
  };
}

export function removePlayerFromSeats(
  state: TableState,
  player: TablePlayer
): TableState {
  return {
    ...state,
    northPlayer:
      state.northPlayer?.id === player.id && state.northPlayer?.name === player.name
        ? null
        : state.northPlayer,
    eastPlayer:
      state.eastPlayer?.id === player.id && state.eastPlayer?.name === player.name
        ? null
        : state.eastPlayer,
    southPlayer:
      state.southPlayer?.id === player.id && state.southPlayer?.name === player.name
        ? null
        : state.southPlayer,
    westPlayer:
      state.westPlayer?.id === player.id && state.westPlayer?.name === player.name
        ? null
        : state.westPlayer,
    spectators: state.spectators.filter(
      (spectator) =>
        spectator.id !== player.id || spectator.name !== player.name
    ),
  };
}

export function joinTableAsNorth(
  state: TableState,
  player: TablePlayer,
  context?: TableStateContext
): TableState {
  if (state.northPlayer && state.northPlayer.id !== player.id) {
    return state;
  }

  const withoutPlayer = removePlayerFromSeats(state, player);
  const nextState: TableState = {
    ...withoutPlayer,
    northPlayer: createTablePlayer(player.name, "North", player.id),
  };

  if (context?.communication) {
    void context.communication.updateTableState(state.tableId, nextState);
  }

  return nextState;
}

export function joinTableAsSouth(
  state: TableState,
  player: TablePlayer,
  context?: TableStateContext
): TableState {
  if (state.southPlayer && state.southPlayer.id !== player.id) {
    return state;
  }

  const withoutPlayer = removePlayerFromSeats(state, player);
  const nextState: TableState = {
    ...withoutPlayer,
    southPlayer: createTablePlayer(player.name, "South", player.id),
  };

  if (context?.communication) {
    void context.communication.updateTableState(state.tableId, nextState);
  }

  return nextState;
}

export function joinTableAsSpectator(
  state: TableState,
  player: TablePlayer,
  context?: TableStateContext
): TableState {
  if (state.spectators.some((spectator) => spectator.id === player.id)) {
    return state;
  }

  const withoutPlayer = removePlayerFromSeats(state, player);
  const nextState: TableState = {
    ...withoutPlayer,
    spectators: [...withoutPlayer.spectators, createTablePlayer(player.name, "Spectator", player.id)],
  };

  if (context?.communication) {
    void context.communication.updateTableState(state.tableId, nextState);
  }

  return nextState;
}

export function leaveTable(
  state: TableState,
  player: TablePlayer,
  context?: TableStateContext
): TableState {
  const nextState = removePlayerFromSeats(state, player);

  if (context?.communication) {
    void context.communication.updateTableState(state.tableId, nextState);
  }

  return nextState;
}

export function updateAuctionState(
  state: TableState,
  auction: Bid[],
  turn: Seat,
  context?: TableStateContext
): TableState {
  const nextState: TableState = {
    ...state,
    currentAuction: auction,
    currentTurn: turn,
  };

  if (context?.communication) {
    void context.communication.updateTableState(state.tableId, nextState);
  }

  return nextState;
}