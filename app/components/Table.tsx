"use client";

import Link from "next/link";
import Hand from "./Hand";
import SuitHand from "./SuitHand";
import Auction from "./Auction";
import BiddingBox from "./BiddingBox";
import Image from "next/image";
import {
  Deal,
  createDeck,
  shuffleDeck,
  dealHands,
} from "../lib/deck";
import { Bid, Seat } from "../lib/auction";
import type { TableState } from "../lib/game";
import { useEffect } from "react";

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
  tableState: TableState | null;
  isHost?: boolean;
  isAuctionFinished?: boolean;
  onCall?: (call: Bid) => void;
  onUndo?: () => void;
  newBoardRequest?: TableState["newBoardRequest"];
  onApproveNewBoardRequest?: () => void;
  onRejectNewBoardRequest?: () => void;
};

function HiddenHand() {
  return (
    <div className="flex items-end justify-center">
      {Array.from({ length: 13 }).map((_, index) => (
        <div
          key={index}
          style={{
            marginLeft: index === 0 ? 0 : -70,
            zIndex: index,
          }}
        >
          <Image
            src="/kartimiz.png"
            alt="Kapalı kart"
            width={120}
            height={180}
            className="rounded-xl shadow-lg select-none"
          />
        </div>
      ))}
    </div>
  );
}

function HiddenSuitHand() {
  return (
    <div className="flex flex-col items-center justify-center">
      {Array.from({ length: 13 }).map((_, index) => (
        <div
          key={index}
          style={{
            marginTop: index === 0 ? 0 : -170,
            zIndex: index,
          }}
        >
          <Image
            src="/kartimiz.png"
            alt="Kapalı kart"
            width={120}
            height={180}
            className="rounded-xl shadow-lg select-none"
          />
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
  tableState,
  isHost,
  isAuctionFinished = false,
  onCall,
  onUndo,
  newBoardRequest,
  onApproveNewBoardRequest,
  onRejectNewBoardRequest,
}: TableProps) {
  function undo() {
    if (auction.length === 0) return;

    if (onUndo) {
      onUndo();
      return;
    }

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

  let bottomPlayer = tableState?.southPlayer;
  let topPlayer = tableState?.northPlayer;
  let leftPlayer = tableState?.eastPlayer;
  let rightPlayer = tableState?.westPlayer;

  switch (playerRole) {
    case "NORTH":
      bottomPlayer = tableState?.northPlayer;
      topPlayer = tableState?.southPlayer;
      leftPlayer = tableState?.eastPlayer;
      rightPlayer = tableState?.westPlayer;
      break;

    case "SOUTH":
      bottomPlayer = tableState?.southPlayer;
      topPlayer = tableState?.northPlayer;
      leftPlayer = tableState?.westPlayer;
      rightPlayer = tableState?.eastPlayer;
      break;

    case "EAST":
      bottomPlayer = tableState?.eastPlayer;
      topPlayer = tableState?.westPlayer;
      leftPlayer = tableState?.southPlayer;
      rightPlayer = tableState?.northPlayer;
      break;

    case "WEST":
      bottomPlayer = tableState?.westPlayer;
      topPlayer = tableState?.eastPlayer;
      leftPlayer = tableState?.northPlayer;
      rightPlayer = tableState?.southPlayer;
      break;
  }

  const isSpectator = playerRole === "SPECTATOR";

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("bridge-chat-role-change", {
        detail: {
          role: playerRole,
          tableId: tableState?.tableId,
        },
      })
    );
  }, [playerRole, tableState?.tableId]);

  const playerSeat: "N" | "E" | "S" | "W" | null =
    playerRole === "NORTH"
      ? "N"
      : playerRole === "EAST"
        ? "E"
        : playerRole === "SOUTH"
          ? "S"
          : playerRole === "WEST"
            ? "W"
            : null;

  const isTurnSeatEmpty =
    turn === "N"
      ? !tableState?.northPlayer
      : turn === "E"
        ? !tableState?.eastPlayer
        : turn === "S"
          ? !tableState?.southPlayer
          : !tableState?.westPlayer;

  const canHostBidForEmptySeat = isHost === true;
  const hideTop = !isSpectator && !isAuctionFinished;
  const hideBottom = false;

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900">
      <div className="flex items-center gap-10">
        {/* MASA */}
        <div className="relative w-[1000px] h-[700px] rounded-full bg-green-800 border-8 border-red-700 shadow-2xl">

          {/* TOP */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="text-white font-bold mb-2">
              {topPlayer?.name ?? "NORTH"}
            </div>

            {hideTop ? (
              <HiddenHand />
            ) : (
              <div className="translate-y-6">
                <Hand
                  cards={topCards}
                  direction="horizontal"
                />
              </div>
            )}
          </div>

          {/* BOTTOM */}
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex flex-col items-center">
            {hideBottom ? (
              <HiddenHand />
            ) : (
              <Hand
                cards={bottomCards}
                direction="horizontal"
              />
            )}

            <div className="text-white font-bold mt-2">
              {bottomPlayer?.name ?? "SOUTH"}
            </div>
          </div>

          {/* BATI */}
          <div className="absolute left-16 top-1/2 -translate-y-1/2">
            {isSpectator ||
            rightCards === bottomCards ||
            isAuctionFinished ? (
              <div className="-translate-x-8">
                <SuitHand cards={rightCards} />
              </div>
            ) : (
              <HiddenSuitHand />
            )}
          </div>

          {/* DOĞU */}
          <div className="absolute right-16 top-1/2 -translate-y-1/2">
            {isSpectator ||
            leftCards === bottomCards ||
            isAuctionFinished ? (
              <div className="translate-x-8">
                <SuitHand cards={leftCards} />
              </div>
            ) : (
              <HiddenSuitHand />
            )}
          </div>

          {tableState?.newBoardRequest && isHost && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35">
              <div className="rounded-lg border border-yellow-600 bg-yellow-900/90 p-4 shadow-2xl">
                <div className="font-semibold text-yellow-300">
                  {tableState.newBoardRequest.requestedBy} yeni el talep ediyor.
                </div>

                <div className="mt-3 flex justify-center gap-2">
                  <button
                    onClick={() => {
                      onApproveNewBoardRequest?.();
                    }}
                    className="rounded bg-green-700 px-3 py-1 text-white hover:bg-green-600"
                  >
                    Onayla
                  </button>

                  <button
                    onClick={() => {
                      onRejectNewBoardRequest?.();
                    }}
                    className="rounded bg-red-700 px-3 py-1 text-white hover:bg-red-600"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AUCTION */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">

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
              playerSeat={playerSeat}
              isHost={isHost}
              isTurnSeatEmpty={isTurnSeatEmpty}
              canHostBidForEmptySeat={canHostBidForEmptySeat}
              onCall={onCall}
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

              <button
                className="bg-purple-700 hover:bg-purple-600 text-white rounded-lg py-2 font-bold"
              >
                Director
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}