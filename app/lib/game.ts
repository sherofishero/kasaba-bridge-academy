import { Deal, Seat } from "./deck";
import { Bid } from "./auction";

export type TableRole = "North" | "South" | "Spectator";

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
  currentDeal: Deal;
  currentAuction: Bid[];
  currentTurn: Seat;
};

export type GameState = {
  deal: Deal;
  auction: Bid[];
  turn: Seat;
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
    currentDeal,
    currentAuction,
    currentTurn,
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
  player: TablePlayer
): TableState {
  if (state.northPlayer && state.northPlayer.id !== player.id) {
    return state;
  }

  const withoutPlayer = removePlayerFromSeats(state, player);
  return {
    ...withoutPlayer,
    northPlayer: { ...player, role: "North" },
  };
}

export function joinTableAsSouth(
  state: TableState,
  player: TablePlayer
): TableState {
  if (state.southPlayer && state.southPlayer.id !== player.id) {
    return state;
  }

  const withoutPlayer = removePlayerFromSeats(state, player);
  return {
    ...withoutPlayer,
    southPlayer: { ...player, role: "South" },
  };
}

export function joinTableAsSpectator(
  state: TableState,
  player: TablePlayer
): TableState {
  if (state.spectators.some((spectator) => spectator.id === player.id)) {
    return state;
  }

  const withoutPlayer = removePlayerFromSeats(state, player);
  return {
    ...withoutPlayer,
    spectators: [...withoutPlayer.spectators, { ...player, role: "Spectator" }],
  };
}

export function leaveTable(
  state: TableState,
  player: TablePlayer
): TableState {
  return removePlayerFromSeats(state, player);
}