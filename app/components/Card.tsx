import { Card as BridgeCard, suitColor, suitSymbol } from "../lib/deck";

type CardProps = {
  card: BridgeCard;
};

export default function Card({ card }: CardProps) {
  return (
    <div
      className="
        w-7
        h-10
        bg-white
        rounded
        border
        border-gray-400
        shadow-sm
        flex
        flex-col
        items-center
        justify-center
        font-bold
        text-[10px]
        leading-none
        select-none
      "
    >
      <span className={suitColor(card.suit)}>
        {suitSymbol(card.suit)}
      </span>

      <span className={suitColor(card.suit)}>
        {card.rank}
      </span>
    </div>
  );
}