import {
  Card,
  Deal,
  createDeck,
  shuffleDeck,
  dealHands,
} from "./deck";

export type OneNTCategory =
  | "4-4 majör"
  | "5-5 majör"
  | "6-4 majör"
  | "5-4 majör"
  | "4M + 5/6 minör"
  | "4441 / 4414"
  | "5-5 minör"
  | "tek renkli minör"
  | "tek renkli majör"
  | "4'lü majörü olmayan dengeli";

export type OneNTGoal = "ZON" | "ŞLAMIŞ";

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

function handHcp(hand: Card[]): number {
  return hand.reduce((t, c) => t + hcp(c), 0);
}

function suitLength(
  hand: Card[],
  suit: "S" | "H" | "D" | "C"
): number {
  return hand.filter((c) => c.suit === suit).length;
}

function isBalanced(hand: Card[]): boolean {
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
    shape === "5-3-3-2" ||
    shape === "6-3-2-2"
  );
}

function validOneNTSouth(hand: Card[]): boolean {
  const points = handHcp(hand);

  if (points < 15 || points > 17) return false;

  if (!isBalanced(hand)) return false;

  if (suitLength(hand, "S") >= 5) return false;
  if (suitLength(hand, "H") >= 5) return false;

  return true;
}

function validOneNTNorth(
  hand: Card[],
  category: OneNTCategory
): boolean {
  const S = suitLength(hand, "S");
  const H = suitLength(hand, "H");
  const D = suitLength(hand, "D");
  const C = suitLength(hand, "C");

  switch (category) {
    case "4-4 majör":
      return S === 4 && H === 4;

    case "5-5 majör":
      return S === 5 && H === 5;

    case "6-4 majör":
      return (
        (S === 6 && H === 4) ||
        (S === 4 && H === 6)
      );

    case "5-4 majör":
      return (
        (S === 5 && H === 4) ||
        (S === 4 && H === 5)
      );

    case "4M + 5/6 minör":
      return (
        (S === 4 || H === 4) &&
        (D === 5 || D === 6 || C === 5 || C === 6)
      );

    case "4441 / 4414":
      return (
        [S, H, D, C].sort((a, b) => a - b).join("-") ===
        "1-4-4-4"
      );

    case "5-5 minör":
      return D === 5 && C === 5;

    case "tek renkli minör":
      return (
        (C >= 6 || D >= 6) &&
        S <= 3 &&
        H <= 3
      );

    case "tek renkli majör":
      return (
        (S >= 6 || H >= 6) &&
        D <= 3 &&
        C <= 3
      );

    case "4'lü majörü olmayan dengeli":
      return (
        isBalanced(hand) &&
        S <= 3 &&
        H <= 3
      );
  }
}

function validOneNTNorthGoal(
  hand: Card[],
  goal: OneNTGoal
): boolean {
  const points = handHcp(hand);

  // Şlamiş = şlem ilgisi.
  // 1NT açışında cevapçının 16+ HCP'si,
  // açıcı 17 tuttuğunda 33 toplam puana ulaşabilir.
  if (goal === "ŞLAMIŞ") {
    return points >= 16;
  }

  // ZON: şlem ilgisi olmayan, ancak oyun/manş değerlendirmesine
  // girebilecek cevapçı eli.
  return points >= 10 && points <= 15;
}

export function generateOneNTDeal(
  category: OneNTCategory,
  goal: OneNTGoal
): Deal {
  while (true) {
    const deal = dealHands(
      shuffleDeck(createDeck())
    );

    if (!validOneNTSouth(deal.south)) {
      continue;
    }

    if (!validOneNTNorth(deal.north, category)) {
      continue;
    }

    if (!validOneNTNorthGoal(deal.north, goal)) {
      continue;
    }

    return deal;
  }
}

// Mevcut Inverted generator
export function generateInvertedDeal(): Deal {
  while (true) {
    const deal = dealHands(
      shuffleDeck(createDeck())
    );

    const southHcp = handHcp(deal.south);

    if (
      !(
        (southHcp >= 12 && southHcp <= 14) ||
        (southHcp >= 18 && southHcp <= 19)
      )
    ) {
      continue;
    }

    if (
      suitLength(deal.south, "S") >= 5 ||
      suitLength(deal.south, "H") >= 5
    ) {
      continue;
    }

    let openingMinor: "C" | "D";

    if (suitLength(deal.south, "C") >= 5) {
      openingMinor = "C";
    } else if (suitLength(deal.south, "D") >= 5) {
      openingMinor = "D";
    } else {
      continue;
    }

    if (suitLength(deal.north, openingMinor) < 5) {
      continue;
    }

    if (
      suitLength(deal.north, "S") >= 4 ||
      suitLength(deal.north, "H") >= 4
    ) {
      continue;
    }

    return deal;
  }
}

// Mevcut 2NT generator
export function generateTwoNTDeal(): Deal {
  while (true) {
    const deal = dealHands(
      shuffleDeck(createDeck())
    );

    const southHcp = handHcp(deal.south);

    if (southHcp < 20 || southHcp > 21) {
      continue;
    }

    if (
      suitLength(deal.south, "S") >= 5 ||
      suitLength(deal.south, "H") >= 5
    ) {
      continue;
    }

    if (!isBalanced(deal.south)) {
      continue;
    }

    return deal;
  }
}