"use client";
import Link from "next/link";
import Hand from "./Hand";
import SuitHand from "./SuitHand";
import Auction from "./Auction";
import BiddingBox from "./BiddingBox";

import {
  Deal,
  createDeck,
  shuffleDeck,
  dealHands,
} from "../lib/deck";
import { Bid, Seat } from "../lib/auction";

type TableProps = {
  hands: Deal;
  setHands: React.Dispatch<React.SetStateAction<Deal>>;
  auction: Bid[];
  setAuction: React.Dispatch<React.SetStateAction<Bid[]>>;
  turn: Seat;
  setTurn: React.Dispatch<React.SetStateAction<Seat>>;
};

export default function Table({
  hands,
  setHands,
  auction,
  setAuction,
  turn,
  setTurn,
}: TableProps) {
  function undo() {
  if (auction.length === 0) return;

  setAuction(auction.slice(0, -1));

  setTurn((current) => {
    switch (current) {
      case "N":
        return "W";
      case "E":
        return "N";
      case "S":
        return "E";
      case "W":
        return "S";
    }
  });
}
 function newDeal() {
  setHands(
    dealHands(
      shuffleDeck(
        createDeck()
      )
    )
  );

  setAuction([]);
  setTurn("N");
} 
return (
    
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <div className="flex items-center gap-10">
        {/* MASA */}
        <div className="relative w-[900px] h-[650px] rounded-full bg-green-800 border-8 border-red-700 shadow-2xl">

          {/* KUZEY */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="text-white font-bold mb-2">
              KUZEY
            </div>

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

            <div className="text-white font-bold mt-2">
              GÜNEY
            </div>
          </div>

          {/* BATI */}
          <div className="absolute left-8 top-1/2 -translate-y-1/2">
            <SuitHand cards={hands.west} />
          </div>

          {/* DOĞU */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
            <SuitHand cards={hands.east} />
          </div>

          {/* AUCTION */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Auction
              auction={auction}
              turn={turn}
            />
          </div>
        </div>

        {/* BIDDING BOX */}
        <div className="self-center flex flex-col gap-3">
  <BiddingBox
    auction={auction}
    setAuction={setAuction}
    turn={turn}
    setTurn={setTurn}
  />

  <div className="grid grid-cols-2 gap-2">
   <button
  onClick={undo}
  className="bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg py-2 font-bold"
>
  Undo
</button>

    <button
  onClick={newDeal}
  className="bg-green-700 hover:bg-green-600 text-white rounded-lg py-2 font-bold"
>
  Yeni El
</button>
  </div>
</div>
      </div>
    </div>
  );
}