"use client";

import { useEffect, useState, type ReactNode } from "react";

import { listTableHistory } from "../../lib/history/engine";
import {
  canViewHistory,
  type HistoryViewContext,
} from "../../lib/history/visibility";
import type {
  GameType,
  HistoryRecord,
} from "../../lib/history/types";
import type { Bid } from "../../lib/auction";
import type { Card, Deal } from "../../lib/deck";

type HistoryPanelProps = {
  tableId: string;
  gameType: GameType;
  isTableParticipant?: boolean;
  isSpectator?: boolean;
  embedded?: boolean;
  onClose: () => void;
};

const SUIT_SYMBOLS: Record<string, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

function isDeal(value: unknown): value is Deal {
  if (!value || typeof value !== "object") return false;

  const deal = value as Partial<Deal>;
  return (
    Array.isArray(deal.north) &&
    Array.isArray(deal.east) &&
    Array.isArray(deal.south) &&
    Array.isArray(deal.west)
  );
}

function getAuction(record: HistoryRecord): Bid[] {
  return Array.isArray(record.auction)
    ? (record.auction as Bid[])
    : [];
}

function formatContractText(record: HistoryRecord): string {
  const auction = getAuction(record);

  if (
    auction.length === 4 &&
    auction.every((bid) => bid.type === "PASS")
  ) {
    return "PASS PASS PASS PASS";
  }

  if (!record.contract) return "—";

  const normalized = record.contract.trim().replace(
    /^(\d)(c|d|h|s|nt)$/i,
    (_, level: string, strain: string) =>
      `${level}${SUIT_SYMBOLS[strain.toUpperCase()] ?? strain.toUpperCase()}`
  );
  const declarer = record.declarer?.trim() ?? "";
  const result = record.result?.trim() ?? "";

  return [normalized, declarer + result].filter(Boolean).join(" ");
}

function renderSuitText(text: string): ReactNode {
  return text.split(/([♣♠♥♦])/u).map((part, index) => {
    if (!/[♣♠♥♦]/u.test(part)) {
      return <span key={index}>{part}</span>;
    }

    const isRed = part === "♥" || part === "♦";
    return (
      <span
        key={index}
        className={isRed ? "text-red-600" : "text-black"}
      >
        {part}
      </span>
    );
  });
}

function scoreCells(record: HistoryRecord): {
  ours: string;
  opponents: string;
} {
  if (record.score === null) {
    return { ours: "—", opponents: "—" };
  }

  return record.score >= 0
    ? { ours: String(record.score), opponents: "—" }
    : { ours: "—", opponents: String(Math.abs(record.score)) };
}

function totalScores(records: HistoryRecord[]) {
  return records.reduce(
    (total, record) => {
      if (record.score === null) return total;

      if (record.score >= 0) {
        total.ours += record.score;
      } else {
        total.opponents += Math.abs(record.score);
      }

      return total;
    },
    { ours: 0, opponents: 0 }
  );
}

function formatHand(cards: Card[]): ReactNode {
  const bySuit: Record<string, string[]> = {
    S: [],
    H: [],
    D: [],
    C: [],
  };

  for (const card of cards) {
    bySuit[card.suit]?.push(card.rank);
  }

  return ["S", "H", "D", "C"].map((suit) => {
    const isRed = suit === "H" || suit === "D";
    return (
      <div
        key={suit}
        className={isRed ? "text-red-600" : "text-black"}
      >
        <span className="mr-2 font-bold">{SUIT_SYMBOLS[suit]}</span>
        <span className="font-semibold">
          {bySuit[suit].join(" ") || "—"}
        </span>
      </div>
    );
  });
}

export default function HistoryPanel({
  tableId,
  gameType,
  isTableParticipant = true,
  isSpectator = false,
  embedded = false,
  onClose,
}: HistoryPanelProps) {
  const [records, setRecords] = useState<HistoryRecord[] | null>(null);
  const [selected, setSelected] = useState<HistoryRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    void listTableHistory(tableId).then((result) => {
      if (cancelled) return;
      setRecords(result);
      setSelected(result[result.length - 1] ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [tableId]);

  const viewContext: HistoryViewContext = {
    gameType,
    isTableParticipant,
    isSpectator,
  };
  const visibleRecords =
    records?.filter((record) => canViewHistory(viewContext, record)) ?? null;

  const content = (
    <div className="w-full bg-white text-black">
      {!embedded && (
        <div className="flex items-center justify-between border-b border-zinc-300 px-3 py-2">
          <h2 className="text-lg font-black text-yellow-500">GEÇMİŞ</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-400 bg-white px-3 py-1 text-sm font-bold text-red-600 shadow-sm hover:bg-zinc-100"
          >
            KAPAT
          </button>
        </div>
      )}

      <PanelBody
        visibleRecords={visibleRecords}
        selected={selected}
        onSelect={setSelected}
      />
    </div>
  );

  if (embedded) return content;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-3">
      <div className="max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded border-2 border-blue-900 bg-white shadow-2xl">
        {content}
      </div>
    </div>
  );
}

function PanelBody({
  visibleRecords,
  selected,
  onSelect,
}: {
  visibleRecords: HistoryRecord[] | null;
  selected: HistoryRecord | null;
  onSelect: (record: HistoryRecord | null) => void;
}) {
  if (visibleRecords === null) {
    return <p className="p-3 text-sm text-zinc-600">Geçmiş yükleniyor...</p>;
  }

  if (visibleRecords.length === 0) {
    return (
      <p className="p-3 text-sm text-zinc-600">
        Bu masada henüz tamamlanmış board yok.
      </p>
    );
  }

  const totals = totalScores(visibleRecords);

  return (
    <div className="p-2 sm:p-3">
      <BoardList
        records={visibleRecords}
        selectedId={selected?.id ?? null}
        onSelect={onSelect}
      />

      <div className="mt-1 grid grid-cols-[1fr_auto_auto] items-center gap-2 border-t-2 border-black bg-yellow-200 px-2 py-1 text-xs font-bold sm:text-sm">
        <span>TOPLAM SKOR</span>
        <span>BİZ: {totals.ours}</span>
        <span>RAKİP: {totals.opponents}</span>
      </div>

      {selected && (
        <BoardDetail
          records={visibleRecords}
          selected={selected}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

function BoardList({
  records,
  selectedId,
  onSelect,
}: {
  records: HistoryRecord[];
  selectedId: string | null;
  onSelect: (record: HistoryRecord | null) => void;
}) {
  return (
    <div className="overflow-hidden rounded border-2 border-zinc-800 bg-yellow-200">
      <div className="grid grid-cols-[3.25rem_minmax(0,1fr)_3.25rem_3.5rem] bg-yellow-300 px-2 py-1 text-[10px] font-black sm:grid-cols-[4rem_minmax(0,1fr)_4rem_4.5rem] sm:text-xs">
        <span>BOARD</span>
        <span>KONTRAT</span>
        <span>BİZ</span>
        <span>RAKİP</span>
      </div>

      {records.map((record) => {
        const scores = scoreCells(record);
        return (
          <button
            key={record.id}
            type="button"
            onClick={() => onSelect(record)}
            className={`grid w-full grid-cols-[3.25rem_minmax(0,1fr)_3.25rem_3.5rem] border-t border-yellow-500 px-2 py-1 text-left text-[11px] leading-tight transition hover:bg-yellow-300 sm:grid-cols-[4rem_minmax(0,1fr)_4rem_4.5rem] sm:text-sm ${
              record.id === selectedId
                ? "bg-yellow-400 font-bold"
                : "bg-yellow-200"
            }`}
          >
            <span>{record.boardNumber}</span>
            <span className="min-w-0 truncate">
              {renderSuitText(formatContractText(record))}
            </span>
            <span>{scores.ours}</span>
            <span>{scores.opponents}</span>
          </button>
        );
      })}
    </div>
  );
}

function BoardDetail({
  records,
  selected,
  onSelect,
}: {
  records: HistoryRecord[];
  selected: HistoryRecord;
  onSelect: (record: HistoryRecord | null) => void;
}) {
  const selectedIndex = records.findIndex(
    (record) => record.id === selected.id
  );
  const previousBoard = records[selectedIndex - 1] ?? null;
  const nextBoard = records[selectedIndex + 1] ?? null;

  return (
    <section className="mt-1 rounded border-2 border-white bg-green-800 p-2 text-white shadow-inner sm:p-3">
      <h3 className="text-xl font-black">BOARD {selected.boardNumber}</h3>
      <p className="text-xs text-green-100 sm:text-sm">
        Dağıtan: {selected.dealer ?? "—"} · Zon:{" "}
        {selected.vulnerability ?? "None"}
      </p>

      {isDeal(selected.deal) ? (
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)] grid-rows-[auto_auto_auto] items-center gap-x-2 gap-y-2 sm:gap-x-4">
          <PlayerHand
            className="col-start-2 row-start-1"
            label="N"
            name={selected.players.north}
            cards={selected.deal.north}
          />
          <PlayerHand
            className="col-start-1 row-start-2"
            label="W"
            name={selected.players.west}
            cards={selected.deal.west}
          />
          <PlayerHand
            className="col-start-3 row-start-2"
            label="E"
            name={selected.players.east}
            cards={selected.deal.east}
          />
          <PlayerHand
            className="col-start-2 row-start-3"
            label="S"
            name={selected.players.south}
            cards={selected.deal.south}
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-green-100">
          Bu board için kart dağılımı bulunmuyor.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-4 sm:gap-2">
        <NavigationButton disabled>ÖNCEKİ EL</NavigationButton>
        <NavigationButton disabled>SONRAKİ EL</NavigationButton>
        <NavigationButton
          disabled={!previousBoard}
          onClick={() => previousBoard && onSelect(previousBoard)}
        >
          ÖNCEKİ BOARD
        </NavigationButton>
        <NavigationButton
          disabled={!nextBoard}
          onClick={() => nextBoard && onSelect(nextBoard)}
        >
          SONRAKİ BOARD
        </NavigationButton>
      </div>
    </section>
  );
}

function PlayerHand({
  className,
  label,
  name,
  cards,
}: {
  className: string;
  label: string;
  name: string | null;
  cards: Card[];
}) {
  return (
    <div className={className}>
      <div className="mb-1 text-center text-sm font-black text-yellow-300">
        {label}: <span className="text-white">{name ?? "—"}</span>
      </div>
      <div className="rounded-md bg-white px-2 py-1 text-[11px] leading-tight sm:text-xs">
        {formatHand(cards)}
      </div>
    </div>
  );
}

function NavigationButton({
  children,
  disabled = false,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-9 rounded-md border border-zinc-300 bg-white px-1 text-[10px] font-black text-zinc-900 shadow-sm disabled:cursor-not-allowed disabled:text-zinc-400 sm:text-xs"
    >
      {children}
    </button>
  );
}
