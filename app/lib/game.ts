import { Deal, Seat } from "./deck";
import { Bid } from "./auction";
import { trainingBoards } from "./trainingDeals";
import { TableCommunication } from "./communication";

export type TableRole = "North" | "South" | "Spectator";
export type TrainingDealKey = keyof typeof trainingBoards;

export type TablePlayer = {
  id: string | null;
  name: string;
  role: TableRole;
};

export type TableState = {
  tableId: string;
  northPlayer: TablePlayer | null;
  southPlayer: TablePlayer | null;
  spectators: TablePlayer[];
  activeTrainingDeal: TrainingDealKey | null;
  currentDeal: Deal;
  currentAuction: Bid[];
  currentTurn: Seat;
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
    southPlayer: null,
    spectators: [],
    activeTrainingDeal: null,
    currentDeal,
    currentAuction,
    currentTurn,
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

function removePlayerFromSeats(
  state: TableState,
  player: TablePlayer
): TableState {
  return {
    ...state,
    northPlayer:
      state.northPlayer?.id === player.id && state.northPlayer?.name === player.name
        ? null
        : state.northPlayer,
    southPlayer:
      state.southPlayer?.id === player.id && state.southPlayer?.name === player.name
        ? null
        : state.southPlayer,
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
  const nextState = {
    ...withoutPlayer,
    northPlayer: { ...player, role: "North" },
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
  const nextState = {
    ...withoutPlayer,
    southPlayer: { ...player, role: "South" },
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
  const nextState = {
    ...withoutPlayer,
    spectators: [...withoutPlayer.spectators, { ...player, role: "Spectator" }],
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