import { Deal, Seat } from "./deck";
import { Bid } from "./auction";
import { trainingBoards } from "./trainingDeals";
import { TableCommunication } from "./communication";
import type {
  Contract,
  GamePhase,
  PlayedCard,
  Trick,
} from "./play";

export type TableRole =
  | "North"
  | "East"
  | "South"
  | "West"
  | "Spectator";

export type TrainingDealKey = keyof typeof trainingBoards;

export type Vulnerability = "None" | "NS" | "EW" | "Both";

export type TablePlayer = {
  id: string | null;
  name: string;
  role: TableRole;
  lastSeenAt?: string;
};

export type TableState = {
  tableId: string;

  northPlayer: TablePlayer | null;
  eastPlayer: TablePlayer | null;
  southPlayer: TablePlayer | null;
  westPlayer: TablePlayer | null;

  spectators: TablePlayer[];

  hostPlayerId: string | null;

  /*
   * Katilim sirasi (oyuncu id'leri). Yalnizca SQL RPC'leri yonetir
   * (join_table_seat / leave_table_seat / cron sweep);
   * istemci tarafindan elle yazilmaz.
   * Eski masa verisinde bulunmayabilir -> opsiyonel.
   */
  joinOrder?: string[];

  activeTrainingDeal: TrainingDealKey | null;

  boardNumber: number;

  currentDeal: Deal;
  currentAuction: Bid[];

  dealer: Seat;
  vulnerability: Vulnerability;
  currentTurn: Seat;

  /* =========================================================
   * KART OYNAMA AŞAMASI (ortak play motoru — app/lib/play.ts)
   *
   * - originalDeal : board başladığında dağıtılan eller; oyun
   *                  boyunca DEĞİŞMEZ (history/replay/analiz için).
   * - currentDeal  : kart oynandıkça kalan eller.
   * - gamePhase    : "auction" | "play" | "completed"
   * ========================================================= */
  gamePhase: GamePhase;
  contract: Contract | null;
  declarer: Seat | null;
  dummy: Seat | null;
  openingLeader: Seat | null;
  playTurn: Seat | null;
  originalDeal: Deal;
  currentTrick: PlayedCard[];
  completedTricks: Trick[];
  playedCards: PlayedCard[];

  newBoardRequest: {
    requestedBy: string;
    approvals: string[];
    rejections: string[];
  } | null;

  /*
   * KART OYNAMA UNDO TALEBI (play fazı, açılış atağı dahil).
   *
   * - requestedBy   : talebi açan oyuncunun kullanıcı adı.
   * - requestedSeat : geri alınacak kartın ETKİN koltuğu. Dummy'den
   *                   declarer tarafından oynanan kartlarda bu
   *                   declarer'ın koltuğudur (talep onun hamlesi sayılır).
   * - approvals     : onaylayan rakiplerin kullanıcı adları.
   * - rejections    : reddeden rakiplerin kullanıcı adları.
   *
   * Undo'nun gerçekleşmesi için talep eden tarafın rakip
   * partnership'indeki İKİ oyuncunun da onayı zorunludur; biri bile
   * reddederse talep düşer. Aynı anda tek pending talep olabilir.
   */
  undoRequest: {
    requestedBy: string;
    requestedSeat: Seat;
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

export function getDealerForBoard(boardNumber: number): Seat {
  const seats: Seat[] = ["N", "E", "S", "W"];

  if (boardNumber < 1) {
    return "N";
  }

  return seats[(boardNumber - 1) % 4];
}

export function getVulnerabilityForBoard(
  boardNumber: number
): Vulnerability {
  const vulnerabilities: Vulnerability[] = [
    "None",
    "NS",
    "EW",
    "Both",
    "NS",
    "EW",
    "Both",
    "None",
    "EW",
    "Both",
    "None",
    "NS",
    "Both",
    "None",
    "NS",
    "EW",
  ];

  if (boardNumber < 1) {
    return "None";
  }

  return vulnerabilities[(boardNumber - 1) % 16];
}

export function createTablePlayer(
  name: string,
  role: TableRole,
  id: string | null = null
): TablePlayer {
  return {
    id,
    name,
    role,
    lastSeenAt: new Date().toISOString(),
  };
}

export function createTableState(
  tableId: string,
  currentDeal: Deal,
  currentAuction: Bid[] = [],
  currentTurn?: Seat,
  boardNumber: number = 1
): TableState {
  const dealer = getDealerForBoard(boardNumber);
  const vulnerability = getVulnerabilityForBoard(boardNumber);

  return {
    tableId,

    northPlayer: null,
    eastPlayer: null,
    southPlayer: null,
    westPlayer: null,

    spectators: [],

    hostPlayerId: null,

    joinOrder: [],

    activeTrainingDeal: null,

    boardNumber,

    currentDeal,
    currentAuction,

    dealer,
    vulnerability,

    currentTurn: currentTurn ?? dealer,

    /* Kart oynama aşaması başlangıç değerleri. */
    gamePhase: "auction",
    contract: null,
    declarer: null,
    dummy: null,
    openingLeader: null,
    playTurn: null,
    originalDeal: currentDeal,
    currentTrick: [],
    completedTricks: [],
    playedCards: [],

    newBoardRequest: null,

    undoRequest: null,

    autoPass: true,
  };
}

export function selectTrainingDeal(
  state: TableState,
  dealKey: TrainingDealKey,
  boardNumber: number = state.boardNumber
): TableState {
  const deal = trainingBoards[dealKey][0];

  return {
    ...state,

    activeTrainingDeal: dealKey,

    currentDeal: deal,

    boardNumber,

    dealer: "S",

    vulnerability: getVulnerabilityForBoard(boardNumber),

    currentTurn: "S",

    /* Yeni eğitim eli: play aşaması sıfırlanır. */
    gamePhase: "auction",
    contract: null,
    declarer: null,
    dummy: null,
    openingLeader: null,
    playTurn: null,
    originalDeal: deal,
    currentTrick: [],
    completedTricks: [],
    playedCards: [],
  };
}

export function removePlayerFromSeats(
  state: TableState,
  player: TablePlayer
): TableState {
  return {
    ...state,

    northPlayer:
      state.northPlayer?.id === player.id &&
      state.northPlayer?.name === player.name
        ? null
        : state.northPlayer,

    eastPlayer:
      state.eastPlayer?.id === player.id &&
      state.eastPlayer?.name === player.name
        ? null
        : state.eastPlayer,

    southPlayer:
      state.southPlayer?.id === player.id &&
      state.southPlayer?.name === player.name
        ? null
        : state.southPlayer,

    westPlayer:
      state.westPlayer?.id === player.id &&
      state.westPlayer?.name === player.name
        ? null
        : state.westPlayer,

    spectators: state.spectators.filter(
      (spectator) =>
        spectator.id !== player.id ||
        spectator.name !== player.name
    ),
  };
}

export function joinTableAsNorth(
  state: TableState,
  player: TablePlayer,
  context?: TableStateContext
): TableState {
  if (
    state.northPlayer &&
    state.northPlayer.id !== player.id
  ) {
    return state;
  }

  const withoutPlayer = removePlayerFromSeats(
    state,
    player
  );

  const nextState: TableState = {
    ...withoutPlayer,

    northPlayer: createTablePlayer(
      player.name,
      "North",
      player.id
    ),
  };

  if (context?.communication) {
    void context.communication.updateTableState(
      state.tableId,
      nextState
    );
  }

  return nextState;
}

export function joinTableAsSouth(
  state: TableState,
  player: TablePlayer,
  context?: TableStateContext
): TableState {
  if (
    state.southPlayer &&
    state.southPlayer.id !== player.id
  ) {
    return state;
  }

  const withoutPlayer = removePlayerFromSeats(
    state,
    player
  );

  const nextState: TableState = {
    ...withoutPlayer,

    southPlayer: createTablePlayer(
      player.name,
      "South",
      player.id
    ),
  };

  if (context?.communication) {
    void context.communication.updateTableState(
      state.tableId,
      nextState
    );
  }

  return nextState;
}

export function joinTableAsSpectator(
  state: TableState,
  player: TablePlayer,
  context?: TableStateContext
): TableState {
  if (
    state.spectators.some(
      (spectator) => spectator.id === player.id
    )
  ) {
    return state;
  }

  const withoutPlayer = removePlayerFromSeats(
    state,
    player
  );

  const nextState: TableState = {
    ...withoutPlayer,

    spectators: [
      ...withoutPlayer.spectators,

      createTablePlayer(
        player.name,
        "Spectator",
        player.id
      ),
    ],
  };

  if (context?.communication) {
    void context.communication.updateTableState(
      state.tableId,
      nextState
    );
  }

  return nextState;
}

export function leaveTable(
  state: TableState,
  player: TablePlayer,
  context?: TableStateContext
): TableState {
  const nextState = removePlayerFromSeats(
    state,
    player
  );

  if (context?.communication) {
    void context.communication.updateTableState(
      state.tableId,
      nextState
    );
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
    void context.communication.updateTableState(
      state.tableId,
      nextState
    );
  }

  return nextState;
}