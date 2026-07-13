import Card from "./Card";
import { Card as BridgeCard } from "../lib/deck";

type HandProps = {
  cards: BridgeCard[];
  direction?: "horizontal" | "vertical";
};

export default function Hand({
  cards,
  direction = "horizontal",
}: HandProps) {
  if (direction === "vertical") {
    return (
      <div className="flex flex-col">
        {cards.map((card, index) => (
          <div
            key={index}
            className={index === 0 ? "" : "-mt-8"}
            style={{ zIndex: index }}
          >
            <Card card={card} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex">
      {cards.map((card, index) => (
        <div
          key={index}
          className={index === 0 ? "" : "-ml-2"}
          style={{ zIndex: index }}
        >
          <Card card={card} />
        </div>
      ))}
    </div>
  );
}