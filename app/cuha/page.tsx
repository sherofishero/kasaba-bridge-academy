"use client";
import { trainingBoards } from "../lib/trainingDeals";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Table from "../components/Table";
import {
  createDeck,
  shuffleDeck,
  dealHands,
  Deal,
} from "../lib/deck";

import { Bid, Seat, auctionFinished } from "../lib/auction";
import { createTableState } from "../lib/game";
import { supabaseTableCommunication } from "../lib/supabase";
import { useSearchParams } from "next/navigation";
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

type PlayerRole =
 | "NORTH"
 | "EAST" 
 | "SOUTH" 
 | "WEST"
 | "SPECTATOR";

function getRequestedTableId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const requestedTableId = new URLSearchParams(window.location.search).get("tableId")?.trim();

  if (requestedTableId) {
    return requestedTableId;
  }

  const storedTableId = window.localStorage.getItem("bridge-table-id");

  if (storedTableId) {
    return storedTableId;
  }

  const nextTableId = `table-${Date.now()}`;
  window.localStorage.setItem("bridge-table-id", nextTableId);
  return nextTableId;
}

export default function MasaPage() {
  const searchParams = useSearchParams();
  const seat = searchParams.get("seat");
  const [hands, setHands] = useState<Deal>(newDeal());
  const [auction, setAuction] = useState<Bid[]>([]);
  const [turn, setTurn] = useState<Seat>("N");
  const [tableId, setTableId] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const subscriptionRef = useRef<(() => void) | null>(null);
  const lastPublishedRef = useRef<string | null>(null);

  const [dealMode, setDealMode] = useState<
    "RANDOM" | "INVERTED" | "TWO_NT"
  >("RANDOM");
  const [selectedTopic, setSelectedTopic] = useState("Rastgele Eller");
  const [showDealMenu, setShowDealMenu] =
    useState(false);
  const [showTopics, setShowTopics] =
    useState(false);

  // Role selection state
  const [playerRole, setPlayerRole] = useState<PlayerRole>(() => {
  switch (seat) {
    case "NORTH":
      return "NORTH";
    case "SOUTH":
      return "SOUTH";
    case "EAST":
      return "EAST";
    case "WEST":
      return "WEST";
    default:
      return "SPECTATOR";
  }
});
   const [showRoleSelector, setShowRoleSelector] = useState(false);

  //me from localStorage
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const storedName = localStorage.getItem("guestName");
    if (storedName) {
      setUsername(storedName);
    }
  }, []);

  // Check if auction is finished (3 consecutive PASSes)
  const isAuctionFinished = auctionFinished(auction);

  async function newBoard() {
    console.log("[SYNC] Yeni El handler entered", { tableId, dealMode });
    const deal = getNextDeal(dealMode);
    const nextHands = deal;
    const nextAuction: Bid[] = [];
    const nextTurn: Seat = "N";
    setHands(nextHands);
    setAuction(nextAuction);
    setTurn(nextTurn);

    if (!tableId) {
      console.log("[SYNC] No tableId available for publish");
      return;
    }

    const nextState = createTableState(tableId, nextHands, nextAuction, nextTurn);
    console.log("[SYNC] Publish function called", { tableId, nextState });

    void supabaseTableCommunication.publishTableState(tableId, nextState)
      .then(() => {
        console.log("[SYNC] Publish completed successfully");
      })
      .catch((error) => {
        console.log("[SYNC] Publish failed", error);
      });
  }

  async function createTable() {
    try {
      const nextTableId = getRequestedTableId();

      if (!nextTableId) {
        setTableId(null);
        return;
      }

      setTableId(nextTableId);

      const existingState = await supabaseTableCommunication.getTable(nextTableId);

      if (existingState) {
        setHands(existingState.currentDeal);
        setAuction(existingState.currentAuction);
        setTurn(existingState.currentTurn);
        return;
      }

      const initialState = createTableState(
        nextTableId,
        hands,
        auction,
        turn
      );

      await supabaseTableCommunication.createTable(nextTableId, initialState);
    } catch {
      // Keep the existing UI behavior unchanged if the communication layer fails.
    }
  }

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    const nextTableId = getRequestedTableId();

    if (!nextTableId) {
      setTableId(null);
      return;
    }

    setTableId(nextTableId);

    void supabaseTableCommunication.getTable(nextTableId)
      .then((existingState) => {
        if (existingState) {
          setHands(existingState.currentDeal);
          setAuction(existingState.currentAuction);
          setTurn(existingState.currentTurn);
          return null;
        }

        const initialState = createTableState(
          nextTableId,
          hands,
          auction,
          turn
        );

        return supabaseTableCommunication.createTable(nextTableId, initialState);
      })
      .then(() => {
        subscriptionRef.current = supabaseTableCommunication.subscribeToTable(nextTableId, (nextState) => {
          const nextSignature = JSON.stringify({
            deal: nextState.currentDeal,
            auction: nextState.currentAuction,
            turn: nextState.currentTurn,
          });

          console.log("[SYNC] Subscription callback fired", { tableId: nextTableId, nextState });
          lastPublishedRef.current = nextSignature;
          setHands(nextState.currentDeal);
          setAuction(nextState.currentAuction);
          setTurn(nextState.currentTurn);
          console.log("[SYNC] Remote React state updated");
        });
      })
      .catch(() => undefined);

    return () => {
      subscriptionRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!tableId) {
      return;
    }

    const nextSignature = JSON.stringify({
      deal: hands,
      auction,
      turn,
    });

    if (lastPublishedRef.current === nextSignature) {
      return;
    }

    lastPublishedRef.current = nextSignature;

    void supabaseTableCommunication.publishTableState(
      tableId,
      createTableState(tableId, hands, auction, turn)
    ).catch(() => undefined);
  }, [hands, auction, turn, tableId]);
  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="p-6 flex items-start justify-between">
        <div className="flex gap-3">
  <Link
    href="/egitim"
    className="inline-block rounded-lg border border-red-700 px-4 py-2 text-white hover:bg-red-900 transition"
  >
    ← Geri
  </Link>

  <Link
    href="/salon"
    className="inline-block rounded-lg border border-red-700 px-4 py-2 text-white hover:bg-red-900 transition"
  >
    ← Salona Dön
  </Link>
</div>
        <div className="relative flex items-center gap-4">
          <div className="flex items-center gap-3">

  <button
  onClick={newBoard}
  disabled={showDealMenu}
  className="rounded-lg border border-red-700 bg-red-900 px-4 py-2 font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
>
  Yeni El Dağıt
</button>

<p className="ml-4 min-w-[170px] text-sm text-yellow-400">
  Dağılım: <span className="font-bold">{selectedTopic}</span>
</p>

<button
  disabled={showDealMenu}
  onClick={() => {
    setShowDealMenu(!showDealMenu);
    if (showDealMenu) {
      setShowTopics(false);
    }
  }}
  className="rounded-lg border border-red-700 bg-zinc-800 px-4 py-2 font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
>
  Dağılım Seç
</button>
  {showDealMenu && (
    <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-red-800 bg-zinc-900 p-4 shadow-2xl">
      <button
        onClick={() => {
          setDealMode("RANDOM");
          setSelectedTopic("Rastgele");
          setTurn("N");
          setShowTopics(false);
          setShowDealMenu(false);
        }}
        className="block w-full text-left rounded-lg px-3 py-2 hover:bg-zinc-800"
      >
        Rastgele
      </button>

      <button
        onClick={() => setShowTopics(!showTopics)}
        className="mt-2 block w-full rounded-lg border border-zinc-700 px-3 py-2 text-left hover:bg-zinc-800 transition"
      >
        Konu Seç
      </button>

      {showTopics && (
        className="mt-2 text-center text-xs text-zinc-500"

          <button
             onClick={() => {
             setDealMode("INVERTED");
             setSelectedTopic("Inverted");
             setShowDealMenu(false);
             setShowTopics(false);
            }}
             className="block w-full rounded-lg border border-zinc-700 px-3 py-2 text-left hover:bg-zinc-700 transition"
          >
            Inverted
          </button>

          <button
            onClick={() => {
            setDealMode("TWO_NT");
            setSelectedTopic("2NT");
            setShowDealMenu(false);
            setShowTopics(false);
            }}
            className="block w-full rounded-lg border border-zinc-700 px-3 py-2 text-left hover:bg-zinc-700 transition"
          >
            2NT
            <hr className="my-2 border-zinc-700" />
          </button>
          <div className="mt-3 text-center text-xs text-zinc-500">
            ...
          </div>

        </div>
      )}

    </div>
  )}

      </div>
      </div>

      {/* Role Selector */}
      {showRoleSelector && (
        <div className="mx-auto mt-4 max-w-md rounded-xl border border-yellow-700 bg-zinc-800/50 p-4">
          <h3 className="text-center text-lg font-bold text-yellow-300 mb-3">
            Rol Seçin
          </h3>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => {
                setPlayerRole("NORTH");
                setShowRoleSelector(false);
              }}
              className="rounded-lg bg-red-800 px-4 py-2 font-bold text-white transition hover:bg-red-700"
            >
              KUZEY (North)
            </button>
            <button
              onClick={() => {
                setPlayerRole("EAST");
                setShowRoleSelector(false);
              }}
              className="rounded-lg bg-red-800 px-4 py-2 font-bold text-white transition hover:bg-red-700"
            >
              DOĞU
            </button>
            <button
              onClick={() => {
                setPlayerRole("SOUTH");
                setShowRoleSelector(false);
              }}
              className="rounded-lg bg-red-800 px-4 py-2 font-bold text-white transition hover:bg-red-700"
            >
              GÜNEY (South)
            </button>
            <button
              onClick={() => {
                setPlayerRole("SPECTATOR");
                setShowRoleSelector(false);
              }}
              className="rounded-lg bg-yellow-700 px-4 py-2 font-bold text-white transition hover:bg-yellow-600"
            >
              İZLEYİCİ (Spectator)
            </button>
            <button
              onClick={() => {
                setPlayerRole("WEST");
                setShowRoleSelector(false);
              }}
              className="rounded-lg bg-red-800 px-4 py-2 font-bold text-white transition hover:bg-red-700"
            >
              BATI
            </button>
          </div>
          <p className="mt-2 text-center text-sm text-zinc-400">
            {username ? `Hoş geldin, ${username}!` : "Misafir olarak katıldınız"}
          </p>
        </div>
      )}

      {/* Role indicator */}

      </div>

      <Table
        hands={hands}
        setHands={setHands}
        auction={auction}
        setAuction={setAuction}
        turn={turn}
        setTurn={setTurn}
        playerRole={playerRole}
        isAuctionFinished={isAuctionFinished}
      />
    </div>
  );
}
