export type Seat = "N" | "E" | "S" | "W";

export type Strain =
  | "C"
  | "D"
  | "H"
  | "S"
  | "NT";

export type BidType =
  | "BID"
  | "PASS"
  | "DOUBLE"
  | "REDOUBLE";

export type Bid = {
  seat: Seat;
  type: BidType;

  level?: 1 | 2 | 3 | 4 | 5 | 6 | 7;

  strain?: Strain;
};

const strainOrder: Record<Strain, number> = {
  C: 0,
  D: 1,
  H: 2,
  S: 3,
  NT: 4,
};

export function getLastContract(
  auction: Bid[]
): Bid | undefined {
  for (let i = auction.length - 1; i >= 0; i--) {
    if (auction[i].type === "BID") {
      return auction[i];
    }
  }

  return undefined;
}
export function getLastCall(
  auction: Bid[]
): Bid | undefined {
  return auction.at(-1);
}

export function isHigherBid(
  level: number,
  strain: Strain,
  lastBid?: Bid
) {
  if (!lastBid) return true;

  if (
    lastBid.level === undefined ||
    lastBid.strain === undefined
  ) {
    return true;
  }

  if (level > lastBid.level) {
    return true;
  }

  if (level < lastBid.level) {
    return false;
  }

  return (
    strainOrder[strain] >
    strainOrder[lastBid.strain]
  );
}

export function isLegalBid(
  auction: Bid[],
  level: number,
  strain: Strain
) {
  const lastContract = getLastContract(auction);

  return isHigherBid(
    level,
    strain,
    lastContract
  );
}



 export function canDouble(
  auction: Bid[],
  turn: Seat
) {
  const lastContract = getLastContract(auction);

  if (!lastContract) {
    return false;
  }

  // Aynı ortaklığın kontratını double edemez.
  if (
    getPartnership(lastContract.seat) ===
    getPartnership(turn)
  ) {
    return false;
  }

  // Son kontrattan sonra tekrar DOUBLE yapılmış mı?
  for (let i = auction.length - 1; i >= 0; i--) {
    const call = auction[i];

    if (call.type === "BID") {
      break;
    }

    if (call.type === "DOUBLE") {
      return false;
    }

    if (call.type === "REDOUBLE") {
      return false;
    }
  }

  return true;
}

export function canRedouble(
  auction: Bid[],
  turn: Seat
) {
  let lastDouble: Bid | undefined;

  for (let i = auction.length - 1; i >= 0; i--) {
    const call = auction[i];

    if (call.type === "BID") {
      break;
    }

    if (call.type === "REDOUBLE") {
      return false;
    }

    if (call.type === "DOUBLE") {
      lastDouble = call;
      break;
    }
  }

  if (!lastDouble) {
    return false;
  }

  return (
    getPartnership(lastDouble.seat) !==
    getPartnership(turn)
  );
}
export function auctionFinished(
  auction: Bid[]
) {
  if (auction.length < 4) {
    return false;
  }

  const lastThree = auction.slice(-3);

  return lastThree.every(
    (call) => call.type === "PASS"
  );
}

function getPartnership(
  seat: Seat
): "NS" | "EW" {
  return seat === "N" || seat === "S"
    ? "NS"
    : "EW";
}