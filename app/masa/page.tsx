"use client";

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
    <Table
      hands={hands}
      setHands={setHands}
      auction={auction}
      setAuction={setAuction}
      turn={turn}
      setTurn={setTurn}
    />
  );
}