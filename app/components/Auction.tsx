type Bid = {
  seat: "N" | "E" | "S" | "W";
  call: string;
};

const auction: Bid[] = [];

export default function Auction() {
  return (
    <div className="bg-zinc-900/90 rounded-xl border border-red-700 shadow-xl p-4 min-w-[260px]">
      <div className="text-center text-white font-bold text-lg mb-3">
        AUCTION
      </div>

      <div className="grid grid-cols-4 gap-1 text-center mb-2">
        <div className="font-bold text-yellow-300">N</div>
        <div className="font-bold text-yellow-300">E</div>
        <div className="font-bold text-yellow-300">S</div>
        <div className="font-bold text-yellow-300">W</div>
      </div>

      <div className="grid grid-cols-4 gap-1 min-h-[180px]">
        {auction.length === 0 ? (
          <div className="col-span-4 flex items-center justify-center text-zinc-500 italic">
            Açık artırma henüz başlamadı
          </div>
        ) : (
          auction.map((bid, index) => (
            <div
              key={index}
              className="bg-zinc-800 rounded py-1 text-white text-center"
            >
              {bid.call}
            </div>
          ))
        )}
      </div>
    </div>
  );
}