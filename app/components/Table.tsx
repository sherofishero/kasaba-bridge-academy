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
  /* Rol henüz async olarak çözümlenmediyse true: tüm eller
    HiddenHand/HiddenSuitHand ile gösterilir (refresh flaşı önlenir). */
  rolePending?: boolean;
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
            width={80}
            height={120}
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
            marginTop: index === 0 ? 0 : -100,
            zIndex: index,
          }}
        >
          <Image
            src="/kartimiz.png"
            alt="Kapalı kart"
            width={80}
            height={120}
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
  rolePending = false,
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

  /*
   * Görüntüleme rotasyonuna göre ekranın üst/alt konumunun
   * GERÇEK masa yönü. Boş koltuklarda oyuncu adı yerine bu
   * yön etiketi gösterilir (Kuzey↔Güney, Doğu↔Batı geometrisi).
   */
  const viewSeats =
    playerRole === "NORTH"
      ? { top: "SOUTH", bottom: "NORTH" }
      : playerRole === "EAST"
        ? { top: "WEST", bottom: "EAST" }
        : playerRole === "WEST"
          ? { top: "EAST", bottom: "WEST" }
          : /* SOUTH ve SPECTATOR */ { top: "NORTH", bottom: "SOUTH" };

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
  /* Rol çözümlenmeden hiçbir el açık gösterilmez (refresh flaşı önlenir). */
  const hideTop = rolePending || (!isSpectator && !isAuctionFinished);
  const hideBottom = rolePending;

  return (
    <div className="relative min-h-screen bg-zinc-900">

      {/* MASA */}
      <div className="absolute left-[48%] top-[36%] -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-[800px] h-[460px] rounded-[28px] bg-green-800 border-16 border-[#331704] shadow-2xl">

          {/* TOP */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
            {topPlayer ? (
              <button
                type="button"
                onClick={() => {
                  /*
                   * Masa oyuncu adından özel sohbet açma isteği;
                   * üye/misafir ayrımını PrivateChatManager yapar.
                   */
                  window.dispatchEvent(
                    new CustomEvent(
                      "kasaba-open-private-chat",
                      {
                        detail: {
                          username:
                            topPlayer.name,
                        },
                      }
                    )
                  );
                }}
                title={`${topPlayer.name} ile özel sohbet`}
                className="mb-2 font-bold text-white hover:underline"
              >
                {topPlayer.name}
              </button>
            ) : (
              <div className="mb-2 font-bold text-white">
                {viewSeats.top}
              </div>
            )}

            {hideTop ? (
              <HiddenHand />
            ) : (
              <div className="translate-y-2">
                <Hand
                  cards={topCards}
                  direction="horizontal"
                />
              </div>
            )}
          </div>

          {/* BOTTOM */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
            {hideBottom ? (
              <HiddenHand />
            ) : (
              <Hand
                cards={bottomCards}
                direction="horizontal"
              />
            )}

            {bottomPlayer ? (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent(
                      "kasaba-open-private-chat",
                      {
                        detail: {
                          username:
                            bottomPlayer.name,
                        },
                      }
                    )
                  );
                }}
                title={`${bottomPlayer.name} ile özel sohbet`}
                className="mt-2 font-bold text-white hover:underline"
              >
                {bottomPlayer.name}
              </button>
            ) : (
              <div className="mt-2 font-bold text-white">
                {viewSeats.bottom}
              </div>
            )}
          </div>

          {/* BATI */}
          <div className="absolute left-8 top-[48%] -translate-y-1/3">
            {rolePending ? (
              <div className="-translate-y-6">
                <HiddenSuitHand />
              </div>
            ) : isSpectator ||
              rightCards === bottomCards ||
              isAuctionFinished ? (
              <div className="-translate-x-8 -translate-y-6">
                <SuitHand cards={rightCards} />
              </div>
            ) : (
              <div className="-translate-y-6">
                <HiddenSuitHand />
              </div>
            )}
          </div>

          {/* DOĞU */}
          <div className="absolute right-8 top-[48%] -translate-y-1/2">
            {rolePending ? (
              <div className="translate-y-1">
                <HiddenSuitHand />
              </div>
            ) : isSpectator ||
              leftCards === bottomCards ||
              isAuctionFinished ? (
              <div className="translate-x-8 translate-y-2">
                <SuitHand cards={leftCards} />
              </div>
            ) : (
              <div className="translate-y-1">
                <HiddenSuitHand />
              </div>
            )}
          </div>

          {/* YENİ EL TALEBİ */}
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

          {/* DIRECTOR - MASANIN SOL ÜST KÖŞESİ */}
          {!isSpectator && (
            <button
              type="button"
              className="absolute left-0 top-0 z-50 rounded-lg bg-red-700 px-7 py-3 text-lg font-bold text-white transition hover:bg-red-600"
            >
              director
            </button>
          )}

          {/* UNDO - MASANIN SAĞ ÜST KÖŞESİ */}
          {!isSpectator && (
            <button
              type="button"
              onClick={undo}
              className="absolute right-0 top-0 rounded-lg bg-red-700 px-7 py-3 text-lg font-bold text-white transition hover:bg-red-600"
            >
              undo
            </button>
          )}

        </div>
      </div>

      {/* BIDDING BOX */}
      {!isSpectator && (
        <div className="fixed left-0 top-8 z-50">
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
        </div>
      )}

    </div>
  );
}