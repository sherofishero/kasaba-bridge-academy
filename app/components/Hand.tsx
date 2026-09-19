import Card from "./Card";
import { Card as BridgeCard } from "../lib/deck";

type HandProps = {
  cards: BridgeCard[];
  direction?: "horizontal" | "vertical";
  onCardClick?: (card: BridgeCard) => void;
  /*
   * RESPONSIVE GÃ–REV 4 â€” kartlar arasÄ± Ã¶rtÃ¼ÅŸme (px).
   * Verilmezse (tÃ¼m mevcut kullanÄ±mlar: North, masaÃ¼stÃ¼, yatay, tablet)
   * deÄŸer 8'dir ve davranÄ±ÅŸ birebir eskisi gibidir. YalnÄ±zca mobil dikey
   * South eli daha bÃ¼yÃ¼k Ã¶rtÃ¼ÅŸme deÄŸeri geÃ§irir.
   */
  overlap?: number;
};

const suitOrder: Record<string, number> = {
  S: 0,
  H: 1,
  C: 2,
  D: 3,
};

const rankOrder: Record<string, number> = {
  A: 0,
  K: 1,
  Q: 2,
  J: 3,
  "10": 4,
  "9": 5,
  "8": 6,
  "7": 7,
  "6": 8,
  "5": 9,
  "4": 10,
  "3": 11,
  "2": 12,
};

export default function Hand({
  cards,
  direction = "horizontal",
  onCardClick,
  overlap = 8,
}: HandProps) {
  const sortedCards = [...cards].sort((a, b) => {
    const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];

    if (suitDiff !== 0) return suitDiff;

    return rankOrder[a.rank] - rankOrder[b.rank];
  });

  if (direction === "vertical") {
    return (
      <div className="flex flex-col">
        {sortedCards.map((card, index) => (
          <div
            key={index}
            className={index === 0 ? "" : "-mt-8"}
            style={{
              zIndex: index,
            }}
          >
            <Card
              card={card}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-end justify-center">
      {sortedCards.map((card, index) => (
        <div
          key={index}
          style={{
            /* GÃ–REV 4: Ã¶rtÃ¼ÅŸme Ã§aÄŸÄ±ran taraftan gelir; varsayÄ±lan 8 = mevcut
               davranÄ±ÅŸ. BÃ¶ylece North/masaÃ¼stÃ¼/yatay/tablet deÄŸiÅŸmez. */
            marginLeft: index === 0 ? 0 : -overlap,
            zIndex: index,
          }}
        >
          <Card
            card={card}
            onClick={onCardClick ? () => onCardClick(card) : undefined}
          />
        </div>
      ))}
    </div>
  );
}