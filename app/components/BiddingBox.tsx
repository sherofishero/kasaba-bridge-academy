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

export default function BiddingBox({
  auction,
  setAuction,
  turn,
  setTurn,
  playerSeat,
  isHost,
  isTurnSeatEmpty,
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

  function nextTurn() {
    switch (turn) {
      case "N":
        setTurn("E");
        break;

      case "E":
        setTurn("S");
        break;

      case "S":
        setTurn("W");
        break;

      case "W":
        setTurn("N");
        break;
    }
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

  function handleUndo() {
    if (auction.length === 0) return;

    const nextAuction = auction.slice(0, -1);
    setAuction(nextAuction);

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

    event.currentTarget.setPointerCapture(event.pointerId);
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

    const handlePointerMove = (event: PointerEvent) => {
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
    className="relative w-[240px] rounded-xl border border-red-700 bg-zinc-900 p-2 shadow-xl"
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

      {/* Dikey Kaydırılabilir (Scroll) Sabit Yükseklik Alanı */}
      <div className="max-h-52 overflow-y-auto pr-1">
        {levels.map((level) => (
          <div
            key={level}
            className="grid grid-cols-5 gap-1 mb-1 last:mb-0"
          >
            {strains.map((strain) => (
              <button
                key={`${level}-${strain.code}`}
                onClick={() =>
                  handleBid(level, strain.code)
                }
                disabled={
                  !isLegalBid(
                    auction,
                    level,
                    strain.code
                  )
                }
                className={`rounded py-1 text-sm font-bold text-white transition ${
                  isLegalBid(
                    auction,
                    level,
                    strain.code
                  )
                    ? strain.color
                    : "cursor-not-allowed bg-zinc-800 opacity-40"
                }`}
              >
                {level}
                {strain.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1">
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

        <button className="rounded bg-orange-700 py-1 text-sm font-bold text-white hover:bg-orange-600 col-span-2">
          STOP
        </button>
      </div>

      <div className="mt-2 text-center text-sm font-semibold text-yellow-300">
        Sıra: {turn}
      </div>
    </div>
  );
}