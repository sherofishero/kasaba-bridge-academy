"use client";

type BridgeTableProps = {
  tableNumber: string;
  northLabel: string;
  southLabel: string;
  eastLabel: string;
  westLabel: string;
  onNorth: () => void;
  onSouth: () => void;
  onEast: () => void;
  onWest: () => void;
  onEnter: () => void;
};

export default function BridgeTable({
  tableNumber,
  northLabel,
  southLabel,
  eastLabel,
  westLabel,
  onNorth,
  onSouth,
  onEast,
  onWest,
  onEnter,
}: BridgeTableProps) {
  return (
    <div className="relative h-[420px] w-[380px] rounded-3xl -[#0b0b0b] shadow-2xl">
      {/* Header */}
      <div className="flex h-16 items-center justify-center">
        <h2 className="text-2xl font-bold tracking-wide text-yellow-400">
          MASA {tableNumber}
        </h2>
      </div>

      {/* Table */}
      <div className="relative h-[270px] px-4">
        <div className="relative h-full rounded-[90px] border-2 border-yellow-600 bg-green-800 shadow-inner">
          {/* North */}
          <button
            onClick={onNorth}
            className="absolute left-1/2 top-4 -translate-x-1/2 rounded-xl border-2 border-yellow-600 bg-[#111111] px-8 py-3 text-xl font-bold text-yellow-400 transition hover:bg-[#1b1b1b]"
          >
            <div className="flex flex-col items-center leading-none">
            <span className="text-xs text-yellow-500">N</span>
            <span>OTUR</span>
          </div>
          </button>

          {/* West */}
          <button
            onClick={onWest}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-xl border-2 border-yellow-600 bg-[#111111] px-7 py-3 text-xl font-bold text-yellow-400 transition hover:bg-[#1b1b1b]"
          >
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs text-yellow-500">W</span>
              <span>OTUR</span>
            </div>
          </button>

          {/* East */}
          <button
            onClick={onEast}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl border-2 border-yellow-600 bg-[#111111] px-7 py-3 text-xl font-bold text-yellow-400 transition hover:bg-[#1b1b1b]"
          >
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs text-yellow-500">E</span>
              <span>OTUR</span>
            </div>
          </button>

          {/* South */}
          <button
            onClick={onSouth}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-xl border-2 border-yellow-600 bg-[#111111] px-8 py-3 text-xl font-bold text-yellow-400 transition hover:bg-[#1b1b1b]"
          >
            <div className="flex flex-col items-center leading-none">
              <span className="text-xs text-yellow-500">S</span>
              <span>OTUR</span>
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="flex h-[80px] items-center justify-center">
        <button
          onClick={onEnter}
          className="rounded-xl border border-zinc-600 bg-[#111111] px-12 py-3 text-2xl font-bold text-white transition hover:bg-[#1b1b1b]"
        >
          MASAYA GİR
        </button>
      </div>
    </div>
  );
}