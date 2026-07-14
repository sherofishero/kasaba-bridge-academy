"use client";
import { trainingBoards } from "../lib/trainingDeals";
import Link from "next/link";
import { useState } from "react";
import { useEffect } from "react";
import Table from "../components/Table";
import {
  createDeck,
  shuffleDeck,
  dealHands,
  Deal,
} from "../lib/deck";

import { Bid, Seat } from "../lib/auction";
import { supabase } from "../lib/supabase";
function newDeal(): Deal {
  return dealHands(shuffleDeck(createDeck()));
}
function getNextDeal(
  mode: "RANDOM" | "INVERTED" | "TWO_NT"
): Deal {
  switch (mode) {
    case "INVERTED":
      if (trainingBoards.INVERTED.length > 0) {
        const i = Math.floor(
          Math.random() *
            trainingBoards.INVERTED.length
        );

        return trainingBoards.INVERTED[i];
      }

      return newDeal();

    case "TWO_NT":
      if (trainingBoards.TWO_NT.length > 0) {
        const i = Math.floor(
          Math.random() *
            trainingBoards.TWO_NT.length
        );

        return trainingBoards.TWO_NT[i];
      }

      return newDeal();

    default:
      return newDeal();
  }
}

export default function MasaPage() {
  const [hands, setHands] = useState<Deal>(() => newDeal());

  const [auction, setAuction] = useState<Bid[]>([]);

  const [turn, setTurn] = useState<Seat>("N");

  const [dealMode, setDealMode] = useState<
    "RANDOM" | "INVERTED" | "TWO_NT"
  >("RANDOM");

  const [showDealMenu, setShowDealMenu] =
    useState(false);
async function newBoard() {
  console.log("newBoard çalıştı");

  const deal = getNextDeal(dealMode);

  setHands(deal);
  setAuction([]);
  setTurn("N");

 const { data, error } = await supabase
  .from("boards")
  .update({
    deal,
    auction: [],
    turn: "N",
    updated_at: new Date().toISOString(),
  })
  .eq("id", 1)
  .select();

console.log("DATA:", data);
console.log("ERROR:", error);

if (error) {
  console.error(error);
} else {
  console.log("Board güncellendi.");
}
}
async function updateAuction(
  newAuction: Bid[],
  newTurn: Seat
) {
  setAuction(newAuction);
  setTurn(newTurn);

  const { error } = await supabase
    .from("boards")
    .update({
      auction: newAuction,
      turn: newTurn,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    console.error(error);
  }
}
  const [showTopics, setShowTopics] =
    useState(false);
useEffect(() => {
  const channel = supabase
    .channel("board-room")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "boards",
      },
      (payload) => {
  console.log("Realtime geldi:", payload);

  const board = payload.new as {
    deal: Deal;
    auction: Bid[];
    turn: Seat;
  };

  setHands(board.deal);
  setAuction(board.auction);
  setTurn(board.turn);
}
    )
    .subscribe((status) => {
  console.log("Realtime:", status);
});

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="p-6 flex items-center justify-between">
        <Link
          href="/lobby"
          className="inline-block rounded-lg border border-red-700 px-4 py-2 text-white hover:bg-red-900 transition"
        >
          ← Lobiye Dön
        </Link>

        <div className="relative">

  <button
  onClick={newBoard}
  className="rounded-lg border border-red-700 px-4 py-2 text-white hover:bg-red-900 transition"
>
  Yeni El
</button>
  <button
    onClick={() => setShowDealMenu(!showDealMenu)}
    className="rounded-lg border border-red-700 px-4 py-2 text-white hover:bg-red-900 transition"
  >
    Dağılım Seç
  </button>

  {showDealMenu && (
    <div className="absolute right-0 mt-2 w-72 rounded-xl border border-red-800 bg-zinc-900 p-4 shadow-2xl z-50">

      <button
        onClick={() => {
          setDealMode("RANDOM");
          setShowTopics(false);
        }}
        className="block w-full text-left rounded-lg px-3 py-2 hover:bg-zinc-800"
      >
        1. Rastgele Eller
      </button>

      <button
        onClick={() => setShowTopics(!showTopics)}
        className="mt-2 block w-full text-left rounded-lg px-3 py-2 hover:bg-zinc-800"
      >
        2. Konu Seç
      </button>

      {showTopics && (
        <div className="mt-3 ml-4 border-l border-zinc-700 pl-4">

          <button
            onClick={() => setDealMode("INVERTED")}
            className="block w-full text-left rounded-lg px-3 py-2 hover:bg-zinc-800"
          >
            Inverted Minör
          </button>

          <button
            onClick={() => setDealMode("TWO_NT")}
            className="mt-2 block w-full text-left rounded-lg px-3 py-2 hover:bg-zinc-800"
          >
            2NT Açılışı
          </button>

        </div>
      )}

    </div>
  )}

</div>
      </div>

      <Table
        hands={hands}
        setHands={setHands}
        auction={auction}
        setAuction={setAuction}
        turn={turn}
        setTurn={setTurn}
      />
    </div>
  );
}