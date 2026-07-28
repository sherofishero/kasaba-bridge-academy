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
import { useSearchParams } from "next/navigation";
import { Bid, Seat, auctionFinished } from "../lib/auction";
import { createTablePlayer, createTableState, TableRole } from "../lib/game";
import { supabaseTableCommunication } from "../lib/supabase";

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

  const nextTableId = "table-1";
       window.localStorage.setItem("bridge-table-id", nextTableId);
    return nextTableId;
  }

    export default function MasaPage() {
  const searchParams = useSearchParams();
  const requestedSeat = searchParams.get("seat");
  const [hands, setHands] = useState<Deal>(() =>
  dealHands(createDeck())
    );
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
  const [playerRole, setPlayerRole] = useState<PlayerRole>("SPECTATOR");
   const [showRoleSelector, setShowRoleSelector] = useState(false);

  //me from localStorage
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const storedName = localStorage.getItem("guestName");
    if (storedName) {
      setUsername(storedName);
    }
  }, []);
  useEffect(() => {
  if (!tableId || !username || !requestedSeat) {
    return;
  }

  if (
    requestedSeat !== "NORTH" &&
    requestedSeat !== "EAST" &&
    requestedSeat !== "SOUTH" &&
    requestedSeat !== "WEST"
  ) {
    return;
  }

  const roleMap: Record<Exclude<PlayerRole, "SPECTATOR">, TableRole> = {
    NORTH: "North",
    EAST: "East",
    SOUTH: "South",
    WEST: "West",
  };

  const requestedRole = requestedSeat as Exclude<PlayerRole, "SPECTATOR">;
  const tableRole = roleMap[requestedRole];
  const player = createTablePlayer(username, tableRole, username);

  void supabaseTableCommunication
    .joinTable(tableId, player, tableRole)
    .then(() => {
      console.log("[SEAT] JOIN SUCCESS", {
        tableId,
        username,
        requestedRole,
      });

      setPlayerRole(requestedRole);
    })
    .catch((error) => {
      console.error("[SEAT] JOIN FAILED", error);
      setPlayerRole("SPECTATOR");
    });
}, [tableId, username, requestedSeat]);
  // Check if auction is finished (3 consecutive PASSes)
  const isAuctionFinished = auctionFinished(auction);
  
  async function leaveCurrentTable() {
  if (!tableId || !username || playerRole === "SPECTATOR") {
    window.location.href = "/egitim";
    return;
  }

  try {
    console.log("[SEAT] LEAVE START", {
  tableId,
  username,
  playerRole,
});
    const roleMap: Record<Exclude<PlayerRole, "SPECTATOR">, TableRole> = {
      NORTH: "North",
      EAST: "East",
      SOUTH: "South",
      WEST: "West",
    };

    const tableRole = roleMap[playerRole];
    const player = createTablePlayer(username, tableRole, username);

    await supabaseTableCommunication.leaveTable(tableId, player);

    console.log("[SEAT] LEAVE SUCCESS", {
      tableId,
      username,
      playerRole,
    });

    window.location.href = "/egitim";
  } catch (error) {
    console.error("[SEAT] LEAVE FAILED", error);
  }
}
 async function handleCall(call: Bid) {
  if (!tableId) {
    return;
  }

  const nextAuction = [...auction, call];

  const nextTurn: Seat =
    turn === "N"
      ? "E"
      : turn === "E"
      ? "S"
      : turn === "S"
      ? "W"
      : "N";

  setAuction(nextAuction);
  setTurn(nextTurn);

  const nextState = createTableState(
    tableId,
    hands,
    nextAuction,
    nextTurn
  );

  try {
    await supabaseTableCommunication.publishTableState(
      tableId,
      nextState
    );

    console.log("[AUCTION] CALL PUBLISHED", {
      call,
      nextTurn,
    });
  } catch (error) {
    console.error("[AUCTION] CALL PUBLISH FAILED", error);
  }
} 
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
     console.log("[SYNC] REQUESTED TABLE ID", nextTableId);
    void supabaseTableCommunication.getTable(nextTableId)
  .then((existingState) => {
    console.log("[SYNC] getTable result", {
      tableId: nextTableId,
      existingState,
    });
        if (existingState) {
  const nextSignature = JSON.stringify({
    deal: existingState.currentDeal,
    auction: existingState.currentAuction,
    turn: existingState.currentTurn,
    });

     lastPublishedRef.current = nextSignature;
     setHands(existingState.currentDeal);
     setAuction(existingState.currentAuction);
     setTurn(existingState.currentTurn);

           return null;
           }

        const initialDeal = newDeal();

        const initialState = createTableState(
              nextTableId,
              initialDeal,
           [],
           "N"
           );
  return supabaseTableCommunication.createTable(nextTableId, initialState);
      })
      .then(() => {
        subscriptionRef.current =
          supabaseTableCommunication.subscribeToTable(
            nextTableId,
            (nextState) => {
              const nextSignature = JSON.stringify({
                deal: nextState.currentDeal,
                auction: nextState.currentAuction,
                turn: nextState.currentTurn,
              });

              console.log("[SYNC] Subscription callback fired", {
                tableId: nextTableId,
                nextState,
              });

              lastPublishedRef.current = nextSignature;
              setHands(nextState.currentDeal);
              setAuction(nextState.currentAuction);
              setTurn(nextState.currentTurn);

              console.log("[SYNC] Remote React state updated");
            }
          );
      })
             .catch((error) => {
             console.error("[SYNC] Table initialization failed", error);
             });

    return () => {
      subscriptionRef.current?.();
    };
  }, []);         


  
  return (
    <div className="min-h-screen bg-zinc-900">
      <div className="p-6 flex items-start justify-between">
        <div className="flex gap-3">
  <button
  onClick={leaveCurrentTable}
  className="inline-block rounded-lg border border-red-700 px-4 py-2 text-white hover:bg-red-900 transition"
>
  ← Geri
</button>

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
        <div className="mt-2 text-center text-xs text-zinc-500">

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
              onClick={async () => {
                console.log("[SEAT] NORTH CLICK", { tableId, username });
                if (!tableId || !username) {
                 return;
                }

                try {
                 const player = createTablePlayer(username, "North", username);

                 const joinedState = await supabaseTableCommunication.joinTable(
                  tableId,
                  player,
                  "North"
                );

                console.log("[SEAT] JOIN RESULT", joinedState);

                 setPlayerRole("NORTH");
                 setShowRoleSelector(false);
               } catch (error) {
                 console.error("[SEAT] North seat join failed", error);
               }
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
        onCall={handleCall}
      />
    </div>
  );
}
