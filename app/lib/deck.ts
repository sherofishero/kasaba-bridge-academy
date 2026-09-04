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

/*
 * Tek Seat kaynağı. auction.ts ve diğer modüller Seat'i buradan alır;
 * böylece deklarasyon ile kart oynama arasında tip uyumsuzluğu oluşmaz.
 */
export const SEAT_ORDER: readonly Seat[] = ["N", "E", "S", "W"];

/* Saat yönü sırası: N -> E -> S -> W -> N */
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

/* Verilen seat'in elini Deal'den okur (mutable olmayan referans). */
export function getHand(deal: Deal, seat: Seat): Hand {
  switch (seat) {
    case "N":
      return deal.north;
    case "E":
      return deal.east;
    case "S":
      return deal.south;
    case "W":
      return deal.west;
  }
}

/* Bir kartı seat'in elinden çıkarır ve YENİ bir Deal döner (immutable). */
export function removeCard(
  deal: Deal,
  seat: Seat,
  card: Card
): Deal {
  const handFor = (slot: Seat): Hand =>
    slot === seat
      ? getHand(deal, slot).filter(
          (c) => !(c.suit === card.suit && c.rank === card.rank)
        )
      : getHand(deal, slot);

  return {
    north: handFor("N"),
    east: handFor("E"),
    south: handFor("S"),
    west: handFor("W"),
  };
}

const suits: Suit[] = ["S", "H", "D", "C"];

/* Rank sırası (büyükten küçüğe). Trick winner ve sıralama bu diziye dayanır. */
export const ranks: Rank[] = [
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