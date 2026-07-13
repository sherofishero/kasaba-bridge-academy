import { Card as BridgeCard } from "../lib/deck";

type SuitHandProps = {
  cards: BridgeCard[];
};

const suitOrder = ["S", "H", "D", "C"] as const;

const rankOrder = [
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

function suitSymbol(suit: BridgeCard["suit"]) {
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

function suitColor(suit: BridgeCard["suit"]) {
  return suit === "H" || suit === "D"
    ? "text-red-600"
    : "text-black";
}

export default function SuitHand({ cards }: SuitHandProps) {
  return (
    <div className="bg-white rounded-lg shadow-md px-3 py-2 min-w-[170px]">
      {suitOrder.map((suit) => {
        const suitCards = cards
          .filter((c) => c.suit === suit)
          .sort(
            (a, b) =>
              rankOrder.indexOf(a.rank) -
              rankOrder.indexOf(b.rank)
          );

        return (
          <div
            key={suit}
            className="flex items-center gap-2 py-1"
          >
            <span
              className={`text-xl font-bold ${suitColor(suit)}`}
            >
              {suitSymbol(suit)}
            </span>

            <span
              className={`font-bold tracking-wide ${suitColor(suit)}`}
            >
              {suitCards.length
                ? suitCards.map((c) => c.rank).join(" ")
                : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}