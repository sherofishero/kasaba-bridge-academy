import { writeFileSync } from "node:fs";
import { createDeck, shuffleDeck, dealHands, Card, Deal } from "./app/lib/deck";
const usedBoards = new Set<string>();

function boardKey(deal: Deal): string {
  return ["north", "east", "south", "west"]
    .map((seat) =>
      deal[seat as keyof Deal]
        .map((c) => `${c.suit}${c.rank}`)
        .join("")
    )
    .join("|");
}


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
  const s = suitLength(hand, "S");
  const h = suitLength(hand, "H");
  const d = suitLength(hand, "D");
  const c = suitLength(hand, "C");

  const shape = [s, h, d, c]
    .sort((a, b) => b - a)
    .join("-");

  return (
    shape === "4-3-3-3" ||
    shape === "4-4-3-2" ||
    shape === "5-3-3-2"
  );
}
function validInvertedSouth(hand: Card[]): boolean {
  if (handHcp(hand) < 12) {
    return false;
  }

  if (!isBalanced(hand)) {
    return false;
  }

  if (suitLength(hand, "S") >= 5) {
    return false;
  }

  if (suitLength(hand, "H") >= 5) {
    return false;
  }

  if (
    suitLength(hand, "C") >= 5 &&
    suitLength(hand, "D") >= 5
  ) {
    return false;
  }

  return true;
}

function validInvertedNorth(
  hand: Card[],
  opener: Card[]
): boolean {
  if (handHcp(hand) < 10) {
    return false;
  }

  if (suitLength(hand, "S") >= 4) {
    return false;
  }

  if (suitLength(hand, "H") >= 4) {
    return false;
  }

  const clubsOpened =
    suitLength(opener, "C") >= suitLength(opener, "D");

  if (clubsOpened) {
    return suitLength(hand, "C") >= 5;
  }

  return suitLength(hand, "D") >= 5;
}

function generateInvertedBoard(): Deal {
  while (true) {
    const deal = dealHands(
      shuffleDeck(createDeck())
    );

    if (!validInvertedSouth(deal.south)) {
      continue;
    }

    if (
      !validInvertedNorth(
        deal.north,
        deal.south
      )
    ) {
      continue;
    }

    const key = boardKey(deal);

if (usedBoards.has(key)) {
  continue;
}

usedBoards.add(key);

return deal;
  }
}
function validTwoNtSouth(hand: Card[]): boolean {
  if (handHcp(hand) < 20 || handHcp(hand) > 21) {
    return false;
  }

  if (!isBalanced(hand)) {
    return false;
  }

  return true;
}

function generateTwoNtBoard(): Deal {
  while (true) {
    const deal = dealHands(
      shuffleDeck(createDeck())
    );

    if (!validTwoNtSouth(deal.south)) {
      continue;
    }

    const key = boardKey(deal);

if (usedBoards.has(key)) {
  continue;
}

usedBoards.add(key);

return deal;
  }
}

function cardText(card: Card): string {
  return `{ suit: "${card.suit}", rank: "${card.rank}" }`;
}

function handText(hand: Card[]): string {
  return `[
${hand.map((c) => `      ${cardText(c)}`).join(",\n")}
    ]`;
}

function dealText(deal: Deal): string {
  return `{
    north: ${handText(deal.north)},
    east: ${handText(deal.east)},
    south: ${handText(deal.south)},
    west: ${handText(deal.west)},
  }`;
}
function buildFile(): string {
  const inverted: Deal[] = [];
  const twoNt: Deal[] = [];

  for (let i = 0; i < 100; i++) {
    inverted.push(generateInvertedBoard());
  }

  for (let i = 0; i < 100; i++) {
    twoNt.push(generateTwoNtBoard());
  }

  return `import { Deal } from "./deck";

export const trainingBoards = {
  INVERTED: [
${inverted.map((d) => dealText(d)).join(",\n")}
  ] as Deal[],

  TWO_NT: [
${twoNt.map((d) => dealText(d)).join(",\n")}
  ] as Deal[],
};
`;
}

writeFileSync(
  "./app/lib/trainingDeals.ts",
  buildFile(),
  "utf8"
);

console.log("trainingDeals.ts oluşturuldu.");
console.log("Inverted Board : 100");
console.log("2NT Board      : 100");