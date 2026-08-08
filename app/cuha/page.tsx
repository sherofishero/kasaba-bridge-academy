"use client";
import { trainingBoards } from "../lib/trainingDeals";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react"; import Table from "../components/Table";
import {
  createDeck,
  shuffleDeck,
  dealHands,
  Deal,
} from "../lib/deck";
import { useSearchParams } from "next/navigation";
import { Bid, Seat, auctionFinished } from "../lib/auction";
import {
  createTablePlayer,
  createTableState,
  TableRole,
  TableState,
} from "../lib/game";
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

function MasaContent() {
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
  const [showTableOptions, setShowTableOptions] = useState(false);
  const [showAutoPassInfo, setShowAutoPassInfo] = useState(false);
  const [tableState, setTableState] = useState<TableState | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  //me from localStorage
  const [username, setUsername] = useState<string>("");
  const isHost = tableState?.hostPlayerId === username;

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
      .then((nextState) => {
        console.log("[SEAT] JOIN SUCCESS", {
          tableId,
          username,
          requestedRole,
        });

        setPlayerRole(requestedRole);
        setTableState(nextState);
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
      const stateAfterLeave = await supabaseTableCommunication.getTable(tableId);

      console.log("[GHOST TEST]", stateAfterLeave);

      console.log("[SEAT] LEAVE SUCCESS", {
        tableId,
        username,
        playerRole,
      });

      // window.location.href = "/egitim";

      alert("LEAVE SUCCESS");
    } catch (error) {
      console.error("[SEAT] LEAVE FAILED", error);
    }
  }

  function isSeatEmpty(seat: Seat): boolean {
    if (!tableState) {
      return false;
    }

    switch (seat) {
      case "N":
        return tableState.northPlayer === null;
      case "E":
        return tableState.eastPlayer === null;
      case "S":
        return tableState.southPlayer === null;
      case "W":
        return tableState.westPlayer === null;
    }
  }
  function getNextSeat(seat: Seat): Seat {
    switch (seat) {
      case "N":
        return "E";
      case "E":
        return "S";
      case "S":
        return "W";
      case "W":
        return "N";
    }
  }
  async function handleUndo() {
    if (!tableId || auction.length === 0) {
      return;
    }

    let nextAuction: Bid[];

    if (isHost) {
      nextAuction = auction.slice(0, -1);
    } else {
      const seatMap: Record<Exclude<PlayerRole, "SPECTATOR">, Seat> = {
        NORTH: "N",
        EAST: "E",
        SOUTH: "S",
        WEST: "W",
      };

      if (playerRole === "SPECTATOR") {
        return;
      }

      const playerSeat = seatMap[playerRole];

      let ownLastCallIndex = -1;

      for (let i = auction.length - 1; i >= 0; i--) {
        if (auction[i].seat === playerSeat) {
          ownLastCallIndex = i;
          break;
        }
      }

      if (ownLastCallIndex === -1) {
        return;
      }

      nextAuction = auction.slice(0, ownLastCallIndex);
    }

    const nextTurn: Seat =
      nextAuction.length === 0
        ? "N"
        : getNextSeat(nextAuction[nextAuction.length - 1].seat);

    setAuction(nextAuction);
    setTurn(nextTurn);

    const nextState: TableState = {
      ...(tableState ?? createTableState(tableId, hands)),
      currentDeal: hands,
      currentAuction: nextAuction,
      currentTurn: nextTurn,
    };

    setTableState(nextState);

    try {
      await supabaseTableCommunication.publishTableState(
        tableId,
        nextState
      );

      console.log("[AUCTION] UNDO PUBLISHED", {
        isHost,
        playerRole,
        nextAuction,
        nextTurn,
      });
    } catch (error) {
      console.error("[AUCTION] UNDO PUBLISH FAILED", error);
    }
  }

  async function handleCall(call: Bid) {
    if (!tableId) {
      return;
    }
    console.log("[AUTO PASS] TABLE STATE", {
      north: tableState?.northPlayer,
      east: tableState?.eastPlayer,
      south: tableState?.southPlayer,
      west: tableState?.westPlayer,
    });
    const nextAuction = [...auction, call];

    let nextTurn = getNextSeat(turn);

    while (
      tableState?.autoPass !== false &&
      isSeatEmpty(nextTurn) &&
      !auctionFinished(nextAuction)
    ) {
      nextAuction.push({
        seat: nextTurn,
        type: "PASS",
      });

      nextTurn = getNextSeat(nextTurn);
    }

    setAuction(nextAuction);
    setTurn(nextTurn);

    const nextState: TableState = {
      ...(tableState ?? createTableState(tableId, hands)),
      currentDeal: hands,
      currentAuction: nextAuction,
      currentTurn: nextTurn,
    };

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
  async function requestNewBoard() {
    if (!tableId || !username || playerRole === "SPECTATOR") {
      return;
    }

    if (isHost) {
      await newBoard();
      return;
    }

    const nextState: TableState = {
      ...(tableState ?? createTableState(tableId, hands)),
      newBoardRequest: {
        requestedBy: username,
        approvals: [],
        rejections: [],
      },
    };

    setTableState(nextState);

    try {
      await supabaseTableCommunication.publishTableState(
        tableId,
        nextState
      );

      console.log("[NEW BOARD] REQUEST PUBLISHED", {
        requestedBy: username,
      });
    } catch (error) {
      console.error("[NEW BOARD] REQUEST FAILED", error);
    }
  }
  async function approveNewBoardRequest() {
    if (!tableState?.newBoardRequest) {
      return;
    }

    await newBoard();

    setTableState((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        newBoardRequest: null,
      };
    });
  }
  async function rejectNewBoardRequest() {
    if (!tableState || !tableId) {
      return;
    }

    const nextState: TableState = {
      ...tableState,
      newBoardRequest: null,
    };

    setTableState(nextState);

    try {
      await supabaseTableCommunication.publishTableState(
        tableId,
        nextState
      );
    } catch (error) {
      console.error("[NEW BOARD] REJECT FAILED", error);
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

    const nextState: TableState = {
      ...(tableState ?? createTableState(tableId, nextHands)),
      currentDeal: nextHands,
      currentAuction: nextAuction,
      currentTurn: nextTurn,
      newBoardRequest: null,
    };
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
          setTableState(existingState);

          return null;
        }

        const initialDeal = newDeal();

        const initialState = createTableState(
          nextTableId,
          initialDeal,
          [],
          "N"
        );
        initialState.hostPlayerId = username;
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
              setTableState(nextState);

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

          <button
            type="button"
            onClick={async () => {
              if (!tableId || !username || playerRole === "SPECTATOR") {
                window.location.href = "/salon";
                return;
              }

              try {
                const roleMap: Record<Exclude<PlayerRole, "SPECTATOR">, TableRole> = {
                  NORTH: "North",
                  EAST: "East",
                  SOUTH: "South",
                  WEST: "West",
                };

                const tableRole = roleMap[playerRole];
                const player = createTablePlayer(username, tableRole, username);

                await supabaseTableCommunication.leaveTable(tableId, player);

                window.location.href = "/salon";
              } catch (error) {
                console.error("[SEAT] LEAVE TO SALON FAILED", error);
              }
            }}
            className="inline-block rounded-lg border border-red-700 px-4 py-2 text-white hover:bg-red-900 transition"
          >
            ← Salona Dön
          </button>
        </div>
        <div className="relative flex items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowTableOptions(true)}
              className="rounded-lg border border-red-700 bg-black px-4 py-2 font-semibold text-yellow-400 transition hover:bg-red-950"
            >
              Masa Seçenekleri
            </button>
            <button
              onClick={() => void requestNewBoard()}
              disabled={showDealMenu}
              className="rounded-lg border border-red-700 bg-red-900 px-4 py-2 font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >

              Yeni El Dağıt
            </button>

            <div className="flex flex-col items-center">
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

              <p className="mt-1 text-center text-xs text-yellow-400">
                {selectedTopic}
              </p>
            </div>
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
                      className="block w-full rounded-lg border border-zinc-700 px-3 py-2 text-left text-yellow-300 transition hover:bg-zinc-700"
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
                      className="block w-full rounded-lg border border-zinc-700 px-3 py-2 text-left text-yellow-300 transition hover:bg-zinc-700"
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
        tableState={tableState}
        isHost={isHost}
        isAuctionFinished={isAuctionFinished}
        onCall={handleCall}
        onUndo={handleUndo}
        newBoardRequest={tableState?.newBoardRequest}
        onApproveNewBoardRequest={() => void approveNewBoardRequest()}
        onRejectNewBoardRequest={() => void rejectNewBoardRequest()}
      />
      {showTableOptions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
          <div className="w-[420px] rounded-xl border border-red-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-yellow-400">
                Masa Seçenekleri
              </h2>

              <button
                type="button"
                onClick={() => setShowTableOptions(false)}
                className="text-xl text-zinc-400 transition hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-800 py-4">
              <span className="font-semibold text-white">
                Otomatik Pass
              </span>

              <button
                type="button"
                onClick={async () => {
                  if (!tableState || !tableId) return;

                  const nextState: TableState = {
                    ...tableState,
                    autoPass: tableState.autoPass === false,
                  };

                  if (nextState.autoPass === false) {
                    setShowAutoPassInfo(true);
                  }

                  setTableState(nextState);

                  try {
                    await supabaseTableCommunication.publishTableState(
                      tableId,
                      nextState
                    );
                  } catch (error) {
                    console.error("[TABLE OPTIONS] AUTO PASS UPDATE FAILED", error);
                  }
                }}
                className={`rounded-lg border px-3 py-1 text-sm font-bold transition ${tableState?.autoPass !== false
                  ? "border-green-700 text-green-400 hover:bg-green-950"
                  : "border-red-700 text-red-400 hover:bg-red-950"
                  }`}
              >
                {tableState?.autoPass !== false ? "AÇIK" : "KAPALI"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showAutoPassInfo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70">
          <div className="w-[420px] rounded-xl border border-red-800 bg-zinc-950 p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-bold text-yellow-400">
              Otomatik Pass Kapatıldı
            </h2>

            <p className="mb-6 leading-relaxed text-zinc-300">
              Boş koltuklarda otomatik PASS verilmez. Sıra boş bir koltuğa
              geldiğinde Host, o koltuktaki oyuncunun yerine deklare verir.
            </p>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowAutoPassInfo(false)}
                className="rounded-lg border border-red-700 bg-red-900 px-4 py-2 font-semibold text-white transition hover:bg-red-800"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default function MasaPage() {
  return (
    <Suspense fallback={null}>
      <MasaContent />
    </Suspense>
  );
}
