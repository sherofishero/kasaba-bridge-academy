import { Card as BridgeCard, suitColor, suitSymbol } from "../lib/deck";

type CardProps = {
  card: BridgeCard;
};

export default function Card({ card }: CardProps) {
  return (
    <div
      className={`
        w-10
        h-14
        bg-white
        rounded-md
        border
        border-gray-400
        shadow
        flex
        flex-col
        justify-between
        px-1
        py-1
        select-none
      `}
    >
      <div
        className={`text-xs font-bold leading-none ${suitColor(card.suit)}`}
      >
        {card.rank}
      </div>

      <div
        className={`text-lg font-bold text-center leading-none ${suitColor(
          card.suit
        )}`}
      >
        {suitSymbol(card.suit)}
      </div>

      <div
        className={`text-xs font-bold leading-none self-end rotate-180 ${suitColor(
          card.suit
        )}`}
      >
        {card.rank}
      </div>
    </div>
  );
}