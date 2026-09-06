"use client";

import Link from "next/link";
import Hand from "./Hand";
import SuitHand from "./SuitHand";
import CardFace from "./Card";
import Auction from "./Auction";
import BiddingBox from "./BiddingBox";
import Image from "next/image";
import {
  Deal,
  type Card as BridgeCard,
  createDeck,
  shuffleDeck,
  dealHands,
} from "../lib/deck";
import { Bid, Seat } from "../lib/auction";
import type { TableState } from "../lib/game";
import { useEffect } from "react";
import TableInfoPanel from "./table/TableInfoPanel";

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
  isNormalGameTable?: boolean;
  /* Rol henüz async olarak çözümlenmediyse true: tüm eller
    HiddenHand/HiddenSuitHand ile gösterilir (refresh flaşı önlenir). */
  rolePending?: boolean;
  isAuctionFinished?: boolean;
  onCall?: (call: Bid) => void;
  onUndo?: () => void;
  onUndoRequest?: () => void;
  onApproveUndo?: () => void;
  onRejectUndo?: () => void;
  onCancelUndo?: () => void;
  undoRequest?: TableState["undoRequest"];
  currentUsername?: string | null;
  onPlayCard?: (card: BridgeCard, seat: Seat) => void;
  boardResult?: {
    contract: string;
    declarer: Seat;
    result: string;
    score: number;
    scoringSide: "NS" | "EW";
  } | null;
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
  isNormalGameTable = false,
  rolePending = false,
  isAuctionFinished = false,
  onCall,
  onUndo,
  onUndoRequest,
  onApproveUndo,
  onRejectUndo,
  onCancelUndo,
  undoRequest,
  currentUsername = null,
  onPlayCard,
  boardResult,
  newBoardRequest,
  onApproveNewBoardRequest,
  onRejectNewBoardRequest,
}: TableProps) {
  /* Kullanıcının kendi koltuğu (SPECTATOR ise null). Kart oynama
    aşamasında kendi elini tıklayarak oynaması için gereklidir. */
  const playerSeat: Seat | null =
    playerRole === "NORTH"
      ? "N"
      : playerRole === "EAST"
        ? "E"
        : playerRole === "SOUTH"
          ? "S"
          : playerRole === "WEST"
            ? "W"
            : null;

  function undo() {
    /*
     * UNDO BUTONU — TEK AKIŞ: hem DEKLARASYON hem KART OYNAMA aşamasında
     * (açılış atağı dahil) buton rakip onayına sunulan bir UNDO TALEBİ
     * açar. Kart oynama aşamasında buton KESİNLİKLE auction-undo /
     * BiddingBox akışına düşmez; geçerlilik kontrolü sayfada yapılır.
     */
    if (onUndoRequest) {
      onUndoRequest();
      return;
    }

    /* Eski fallback (onUndoRequest verilmeyen sayfalar için). */
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

  /* =========================================================
   * FİZİKSEL KONUM -> GERÇEK KOLTUK (Seat) EŞLEMESİ
   *
   * Ekrandaki top/bottom/left/right konumlarının hangi GERÇEK
   * koltuğa (N/E/S/W) karşılık geldiği. Görünürlük kararı bu Seat
   * değerlerine göre verilir (kart dizisi referansına göre DEĞİL).
   *
   * Kartların hangi fiziksel konumda çizileceği (topCards vb.)
   * DEĞİŞMEZ; yalnızca açık/kapalı kararı Seat üzerinden yapılır.
   * ========================================================= */
  let bottomSeat: Seat = "S";
  let topSeat: Seat = "N";
  let leftSeat: Seat = "E";
  let rightSeat: Seat = "W";

  switch (playerRole) {
    case "NORTH":
      bottomSeat = "N";
      topSeat = "S";
      leftSeat = "E";
      rightSeat = "W";
      break;

    case "SOUTH":
      bottomSeat = "S";
      topSeat = "N";
      leftSeat = "W";
      rightSeat = "E";
      break;

    case "EAST":
      bottomSeat = "E";
      topSeat = "W";
      leftSeat = "S";
      rightSeat = "N";
      break;

    case "WEST":
      bottomSeat = "W";
      topSeat = "E";
      leftSeat = "N";
      rightSeat = "S";
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

  const isTurnSeatEmpty =
    turn === "N"
      ? !tableState?.northPlayer
      : turn === "E"
        ? !tableState?.eastPlayer
        : turn === "S"
          ? !tableState?.southPlayer
          : !tableState?.westPlayer;

  const canHostBidForEmptySeat =
    !isNormalGameTable && isHost === true && isTurnSeatEmpty;
  /* Rol çözümlenmeden hiçbir el açık gösterilmez (refresh flaşı önlenir). */

  /*
   * DUMMY görünürlük kuralı: dummy ancak atak (opening lead) YAPILDIKTAN
   * sonra açılır. gamePhase === "play" tek başına yeterli DEĞİLDİR; ilk
   * atak kartı oynanmadan (currentTrick boşken) hiçbir rakip/partner eli
   * açılmaz. Bu sayede ihale bitiminde "4 el birden açılma" hatası giderilir.
   */
  const openingLeadMade =
    (tableState?.currentTrick?.length ?? 0) > 0 ||
    (tableState?.completedTricks?.length ?? 0) > 0;
  const dummyOpen =
    tableState?.gamePhase === "play" && openingLeadMade;
  const dummySeat: Seat | null = tableState?.dummy ?? null;
  const declarerSeat: Seat | null = tableState?.declarer ?? null;

  /* Masada (merkezde) gösterilecek oynanan kartlar kamera. */

  const displayTrickCards =
    (tableState?.currentTrick?.length ?? 0) > 0
      ? tableState?.currentTrick ?? []
      : (tableState?.completedTricks?.length ?? 0) > 0
        ? (tableState?.completedTricks ?? [])[
          (tableState?.completedTricks?.length ?? 0) - 1
        ]?.cards ?? []
        : [];

  /* Oynanan bir GERÇEK koltuğun kartını bu bakış açısında hangi FİZİKSEL
   * konumda (üst/alt/sol/sağ) göstereceğimizi döndürür. */
  function cardScreenPosition(
    seat: Seat
  ): "top" | "bottom" | "left" | "right" {
    if (seat === topSeat) return "top";
    if (seat === bottomSeat) return "bottom";
    if (seat === leftSeat) return "left";
    return "right";
  }

  /*
   * Bir GERÇEK koltuğun eli bu bakış açısında açık yüz gösterilmeli mi?
   * (kart dizisi referansı kullanılmaz; yalnızca Seat değerlerine bakılır)
   *
   *  - Spectator    : dört eli de görür.
   *  - Oyuncu       : kendi (playerSeat) elini her zaman görür.
   *  - dummyOpen    : dummy koltuk yalnızca atak yapıldıktan sonra açılır.
   *  - Partner      : dummy oyuncusu, declarer (ortağı) elini de görür.
   *  - Rakipler     : declarer'ın elini asla görmez.
   */
  function isSeatFaceUp(seat: Seat): boolean {
    if (isSpectator) {
      return true;
    }
    if (seat === playerSeat) {
      return true;
    }
    if (dummyOpen && seat === dummySeat) {
      return true;
    }
    if (dummyOpen && playerSeat === dummySeat && seat === declarerSeat) {
      return true;
    }
    return false;
  }

  const hideTop = rolePending || !isSeatFaceUp(topSeat);
  const hideBottom = rolePending;

  /* Bu seat elinden kart oynayabilir miyim?
 * - Kendi koltuğum, sıra bende iken oynarım.
 * - Declarer isem dummy elini de oynayabilirim.
 * - Sırası olmayan hiçbir oyuncu hiçbir elden oynayamaz.
 */
  const canPlayHand = (seat: Seat): boolean => {
    if (isSpectator) return false;
    if (tableState?.gamePhase !== "play") return false;
    if (tableState.playTurn !== seat) return false;  /* Sıra bu elin üstünde olmalı. */
    if (seat === tableState.dummy) {
      return playerSeat === tableState.declarer;
    }
    if (seat === playerSeat) return true;             /* Kendi elim. */
    return false;
  };

  const isMyPlayTurn = playerSeat !== null && canPlayHand(playerSeat);
  const isMyDummyPlayTurn = canPlayHand(topSeat);


  console.log("[PLAY DEBUG] TURN CHECK", {
    isSpectator,
    playerSeat,
    gamePhase: tableState?.gamePhase,
    playTurn: tableState?.playTurn,
    isMyPlayTurn: isMyPlayTurn,
    isMyDummyPlayTurn,
  });
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-900">

      {/* MASA */}
      <div className="absolute left-[48%] top-[36%] -translate-x-1/2 -translate-y-1/2">
        <div
          id="kasaba-table-root"
          className="relative w-[800px] h-[460px] origin-center scale-[0.42] min-[420px]:scale-[0.5] sm:scale-[0.65] md:scale-[0.8] lg:scale-[0.85] rounded-[28px] bg-[var(--kasaba-table-felt)] border-16 border-[#331704] shadow-2xl">
        <TableInfoPanel
          boardNumber={tableState?.boardNumber ?? 1}
          auction={tableState?.currentAuction ?? auction}
          phase={tableState?.gamePhase ?? "auction"}
          contract={tableState?.contract ?? null}
          declarer={tableState?.declarer ?? null}
          completedTricks={tableState?.completedTricks ?? []}
          score={boardResult?.score ?? null}
          viewerRole={
            isSpectator
              ? "SPECTATOR"
              : playerSeat === tableState?.dummy
                ? "DUMMY"
                : "LIVE_PLAYER"
          }
        />

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
              <div className="-translate-y-1">
                <Hand
                  cards={topCards}
                  direction="horizontal"
                  onCardClick={
                    isMyDummyPlayTurn
                      ? (card) => onPlayCard?.(card, topSeat)
                      : undefined
                  }
                />
              </div>
            )}
          </div>

          {/* BOTTOM */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
            {hideBottom ? (
              <HiddenHand />
            ) : (
              <div className="translate-y-2">
                <Hand
                  cards={bottomCards}
                  direction="horizontal"
                  onCardClick={
                    isMyPlayTurn
                      ? (card) => onPlayCard?.(card, bottomSeat)
                      : undefined
                  }
                />
              </div>
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

          {/* BATI (ekranın SOL tarafı) */}
          <div className="absolute left-8 top-[48%] -translate-y-1/3">
            {rolePending ? (
              <div className="-translate-y-6">
                <HiddenSuitHand />
              </div>
            ) : isSeatFaceUp(leftSeat) ? (
              <div className="-translate-x-8 -translate-y-6 scale-[0.95]">
                <SuitHand cards={leftCards} />
              </div>
            ) : (
              <div className="-translate-y-6">
                <HiddenSuitHand />
              </div>
            )}
          </div>

          {/* DOĞU (ekranın SAĞ tarafı) */}
          <div className="absolute right-8 top-[48%] -translate-y-1/2">
            {rolePending ? (
              <div className="translate-y-1">
                <HiddenSuitHand />
              </div>
            ) : isSeatFaceUp(rightSeat) ? (
              <div className="translate-x-8 translate-y-2 scale-[0.95]">
                <SuitHand cards={rightCards} />
              </div>
            ) : (
              <div className="translate-y-1">
                <HiddenSuitHand />
              </div>
            )}
          </div>

          {/* BOARD SONUCU */}
          {boardResult && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
              <div className="rounded-xl border-2 border-yellow-500 bg-white px-8 py-5 text-center text-zinc-900 shadow-2xl">
                <div className="text-2xl font-bold">
                  {boardResult.contract}{" "}
                  {boardResult.declarer}{" "}
                  {boardResult.result}
                </div>

                <div className="mt-2 text-xl font-semibold text-yellow-700">
                  {boardResult.scoringSide}{" "}
                  {Math.abs(boardResult.score)}
                </div>
              </div>
            </div>
          )}

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

          {/* UNDO TALEBİ KUTUSU (DEKLARASYON + KART OYNAMA) */}
          {undoRequest &&
            (() => {
              const seatLabels: Record<Seat, string> = {
                N: "North",
                E: "East",
                S: "South",
                W: "West",
              };

              const requesterLabel = seatLabels[undoRequest.requestedSeat];

              /* Gerçek insan onaycılar: dummy hariç partnership rakipleri. */
              const opponentSeats: Seat[] = (
                undoRequest.requestedSeat === "N" ||
                  undoRequest.requestedSeat === "S"
                  ? (["E", "W"] as Seat[])
                  : (["N", "S"] as Seat[])
              ).filter((s) => s !== dummySeat);

              const isResponder =
                playerSeat !== null &&
                opponentSeats.includes(playerSeat);

              const isRequester =
                currentUsername !== null &&
                undoRequest.requestedBy === currentUsername;

              const isRejected = undoRequest.rejections.length > 0;

              /* Reddedilmiş talep: kimseye Onayla/Reddet gösterilmez. */
              if (isRejected) {
                return (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35">
                    <div className="rounded-lg border border-red-600 bg-red-900/90 p-4 shadow-2xl">
                      <div className="font-semibold text-red-300">
                        {requesterLabel}: Lütfen geri alabilir miyim?
                      </div>
                      <div className="mt-1 text-sm text-red-100">
                        {isRequester
                          ? "Talebiniz rakipler tarafından reddedildi."
                          : "Undo talebi reddedildi."}
                      </div>

                      {isRequester && (
                        <div className="mt-3 flex justify-center">
                          <button
                            onClick={() => {
                              onCancelUndo?.();
                            }}
                            className="rounded bg-zinc-700 px-3 py-1 text-white hover:bg-zinc-600"
                          >
                            Kapat
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              /* Rakiplerin ekranı: talebi kimin gönderdiği açıkça görünür. */
              if (isResponder) {
                return (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35">
                    <div className="rounded-lg border border-yellow-600 bg-yellow-900/90 p-4 shadow-2xl">
                      <div className="font-semibold text-yellow-300">
                        {requesterLabel}: Lütfen geri alabilir miyim?
                      </div>
                      <div className="mt-1 text-sm text-yellow-100">
                        Son hamle geri alınacak. Onaylıyor musunuz?
                      </div>

                      <div className="mt-3 flex justify-center gap-2">
                        <button
                          onClick={() => {
                            onApproveUndo?.();
                          }}
                          className="rounded bg-green-700 px-3 py-1 text-white hover:bg-green-600"
                        >
                          Onayla
                        </button>

                        <button
                          onClick={() => {
                            onRejectUndo?.();
                          }}
                          className="rounded bg-red-700 px-3 py-1 text-white hover:bg-red-600"
                        >
                          Reddet
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              /* Talep eden + diğer oyuncular/spectatorlar: bekleme ekranı. */
              return (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35">
                  <div className="rounded-lg border border-yellow-600 bg-yellow-900/90 p-4 shadow-2xl">
                    <div className="font-semibold text-yellow-300">
                      {requesterLabel}: Lütfen geri alabilir miyim?
                    </div>
                    <div className="mt-1 text-sm text-yellow-100">
                      {isRequester
                        ? "Talebiniz rakiplerin onayına sunuldu, beklemede."
                        : "Undo talebi rakiplerin onayında."}
                    </div>
                    <div className="mt-1 text-sm text-yellow-100">
                      Onaylar: {undoRequest.approvals.length}/{opponentSeats.length}
                    </div>

                    {isRequester && (
                      <div className="mt-3 flex justify-center">
                        <button
                          onClick={() => {
                            onCancelUndo?.();
                          }}
                          className="rounded bg-red-700 px-3 py-1 text-white hover:bg-red-600"
                        >
                          İptal Et
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          {/* AUCTION / OYNANAN KARTLAR - MASA MERKEZİ */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {/* Oyun fazına geçince Auction kutusu masadan kalkar (AŞAMA 1).}
             * Merkezde oynanan kartlar görünür: N yukarı, E sağa,
             * S aşağı, W sola; merkeze yakın, hafif örtüşerek. */}
            {(tableState?.gamePhase === "play" && openingLeadMade) ||
              tableState?.gamePhase === "completed" ? (
              <div className="relative w-[220px] h-[150px]">
                {displayTrickCards.map((pc, i) => (
                  <div
                    key={`${pc.seat}-${i}`}
                    className={`absolute z-10 ${cardScreenPosition(pc.seat) === "top"
                      ? "left-1/2 -translate-x-1/2 top-3"
                      : cardScreenPosition(pc.seat) === "bottom"
                        ? "left-1/2 -translate-x-1/2 bottom-3"
                        : cardScreenPosition(pc.seat) === "left"
                          ? "top-1/2 -translate-y-1/2 left-3"
                          : "top-1/2 -translate-y-1/2 right-3"
                      }`}
                  >
                    <CardFace card={pc.card} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="scale-[0.95]">
                  <Auction
                    auction={auction}
                    turn={turn}
                    openingLeader={tableState?.openingLeader ?? null}
                  />
                </div>
              </div>
            )}
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