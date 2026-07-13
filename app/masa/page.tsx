"use client";

import Table from "../components/Table";
import { createDeck, shuffleDeck, dealHands } from "../lib/deck";
import { useState } from "react";

export default function MasaPage() {
  const [hands] = useState(() =>
    dealHands(shuffleDeck(createDeck()))
  );

  return <Table hands={hands} />;
}