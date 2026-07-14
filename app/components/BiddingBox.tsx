import { Bid } from "../lib/auction";

type BiddingBoxProps = {
  auction: Bid[];
  setAuction: React.Dispatch<React.SetStateAction<Bid[]>>;
  turn: "N" | "E" | "S" | "W";
  setTurn: React.Dispatch<
    React.SetStateAction<"N" | "E" | "S" | "W">
  >;
};

const levels = [1, 2, 3, 4, 5, 6, 7] as const;

const strains = [
  {
    code: "C",
    label: "♣",
    color: "bg-green-700 hover:bg-green-600",
  },
  {
    code: "D",
    label: "♦",
    color: "bg-yellow-600 hover:bg-yellow-500",
  },
  {
    code: "H",
    label: "♥",
    color: "bg-red-700 hover:bg-red-600",
  },
  {
    code: "S",
    label: "♠",
    color: "bg-gray-700 hover:bg-gray-600",
  },
  {
    code: "NT",
    label: "NT",
    color: "bg-sky-700 hover:bg-sky-600",
  },
] as const;

export default function BiddingBox({
  auction,
  setAuction,
  turn,
  setTurn,
}: BiddingBoxProps) {
  function nextTurn() {
    switch (turn) {
      case "N":
        setTurn("E");
        break;

      case "E":
        setTurn("S");
        break;

      case "S":
        setTurn("W");
        break;

      case "W":
        setTurn("N");
        break;
    }
  }

  function addBid(
    level: (typeof levels)[number],
    strain: "C" | "D" | "H" | "S" | "NT"
  ) {
    setAuction([
      ...auction,
      {
        seat: turn,
        type: "BID",
        level,
        strain,
      },
    ]);

    nextTurn();
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-red-700 shadow-xl p-4 w-[300px]">
      <div className="text-center text-white font-bold text-lg mb-4">
        BIDDING BOX
      </div>

      <div className="grid grid-cols-5 gap-2">
        {levels.map((level) =>
          strains.map((strain) => (
            <button
              key={`${level}-${strain.code}`}
              onClick={() => addBid(level, strain.code)}
              className={`${strain.color} rounded py-2 font-bold text-white transition`}
            >
              {level}
              {strain.label}
            </button>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button className="bg-zinc-700 hover:bg-zinc-600 rounded py-2 font-bold text-white">
          PASS
        </button>

        <button className="bg-red-700 hover:bg-red-600 rounded py-2 font-bold text-white">
          X
        </button>

        <button className="bg-blue-700 hover:bg-blue-600 rounded py-2 font-bold text-white">
          XX
        </button>

        <button className="bg-yellow-600 hover:bg-yellow-500 rounded py-2 font-bold text-black">
          ALERT
        </button>
      </div>

      <div className="mt-6 text-center text-yellow-300 font-semibold">
        Sıra: {turn}
      </div>
    </div>
  );
}