"use client";
import Link from "next/link";
import { useState } from "react";

import Table from "../components/Table";
import {
  createDeck,
  shuffleDeck,
  dealHands,
  Deal,
} from "../lib/deck";

import { Bid, Seat } from "../lib/auction";

function newDeal(): Deal {
  return dealHands(shuffleDeck(createDeck()));
}

export default function MasaPage() {
  const [hands, setHands] = useState<Deal>(() => newDeal());

  const [auction, setAuction] = useState<Bid[]>([]);

  const [turn, setTurn] = useState<Seat>("N");

  return (
  <div className="min-h-screen bg-zinc-900">

    <div className="p-6">
      <Link
        href="/lobby"
        className="inline-block rounded-lg border border-red-700 px-4 py-2 text-white hover:bg-red-900 transition"
      >
        ← Lobiye Dön
      </Link>
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