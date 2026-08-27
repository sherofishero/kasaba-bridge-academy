"use client";
import { trainingBoards } from "../lib/trainingDeals";
import {
  generateInvertedDeal,
  generateTwoNTDeal,
  generateOneNTDeal,
  OneNTCategory,
  OneNTGoal,
} from "../lib/trainingGenerator";import Link from "next/link";
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
  getVulnerabilityForBoard,
  TableRole,
  TableState,
} from "../lib/game";
import { supabaseTableCommunication } from "../lib/supabase";

function newDeal(): Deal {
  return dealHands(shuffleDeck(createDeck()));
}
function getNextDeal(
  mode: "RANDOM" | "INVERTED" | "TWO_NT" | "1NT_AÇIŞLAR",
  category?: OneNTCategory,
  goal?: OneNTGoal
): Deal {
  switch (mode) {
    case "INVERTED":
      return generateInvertedDeal();

    case "TWO_NT":
      return generateTwoNTDeal();

    case "1NT_AÇIŞLAR":
      if (!category || !goal) {
        return newDeal();
      }
      return generateOneNTDeal(category, goal);

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
    "RANDOM" | "INVERTED" | "TWO_NT" | "1NT_AÇIŞLAR"
  >("RANDOM");
  const [selectedTopic, setSelectedTopic] = useState("Rastgele Eller");
  const [oneNTCategory, setOneNTCategory] =
    useState<OneNTCategory>("4-4 majör");
  const [oneNTGoal, setOneNTGoal] =
    useState<OneNTGoal>("ZON");
  const [showDealMenu, setShowDealMenu] =
    useState(false);
  const [showTopics, setShowTopics] =
    useState(false);

  // Role selection state
  const [playerRole, setPlayerRole] = useState<PlayerRole>("SPECTATOR");
  /* Rol async çözümlenene kadar Table tüm elleri gizli gösterir. */
  const [roleResolved, setRoleResolved] = useState(false);
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

    const requestedRole =
      requestedSeat as Exclude<PlayerRole, "SPECTATOR">;

    const tableRole = roleMap[requestedRole];

    async function joinOrRestoreSeat() {
      try {
        // Önce masanın mevcut durumunu oku.
        const existingState =
          await supabaseTableCommunication.getTable(tableId!);
        if (existingState) {
          const existingPlayer =
            requestedRole === "NORTH"
              ? existingState.northPlayer
              : requestedRole === "EAST"
                ? existingState.eastPlayer
                : requestedRole === "SOUTH"
                  ? existingState.southPlayer
                  : existingState.westPlayer;

          // F5 sonrası oyuncu zaten kendi koltuğundaysa
          // tekrar joinTable çağırma.
          if (existingPlayer?.id === username) {
            console.log("[SEAT] RESTORE EXISTING SEAT", {
              tableId,
              username,
              requestedRole,
            });

            setPlayerRole(requestedRole);
            setRoleResolved(true);
            setTableState(existingState);
            return;
          }
        }

        // Oyuncu masada değilse normal şekilde koltuğa otur.
        const player = createTablePlayer(
          username,
          tableRole,
          username
        );

        const nextState =
          await supabaseTableCommunication.joinTable(
            tableId!,
            player,
            tableRole
          );

        console.log("[SEAT] JOIN SUCCESS", {
          tableId,
          username,
          requestedRole,
        });

        setPlayerRole(requestedRole);
        setRoleResolved(true);
        setTableState(nextState);
      } catch (error) {
        console.error("[SEAT] JOIN FAILED", error);
        setPlayerRole("SPECTATOR");
        setRoleResolved(true);
      }
    }

    void joinOrRestoreSeat();
  }, [tableId, username, requestedSeat]);

  /*
   * HEARTBEAT: oturan oyuncu 20 saniyede bir KENDI koltugunun
   * lastSeenAt'ini sunucu RPC'si ile gunceller. Kopma tespitinin
   * nihai otoritesi sunucudaki cron sweep'tir (remove_stale_players).
   * Arka plan sekmelerinde kisilan timer'lara karsi
   * visibilitychange/focus'ta aninda bir heartbeat daha gonderilir.
   */
  useEffect(() => {
    if (!tableId || !username || playerRole === "SPECTATOR") {
      return;
    }

    const roleMap: Record<
      Exclude<PlayerRole, "SPECTATOR">,
      TableRole
    > = {
      NORTH: "North",
      EAST: "East",
      SOUTH: "South",
      WEST: "West",
    };

    const seat = roleMap[playerRole];

    const beat = () => {
      void supabaseTableCommunication.heartbeatTablePlayer(
        tableId,
        username,
        seat
      );
    };

    beat();

    const interval = setInterval(beat, 20_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        beat();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [tableId, username, playerRole]);

  /*
   * PAGEHIDE: sekme kapanirken best-effort cikis.
   * Garanti DEGILDIR; calismazsa cron sweep temizler.
   */
  useEffect(() => {
    if (!tableId || !username || playerRole === "SPECTATOR") {
      return;
    }

    const onPageHide = () => {
      supabaseTableCommunication.leaveTableKeepalive(
        tableId,
        username
      );
    };

    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [tableId, username, playerRole]);

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

      const roleMap: Record<
        Exclude<PlayerRole, "SPECTATOR">,
        TableRole
      > = {
        NORTH: "North",
        EAST: "East",
        SOUTH: "South",
        WEST: "West",
      };

      const tableRole = roleMap[playerRole];
      const player = createTablePlayer(
        username,
        tableRole,
        username
      );

      await supabaseTableCommunication.leaveTable(
        tableId,
        player
      );

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
    const deal = getNextDeal(
      dealMode,
      oneNTCategory,
      oneNTGoal
    );
    const nextHands = deal;
    const nextAuction: Bid[] = [];

    const currentBoardNumber = tableState?.boardNumber ?? 1;
    const nextBoardNumber = currentBoardNumber + 1;

    const nextDealer: Seat = "S";
    const nextTurn: Seat = "S";

    const nextVulnerability =
      getVulnerabilityForBoard(nextBoardNumber);
    setHands(nextHands);

    setAuction(nextAuction);
    setTurn(nextTurn);

    if (!tableId) {
      console.log("[SYNC] No tableId available for publish");
      return;
    }

    const nextState: TableState = {
      ...(tableState ?? createTableState(
        tableId,
        nextHands,
        [],
        undefined,
        nextBoardNumber
      )),
      boardNumber: nextBoardNumber,
      currentDeal: nextHands,
      currentAuction: nextAuction,
      dealer: nextDealer,
      vulnerability: nextVulnerability,
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
          "S",
          1
        );
        initialState.dealer = "S";
        initialState.currentTurn = "S";
        initialState.vulnerability =
          getVulnerabilityForBoard(1);
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

        {/* SOL ÜST BUTONLAR */}
        <div className="fixed left-0 top-0 z-50 flex items-start gap-2">
          <button
            type="button"
            onClick={leaveCurrentTable}
            className="h-8 w-[120px] shrink-0 whitespace-nowrap rounded-lg border border-blue-900 bg-blue-950 px-3 py-1 text-sm font-semibold leading-none text-yellow-400 transition hover:bg-blue-950"
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
                const roleMap: Record<
                  Exclude<PlayerRole, "SPECTATOR">,
                  TableRole
                > = {
                  NORTH: "North",
                  EAST: "East",
                  SOUTH: "South",
                  WEST: "West",
                };

                const tableRole = roleMap[playerRole];
                const player = createTablePlayer(
                  username,
                  tableRole,
                  username
                );

                await supabaseTableCommunication.leaveTable(
                  tableId,
                  player
                );

                window.location.href = "/salon";
              } catch (error) {
                console.error(
                  "[SEAT] LEAVE TO SALON FAILED",
                  error
                );
              }
            }}
            className="h-8 w-[120px] shrink-0 whitespace-nowrap rounded-lg border border-blue-900 bg-blue-950 px-3 py-1 text-sm font-semibold leading-none text-white transition hover:bg-blue-900"
          >
            ← Salona Dön
          </button>
        </div>

        {/* SAĞ ÜST BUTONLAR */}
        <div className="absolute right-0 top-0 z-50 flex items-start gap-2">
          <div className="flex items-center gap-3">

            <div className="absolute right-0 top-0 z-50 flex items-start gap-2">

              {/* MASA SEÇENEKLERİ - SADECE HOST */}
              {isHost && (
                <button
                  type="button"
                  onClick={() => setShowTableOptions(true)}
                  className="h-8 w-[120px] shrink-0 whitespace-nowrap rounded-lg border border-blue-900 bg-blue-950 px-3 py-1 text-sm font-semibold leading-none text-yellow-400 transition hover:bg-blue-950"
                >
                  Masa Seçenekleri
                </button>
              )}

              {/* YENİ EL DAĞIT */}
              <button
                type="button"
                onClick={() => void requestNewBoard()}
                disabled={showDealMenu}
                className="h-8 w-[120px] shrink-0 whitespace-nowrap rounded-lg border border-blue-900 bg-blue-950 px-3 py-1 text-sm font-semibold leading-none text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Yeni El Dağıt
              </button>

              {/* DAĞILIM SEÇ */}
              <div className="relative flex w-[120px] shrink-0 flex-col items-center">
                <button
                  type="button"
                  disabled={showDealMenu}
                  onClick={() => {
                    setShowDealMenu(!showDealMenu);

                    if (showDealMenu) {
                      setShowTopics(false);
                    }
                  }}
                  className="h-8 w-[120px] whitespace-nowrap rounded-lg border border-blue-900 bg-blue-950 px-3 py-1 text-sm font-semibold leading-none text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Dağılım Seç
                </button>

                <p className="mt-1 text-center text-xs text-yellow-400">
                  {selectedTopic}
                </p>

                {showDealMenu && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-blue-900 bg-zinc-900 p-4 text-yellow-100 shadow-2xl">

                    <button
                      onClick={() => {
                        setDealMode("RANDOM");
                        setSelectedTopic("Rastgele");
                        setTurn("N");
                        setShowTopics(false);
                        setShowDealMenu(false);
                      }}
                      className={`block w-full rounded-lg px-3 py-2.5 text-left font-semibold transition hover:bg-blue-950 hover:text-white ${
                        dealMode === "RANDOM"
                          ? "bg-blue-950 text-yellow-300 ring-1 ring-yellow-500/60"
                          : "text-yellow-100"
                      }`}
                    >
                      Rastgele
                    </button>

                    <div className="my-2 h-px bg-zinc-700" />

                    <button
                      onClick={() => setShowTopics(!showTopics)}
                      className={`block w-full rounded-lg border px-3 py-2.5 text-left font-semibold transition hover:bg-blue-950 hover:text-white ${
                        showTopics || dealMode !== "RANDOM"
                          ? "border-yellow-600 text-yellow-300"
                          : "border-zinc-700 text-yellow-100"
                      }`}
                    >
                      Konu Seç
                    </button>

                    {showTopics && (
                      <div className="mt-2 space-y-2 rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-center text-xs text-yellow-300">

                        <button
                          onClick={() => {
                            setDealMode("INVERTED");
                            setSelectedTopic("Inverted");
                            setShowDealMenu(false);
                            setShowTopics(false);
                          }}
                          className={`block w-full rounded-lg border px-3 py-2.5 text-left font-semibold transition hover:bg-blue-950 hover:text-white ${
                            selectedTopic === "Inverted"
                              ? "border-yellow-600 bg-blue-950 text-yellow-200"
                              : "border-zinc-700 bg-zinc-900 text-yellow-300"
                          }`}
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
                          className={`block w-full rounded-lg border px-3 py-2.5 text-left font-semibold transition hover:bg-blue-950 hover:text-white ${
                            selectedTopic === "2NT"
                              ? "border-yellow-600 bg-blue-950 text-yellow-200"
                              : "border-zinc-700 bg-zinc-900 text-yellow-300"
                          }`}
                        >
                          2NT
                        </button>

                        <button
                          onClick={() => {
                            setDealMode("1NT_AÇIŞLAR");
                            setSelectedTopic("1NT AÇIŞLAR");
                            setShowDealMenu(false);
                            setShowTopics(false);
                          }}
                          className={`block w-full rounded-lg border px-3 py-2.5 text-left font-semibold transition hover:bg-blue-950 hover:text-white ${
                            selectedTopic === "1NT AÇIŞLAR"
                              ? "border-yellow-600 bg-blue-950 text-yellow-200"
                              : "border-zinc-700 bg-zinc-900 text-yellow-300"
                          }`}
                        >
                          1NT AÇIŞLAR
                        </button>

                        <div className="mt-3 text-center text-xs text-zinc-400">
                          ...
                        </div>

                      </div>
                    )}

                  </div>
                )}

              </div>

            </div>
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
                    setRoleResolved(true);
                    setShowRoleSelector(false);
                  } catch (error) {
                    console.error("[SEAT] North seat join failed", error);
                  }
                }}
                className="rounded-lg bg-blue-900 px-4 py-2 font-bold text-white transition hover:bg-blue-800"
              >
                KUZEY (North)
              </button>
              <button
                onClick={() => {
                  setPlayerRole("EAST");
                  setRoleResolved(true);
                  setShowRoleSelector(false);
                }}
                className="rounded-lg bg-blue-900 px-4 py-2 font-bold text-white transition hover:bg-blue-800"
              >
                DOĞU
              </button>
              <button
                onClick={() => {
                  setPlayerRole("SOUTH");
                  setRoleResolved(true);
                  setShowRoleSelector(false);
                }}
                className="rounded-lg bg-blue-900 px-4 py-2 font-bold text-white transition hover:bg-blue-800"
              >
                GÜNEY (South)
              </button>
              <button
                onClick={() => {
                  setPlayerRole("SPECTATOR");
                  setRoleResolved(true);
                  setShowRoleSelector(false);
                }}
                className="rounded-lg bg-yellow-700 px-4 py-2 font-bold text-white transition hover:bg-yellow-600"
              >
                İZLEYİCİ (Spectator)
              </button>
              <button
                onClick={() => {
                  setPlayerRole("WEST");
                  setRoleResolved(true);
                  setShowRoleSelector(false);
                }}
                className="rounded-lg bg-blue-900 px-4 py-2 font-bold text-white transition hover:bg-blue-800"
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
        rolePending={!roleResolved}
        isAuctionFinished={isAuctionFinished}
        onCall={handleCall}
        onUndo={handleUndo}
        newBoardRequest={tableState?.newBoardRequest}
        onApproveNewBoardRequest={() => void approveNewBoardRequest()}
        onRejectNewBoardRequest={() => void rejectNewBoardRequest()}
      />
      {showTableOptions && isHost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
          <div className="w-[420px] rounded-xl border border-blue-900 bg-zinc-950 p-6 shadow-2xl">
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
                  : "border-blue-900 text-blue-300 hover:bg-blue-950"
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
          <div className="w-[420px] rounded-xl border border-blue-900 bg-zinc-950 p-6 shadow-2xl">
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
                className="rounded-lg border border-blue-900 bg-blue-950 px-4 py-2 font-semibold text-white transition hover:bg-blue-900"
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