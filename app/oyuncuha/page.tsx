"use client";

import { trainingBoards } from "../lib/trainingDeals";
import {
    generateInvertedDeal,
    generateTwoNTDeal,
    generateOneNTDeal,
    OneNTCategory,
    OneNTGoal,
} from "../lib/trainingGenerator";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import {
    recordBoardIfCompleted,
} from "../lib/history/engine";
import HistoryPanel from "../components/history/HistoryPanel";
import Table from "../components/Table";
import {
    createDeck,
    shuffleDeck,
    dealHands,
    nextSeat,
    Deal,
    Card as BridgeCard,
} from "../lib/deck";
import { useSearchParams } from "next/navigation";
import { Bid, Seat, auctionFinished } from "../lib/auction";
import {
    buildPlayStart,
    playCard,
    tryCompleteTrick,
    isBoardCompleted,
    nextPlaySeat,
    Trick,
} from "../lib/play";
import {
    createTablePlayer,
    createTableState,
    getVulnerabilityForBoard,
    TableRole,
    TableState,
} from "../lib/game";
import { supabaseTableCommunication } from "../lib/supabase";

/* =========================================================
 * UNDO — SAF YARDIMCILAR (app/cuha/page.tsx ile birebir aynı akış)
 * ========================================================= */

/*
 * UNDO MODU:
 * - "CARD" : kart oynama aşamasında son oynanan kart geri alınır
 *            (açılış atağı dahil; dummy kartları declarer'ın hamlesi).
 * - "BID"  : deklarasyon aşamasında son bid geri alınır. Auction bitmiş
 *            fakat opening lead henüz yapılmamışsa (playedCards boş)
 *            undo yine BID modunda çalışır.
 */
function getUndoMode(state: TableState): "CARD" | "BID" | null {
    if (
        state.gamePhase === "play" ||
        state.gamePhase === "completed"
    ) {
        if ((state.playedCards?.length ?? 0) > 0) {
            return "CARD";
        }

        /*
         * ATAK ÖNCESİ UNDO: auction tamamlanmış, contract/declarer/openingLeader
         * belirlenmiş ancak açılış atağı henüz YAPILMAMIŞSA undo yine BID
         * modunda çalışır: son bid geri alınır ve play alanları yeni auction'a
         * göre yeniden kurulur (buildUndoBidState).
         */
        if (
            state.gamePhase === "play" &&
            (state.currentAuction?.length ?? 0) > 0
        ) {
            return "BID";
        }

        return null;
    }

    if (
        state.gamePhase === "auction" &&
        (state.currentAuction?.length ?? 0) > 0
    ) {
        return "BID";
    }

    return null;
}

/*
 * Geri alınacak hamlenin ETKİN koltuğu. Kart fazında dummy'den declarer
 * tarafından oynanan kartlar declarer'ın hamlesi sayılır.
 * Deklarasyon fazında son bid'i veren koltuk etkin koltuktur.
 */
function getUndoEffectiveSeat(state: TableState): Seat | null {
    const mode = getUndoMode(state);
    if (mode === null) {
        return null;
    }

    if (mode === "BID") {
        const auction = state.currentAuction ?? [];
        return auction[auction.length - 1]?.seat ?? null;
    }

    const played = state.playedCards ?? [];
    const last = played[played.length - 1];

    if (state.dummy && last.seat === state.dummy && state.declarer) {
        return state.declarer;
    }

    return last.seat;
}

/* Bir koltuğun partnership rakipleri (iki koltuk). */
function getUndoOpponentSeats(seat: Seat): Seat[] {
    return seat === "N" || seat === "S" ? ["E", "W"] : ["N", "S"];
}

/*
 * Undo onaycıları: partnership rakipleri arasından yalnızca gerçek insan
 * oyuncularının koltukları. Dummy hiçbir zaman bağımsız onay makamı
 * olmadığı için dummy koltuğu listeden çıkarılır. Bu, Problem 1'in
 * (dummy onayı) kök nedenidir.
 */
function getUndoApproverSeats(state: TableState, seat: Seat): Seat[] {
    return getUndoOpponentSeats(seat).filter(
        (s) => s !== state.dummy
    );
}

function getSeatPlayerId(state: TableState, seat: Seat): string | null {
    switch (seat) {
        case "N":
            return state.northPlayer?.id ?? null;
        case "E":
            return state.eastPlayer?.id ?? null;
        case "S":
            return state.southPlayer?.id ?? null;
        case "W":
            return state.westPlayer?.id ?? null;
    }
}

function removeFromUndoHand(hand: BridgeCard[], card: BridgeCard): BridgeCard[] {
    const index = hand.findIndex(
        (c) => c.suit === card.suit && c.rank === card.rank
    );
    if (index === -1) {
        return hand;
    }
    return [...hand.slice(0, index), ...hand.slice(index + 1)];
}

function newDeal(): Deal {
    return dealHands(shuffleDeck(createDeck()));
}

/*
 * DEKLARASYON UNDO: son bid gerçekten geri alınır; auction state'i bir
 * önceki gerçek duruma döner ve sıra bid'i veren oyuncuya döner.
 * buildPlayStart ile play alanları yeni auction'a göre yeniden hesaplanır:
 * auction hâlâ bitmemişse oyun "auction" fazına döner ve play kalıntıları
 * temizlenir; bitmişse yeni kontrat/declarer/dummy/openingLeader kurulur.
 * Dealer'a DOKUNULMAZ.
 */
function buildUndoBidState(state: TableState): TableState | null {
    const auction = state.currentAuction ?? [];
    if (auction.length === 0) {
        return null;
    }

    const nextAuction = auction.slice(0, -1);

    const nextTurn: Seat =
        nextAuction.length === 0
            ? "N"
            : nextSeat(nextAuction[nextAuction.length - 1].seat);

    const playStart = buildPlayStart(nextAuction);

    const nextState: TableState = {
        ...state,
        currentAuction: nextAuction,
        currentTurn: nextTurn,

        gamePhase: playStart ? "play" : "auction",
        contract: playStart ? playStart.contract : null,
        declarer: playStart ? playStart.declarer : null,
        dummy: playStart ? playStart.dummy : null,
        openingLeader: playStart ? playStart.openingLeader : null,
        playTurn: playStart ? playStart.openingLeader : null,
    };

    if (!playStart) {
        nextState.currentTrick = [];
        nextState.completedTricks = [];
        nextState.playedCards = [];
    }

    return nextState;
}

/*
 * GERÇEK undo state'i (kart fazı): son oynanan kartı geri alır.
 *
 * Eller originalDeal'den, hâlâ masada olan kartlar (remaining playedCards)
 * düşülerek yeniden türetilir -> ilgili oyuncunun eli her zaman tutarlıdır.
 * currentTrick / completedTricks / playTurn / gamePhase önceki duruma döner.
 * Açılış atağı geri alındığında playedCards boalır, playTurn openingLeader
 * (son atak kartının koltuğu) olur; auction/contract alanlarına DOKUNULMAZ.
 */
function buildUndoState(state: TableState): TableState | null {
    const played = state.playedCards ?? [];
    if (played.length === 0) {
        return null;
    }

    const last = played[played.length - 1];
    const remaining = played.slice(0, -1);

    const original: Deal =
        state.originalDeal ?? state.currentDeal;

    let north = [...(original.north ?? [])];
    let east = [...(original.east ?? [])];
    let south = [...(original.south ?? [])];
    let west = [...(original.west ?? [])];

    for (const pc of remaining) {
        switch (pc.seat) {
            case "N":
                north = removeFromUndoHand(north, pc.card);
                break;
            case "E":
                east = removeFromUndoHand(east, pc.card);
                break;
            case "S":
                south = removeFromUndoHand(south, pc.card);
                break;
            case "W":
                west = removeFromUndoHand(west, pc.card);
                break;
        }
    }

    let currentTrick = [...(state.currentTrick ?? [])];
    let completedTricks: Trick[] = [...(state.completedTricks ?? [])];

    if (currentTrick.length > 0) {
        /* Kart aktif lövedeydi. */
        currentTrick = currentTrick.slice(0, -1);
    } else if (completedTricks.length > 0) {
        /* Löve tamamlanmıştı: son löveyi geri aç, son kartını çıkar. */
        const lastTrick = completedTricks[completedTricks.length - 1];
        completedTricks = completedTricks.slice(0, -1);
        currentTrick = lastTrick.cards.slice(0, -1);
    }

    return {
        ...state,
        currentDeal: { north, east, south, west },
        playedCards: remaining,
        currentTrick,
        completedTricks,
        playTurn: last.seat,
        gamePhase: "play",
    };
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

    const requestedTableId = new URLSearchParams(
        window.location.search
    ).get("tableId")?.trim();

    if (requestedTableId) {
        return requestedTableId;
    }

    const nextTableId = "table-1";
    window.localStorage.setItem("bridge-table-id", nextTableId);
    return nextTableId;
}

function OyuncuMasaContent() {
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

    const [selectedTopic, setSelectedTopic] =
        useState("Rastgele Eller");

    const [oneNTCategory, setOneNTCategory] =
        useState<OneNTCategory>("4-4 majör");

    const [oneNTGoal, setOneNTGoal] =
        useState<OneNTGoal>("ZON");

    const [showDealMenu, setShowDealMenu] =
        useState(false);

    const [showTopics, setShowTopics] =
        useState(false);

    const [playerRole, setPlayerRole] =
        useState<PlayerRole>("SPECTATOR");

    /*
     * Rol async çözümlenene kadar Table tüm elleri gizli gösterir.
     */
    const [roleResolved, setRoleResolved] =
        useState(false);

    const [showTableOptions, setShowTableOptions] =
        useState(false);

    const [showAutoPassInfo, setShowAutoPassInfo] =
        useState(false);

    const [tableState, setTableState] =
        useState<TableState | null>(null);

    const [showRoleSelector, setShowRoleSelector] =
        useState(false);

    //me from localStorage
    const [username, setUsername] = useState<string>("");

    const isHost =
        tableState?.hostPlayerId === username;

    useEffect(() => {
        const storedName =
            localStorage.getItem("guestName");

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

        const roleMap: Record<
            Exclude<PlayerRole, "SPECTATOR">,
            TableRole
        > = {
            NORTH: "North",
            EAST: "East",
            SOUTH: "South",
            WEST: "West",
        };

        const requestedRole =
            requestedSeat as Exclude<
                PlayerRole,
                "SPECTATOR"
            >;

        const tableRole = roleMap[requestedRole];

        async function joinOrRestoreSeat() {
            try {
                const existingState =
                    await supabaseTableCommunication.getTable(
                        tableId!
                    );

                if (existingState) {
                    const existingPlayer =
                        requestedRole === "NORTH"
                            ? existingState.northPlayer
                            : requestedRole === "EAST"
                                ? existingState.eastPlayer
                                : requestedRole === "SOUTH"
                                    ? existingState.southPlayer
                                    : existingState.westPlayer;

                    if (existingPlayer?.id === username) {
                        console.log(
                            "[SEAT] RESTORE EXISTING SEAT",
                            {
                                tableId,
                                username,
                                requestedRole,
                            }
                        );

                        setPlayerRole(requestedRole);
                        setRoleResolved(true);
                        setTableState(existingState);
                        return;
                    }
                }

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
                console.error(
                    "[SEAT] JOIN FAILED",
                    error
                );

                setPlayerRole("SPECTATOR");
                setRoleResolved(true);
            }
        }

        void joinOrRestoreSeat();
    }, [tableId, username, requestedSeat]);

    /*
     * HEARTBEAT
     */
    useEffect(() => {
        if (
            !tableId ||
            !username ||
            playerRole === "SPECTATOR"
        ) {
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

        const interval = setInterval(
            beat,
            20_000
        );

        const onVisible = () => {
            if (
                document.visibilityState ===
                "visible"
            ) {
                beat();
            }
        };

        document.addEventListener(
            "visibilitychange",
            onVisible
        );

        window.addEventListener(
            "focus",
            onVisible
        );

        return () => {
            clearInterval(interval);

            document.removeEventListener(
                "visibilitychange",
                onVisible
            );

            window.removeEventListener(
                "focus",
                onVisible
            );
        };
    }, [tableId, username, playerRole]);

    /*
     * PAGEHIDE
     */
    useEffect(() => {
        if (
            !tableId ||
            !username ||
            playerRole === "SPECTATOR"
        ) {
            return;
        }

        const onPageHide = () => {
            supabaseTableCommunication.leaveTableKeepalive(
                tableId,
                username
            );
        };

        window.addEventListener(
            "pagehide",
            onPageHide
        );

        return () => {
            window.removeEventListener(
                "pagehide",
                onPageHide
            );
        };
    }, [tableId, username, playerRole]);

    const isAuctionFinished =
        auctionFinished(auction);

    /*
     * HISTORY — ortak engine (app/lib/history).
     * Tamamlanmış board snapshot'ı kaydedilir (idempotent upsert).
     * "Tamamlanmış" tanımı motorun varsayılanı: auctionFinished.
     * Skorlama motoru geldiğinde predicate değişecek, şema aynı.
     */
    const [showHistory, setShowHistory] =
        useState(false);

    const lastRecordedBoardRef =
        useRef<number>(-1);

    useEffect(() => {
        if (
            !tableId ||
            !tableState ||
            lastRecordedBoardRef.current ===
            tableState.boardNumber
        ) {
            return;
        }

        lastRecordedBoardRef.current =
            tableState.boardNumber;

        void recordBoardIfCompleted({
            gameType: "GAME",
            tableId,
            boardNumber:
                tableState.boardNumber,
            dealer: tableState.dealer,
            vulnerability:
                tableState.vulnerability,
            players: {
                north:
                    tableState.northPlayer
                        ?.name ?? null,
                east:
                    tableState.eastPlayer
                        ?.name ?? null,
                south:
                    tableState.southPlayer
                        ?.name ?? null,
                west:
                    tableState.westPlayer
                        ?.name ?? null,
            },
            deal: tableState.currentDeal,
            auction: tableState.currentAuction,
        });
    }, [tableId, tableState]);


    /*
     * GERI DONUS ADRESI:
     *
     * Çalışma Odası'ndan geldiyse /egitim
     * Oyun Odası'ndan geldiyse /oyun-odasi
     *
     * Kaynak belirlenemezse mevcut davranış korunur:
     * /egitim
     */
    function getReturnPath(): string {
        return "/oyun-odasi";
    }
    async function leaveCurrentTable() {
        const returnPath = getReturnPath();

        if (
            !tableId ||
            !username ||
            playerRole === "SPECTATOR"
        ) {
            window.location.href = returnPath;
            return;
        }

        try {
            console.log("[SEAT] LEAVE START", {
                tableId,
                username,
                playerRole,
                returnPath,
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

            const tableRole =
                roleMap[playerRole];

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
                returnPath,
            });

            window.location.href = returnPath;
        } catch (error) {
            console.error(
                "[SEAT] LEAVE FAILED",
                error
            );
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
        console.log("[UNDO DEBUG] HANDLE UNDO ENTERED", {
            tableId,
            username,
            playerRole,
            auction,
            tableStateAuction: tableState?.currentAuction,
        });

        if (!tableId || auction.length === 0) {
            console.log("[UNDO DEBUG] EARLY RETURN", {
                tableId,
                auctionLength: auction.length,
            });
            return;
        }

        const seatMap: Record<
            Exclude<PlayerRole, "SPECTATOR">,
            Seat
        > = {
            NORTH: "N",
            EAST: "E",
            SOUTH: "S",
            WEST: "W",
        };

        if (playerRole === "SPECTATOR") {
            return;
        }

        const playerSeat =
            seatMap[playerRole];

        let ownLastCallIndex = -1;

        for (
            let i = auction.length - 1;
            i >= 0;
            i--
        ) {
            if (
                auction[i].seat ===
                playerSeat
            ) {
                ownLastCallIndex = i;
                break;
            }
        }

        if (ownLastCallIndex === -1) {
            return;
        }

        const nextAuction =
            auction.slice(0, ownLastCallIndex);

        const nextTurn: Seat =
            nextAuction.length === 0
                ? "N"
                : getNextSeat(
                    nextAuction[
                        nextAuction.length - 1
                    ].seat
                );

        setAuction(nextAuction);
        setTurn(nextTurn);

        const nextState: TableState = {
            ...(tableState ??
                createTableState(
                    tableId,
                    hands
                )),

            currentDeal: hands,
            currentAuction: nextAuction,
            currentTurn: nextTurn,
        };

        setTableState(nextState);

        try {
            console.log(
                "[AUCTION] UNDO PUBLISH START",
                {
                    tableId,
                    playerRole,
                    nextAuction,
                    nextTurn,
                }
            );

            await supabaseTableCommunication.publishTableState(
                tableId,
                nextState
            );

            console.log(
                "[AUCTION] UNDO PUBLISHED",
                {
                    tableId,
                    playerRole,
                    nextAuction,
                    nextTurn,
                }
            );
        } catch (error) {
            console.error(
                "[AUCTION] UNDO PUBLISH FAILED",
                error
            );
        }
    }

    function getMyUndoSeat(): Seat | null {
        if (playerRole === "SPECTATOR") {
            return null;
        }

        const seatMap: Record<
            Exclude<PlayerRole, "SPECTATOR">,
            Seat
        > = {
            NORTH: "N",
            EAST: "E",
            SOUTH: "S",
            WEST: "W",
        };

        return seatMap[playerRole];
    }

    /*
     * Undo talebi oluşturma: yalnızca geri alınacak hamlenin ETKİN
     * oyuncusu (dummy kartlarında declarer; deklarasyonda son bid'in
     * sahibi) talep açabilir. Hem DEKLARASYON hem KART OYNAMA aşamasında
     * çalışır (açılış atağı dahil). Aynı anda tek pending talep olabilir;
     * reddedilmiş (kapatılmayı bekleyen) bir talep yenisiyle değiştirilebilir.
     */
    async function handleUndoRequest() {
        if (!tableId || !tableState || !username) {
            return;
        }

        if (getUndoMode(tableState) === null) {
            return;
        }

        if (getUndoEffectiveSeat(tableState) === null) {
            return;
        }

        /* Zaten pending bir talep varsa yeni talep açılamaz. */
        const existing = tableState.undoRequest;
        if (existing && existing.rejections.length === 0) {
            return;
        }

        const mySeat = getMyUndoSeat();
        const effectiveSeat = getUndoEffectiveSeat(tableState);

        if (!mySeat || mySeat !== effectiveSeat) {
            return;
        }

        const nextState: TableState = {
            ...tableState,
            undoRequest: {
                requestedBy: username,
                requestedSeat: effectiveSeat,
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
            console.log("[UNDO] REQUEST PUBLISHED", { requestedBy: username });
        } catch (error) {
            console.error("[UNDO] REQUEST PUBLISH FAILED", error);
        }
    }

    /*
     * Rakip onayı: tüm gerçek insan rakipler onayladığında undo GERÇEKLEŞİR
     * ve gerçek oyun state'i geri alınır. Dummy hiçbir zaman onaycı değildir
     * (Problem 1 çözümü: getUndoApproverSeats dummy'yi listeden çıkarır).
     *
     * Yarış durumu (Problem 2) çözümü: her onaylama önce SUNUCUDAN taze
     * state'i okur, mevcut onaylara ekler. Böylece iki rakip peş peşe
     * onaylasa bile birbirinin onayı silinmez.
     */
    async function approveUndoRequest() {
        if (!tableId || !tableState || !username) {
            return;
        }

        /* Sunucudan taze state oku (race condition önleme). */
        let freshState = tableState;
        try {
            const serverState = await supabaseTableCommunication.getTable(tableId);
            if (serverState) {
                freshState = serverState;
            }
        } catch (error) {
            /* Sunucu okunamazsa yerel state ile devam et. */
        }

        const request = freshState?.undoRequest;
        if (!request) {
            return;
        }

        if (
            request.approvals.includes(username) ||
            request.rejections.includes(username)
        ) {
            return;
        }

        const mySeat = getMyUndoSeat();
        if (
            !mySeat ||
            !getUndoApproverSeats(freshState, request.requestedSeat).includes(mySeat)
        ) {
            return;
        }

        /* Taze onayları koruyarak ekle (Set ile duplicate engelle). */
        const approvals = [...new Set([...request.approvals, username])];

        /* Yalnızca gerçek insan rakipler onaycı (dummy hariç). */
        const approverIds = getUndoApproverSeats(freshState, request.requestedSeat)
            .map((seat) => getSeatPlayerId(freshState, seat))
            .filter((id): id is string => Boolean(id));

        const allApproved =
            approverIds.length > 0 &&
            approverIds.every((id) => approvals.includes(id));

        if (!allApproved) {
            const nextState: TableState = {
                ...freshState,
                undoRequest: { ...request, approvals },
            };

            setTableState(nextState);

            try {
                await supabaseTableCommunication.publishTableState(
                    tableId,
                    nextState
                );
            } catch (error) {
                console.error("[UNDO] APPROVAL PUBLISH FAILED", error);
            }
            return;
        }

        const undoMode = getUndoMode(freshState);

        const undone =
            undoMode === "BID"
                ? buildUndoBidState(freshState)
                : buildUndoState(freshState);

        if (!undone) {
            return;
        }

        const nextState: TableState = { ...undone, undoRequest: null };

        if (undoMode === "BID") {
            /* Deklarasyon undo: yerel auction UI'ını da senkronla. */
            setAuction(nextState.currentAuction);
            setTurn(nextState.currentTurn);
        } else {
            /* Kart undo: yerel el görüntüsünü senkronla. */
            setHands(nextState.currentDeal);
        }

        setTableState(nextState);

        try {
            await supabaseTableCommunication.publishTableState(
                tableId,
                nextState
            );
            console.log("[UNDO] APPROVED AND APPLIED", { approvals });
        } catch (error) {
            console.error("[UNDO] APPLY PUBLISH FAILED", error);
        }
    }

    async function handleCall(call: Bid) {
        if (!tableId) {
            return;
        }

        /* Pending undo talebi varken yeni çağrı kabul edilmez (yarış önlenir). */
        if (tableState?.undoRequest) {
            return;
        }

        console.log(
            "[AUTO PASS] TABLE STATE",
            {
                north:
                    tableState?.northPlayer,
                east:
                    tableState?.eastPlayer,
                south:
                    tableState?.southPlayer,
                west:
                    tableState?.westPlayer,
            }
        );

        const nextAuction = [
            ...auction,
            call,
        ];

        let nextTurn =
            getNextSeat(turn);

        while (
            tableState?.autoPass !== false &&
            isSeatEmpty(nextTurn) &&
            !auctionFinished(
                nextAuction
            )
        ) {
            nextAuction.push({
                seat: nextTurn,
                type: "PASS",
            });

            nextTurn =
                getNextSeat(nextTurn);
        }

        setAuction(nextAuction);
        setTurn(nextTurn);

        const playStart = buildPlayStart(nextAuction);

        const nextState: TableState = {
            ...(tableState ??
                createTableState(
                    tableId,
                    hands
                )),

            currentDeal: hands,
            currentAuction: nextAuction,
            currentTurn: playStart
                ? playStart.openingLeader
                : nextTurn,

            gamePhase: playStart ? "play" : "auction",
            contract: playStart?.contract ?? null,
            declarer: playStart?.declarer ?? null,
            dummy: playStart?.dummy ?? null,
            openingLeader: playStart?.openingLeader ?? null,
            playTurn: playStart?.openingLeader ?? null,

            originalDeal: hands,
            currentTrick: [],
            completedTricks: [],
            playedCards: [],
        };

        try {
            await supabaseTableCommunication.publishTableState(
                tableId,
                nextState
            );

            console.log(
                "[AUCTION] CALL PUBLISHED",
                {
                    call,
                    nextTurn,
                }
            );
        } catch (error) {
            console.error(
                "[AUCTION] CALL PUBLISH FAILED",
                error
            );
        }
    }

    /*
     * Rakip reddi: undo GERÇEKLEŞMEZ, oyun state'i DEĞİŞMEZ. Ret önce
     * state'e kaydedilir (talep eden "reddedildi" mesajını görür), ardından
     * talep otomatik olarak kapatılır; yeni talep için ekstra bir kilit
     * açma adımı gerekmez. Yalnızca gerçek insan rakipler reddedebilir
     * (dummy onay makamı değildir).
     */
    async function rejectUndoRequest() {
        const request = tableState?.undoRequest;

        if (!tableId || !tableState || !request || !username) {
            return;
        }

        if (
            request.rejections.includes(username) ||
            request.approvals.includes(username)
        ) {
            return;
        }

        const mySeat = getMyUndoSeat();

        if (
            !mySeat ||
            !getUndoApproverSeats(tableState, request.requestedSeat).includes(mySeat)
        ) {
            return;
        }

        const rejectedState: TableState = {
            ...tableState,
            undoRequest: { ...request, rejections: [...request.rejections, username] },
        };

        setTableState(rejectedState);

        try {
            await supabaseTableCommunication.publishTableState(
                tableId,
                rejectedState
            );
            console.log("[UNDO] REJECTED", { rejectedBy: username });
        } catch (error) {
            console.error("[UNDO] REJECT PUBLISH FAILED", error);
        }

        /* Reddedilmiş talebi kısa süre sonra tüm istemcilerde kapat. */
        setTimeout(() => {
            void (async () => {
                try {
                    if (rejectedState.undoRequest === null) {
                        return;
                    }

                    if (
                        rejectedState.undoRequest.rejections.length === 0 ||
                        rejectedState.undoRequest.requestedBy !== request.requestedBy
                    ) {
                        return;
                    }

                    const cleared: TableState = {
                        ...rejectedState,
                        undoRequest: null,
                    };
                    setTableState(cleared);
                    await supabaseTableCommunication.publishTableState(
                        tableId,
                        cleared
                    );
                    console.log("[UNDO] REJECTED REQUEST CLEARED");
                } catch (error) {
                    console.error("[UNDO] REJECT CLEAR FAILED", error);
                }
            })();
        }, 2500);
    }

    /* Talep sahibi kendi talebini iptal edebilir. */
    async function cancelUndoRequest() {
        const request = tableState?.undoRequest;

        if (!tableId || !tableState || !request || !username) {
            return;
        }

        if (request.requestedBy !== username) {
            return;
        }

        const nextState: TableState = {
            ...tableState,
            undoRequest: null,
        };

        setTableState(nextState);

        try {
            await supabaseTableCommunication.publishTableState(
                tableId,
                nextState
            );
            console.log("[UNDO] CANCELLED", { cancelledBy: username });
        } catch (error) {
            console.error("[UNDO] CANCEL PUBLISH FAILED", error);
        }
    }

    async function handlePlayCard(
        card: BridgeCard,
        handSeat?: Seat
    ) {
        if (
            !tableId ||
            !tableState ||
            playerRole === "SPECTATOR"
        ) {
            return;
        }

        const seatMap: Record<
            Exclude<PlayerRole, "SPECTATOR">,
            Seat
        > = {
            NORTH: "N",
            EAST: "E",
            SOUTH: "S",
            WEST: "W",
        };

        const playerSeat = seatMap[playerRole];

        /* Pending undo talebi varken kart oynanamaz (state yarışı önlenir).
           Reddedilmiş (kapatılmayı bekleyen) talep akışı engellemez. */
        if (
            tableState.undoRequest &&
            tableState.undoRequest.rejections.length === 0
        ) {
            return;
        }

        if (tableState.gamePhase !== "play") {
            return;
        }

        /* Oynanacak kartın kaynağı: varsayılan kendi elimin, ancak
         * declarer dummy'nin elini oynayabilir ( briç kuralı.. */
        const sourceSeat: Seat =
            handSeat !== undefined ? handSeat : playerSeat;

        /* Sıra bu seat'in elinde olmalı VE sırası bu oyuncuda. */
        const isOwnTurn =
            tableState.playTurn === playerSeat &&
            tableState.playTurn === sourceSeat;

        const isDeclarerPlayingDummy =
            playerSeat === tableState.declarer &&
            tableState.dummy !== null &&
            sourceSeat === tableState.dummy &&
            tableState.playTurn === tableState.dummy;

        if (!isOwnTurn && !isDeclarerPlayingDummy) {
            return;
        }

        const playResult = playCard(
            tableState.currentDeal,
            sourceSeat,
            card,
            tableState.currentTrick
        );

        if (!playResult.ok) {
            console.warn(
                "[PLAY] Card rejected:",
                playResult.reason
            );
            return;
        }

        const nextPlayedCards = [
            ...tableState.playedCards,
            {
                seat: sourceSeat,
                card,
            },
        ];

        const completed = tryCompleteTrick({
            currentTrick: playResult.result.currentTrick,
            completedTricks: tableState.completedTricks,
            trump:
                tableState.contract?.strain ?? "NT",
        });

        const trickWinner = completed.winner;

        const boardCompleted =
            completed.trickCompleted &&
            isBoardCompleted(completed.completedTricks);

        if (boardCompleted) {
          /* 13. löve tamamlandı: el bitti ve oyun/oynama state'i
           * doğru şekilde sıfırlanır. Dealer rotasyonu ve mevcut
           * yeni-el dağıtma/publish mantığı korunarak yeni board
           * otomatik olarak başlatılır (AŞAMA 1 - gereksinim 4.. */
          await newBoard();
          return;
        }

        const nextPlayTurn = boardCompleted
            ? null
            : completed.trickCompleted
                ? trickWinner
                : nextPlaySeat(
                    completed.currentTrick,
                    null
                );

        const nextState: TableState = {
            ...tableState,

            currentDeal:
                playResult.result.currentDeal,

            currentTrick:
                completed.currentTrick,

            completedTricks:
                completed.completedTricks,

            playedCards:
                nextPlayedCards,

            gamePhase:
                boardCompleted
                    ? "completed"
                    : "play",

            playTurn:
                nextPlayTurn,

            currentTurn:
                nextPlayTurn ?? tableState.currentTurn,
        };

        setHands(
            playResult.result.currentDeal
        );

        setTableState(nextState);

        try {
            await supabaseTableCommunication.publishTableState(
                tableId,
                nextState
            );

            console.log(
                "[PLAY] CARD PUBLISHED",
                {
                    seat: playerSeat,
                    card,
                    nextPlayTurn,
                }
            );
        } catch (error) {
            console.error(
                "[PLAY] CARD PUBLISH FAILED",
                error
            );
        }
    }
    async function requestNewBoard() {
        if (
            !tableId ||
            !username ||
            playerRole === "SPECTATOR"
        ) {
            return;
        }

        if (isHost) {
            await newBoard();
            return;
        }

        const nextState: TableState = {
            ...(tableState ??
                createTableState(
                    tableId,
                    hands
                )),

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

            console.log(
                "[NEW BOARD] REQUEST PUBLISHED",
                {
                    requestedBy: username,
                }
            );
        } catch (error) {
            console.error(
                "[NEW BOARD] REQUEST FAILED",
                error
            );
        }
    }

    async function approveNewBoardRequest() {
        if (
            !tableState?.newBoardRequest
        ) {
            return;
        }

        await newBoard();

        setTableState((prev) => {
            if (!prev) {
                return prev;
            }

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
            console.error(
                "[NEW BOARD] REJECT FAILED",
                error
            );
        }
    }

    async function newBoard() {
        console.log(
            "[SYNC] Yeni El handler entered",
            {
                tableId,
                dealMode,
            }
        );

        const deal = getNextDeal(
            dealMode,
            oneNTCategory,
            oneNTGoal
        );

        const nextHands = deal;
        const nextAuction: Bid[] = [];

        const currentBoardNumber =
            tableState?.boardNumber ?? 1;

        const nextBoardNumber =
            currentBoardNumber + 1;

        const dealerOrder: Seat[] = [
            "N",
            "E",
            "S",
            "W",
        ];

        const currentDealer =
            tableState?.dealer ?? "N";

        const currentDealerIndex =
            dealerOrder.indexOf(
                currentDealer
            );

        const nextDealer =
            dealerOrder[
            (currentDealerIndex + 1) %
            dealerOrder.length
            ];

        const nextTurn: Seat =
            nextDealer;

        const nextVulnerability =
            getVulnerabilityForBoard(
                nextBoardNumber
            );

        setHands(nextHands);
        setAuction(nextAuction);
        setTurn(nextTurn);

        if (!tableId) {
            console.log(
                "[SYNC] No tableId available for publish"
            );
            return;
        }

        const nextState: TableState = {
            ...(tableState ??
                createTableState(
                    tableId,
                    nextHands,
                    [],
                    undefined,
                    nextBoardNumber
                )),

            boardNumber:
                nextBoardNumber,

            currentDeal:
                nextHands,

            currentAuction:
                nextAuction,

            dealer:
                nextDealer,

            vulnerability:
                nextVulnerability,

            currentTurn:
                nextTurn,

                        newBoardRequest: null,

            /* Yeni el: undo talebi de sıfırlanır. */
            undoRequest: null,

            /* Yeni el: oyun ve kart oynama state'i tamamen sıfırlanır. */
            gamePhase: "auction",
            contract: null,
            declarer: null,
            dummy: null,
            openingLeader: null,
            playTurn: null,
            originalDeal: nextHands,
            currentTrick: [],
            completedTricks: [],
            playedCards: [],
        };

        setTableState(nextState);

        console.log(
            "[SYNC] Publish function called",
            {
                tableId,
                nextState,
            }
        );

        void supabaseTableCommunication
            .publishTableState(
                tableId,
                nextState
            )
            .then(() => {
                console.log(
                    "[SYNC] Publish completed successfully"
                );
            })
            .catch((error) => {
                console.log(
                    "[SYNC] Publish failed",
                    error
                );
            });
    }

    useEffect(() => {
        if (initializedRef.current) {
            return;
        }

        initializedRef.current = true;

        const nextTableId =
            getRequestedTableId();

        if (!nextTableId) {
            setTableId(null);
            return;
        }

        setTableId(nextTableId);

        console.log(
            "[SYNC] REQUESTED TABLE ID",
            nextTableId
        );

        void supabaseTableCommunication
            .getTable(nextTableId)
            .then((existingState) => {
                console.log(
                    "[SYNC] getTable result",
                    {
                        tableId:
                            nextTableId,
                        existingState,
                    }
                );

                if (existingState) {
                    const nextSignature =
                        JSON.stringify({
                            deal:
                                existingState.currentDeal,
                            auction:
                                existingState.currentAuction,
                            turn:
                                existingState.currentTurn,
                        });

                    lastPublishedRef.current =
                        nextSignature;

                    setHands(
                        existingState.currentDeal
                    );

                    setAuction(
                        existingState.currentAuction
                    );

                    setTurn(
                        existingState.currentTurn
                    );

                    setTableState(
                        existingState
                    );

                    return null;
                }

                const initialDeal =
                    newDeal();

                const initialState =
                    createTableState(
                        nextTableId,
                        initialDeal,
                        [],
                        "N",
                        1
                    );

                initialState.dealer =
                    "N";

                initialState.currentTurn =
                    "N";

                initialState.vulnerability =
                    getVulnerabilityForBoard(
                        1
                    );

                initialState.hostPlayerId =
                    username;

                return supabaseTableCommunication
                    .createTable(
                        nextTableId,
                        initialState
                    );
            })
            .then(() => {
                subscriptionRef.current =
                    supabaseTableCommunication
                        .subscribeToTable(
                            nextTableId,
                            (nextState) => {
                                const nextSignature =
                                    JSON.stringify({
                                        deal:
                                            nextState.currentDeal,
                                        auction:
                                            nextState.currentAuction,
                                        turn:
                                            nextState.currentTurn,
                                    });

                                console.log(
                                    "[SYNC] Subscription callback fired",
                                    {
                                        tableId:
                                            nextTableId,
                                        nextState,
                                    }
                                );
                                console.log("[UNDO DEBUG] REMOTE AUCTION:", nextState.currentAuction);

                                lastPublishedRef.current =
                                    nextSignature;

                                setHands(
                                    nextState.currentDeal
                                );

                                setAuction(
                                    nextState.currentAuction
                                );

                                setTurn(
                                    nextState.currentTurn
                                );

                                setTableState(
                                    nextState
                                );

                                console.log(
                                    "[SYNC] Remote React state updated"
                                );
                            }
                        );
            })
            .catch((error) => {
                console.error(
                    "[SYNC] Table initialization failed",
                    error
                );
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
                        onClick={() =>
                            setShowHistory(true)
                        }
                        className="h-8 w-[120px] shrink-0 whitespace-nowrap rounded-lg border border-blue-900 bg-blue-950 px-3 py-1 text-sm font-semibold leading-none text-white transition hover:bg-blue-900"
                    >
                        GEÇMİŞ
                    </button>

                    <button
                        type="button"
                        onClick={async () => {
                            if (
                                !tableId ||
                                !username ||
                                playerRole ===
                                "SPECTATOR"
                            ) {
                                window.location.href =
                                    "/salon";

                                return;
                            }

                            try {
                                const roleMap: Record<
                                    Exclude<
                                        PlayerRole,
                                        "SPECTATOR"
                                    >,
                                    TableRole
                                > = {
                                    NORTH: "North",
                                    EAST: "East",
                                    SOUTH: "South",
                                    WEST: "West",
                                };

                                const tableRole =
                                    roleMap[playerRole];

                                const player =
                                    createTablePlayer(
                                        username,
                                        tableRole,
                                        username
                                    );

                                await supabaseTableCommunication.leaveTable(
                                    tableId,
                                    player
                                );

                                window.location.href =
                                    "/salon";
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
                                    disabled={true}
                                    className="h-8 w-[120px] shrink-0 whitespace-nowrap rounded-lg border border-blue-900 bg-blue-950 px-3 py-1 text-sm font-semibold leading-none text-yellow-400 opacity-50 cursor-not-allowed"
                                >
                                    Masa Seçenekleri
                                </button>
                            )}

                            {/* YENİ EL DAĞIT */}
                            <button
                                type="button"
                                onClick={() =>
                                    void requestNewBoard()
                                }
                                disabled={
                                    !isHost ||
                                    showDealMenu
                                }
                                className="h-8 w-[120px] shrink-0 whitespace-nowrap rounded-lg border border-blue-900 bg-blue-950 px-3 py-1 text-sm font-semibold leading-none text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Yeni El Dağıt
                            </button>

                            {/* DAĞILIM SEÇ */}
                            <div className="relative flex w-[120px] shrink-0 flex-col items-center">

                                <button
                                    type="button"
                                    disabled={true}
                                    onClick={() => {
                                        setShowDealMenu(
                                            !showDealMenu
                                        );

                                        if (
                                            showDealMenu
                                        ) {
                                            setShowTopics(
                                                false
                                            );
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
                                                setDealMode(
                                                    "RANDOM"
                                                );

                                                setSelectedTopic(
                                                    "Rastgele"
                                                );

                                                setTurn(
                                                    "N"
                                                );

                                                setShowTopics(
                                                    false
                                                );

                                                setShowDealMenu(
                                                    false
                                                );
                                            }}
                                            className={`block w-full rounded-lg px-3 py-2.5 text-left font-semibold transition hover:bg-blue-950 hover:text-white ${dealMode ===
                                                "RANDOM"
                                                ? "bg-blue-950 text-yellow-300 ring-1 ring-yellow-500/60"
                                                : "text-yellow-100"
                                                }`}
                                        >
                                            Rastgele
                                        </button>

                                        <div className="my-2 h-px bg-zinc-700" />

                                        <button
                                            onClick={() =>
                                                setShowTopics(
                                                    !showTopics
                                                )
                                            }
                                            className={`block w-full rounded-lg border px-3 py-2.5 text-left font-semibold transition hover:bg-blue-950 hover:text-white ${showTopics ||
                                                dealMode !==
                                                "RANDOM"
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
                                                        setDealMode(
                                                            "INVERTED"
                                                        );

                                                        setSelectedTopic(
                                                            "Inverted"
                                                        );

                                                        setShowDealMenu(
                                                            false
                                                        );

                                                        setShowTopics(
                                                            false
                                                        );
                                                    }}
                                                    className={`block w-full rounded-lg border px-3 py-2.5 text-left font-semibold transition hover:bg-blue-950 hover:text-white ${selectedTopic ===
                                                        "Inverted"
                                                        ? "border-yellow-600 bg-blue-950 text-yellow-200"
                                                        : "border-zinc-700 bg-zinc-900 text-yellow-300"
                                                        }`}
                                                >
                                                    Inverted
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setDealMode(
                                                            "TWO_NT"
                                                        );

                                                        setSelectedTopic(
                                                            "2NT"
                                                        );

                                                        setShowDealMenu(
                                                            false
                                                        );

                                                        setShowTopics(
                                                            false
                                                        );
                                                    }}
                                                    className={`block w-full rounded-lg border px-3 py-2.5 text-left font-semibold transition hover:bg-blue-950 hover:text-white ${selectedTopic ===
                                                        "2NT"
                                                        ? "border-yellow-600 bg-blue-950 text-yellow-200"
                                                        : "border-zinc-700 bg-zinc-900 text-yellow-300"
                                                        }`}
                                                >
                                                    2NT
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        setDealMode(
                                                            "1NT_AÇIŞLAR"
                                                        );

                                                        setSelectedTopic(
                                                            "1NT AÇIŞLAR"
                                                        );

                                                        setShowDealMenu(
                                                            false
                                                        );

                                                        setShowTopics(
                                                            false
                                                        );
                                                    }}
                                                    className={`block w-full rounded-lg border px-3 py-2.5 text-left font-semibold transition hover:bg-blue-950 hover:text-white ${selectedTopic ===
                                                        "1NT AÇIŞLAR"
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
                                    console.log(
                                        "[SEAT] NORTH CLICK",
                                        {
                                            tableId,
                                            username,
                                        }
                                    );

                                    if (
                                        !tableId ||
                                        !username
                                    ) {
                                        return;
                                    }

                                    try {
                                        const player =
                                            createTablePlayer(
                                                username,
                                                "North",
                                                username
                                            );

                                        const joinedState =
                                            await supabaseTableCommunication.joinTable(
                                                tableId,
                                                player,
                                                "North"
                                            );

                                        console.log(
                                            "[SEAT] JOIN RESULT",
                                            joinedState
                                        );

                                        setPlayerRole(
                                            "NORTH"
                                        );

                                        setRoleResolved(
                                            true
                                        );

                                        setShowRoleSelector(
                                            false
                                        );
                                    } catch (error) {
                                        console.error(
                                            "[SEAT] North seat join failed",
                                            error
                                        );
                                    }
                                }}
                                className="rounded-lg bg-blue-900 px-4 py-2 font-bold text-white transition hover:bg-blue-800"
                            >
                                KUZEY (North)
                            </button>

                            <button
                                onClick={() => {
                                    setPlayerRole(
                                        "EAST"
                                    );

                                    setRoleResolved(
                                        true
                                    );

                                    setShowRoleSelector(
                                        false
                                    );
                                }}
                                className="rounded-lg bg-blue-900 px-4 py-2 font-bold text-white transition hover:bg-blue-800"
                            >
                                DOĞU
                            </button>

                            <button
                                onClick={() => {
                                    setPlayerRole(
                                        "SOUTH"
                                    );

                                    setRoleResolved(
                                        true
                                    );

                                    setShowRoleSelector(
                                        false
                                    );
                                }}
                                className="rounded-lg bg-blue-900 px-4 py-2 font-bold text-white transition hover:bg-blue-800"
                            >
                                GÜNEY (South)
                            </button>

                            <button
                                onClick={() => {
                                    setPlayerRole(
                                        "SPECTATOR"
                                    );

                                    setRoleResolved(
                                        true
                                    );

                                    setShowRoleSelector(
                                        false
                                    );
                                }}
                                className="rounded-lg bg-yellow-700 px-4 py-2 font-bold text-white transition hover:bg-yellow-600"
                            >
                                İZLEYİCİ (Spectator)
                            </button>

                            <button
                                onClick={() => {
                                    setPlayerRole(
                                        "WEST"
                                    );

                                    setRoleResolved(
                                        true
                                    );

                                    setShowRoleSelector(
                                        false
                                    );
                                }}
                                className="rounded-lg bg-blue-900 px-4 py-2 font-bold text-white transition hover:bg-blue-800"
                            >
                                BATI
                            </button>

                        </div>

                        <p className="mt-2 text-center text-sm text-zinc-400">
                            {username
                                ? `Hoş geldin, ${username}!`
                                : "Misafir olarak katıldınız"}
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
                currentUsername={username}
                isHost={isHost}
                rolePending={!roleResolved}
                isAuctionFinished={
                    isAuctionFinished
                }
                onCall={handleCall}
                onUndo={handleUndo}
                onUndoRequest={() =>
                    void handleUndoRequest()
                }
                onApproveUndo={() =>
                    void approveUndoRequest()
                }
                onRejectUndo={() =>
                    void rejectUndoRequest()
                }
                onCancelUndo={() =>
                    void cancelUndoRequest()
                }
                undoRequest={
                    tableState?.undoRequest
                }

                onPlayCard={handlePlayCard}
                newBoardRequest={
                    tableState?.newBoardRequest
                }
                onApproveNewBoardRequest={() =>
                    void approveNewBoardRequest()
                }
                onRejectNewBoardRequest={() =>
                    void rejectNewBoardRequest()
                }
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
                                onClick={() =>
                                    setShowTableOptions(
                                        false
                                    )
                                }
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
                                    if (
                                        !tableState ||
                                        !tableId
                                    ) {
                                        return;
                                    }

                                    const nextState: TableState =
                                    {
                                        ...tableState,
                                        autoPass:
                                            tableState.autoPass ===
                                            false,
                                    };

                                    if (
                                        nextState.autoPass ===
                                        false
                                    ) {
                                        setShowAutoPassInfo(
                                            true
                                        );
                                    }

                                    setTableState(
                                        nextState
                                    );

                                    try {
                                        await supabaseTableCommunication.publishTableState(
                                            tableId,
                                            nextState
                                        );
                                    } catch (error) {
                                        console.error(
                                            "[TABLE OPTIONS] AUTO PASS UPDATE FAILED",
                                            error
                                        );
                                    }
                                }}
                                className={`rounded-lg border px-3 py-1 text-sm font-bold transition ${tableState?.autoPass !==
                                    false
                                    ? "border-green-700 text-green-400 hover:bg-green-950"
                                    : "border-blue-900 text-blue-300 hover:bg-blue-950"
                                    }`}
                            >
                                {tableState?.autoPass !==
                                    false
                                    ? "AÇIK"
                                    : "KAPALI"}
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
                            Boş koltuklarda otomatik PASS
                            verilmez. Sıra boş bir koltuğa
                            geldiğinde Host, o koltuktaki
                            oyuncunun yerine deklare verir.
                        </p>

                        <div className="flex justify-end">

                            <button
                                type="button"
                                onClick={() =>
                                    setShowAutoPassInfo(
                                        false
                                    )
                                }
                                className="rounded-lg border border-blue-900 bg-blue-950 px-4 py-2 font-semibold text-white transition hover:bg-blue-900"
                            >
                                Tamam
                            </button>

                        </div>

                    </div>

                </div>
            )}

            {showHistory && (
                <HistoryPanel
                    tableId={tableId ?? ""}
                    gameType="GAME"
                    isTableParticipant={
                        playerRole !== "SPECTATOR"
                    }
                    isSpectator={
                        playerRole === "SPECTATOR"
                    }
                    onClose={() =>
                        setShowHistory(false)
                    }
                />
            )}
        </div>
    );
}

export default function OyuncuMasaPage() {
    return (
        <Suspense fallback={null}>
            <OyuncuMasaContent />
        </Suspense>
    );
}