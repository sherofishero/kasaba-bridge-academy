export type Suit = "S" | "H" | "D" | "C";

export type Rank =
  | "A"
  | "K"
  | "Q"
  | "J"
  | "10"
  | "9"
  | "8"
  | "7"
  | "6"
  | "5"
  | "4"
  | "3"
  | "2";

export type Card = {
  suit: Suit;
  rank: Rank;
};

export type Hand = Card[];
export type Seat = "N" | "E" | "S" | "W";
export type Deal = {
  north: Hand;
  east: Hand;
  south: Hand;
  west: Hand;
};

const suits: Suit[] = ["S", "H", "D", "C"];

const ranks: Rank[] = [
  "A",
  "K",
  "Q",
  "J",
  "10",
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

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
      });
    }
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const cards = [...deck];

  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards;
}

export function dealHands(deck: Card[]): Deal {
  return {
    north: deck.slice(0, 13),
    east: deck.slice(13, 26),
    south: deck.slice(26, 39),
    west: deck.slice(39, 52),
  };
}export function suitSymbol(suit: Suit): string {
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
  switch (suit) {
    case "H":
    case "D":
      return "text-red-600";
    default:
      return "text-black";
  }
}