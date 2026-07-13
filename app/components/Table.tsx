import Hand from "./Hand";
import Auction from "./Auction";
import BiddingBox from "./BiddingBox";
import { Deal } from "../lib/deck";

type TableProps = {
  hands: Deal;
};

export default function Table({ hands }: TableProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <div className="flex items-center gap-10">

        {/* MASA */}
        <div className="relative w-[900px] h-[650px] rounded-full bg-green-800 border-8 border-red-700 shadow-2xl">

          {/* KUZEY */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="text-white font-bold mb-2">KUZEY</div>

            <Hand
              cards={hands.north}
              direction="horizontal"
            />
          </div>

          {/* GÜNEY */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">

            <Hand
              cards={hands.south}
              direction="horizontal"
            />

            <div className="text-white font-bold mt-2">GÜNEY</div>

          </div>

          {/* BATI */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center">

            <div className="text-white font-bold mb-2">BATI</div>

            <Hand
              cards={hands.west}
              direction="vertical"
            />

          </div>

          {/* DOĞU */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center">

            <div className="text-white font-bold mb-2">DOĞU</div>

            <Hand
              cards={hands.east}
              direction="vertical"
            />

          </div>

          {/* AUCTION */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Auction />
          </div>

        </div>

        {/* BIDDING BOX */}
        <div className="self-center">
          <BiddingBox />
        </div>

      </div>
    </div>
  );
}