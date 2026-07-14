import { Bid } from "../lib/auction";

type BiddingBoxProps = {
  auction: Bid[];
  setAuction: React.Dispatch<React.SetStateAction<Bid[]>>;
  turn: "N" | "E" | "S" | "W";
  setTurn: React.Dispatch<
    React.SetStateAction<"N" | "E" | "S" | "W">
  >;
};

export default function BiddingBox({
  auction,
  setAuction,
  turn,
  setTurn,
}: BiddingBoxProps) {
  function addBid(
    level: 1,
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

  return (
    <div className="bg-zinc-900 rounded-xl border border-red-700 shadow-xl p-4 w-[260px]">
      <div className="text-center text-white font-bold text-lg mb-4">
        BIDDING BOX
      </div>

      <div className="grid grid-cols-5 gap-2">
        <button
          onClick={() => addBid(1, "C")}
          className="bg-green-700 hover:bg-green-600 rounded py-2 font-bold text-white"
        >
          1♣
        </button>

        <button
          onClick={() => addBid(1, "D")}
          className="bg-yellow-600 hover:bg-yellow-500 rounded py-2 font-bold text-white"
        >
          1♦
        </button>

        <button
          onClick={() => addBid(1, "H")}
          className="bg-red-700 hover:bg-red-600 rounded py-2 font-bold text-white"
        >
          1♥
        </button>

        <button
          onClick={() => addBid(1, "S")}
          className="bg-gray-700 hover:bg-gray-600 rounded py-2 font-bold text-white"
        >
          1♠
        </button>

        <button
          onClick={() => addBid(1, "NT")}
          className="bg-sky-700 hover:bg-sky-600 rounded py-2 font-bold text-white"
        >
          1NT
        </button>
      </div>

      <div className="mt-4">
        <button className="w-full bg-zinc-700 hover:bg-zinc-600 rounded py-2 font-bold text-white">
          PASS
        </button>
      </div>

      <div className="mt-6 text-center text-yellow-300 font-semibold">
        Sıra: {turn}
      </div>
    </div>
  );
}