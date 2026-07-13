export default function BiddingBox() {
  const levels = [1, 2, 3, 4, 5, 6, 7];
  const suits = ["♣", "♦", "♥", "♠", "NT"];

  return (
    <div className="w-72 bg-zinc-900 border border-red-700 rounded-xl p-4 shadow-2xl">
      <div className="text-center text-white font-bold text-lg mb-4">
        BIDDING BOX
      </div>

      <div className="grid grid-cols-5 gap-2">
        {levels.map((level) =>
          suits.map((suit) => (
            <button
              key={`${level}${suit}`}
              className="h-10 rounded bg-zinc-800 hover:bg-red-700 text-white font-semibold transition"
            >
              {level}
              {suit}
            </button>
          ))
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <button className="h-10 rounded bg-green-700 hover:bg-green-600 text-white font-bold">
          PASS
        </button>

        <button className="h-10 rounded bg-yellow-600 hover:bg-yellow-500 text-black font-bold">
          X
        </button>

        <button className="h-10 rounded bg-red-700 hover:bg-red-600 text-white font-bold">
          XX
        </button>
      </div>
    </div>
  );
}