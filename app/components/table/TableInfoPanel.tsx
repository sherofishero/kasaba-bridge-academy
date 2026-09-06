"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Bid, Strain } from "../../lib/auction";
import type { Card, Seat } from "../../lib/deck";
import type { Contract, Trick } from "../../lib/play";

type TableInfoPanelProps = {
  boardNumber: number;
  auction: Bid[];
  phase: "auction" | "play" | "completed";
  contract: Contract | null;
  declarer: Seat | null;
  completedTricks: Trick[];
  score?: number | null;
  viewerRole: "LIVE_PLAYER" | "DUMMY" | "SPECTATOR";
};

const strainSymbols: Record<Strain, string> = {
  C: "♣",
  D: "♦",
  H: "♥",
  S: "♠",
  NT: "NT",
};

function formatBid(bid: Bid): string {
  if (bid.type === "PASS") return "Pass";
  if (bid.type === "DOUBLE") return "X";
  if (bid.type === "REDOUBLE") return "XX";
  if (bid.level === undefined || bid.strain === undefined) return "—";
  return `${bid.level}${strainSymbols[bid.strain]}`;
}

function cardText(card: Card): string {
  const suit = { C: "♣", D: "♦", H: "♥", S: "♠" }[card.suit];
  return `${card.rank}${suit}`;
}

function suitClass(card: Card): string {
  return card.suit === "H" || card.suit === "D"
    ? "text-red-600"
    : "text-black";
}

export default function TableInfoPanel({
  boardNumber,
  auction,
  phase,
  contract,
  declarer,
  completedTricks,
  score,
  viewerRole,
}: TableInfoPanelProps) {
  const [popup, setPopup] = useState<"auction" | "tricks" | null>(null);
  const [trickIndex, setTrickIndex] = useState(
    Math.max(0, completedTricks.length - 1)
  );
  const [popupPositions, setPopupPositions] = useState<
    Record<"auction" | "tricks", { x: number; y: number }>
  >({
    auction: { x: 0, y: 0 },
    tricks: { x: 0, y: 0 },
  });
  const dragRef = useRef<{
    popup: "auction" | "tricks";
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTrickIndex(Math.max(0, completedTricks.length - 1));
  }, [completedTricks.length]);

  useEffect(() => {
    if (!popup) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setPopup(null);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [popup]);

  const isPlaying = phase === "play" || phase === "completed";
  const displayedContract = contract
    ? `${contract.level}${strainSymbols[contract.strain]} ${
        declarer ?? ""
      }${contract.redoubled ? " XX" : contract.doubled ? " X" : ""}`
    : "—";
  const currentTrick = completedTricks[trickIndex];
  const canBrowseTricks =
    phase === "completed" || viewerRole !== "LIVE_PLAYER";
  const trickScore = completedTricks.reduce(
    (score, trick) => {
      if (trick.winner === "N" || trick.winner === "S") {
        return { ns: score.ns + 1, ew: score.ew };
      }
      return { ns: score.ns, ew: score.ew + 1 };
    },
    { ns: 0, ew: 0 }
  );

  function startDragging(
    event: ReactPointerEvent<HTMLDivElement>,
    popupName: "auction" | "tricks"
  ) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const position = popupPositions[popupName];
    dragRef.current = {
      popup: popupName,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
  }

  function dragPopup(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    setPopupPositions((positions) => ({
      ...positions,
      [drag.popup]: {
        x: drag.originX + event.clientX - drag.startX,
        y: drag.originY + event.clientY - drag.startY,
      },
    }));
  }

  function stopDragging() {
    dragRef.current = null;
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="pointer-events-auto absolute right-full top-0 mr-3 flex w-[84px] flex-col gap-1 rounded border-4 border-[#331704] bg-green-950 p-1 text-center text-white shadow-xl">
      <InfoBox label="IMP">
        <span className="text-2xl font-black leading-none">{boardNumber}</span>
      </InfoBox>

      {isPlaying ? (
        <>
          <InfoBox label="KONTRAT" onClick={() => setPopup("auction")}>
            <span className="text-[11px] font-black leading-tight">
              {displayedContract}
            </span>
          </InfoBox>
          <InfoBox
            label="LÖVE"
            onClick={() => {
              setTrickIndex(Math.max(0, completedTricks.length - 1));
              setPopup("tricks");
            }}
          >
            <div className="space-y-0.5 text-[10px] font-black leading-tight">
              <div className="flex justify-between gap-1">
                <span>N/S</span>
                <span>{trickScore.ns}</span>
              </div>
              <div className="flex justify-between gap-1">
                <span>E/W</span>
                <span>{trickScore.ew}</span>
              </div>
            </div>
          </InfoBox>
          <InfoBox label="SKOR">
            <span className="text-[11px] font-black">
              {score == null ? "—" : score}
            </span>
          </InfoBox>
        </>
      ) : (
        <InfoBox label="DEKLARASYON" onClick={() => setPopup("auction")}>
          <div className="max-h-32 space-y-0.5 overflow-y-auto text-[11px] font-bold">
            {auction.length === 0 ? (
              <span>—</span>
            ) : (
              auction.map((bid, index) => (
                <div key={`${bid.seat}-${index}`}>{formatBid(bid)}</div>
              ))
            )}
          </div>
        </InfoBox>
      )}

      </div>

      {popup && (
        <div
          ref={popupRef}
          style={{
            transform: `translate(-50%, -50%) translate(${popupPositions[popup].x}px, ${popupPositions[popup].y}px)`,
          }}
          className="pointer-events-auto absolute left-1/2 top-1/2 z-[80] w-64 rounded-lg border-4 border-[#331704] bg-white p-3 text-zinc-900 shadow-2xl"
        >
          <div
            onPointerDown={(event) => startDragging(event, popup)}
            onPointerMove={dragPopup}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            className="mb-2 cursor-move touch-none text-center text-xs font-black text-yellow-700"
          >
          {popup === "auction" ? (
            <h2 className="text-sm">DEKLARASYON</h2>
          ) : (
            <h2 className="text-sm">
              LÖVE {completedTricks.length ? trickIndex + 1 : 0}
            </h2>
          )}
          </div>
          {popup === "auction" ? (
            <>
              <div className="grid grid-cols-4 gap-1 text-center text-xs">
                {(["N", "E", "S", "W"] as Seat[]).map((seat) => (
                  <span key={seat} className="font-black text-yellow-300">
                    {seat === "N" ? "B" : seat === "E" ? "K" : seat === "S" ? "D" : "G"}
                  </span>
                ))}
                {auction.map((bid, index) => (
                  <span key={`${bid.seat}-popup-${index}`} className="rounded bg-yellow-100 px-1 py-0.5 text-black">
                    {formatBid(bid)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="relative mx-auto h-28 w-44 text-sm font-black">
                {(["N", "E", "S", "W"] as Seat[]).map((seat) => {
                  const played = currentTrick?.cards.find(
                    (card) => card.seat === seat
                  );
                  const position =
                    seat === "N"
                      ? "left-1/2 top-0 -translate-x-1/2"
                      : seat === "S"
                        ? "bottom-0 left-1/2 -translate-x-1/2"
                        : seat === "E"
                          ? "right-0 top-1/2 -translate-y-1/2"
                          : "left-0 top-1/2 -translate-y-1/2";
                  return (
                    <span
                      key={seat}
                      className={`absolute ${position} ${played ? suitClass(played.card) : "text-zinc-500"}`}
                    >
                      {played ? cardText(played.card) : "—"}
                    </span>
                  );
                })}
              </div>
              {canBrowseTricks && (
                <div className="mt-2 flex justify-between">
                  <button
                    type="button"
                    disabled={trickIndex <= 0}
                    onClick={() => setTrickIndex((value) => value - 1)}
                    className="rounded bg-white px-2 py-1 text-xs font-bold text-black disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    disabled={trickIndex >= completedTricks.length - 1}
                    onClick={() => setTrickIndex((value) => value + 1)}
                    className="rounded bg-white px-2 py-1 text-xs font-bold text-black disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function InfoBox({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const className =
    "rounded border border-yellow-700 bg-yellow-200 p-1 text-black";
  return onClick ? (
    <button type="button" onClick={onClick} className={className}>
      <div className="text-[8px] font-black leading-none">{label}</div>
      <div className="mt-1">{children}</div>
    </button>
  ) : (
    <div className={className}>
      <div className="text-[8px] font-black leading-none">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
