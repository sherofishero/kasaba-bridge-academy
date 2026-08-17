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
  const northEmpty = northLabel === "OTUR";
  const southEmpty = southLabel === "OTUR";
  const eastEmpty = eastLabel === "OTUR";
  const westEmpty = westLabel === "OTUR";

  const emptyButton =
    "flex items-center justify-center rounded-md border-2 border-red-600 bg-black px-2 py-1 text-sm font-bold text-yellow-300 shadow-[0_0_8px_rgba(255,0,0,0.35)] transition hover:bg-red-950";

  return (
    <div className="relative w-full">

      {/* Masa numarası */}
      <div className="mb-2 text-center">
        <h2 className="text-xl font-bold tracking-[0.12em] text-yellow-400">
          MASA {tableNumber}
        </h2>
      </div>

      {/* Masa görseli */}
      <div className="relative aspect-[16/10] w-full overflow-visible">

        <img
          src="/masa.png"
          alt={`Kasaba Bridge Hub Masa ${tableNumber}`}
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* KUZEY */}
        {northEmpty ? (
          <button
            type="button"
            onClick={onNorth}
            aria-label="Kuzey koltuğuna otur"
            className={`absolute left-1/2 top-0 z-10 h-[30px] w-[72px] -translate-x-1/2 cursor-pointer ${emptyButton}`}
          >
            OTUR
          </button>
        ) : (
          <div className="absolute left-1/2 top-0 z-10 flex h-[30px] w-[72px] -translate-x-1/2 items-center justify-center text-sm font-bold text-cyan-300">
            {northLabel}
          </div>
        )}

        {/* BATI */}
        {westEmpty ? (
          <button
            type="button"
            onClick={onWest}
            aria-label="Batı koltuğuna otur"
            className={`absolute left-[8%] top-[44%] z-10 h-[72px] w-[30px] -translate-y-1/2 cursor-pointer ${emptyButton}`}
          >
            <span className="-rotate-90 whitespace-nowrap">
              OTUR
            </span>
          </button>
        ) : (
          <div className="absolute left-[8%] top-[44%] z-10 flex h-[72px] w-[30px] -translate-y-1/2 items-center justify-center text-sm font-bold text-cyan-300">
            <span className="-rotate-90 whitespace-nowrap">
              {westLabel}
            </span>
          </div>
        )}

        {/* DOĞU */}
        {eastEmpty ? (
          <button
            type="button"
            onClick={onEast}
            aria-label="Doğu koltuğuna otur"
            className={`absolute right-[8%] top-[44%] z-10 h-[72px] w-[30px] -translate-y-1/2 cursor-pointer ${emptyButton}`}
          >
            <span className="rotate-90 whitespace-nowrap">
              OTUR
            </span>
          </button>
        ) : (
          <div className="absolute right-[8%] top-[44%] z-10 flex h-[72px] w-[30px] -translate-y-1/2 items-center justify-center text-sm font-bold text-cyan-300">
            <span className="rotate-90 whitespace-nowrap">
              {eastLabel}
            </span>
          </div>
        )}

        {/* GÜNEY */}
        {southEmpty ? (
          <button
            type="button"
            onClick={onSouth}
            aria-label="Güney koltuğuna otur"
            className={`absolute bottom-[6%] left-1/2 z-10 h-[30px] w-[72px] -translate-x-1/2 cursor-pointer ${emptyButton}`}
          >
            OTUR
          </button>
        ) : (
          <div className="absolute bottom-[6%] left-1/2 z-10 flex h-[30px] w-[72px] -translate-x-1/2 items-center justify-center text-sm font-bold text-cyan-300">
            {southLabel}
          </div>
        )}

        {/* MASAYA GİR */}
        <button
          type="button"
          onClick={onEnter}
          aria-label="Masaya gir"
          className="absolute left-1/2 top-[42%] z-10 h-[30px] w-[72px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-md border-2 border-red-600 bg-black text-xs font-bold text-yellow-300 shadow-[0_0_8px_rgba(255,0,0,0.35)] transition hover:bg-red-950"        >
          MASAYA GİR
        </button>

      </div>
    </div>
  );
}