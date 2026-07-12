"use client";

import { useState } from "react";
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
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => setHands(yeniEl())}
          className="bg-white text-green-800 font-bold px-6 py-2 rounded-lg hover:bg-gray-100"
        >
         Yeni El Dağıt
        </button>
      </div>

      <div className="relative w-[700px] h-[460px] rounded-full bg-green-800 border-8 border-red-800 shadow-2xl">

        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white font-bold">
          KUZEY
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white font-bold">
          GÜNEY
        </div>

        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white font-bold">
          BATI
        </div>

        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white font-bold">
          DOĞU
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 shadow-lg min-w-[300px]">
            <h2 className="font-bold mb-2 text-center">
              GÜNEY'İN ELİ
            </h2>

            <div className="text-sm break-all">
              {hands.south.map((card) => (
                <span key={card.suit + card.rank} className="mr-2">
                  {card.suit}
                  {card.rank}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}