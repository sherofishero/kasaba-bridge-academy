import {
  Card,
  Deal,
  createDeck,
  shuffleDeck,
  dealHands,
} from "./deck";

function hcp(card: Card): number {
  switch (card.rank) {
    case "A":
      return 4;
    case "K":
      return 3;
    case "Q":
      return 2;
    case "J":
      return 1;
    default:
      return 0;
  }
}

function handHcp(hand: Card[]) {
  return hand.reduce((t, c) => t + hcp(c), 0);
}

function suitLength(
  hand: Card[],
  suit: "S" | "H" | "D" | "C"
) {
  return hand.filter((c) => c.suit === suit).length;
}

function isBalanced(hand: Card[]) {
  const lengths = [
    suitLength(hand, "S"),
    suitLength(hand, "H"),
    suitLength(hand, "D"),
    suitLength(hand, "C"),
  ].sort((a, b) => b - a);

  const shape = lengths.join("-");

  return (
    shape === "4-3-3-3" ||
    shape === "4-4-3-2" ||
    shape === "5-3-3-2"
  );
}

function validSouth(hand: Card[]) {
  if (handHcp(hand) < 12) return false;

  if (!isBalanced(hand)) return false;

  if (suitLength(hand, "S") >= 5) return false;

  if (suitLength(hand, "H") >= 5) return false;

  if (
    suitLength(hand, "C") >= 5 &&
    suitLength(hand, "D") >= 5
  ) {
    return false;
  }

  return true;
}
function validNorth(
  hand: Card[],
  opener: Card[]
) {
  if (handHcp(hand) < 10) {
    return false;
  }

  if (suitLength(hand, "S") >= 4) {
    return false;
  }

  if (suitLength(hand, "H") >= 4) {
    return false;
  }

  const clubsOpen =
    suitLength(opener, "C") >= suitLength(opener, "D");

  if (clubsOpen) {
    return suitLength(hand, "C") >= 5;
  }

  return suitLength(hand, "D") >= 5;
}

export function generateInvertedDeal(): Deal {
  while (true) {
    const deal = dealHands(
      shuffleDeck(createDeck())
    );

    if (!validSouth(deal.south)) {
      continue;
    }

    if (
      !validNorth(
        deal.north,
        deal.south
      )
    ) {
      continue;
    }

    return deal;
  }
}