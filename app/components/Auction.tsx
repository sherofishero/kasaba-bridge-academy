import { Bid } from "../lib/auction";
import { useEffect, useRef } from "react";

type AuctionProps = {
  auction: Bid[];
  turn: "W" | "N" | "E" | "S";
  newBoardRequest?: {
    requestedBy: string;
    approvals: string[];
    rejections: string[];
  } | null;
};

function suitSymbol(strain: "C" | "D" | "H" | "S") {
  switch (strain) {
    case "C":
      return "♣";
    case "D":
      return "♦";
    case "H":
      return "♥";
    case "S":
      return "♠";
  }
}

function formatBid(bid: Bid) {
  switch (bid.type) {
    case "PASS":
      return "PASS";
    case "DOUBLE":
      return "X";
    case "REDOUBLE":
      return "XX";
    case "BID":
      return `${bid.level}${bid.strain === "NT"
        ? "NT"
        : suitSymbol(bid.strain!)
        }`;
  }
}

function textColor(bid: Bid) {
  if (bid.type !== "BID") return "text-black";

  switch (bid.strain) {
    case "H":
    case "D":
      return "text-red-600";

    case "NT":
      return "text-sky-500";

    case "S":
    case "C":
      return "text-black";

    default:
      return "text-black";
  }
}

export default function Auction({
  auction,
  turn,
  newBoardRequest,
}: AuctionProps) {
  const auctionScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = auctionScrollRef.current;

    if (!scrollContainer) {
      return;
    }

    requestAnimationFrame(() => {
      scrollContainer.scrollTop =
        scrollContainer.scrollHeight;
    });
  }, [auction]);

  const rows: (Bid | null)[][] = [];

  if (auction.length > 0) {
    const seatIndex: Record<"N" | "E" | "S" | "W", number> = {
      N: 0,
      E: 1,
      S: 2,
      W: 3,
    };

    let currentRow: (Bid | null)[] = [null, null, null, null];
    let lastColumn = -1;

    for (const bid of auction) {
      const column = seatIndex[bid.seat];

      // A bid sits at its actual seat column. When the seat column
      // wraps backward (left of the previous bid), start a new row.
      if (column <= lastColumn) {
        rows.push(currentRow);
        currentRow = [null, null, null, null];
      }

      currentRow[column] = bid;
      lastColumn = column;
    }

    rows.push(currentRow);
  }

  return (
    <div className="bg-yellow-200 rounded-xl border border-red-700 shadow-xl p-3 w-[320px]">

      <div className="grid grid-cols-4 text-center mb-2 font-bold text-zinc-900">
        <div>N</div>
        <div>E</div>
        <div>S</div>
        <div>W</div>
      </div>

      <div
        ref={auctionScrollRef}
        className="min-h-[110px] max-h-[110px] overflow-y-auto space-y-1"
      >
        {rows.length === 0 ? (
          <div className="text-center text-zinc-600 italic mt-12">
            Açık artırma henüz başlamadı
          </div>
        ) : (
          rows.map((row, r) => (
            <div
              key={r}
              className="grid grid-cols-4 gap-1"
            >
              {row.map((bid, c) => (
                <div
                  key={c}
                  className="bg-amber-50 rounded py-1 h-10 flex items-center justify-center font-bold text-lg"
                >
                  {bid && (
                    <span className={textColor(bid)}>
                      {formatBid(bid)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {newBoardRequest ? (
        <div className="mt-3 flex flex-col items-center gap-2">

          <div className="text-yellow-300 font-semibold">
            🃏 {newBoardRequest.requestedBy} yeni el istiyor.
          </div>

          <div className="flex gap-2">
            <button
              className="rounded bg-green-700 px-3 py-1 text-white hover:bg-green-600"
            >
              Onayla
            </button>

            <button
              className="rounded bg-red-700 px-3 py-1 text-white hover:bg-red-600"
            >
              Reddet
            </button>
          </div>

        </div>
      ) : (
        <div className="mt-3 text-center text-black font-semibold">
          Sıra: {turn}
        </div>
      )}

    </div>
  );
}