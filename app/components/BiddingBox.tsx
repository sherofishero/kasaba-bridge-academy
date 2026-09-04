"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Bid,
  canDouble,
  canRedouble,
  isLegalBid,
  auctionFinished,
} from "../lib/auction";

type BiddingBoxProps = {
  auction: Bid[];
  setAuction: React.Dispatch<React.SetStateAction<Bid[]>>;
  turn: "N" | "E" | "S" | "W";
  setTurn: React.Dispatch<
    React.SetStateAction<"N" | "E" | "S" | "W">
  >;
  playerSeat: "N" | "E" | "S" | "W" | null;
  isHost?: boolean;
  isTurnSeatEmpty?: boolean;
  canHostBidForEmptySeat?: boolean;
  onCall?: (call: Bid) => void;
};

const levels = [1, 2, 3, 4, 5, 6, 7] as const;

const strains = [
  {
    code: "C",
    label: "♣",
    color: "bg-green-700 hover:bg-green-600",
  },
  {
    code: "D",
    label: "♦",
    color: "bg-yellow-600 hover:bg-yellow-500",
  },
  {
    code: "H",
    label: "♥",
    color: "bg-red-700 hover:bg-red-600",
  },
  {
    code: "S",
    label: "♠",
    color: "bg-gray-700 hover:bg-gray-600",
  },
  {
    code: "NT",
    label: "NT",
    color: "bg-sky-700 hover:bg-sky-600",
  },
] as const;

type BidStrain = (typeof strains)[number]["code"];

type Seat = "N" | "E" | "S" | "W";

function nextSeat(seat: Seat): Seat {
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

function getMobileDisplayLevel(
  auction: Bid[]
): (typeof levels)[number] {
  const lastBid = [...auction]
    .reverse()
    .find((call) => call.type === "BID");

  if (
    !lastBid ||
    lastBid.level === undefined ||
    lastBid.strain === undefined
  ) {
    return 1;
  }

  const lastLevel = lastBid.level;

  const strainIndex = strains.findIndex(
    (strain) => strain.code === lastBid.strain
  );

  if (strainIndex === -1) {
    return lastLevel as (typeof levels)[number];
  }

  /*
   * Aynı seviyede daha yüksek bir strain varsa
   * aynı seviye gösterilir.
   *
   * Örnek:
   * 2♠ → 2. seviye
   * 2NT → 3. seviye
   */
  if (strainIndex < strains.length - 1) {
    return lastLevel as (typeof levels)[number];
  }

  return Math.min(
    lastLevel + 1,
    7
  ) as (typeof levels)[number];
}

export default function BiddingBox({
  auction,
  setAuction,
  turn,
  setTurn,
  playerSeat,
  canHostBidForEmptySeat,
  onCall,
}: BiddingBoxProps) {
  const isMyTurn =
    (playerSeat === turn || canHostBidForEmptySeat === true) &&
    !auctionFinished(auction);

  const [position, setPosition] = useState({
    x: 0,
    y: 0,
  });

  const [dragging, setDragging] = useState(false);

  const dragStart = useRef({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  const mobileDisplayLevel =
    getMobileDisplayLevel(auction);

  function nextTurn() {
    setTurn(nextSeat(turn));
  }

  function submitCall(call: Bid) {
    if (!isMyTurn) return;

    if (onCall) {
      onCall(call);
      return;
    }

    setAuction([...auction, call]);
    nextTurn();
  }

  function addBid(
    level: (typeof levels)[number],
    strain: BidStrain
  ) {
    submitCall({
      seat: turn,
      type: "BID",
      level,
      strain,
    });
  }

  function handleBid(
    level: (typeof levels)[number],
    strain: BidStrain
  ) {
    if (!isLegalBid(auction, level, strain)) return;

    addBid(level, strain);
  }

  function addPass() {
    submitCall({
      seat: turn,
      type: "PASS",
    });
  }

  function addDouble() {
    if (!canDouble(auction, turn)) return;

    submitCall({
      seat: turn,
      type: "DOUBLE",
    });
  }

  function addRedouble() {
    if (!canRedouble(auction, turn)) return;

    submitCall({
      seat: turn,
      type: "REDOUBLE",
    });
  }

  function startDrag(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setDragging(true);

    dragStart.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      startX: position.x,
      startY: position.y,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  }

  function drag(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    if (!dragging) return;

    const deltaX =
      event.clientX - dragStart.current.mouseX;

    const deltaY =
      event.clientY - dragStart.current.mouseY;

    setPosition({
      x: dragStart.current.startX + deltaX,
      y: dragStart.current.startY + deltaY,
    });
  }

  function stopDrag(
    event: React.PointerEvent<HTMLDivElement>
  ) {
    setDragging(false);

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  }

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (
      event: PointerEvent
    ) => {
      const deltaX =
        event.clientX - dragStart.current.mouseX;

      const deltaY =
        event.clientY - dragStart.current.mouseY;

      setPosition({
        x: dragStart.current.startX + deltaX,
        y: dragStart.current.startY + deltaY,
      });
    };

    const handlePointerUp = () => {
      setDragging(false);
    };

    window.addEventListener(
      "pointermove",
      handlePointerMove
    );

    window.addEventListener(
      "pointerup",
      handlePointerUp
    );

    return () => {
      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      window.removeEventListener(
        "pointerup",
        handlePointerUp
      );
    };
  }, [dragging]);

  if (!isMyTurn) {
    return null;
  }

  return (
    <div
      className="fixed left-4 top-12 z-50 w-[240px] rounded-xl border border-red-700 bg-zinc-900 p-2 shadow-xl"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      {/* SÜRÜKLEME ALANI */}
      <div
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={stopDrag}
        className={`mb-2 flex h-5 cursor-grab items-center justify-center rounded bg-zinc-800 text-[10px] font-bold tracking-widest text-zinc-500 select-none ${
          dragging ? "cursor-grabbing" : ""
        }`}
        title="Bidding Box'ı sürüklemek için tut"
      >
        • • •
      </div>

      {/* MOBİL: SADECE GEREKLİ SEVİYE */}
      <div className="block md:hidden">
        <div className="mb-1 grid grid-cols-5 gap-1">
          {strains.map((strain) => {
            const legal = isLegalBid(
              auction,
              mobileDisplayLevel,
              strain.code
            );

            return (
              <button
                key={`${mobileDisplayLevel}-${strain.code}`}
                onClick={() =>
                  handleBid(
                    mobileDisplayLevel,
                    strain.code
                  )
                }
                disabled={!legal}
                className={`rounded py-1 text-sm font-bold text-white transition ${
                  legal
                    ? strain.color
                    : "cursor-not-allowed bg-zinc-800 opacity-40"
                }`}
              >
                {mobileDisplayLevel}
                {strain.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* WEB: TÜM SEVİYELER + SCROLL */}
      <div className="hidden md:block max-h-52 overflow-y-auto pr-1">
        {levels.map((level) => (
          <div
            key={level}
            className="mb-1 grid grid-cols-5 gap-1 last:mb-0"
          >
            {strains.map((strain) => {
              const legal = isLegalBid(
                auction,
                level,
                strain.code
              );

              return (
                <button
                  key={`${level}-${strain.code}`}
                  onClick={() =>
                    handleBid(level, strain.code)
                  }
                  disabled={!legal}
                  className={`rounded py-1 text-sm font-bold text-white transition ${
                    legal
                      ? strain.color
                      : "cursor-not-allowed bg-zinc-800 opacity-40"
                  }`}
                >
                  {level}
                  {strain.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* PASS / ALERT / X / XX */}
      <div className="mt-1 grid grid-cols-2 gap-1">
        <button
          onClick={addPass}
          className="rounded bg-zinc-700 py-1 text-sm font-bold text-white hover:bg-zinc-600"
        >
          PASS
        </button>

        <button className="rounded bg-yellow-600 py-1 text-sm font-bold text-black hover:bg-yellow-500">
          ALERT
        </button>

        <button
          disabled={!canDouble(auction, turn)}
          onClick={addDouble}
          className={`rounded py-1 text-sm font-bold text-white transition ${
            canDouble(auction, turn)
              ? "bg-red-700 hover:bg-red-600"
              : "cursor-not-allowed bg-red-900 opacity-40"
          }`}
        >
          X
        </button>

        <button
          onClick={addRedouble}
          disabled={!canRedouble(auction, turn)}
          className={`rounded py-1 text-sm font-bold text-white transition ${
            canRedouble(auction, turn)
              ? "bg-blue-700 hover:bg-blue-600"
              : "cursor-not-allowed bg-blue-900 opacity-40"
          }`}
        >
          XX
        </button>
      </div>
    </div>
  );
}