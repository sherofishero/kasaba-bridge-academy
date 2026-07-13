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