export type Seat = "N" | "E" | "S" | "W";

export type Vulnerability =
  | "None"
  | "NS"
  | "EW"
  | "Both";

export interface AuctionState {
  dealer: Seat;
  vulnerability: Vulnerability;
  turn: Seat;
  bids: string[];
}

const seats: Seat[] = ["N", "E", "S", "W"];

const vulnerabilities: Vulnerability[] = [
  "None",
  "NS",
  "EW",
  "Both",
];

export function randomDealer(): Seat {
  return seats[Math.floor(Math.random() * seats.length)];
}

export function randomVulnerability(): Vulnerability {
  return vulnerabilities[
    Math.floor(Math.random() * vulnerabilities.length)
  ];
}

export function createAuction(): AuctionState {
  const dealer = randomDealer();

  return {
    dealer,
    vulnerability: randomVulnerability(),
    turn: dealer,
    bids: [],
  };
}

export function nextSeat(seat: Seat): Seat {
  switch (seat) {
    case "N":
      return "E";

    case "E":
      return "S";

    case "S":
      return "W";

    case "W":
      return "N";
  }
}

export function addBid(
  auction: AuctionState,
  bid: string
): AuctionState {
  return {
    ...auction,
    bids: [...auction.bids, bid],
    turn: nextSeat(auction.turn),
  };
}

export function undoBid(
  auction: AuctionState
): AuctionState {

  if (auction.bids.length === 0) {
    return auction;
  }

  const bids = [...auction.bids];
  bids.pop();

  return {
    ...auction,
    bids,
    turn:
      auction.turn === "N"
        ? "W"
        : auction.turn === "E"
        ? "N"
        : auction.turn === "S"
        ? "E"
        : "S",
  };
}