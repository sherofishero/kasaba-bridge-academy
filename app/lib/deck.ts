export type Suit = "S" | "H" | "D" | "C";

export type Rank =
  | "A"
  | "K"
  | "Q"
  | "J"
  | "T"
  | "9"
  | "8"
  | "7"
  | "6"
  | "5"
  | "4"
  | "3"
  | "2";

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Deal {
  north: Card[];
  east: Card[];
  south: Card[];
  west: Card[];
}

export const SUITS: Suit[] = ["S", "H", "D", "C"];

export const RANKS: Rank[] = [
  "A",
  "K",
  "Q",
  "J",
  "T",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
];

export function createDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

export function sortHand(hand: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = {
    S: 0,
    H: 1,
    C: 2,
    D: 3,
  };

  const rankOrder: Record<Rank, number> = {
    A: 0,
    K: 1,
    Q: 2,
    J: 3,
    T: 4,
    9: 5,
    8: 6,
    7: 7,
    6: 8,
    5: 9,
    4: 10,
    3: 11,
    2: 12,
  };

  return [...hand].sort((a, b) => {
    if (a.suit !== b.suit) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }

    return rankOrder[a.rank] - rankOrder[b.rank];
  });
}

export function dealHands(deck: Card[]): Deal {
  return {
    north: sortHand(deck.slice(0, 13)),
    east: sortHand(deck.slice(13, 26)),
    south: sortHand(deck.slice(26, 39)),
    west: sortHand(deck.slice(39, 52)),
  };
}

export function suitSymbol(suit: Suit): string {
  switch (suit) {
    case "S":
      return "♠";
    case "H":
      return "♥";
    case "D":
      return "♦";
    case "C":
      return "♣";
  }
}

export function suitColor(suit: Suit): string {
  return suit === "H" || suit === "D"
    ? "text-red-600"
    : "text-black";
}