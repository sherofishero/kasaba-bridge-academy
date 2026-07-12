"use client";

import { useState } from "react";
import Hand from "../components/Hand";
import {
  createDeck,
  shuffleDeck,
  dealHands,
} from "../lib/deck";

function yeniEl() {
  return dealHands(shuffleDeck(createDeck()));
}

export default function MasaPage() {
  const [hands, setHands] = useState(yeniEl());

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6">

      <button
        onClick={() => setHands(yeniEl())}
        className="mb-6 bg-red-700 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold"
      >
        Yeni El Dağıt
      </button>

      <div className="relative w-[900px] h-[650px] rounded-full bg-green-800 border-8 border-red-800 shadow-2xl">

        {/* KUZEY */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="text-white font-bold mb-2">
            KUZEY
          </div>

          <Hand cards={hands.north} />
        </div>

        {/* GÜNEY */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <Hand cards={hands.south} />

          <div className="text-white font-bold mt-2">
            GÜNEY
          </div>
        </div>

        {/* BATI */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="text-white font-bold mb-2">
            BATI
          </div>

          <Hand
            cards={hands.west}
            direction="vertical"
          />
        </div>

        {/* DOĞU */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="text-white font-bold mb-2">
            DOĞU
          </div>

          <Hand
            cards={hands.east}
            direction="vertical"
          />
        </div>

        {/* ORTA PANEL */}
        <div className="absolute inset-0 flex items-center justify-center">

          <div className="w-72 rounded-xl bg-zinc-900 border border-red-700 shadow-xl p-4">

            <div className="text-center text-red-500 text-xl font-bold mb-4">
              BOARD 1
            </div>

            <div className="flex justify-between text-white text-sm mb-4">
              <span>Dealer : N</span>
              <span>Vul : None</span>
            </div>

            <div className="grid grid-cols-4 text-center font-bold text-white border-b border-red-700 pb-2 mb-2">
              <div>N</div>
              <div>E</div>
              <div>S</div>
              <div>W</div>
            </div>

            <div className="grid grid-cols-4 gap-y-2 text-center text-yellow-300 min-h-[120px]">

              <div>1NT</div>
              <div>P</div>
              <div>2♣</div>
              <div>P</div>

              <div>2♦</div>
              <div>P</div>
              <div>2NT</div>
              <div>P</div>

              <div>3NT</div>
              <div></div>
              <div></div>
              <div></div>

            </div>

          </div>

        </div>

      </div>

    </main>
  );
}