import { Card as BridgeCard } from "../lib/deck";

type CardProps = {
  card: BridgeCard;
};

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

export default function Card({ card }: CardProps) {
  return (
    <div
      className="
        w-[54px]
        h-[82px]
        bg-white
        rounded-xl
        border-2
        border-gray-300
        shadow-lg
        relative
        select-none
      "
    >
      {/* Sol üst */}
      <div
        className={`absolute top-1 left-1 flex flex-col items-center leading-none font-bold ${suitColor(
          card.suit
        )}`}
      >
        <span className="text-[14px]">{card.rank}</span>
        <span className="text-[14px]">{suitSymbol(card.suit)}</span>
      </div>

      {/* Orta */}
      <div
        className={`absolute inset-0 flex items-center justify-center ${suitColor(
          card.suit
        )}`}
      >
        <span className="text-[34px]">
          {suitSymbol(card.suit)}
        </span>
      </div>

      {/* Sağ alt */}
      <div
        className={`absolute bottom-1 right-1 rotate-180 flex flex-col items-center leading-none font-bold ${suitColor(
          card.suit
        )}`}
      >
        <span className="text-[14px]">{card.rank}</span>
        <span className="text-[14px]">{suitSymbol(card.suit)}</span>
      </div>
    </div>
  );
}