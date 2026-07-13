import { Bid } from "../lib/auction";

type AuctionProps = {
  auction: Bid[];
  setAuction: React.Dispatch<React.SetStateAction<Bid[]>>;
  turn: "N" | "E" | "S" | "W";
  setTurn: React.Dispatch<React.SetStateAction<"N" | "E" | "S" | "W">>;
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
      return `${bid.level}${
        bid.strain === "NT"
          ? "NT"
          : suitSymbol(bid.strain!)
      }`;
  }
}

function textColor(bid: Bid) {
  if (bid.type !== "BID") return "text-white";

  switch (bid.strain) {
    case "H":
    case "D":
      return "text-red-500";

    case "NT":
      return "text-sky-400";

    default:
      return "text-white";
  }
}

export default function BiddingBox({
  auction,
  setAuction,
  turn,
  setTurn,
}: AuctionProps) {
  const rows: (Bid | null)[][] = [];

  for (let i = 0; i < auction.length; i += 4) {
    rows.push([
      auction[i] ?? null,
      auction[i + 1] ?? null,
      auction[i + 2] ?? null,
      auction[i + 3] ?? null,
    ]);
  }

  return (
    <div className="bg-zinc-900/90 rounded-xl border border-red-700 shadow-xl p-4 w-[430px]">

      <div className="text-center text-white font-bold text-lg mb-3">
        AUCTION
      </div>

      <div className="grid grid-cols-4 text-center mb-2 font-bold text-yellow-300">
        <div>N</div>
        <div>E</div>
        <div>S</div>
        <div>W</div>
      </div>

      <div className="min-h-[210px] max-h-[210px] overflow-y-auto space-y-1">

        {rows.length === 0 ? (
          <div className="text-center text-zinc-500 italic mt-12">
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
                  className="bg-zinc-800 rounded py-1 h-8 flex items-center justify-center font-bold"
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

      <div className="mt-3 text-center text-yellow-300 font-semibold">
        Sıra: {turn}
      </div>

    </div>
  );
}