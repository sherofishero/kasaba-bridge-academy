import { writeFileSync } from "node:fs";
import {
  createDeck,
  shuffleDeck,
  dealHands,
  Card,
  Deal,
} from "./app/lib/deck";

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
    case "A": return 4;
    case "K": return 3;
    case "Q": return 2;
    case "J": return 1;
    default: return 0;
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
  const shape = [
    suitLength(hand, "S"),
    suitLength(hand, "H"),
    suitLength(hand, "D"),
    suitLength(hand, "C"),
  ].sort((a, b) => b - a).join("-");

  return (
    shape === "4-3-3-3" ||
    shape === "4-4-3-2" ||
    shape === "5-3-3-2" ||
    shape === "6-3-2-2"
  );
}

/* ---------------- INVERTED ---------------- */

function validInvertedSouth(hand: Card[]): boolean {
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

function validInvertedNorth(
  hand: Card[],
  opener: Card[]
): boolean {
  if (handHcp(hand) < 10) return false;
  if (suitLength(hand, "S") >= 4) return false;
  if (suitLength(hand, "H") >= 4) return false;

  const clubsOpened =
    suitLength(opener, "C") >= suitLength(opener, "D");

  return clubsOpened
    ? suitLength(hand, "C") >= 5
    : suitLength(hand, "D") >= 5;
}

function generateInvertedBoard(): Deal {
  while (true) {
    const deal = dealHands(shuffleDeck(createDeck()));

    if (!validInvertedSouth(deal.south)) continue;
    if (!validInvertedNorth(deal.north, deal.south)) continue;

    const key = boardKey(deal);
    if (usedBoards.has(key)) continue;

    usedBoards.add(key);
    return deal;
  }
}

/* ---------------- 2NT ---------------- */

function validTwoNtSouth(hand: Card[]): boolean {
  return (
    handHcp(hand) >= 20 &&
    handHcp(hand) <= 21 &&
    isBalanced(hand) &&
    suitLength(hand, "S") < 5 &&
    suitLength(hand, "H") < 5
  );
}

function generateTwoNtBoard(): Deal {
  while (true) {
    const deal = dealHands(shuffleDeck(createDeck()));

    if (!validTwoNtSouth(deal.south)) continue;

    const key = boardKey(deal);
    if (usedBoards.has(key)) continue;

    usedBoards.add(key);
    return deal;
  }
}

/* ---------------- 1NT AÇIŞLAR ---------------- */

type OneNTCategory =
  | "4-4 major"
  | "5-5 major"
  | "6-4 major"
  | "5-4 major"
  | "4M + 5/6 minor"
  | "4441 / 4414"
  | "5-5 minor"
  | "single-suit minor"
  | "single-suit major"
  | "balanced without 4M";

type OneNTGoal = "ZON" | "ŞLAMIŞ";

const oneNTCategories: OneNTCategory[] = [
  "4-4 major",
  "5-5 major",
  "6-4 major",
  "5-4 major",
  "4M + 5/6 minor",
  "4441 / 4414",
  "5-5 minor",
  "single-suit minor",
  "single-suit major",
  "balanced without 4M",
];

function validOneNTSouth(hand: Card[]): boolean {
  return (
    handHcp(hand) >= 15 &&
    handHcp(hand) <= 17 &&
    isBalanced(hand) &&
    suitLength(hand, "S") < 5 &&
    suitLength(hand, "H") < 5
  );
}

function validOneNTNorthCategory(
  hand: Card[],
  category: OneNTCategory
): boolean {
  const S = suitLength(hand, "S");
  const H = suitLength(hand, "H");
  const D = suitLength(hand, "D");
  const C = suitLength(hand, "C");

  switch (category) {
    case "4-4 major":
      return S === 4 && H === 4;

    case "5-5 major":
      return S === 5 && H === 5;

    case "6-4 major":
      return (S === 6 && H === 4) || (S === 4 && H === 6);

    case "5-4 major":
      return (S === 5 && H === 4) || (S === 4 && H === 5);

    case "4M + 5/6 minor":
      return (
        (S === 4 || H === 4) &&
        (D === 5 || D === 6 || C === 5 || C === 6)
      );

    case "4441 / 4414":
      return [S, H, D, C]
        .sort((a, b) => a - b)
        .join("-") === "1-4-4-4";

    case "5-5 minor":
      return D === 5 && C === 5;

    case "single-suit minor":
      return (
        (C >= 6 || D >= 6) &&
        S <= 3 &&
        H <= 3
      );

    case "single-suit major":
      return (
        (S >= 6 || H >= 6) &&
        D <= 3 &&
        C <= 3
      );

    case "balanced without 4M":
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

  if (goal === "ŞLAMIŞ") {
    return points >= 16;
  }

  return points >= 10 && points <= 15;
}

function generateOneNTBoard(
  category: OneNTCategory,
  goal: OneNTGoal
): Deal {
  while (true) {
    const deal = dealHands(shuffleDeck(createDeck()));

    if (!validOneNTSouth(deal.south)) continue;
    if (!validOneNTNorthCategory(deal.north, category)) continue;
    if (!validOneNTNorthGoal(deal.north, goal)) continue;

    const key = boardKey(deal);
    if (usedBoards.has(key)) continue;

    usedBoards.add(key);
    return deal;
  }
}

/* ---------------- FILE OUTPUT ---------------- */

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

function generateBoards(
  count: number,
  generator: () => Deal
): Deal[] {
  const boards: Deal[] = [];

  for (let i = 0; i < count; i++) {
    boards.push(generator());
  }

  return boards;
}

function buildFile(): string {
  const inverted = generateBoards(100, generateInvertedBoard);
  const twoNt = generateBoards(100, generateTwoNtBoard);

  const oneNTBlocks = oneNTCategories.flatMap((category) => {
    const zon = generateBoards(
      100,
      () => generateOneNTBoard(category, "ZON")
    );

    const slamInterest = generateBoards(
      100,
      () => generateOneNTBoard(category, "ŞLAMIŞ")
    );

    return [
      `  "${category}": [\n${zon
        .concat(slamInterest)
        .map((d) => dealText(d))
        .join(",\n")}\n  ] as Deal[],`,
    ];
  });

  return `import { Deal } from "./deck";

export const trainingBoards: Record<string, Deal[]> = {
  INVERTED: [
${inverted.map((d) => dealText(d)).join(",\n")}
  ] as Deal[],

  TWO_NT: [
${twoNt.map((d) => dealText(d)).join(",\n")}
  ] as Deal[],

  "1NT AÇIŞLAR": [
${oneNTCategories.map((category) => `    // ${category}`).join("\n")}
  ] as Deal[],

${oneNTBlocks.join("\n\n")}
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
console.log("1NT AÇIŞLAR    : 10 kategori × 200 el (100 ZON + 100 ŞLAMIŞ)");