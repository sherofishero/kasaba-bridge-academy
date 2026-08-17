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

  /*
   * Bütün koltuklar aynı kutu tasarımını kullanır.
   * Boşsa OTUR, doluysa oyuncu adı görünür.
   */
  const seatButton =
    "flex items-center justify-center rounded-md border-2 border-red-600 bg-black px-2 py-1 shadow-[0_0_8px_rgba(255,0,0,0.35)] transition hover:bg-red-950";

  const emptyText =
    "text-sm font-bold text-yellow-300";

  const playerText =
    "text-base font-bold text-yellow-300 whitespace-nowrap";

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
        <button
          type="button"
          onClick={onNorth}
          aria-label={
            northEmpty
              ? "Kuzey koltuğuna otur"
              : `Kuzey koltuğunda ${northLabel}`
          }
          className={`absolute left-1/2 top-0 z-10 h-[30px] w-[72px] -translate-x-1/2 ${seatButton} ${
            northEmpty
              ? "cursor-pointer"
              : "cursor-default"
          }`}
        >
          <span
            className={
              northEmpty
                ? emptyText
                : playerText
            }
          >
            {northLabel}
          </span>
        </button>

        {/* BATI */}
        <button
          type="button"
          onClick={onWest}
          aria-label={
            westEmpty
              ? "Batı koltuğuna otur"
              : `Batı koltuğunda ${westLabel}`
          }
          className={`absolute left-[8%] top-[44%] z-10 flex h-[72px] w-[30px] -translate-y-1/2 items-center justify-center ${seatButton} ${
            westEmpty
              ? "cursor-pointer"
              : "cursor-default"
          }`}
        >
          <span
            className={`-rotate-90 whitespace-nowrap ${
              westEmpty
                ? emptyText
                : playerText
            }`}
          >
            {westLabel}
          </span>
        </button>

        {/* DOĞU */}
        <button
          type="button"
          onClick={onEast}
          aria-label={
            eastEmpty
              ? "Doğu koltuğuna otur"
              : `Doğu koltuğunda ${eastLabel}`
          }
          className={`absolute right-[8%] top-[44%] z-10 flex h-[72px] w-[30px] -translate-y-1/2 items-center justify-center ${seatButton} ${
            eastEmpty
              ? "cursor-pointer"
              : "cursor-default"
          }`}
        >
          <span
            className={`rotate-90 whitespace-nowrap ${
              eastEmpty
                ? emptyText
                : playerText
            }`}
          >
            {eastLabel}
          </span>
        </button>

        {/* GÜNEY */}
        <button
          type="button"
          onClick={onSouth}
          aria-label={
            southEmpty
              ? "Güney koltuğuna otur"
              : `Güney koltuğunda ${southLabel}`
          }
          className={`absolute bottom-[6%] left-1/2 z-10 h-[30px] w-[72px] -translate-x-1/2 ${seatButton} ${
            southEmpty
              ? "cursor-pointer"
              : "cursor-default"
          }`}
        >
          <span
            className={
              southEmpty
                ? emptyText
                : playerText
            }
          >
            {southLabel}
          </span>
        </button>

        {/* MASAYA GİR */}
        <button
          type="button"
          onClick={onEnter}
          aria-label="Masaya gir"
          className="absolute left-1/2 top-[42%] z-10 h-[30px] w-[72px] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-md border-2 border-red-600 bg-black text-xs font-bold text-yellow-300 shadow-[0_0_8px_rgba(255,0,0,0.35)] transition hover:bg-red-950"
        >
          MASAYA GİR
        </button>

      </div>
    </div>
  );
}