import { Card as BridgeCard } from "../lib/deck";

type HandProps = {
  cards: BridgeCard[];
};

export default function Hand({ cards }: HandProps) {
  const suits = {
    S: cards.filter((c) => c.suit === "S"),
    H: cards.filter((c) => c.suit === "H"),
    D: cards.filter((c) => c.suit === "D"),
    C: cards.filter((c) => c.suit === "C"),
  };

  return (
    <div className="text-white text-base font-mono leading-6">
      <div>
        <span className="text-black">♠ </span>
        {suits.S.map((c) => c.rank).join(" ")}
      </div>

      <div>
        <span className="text-red-500">♥ </span>
        {suits.H.map((c) => c.rank).join(" ")}
      </div>

      <div>
        <span className="text-red-500">♦ </span>
        {suits.D.map((c) => c.rank).join(" ")}
      </div>

      <div>
        <span className="text-black">♣ </span>
        {suits.C.map((c) => c.rank).join(" ")}
      </div>
    </div>
  );
}
