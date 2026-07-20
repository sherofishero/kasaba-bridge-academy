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

type PlayerRole = 
| "NORTH" 
| "EAST"
| "SOUTH" 
| "WEST"
| "SPECTATOR";

type TableProps = {
  hands: Deal;
  setHands: React.Dispatch<React.SetStateAction<Deal>>;
  auction: Bid[];
  setAuction: React.Dispatch<React.SetStateAction<Bid[]>>;
  turn: Seat;
  setTurn: React.Dispatch<React.SetStateAction<Seat>>;
  playerRole?: PlayerRole;
  isAuctionFinished?: boolean;
};

// Hidden hand component - shows card backs
function HiddenHand() {
  return (
    <div className="flex items-end justify-center">
      {Array.from({ length: 13 }).map((_, index) => (
        <div
          key={index}
          style={{
            marginLeft: index === 0 ? 0 : -14,
            zIndex: index,
          }}
        >
          <div className="w-[54px] h-[82px] bg-blue-900 rounded-xl border-2 border-blue-700 shadow-lg relative select-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-blue-300 text-3xl">♠</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Hidden suit hand component - shows placeholders
function HiddenSuitHand() {
  return (
    <div className="bg-blue-900/50 rounded-lg shadow-md px-3 py-2 min-w-[170px] border border-blue-700">
      {["S", "H", "D", "C"].map((suit) => (
        <div key={suit} className="flex items-center gap-2 py-1">
          <span className="text-xl font-bold text-blue-300">{suit}</span>
          <span className="font-bold tracking-wide text-blue-300">
            {"—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Table({
  hands,
  setHands,
  auction,
  setAuction,
  turn,
  setTurn,
  playerRole = "SPECTATOR",
  isAuctionFinished = false,
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

  // Determine table view

let bottomCards = hands.south;
let topCards = hands.north;
let leftCards = hands.east;
let rightCards = hands.west;

switch (playerRole) {
  case "NORTH":
    bottomCards = hands.north;
    topCards = hands.south;
    leftCards = hands.east;
    rightCards = hands.west;
    break;

  case "SOUTH":
    bottomCards = hands.south;
    topCards = hands.north;
    leftCards = hands.west;
    rightCards = hands.east;
    break;

  case "EAST":
    bottomCards = hands.east;
    topCards = hands.west;
    leftCards = hands.south;
    rightCards = hands.north;
    break;

  case "WEST":
    bottomCards = hands.west;
    topCards = hands.east;
    leftCards = hands.north;
    rightCards = hands.south;
    break;
}

const isSpectator = playerRole === "SPECTATOR";

const hideTop = !isSpectator && !isAuctionFinished;
const hideBottom = false;
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <div className="flex items-center gap-10">
        {/* MASA */}
        <div className="relative w-[900px] h-[650px] rounded-full bg-green-800 border-8 border-red-700 shadow-2xl">

          {/* TOP */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="text-white font-bold mb-2">
              TOP
            </div>

            {hideTop ? <HiddenHand /> : (
              <Hand
                cards={topCards}
                direction="horizontal"
              />
            )}
          </div>

          {/* BOTTOM */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
            {hideBottom ? <HiddenHand /> : (
              <Hand
                cards={bottomCards}
                direction="horizontal"
              />
            )}

            <div className="text-white font-bold mt-2">
              BOTTOM
            </div>
          </div>

          {/* BATI */}
          <div className="absolute left-8 top-1/2 -translate-y-1/2">
           {isSpectator || rightCards === bottomCards || isAuctionFinished ? (
             <SuitHand cards={rightCards} />
            ) : (
           <HiddenSuitHand />
             )}
          </div>

          {/* DOĞU */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2">
           {isSpectator || leftCards === bottomCards || isAuctionFinished ? (
              <SuitHand cards={leftCards} />
            ) : (
           <HiddenSuitHand />
             )}
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
          {!isSpectator && (
           <BiddingBox
             auction={auction}
             setAuction={setAuction}
             turn={turn}
             setTurn={setTurn}
           />
         )}

          {!isSpectator && (
            <div className="grid grid-cols-2 gap-2">
             <button
               onClick={undo}
               className="bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg py-2 font-bold"
            >
               Undo
            </button>
  </div>
)}
        </div>
      </div>
    </div>
  );
}