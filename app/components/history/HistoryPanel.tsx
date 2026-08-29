"use client";

/*
 * =========================================================
 * KASABA HISTORY — ORTAK PANEL
 * =========================================================
 *
 * Tüm masa türleri BU paneli kullanır (kopyala-yapıştır yok).
 * Görünürlük lib/history/visibility.ts'ten gelir.
 * contract/result/score kayıtta null ise gösterilmez.
 */

import { useEffect, useState } from "react";

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
  onClose: () => void;
};

const SUIT_SYMBOLS: Record<string, string> = {
  S: "♠",
  H: "♥",
  D: "♦",
  C: "♣",
};

const SEAT_ORDER = ["north", "east", "south", "west"] as const;

const SEAT_LABELS: Record<string, string> = {
  north: "KUZEY",
  east: "DOĞU",
  south: "GÜNEY",
  west: "BATI",
};

const AUCTION_SEATS = ["N", "E", "S", "W"] as const;

function formatBid(bid: Bid): string {
  if (bid.type === "PASS") return "PAS";
  if (bid.type === "DOUBLE") return "X";
  if (bid.type === "REDOUBLE") return "XX";

  if (bid.type === "BID") {
    const symbol =
      SUIT_SYMBOLS[bid.strain as string] ??
      (bid.strain as string);
    return bid.level + symbol;
  }

  return "?";
}

function formatHand(cards: Card[] | undefined): string {
  if (!cards || cards.length === 0) {
    return "—";
  }

  const bySuit: Record<string, string[]> = {
    S: [],
    H: [],
    D: [],
    C: [],
  };

  for (const card of cards) {
    bySuit[card.suit]?.push(card.rank);
  }

  const parts: string[] = [];

  for (const suit of ["S", "H", "D", "C"]) {
    if (bySuit[suit].length > 0) {
      parts.push(
        SUIT_SYMBOLS[suit] + " " + bySuit[suit].join(" ")
      );
    }
  }

  return parts.length > 0 ? parts.join("   ") : "—";
}


export default function HistoryPanel({
  tableId,
  gameType,
  isTableParticipant = true,
  isSpectator = false,
  onClose,
}: HistoryPanelProps) {
  const [records, setRecords] = useState<
    HistoryRecord[] | null
  >(null);

  const [selected, setSelected] =
    useState<HistoryRecord | null>(null);

  useEffect(() => {
    let cancelled = false;

    void listTableHistory(tableId).then((result) => {
      if (!cancelled) {
        setRecords(result);
      }
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
    records?.filter((record) =>
      canViewHistory(viewContext, record)
    ) ?? null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-[640px] overflow-y-auto rounded-xl border border-blue-900 bg-zinc-950 p-5 text-yellow-100 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-yellow-400">
            GEÇMİŞ
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-3 py-1 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
          >
            KAPAT
          </button>
        </div>
        <PanelBody
          visibleRecords={visibleRecords}

          selected={selected}
          onSelect={setSelected}
        />
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
    return (
      <p className="text-sm text-zinc-400">
        Geçmiş yükleniyor...
      </p>
    );
  }

  if (visibleRecords.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        Bu masada henüz tamamlanmış board yok.
      </p>
    );
  }

  if (selected === null) {
    return (
      <ul className="space-y-2">
        {visibleRecords.map((record) => (
          <li key={record.id}>
            <button
              type="button"
              onClick={() => onSelect(record)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-left transition hover:bg-zinc-800"
            >
              <span className="font-bold text-yellow-300">
                BOARD {record.boardNumber}
              </span>

              <span className="ml-3 text-xs text-zinc-400">
                K: {record.players.north ?? "—"} / D:{" "}
                {record.players.east ?? "—"} / G:{" "}
                {record.players.south ?? "—"} / B:{" "}
                {record.players.west ?? "—"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <BoardDetail
      record={selected}
      onBack={() => onSelect(null)}
    />
  );
}

function BoardDetail({
  record,
  onBack,
}: {
  record: HistoryRecord;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="rounded-lg border border-zinc-700 px-3 py-1 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
      >
        ← Listeye Dön
      </button>

      <div>
        <h3 className="text-base font-bold text-yellow-300">
          BOARD {record.boardNumber}
        </h3>

        <p className="mt-1 text-sm text-zinc-300">
          İhale yapan: {record.dealer ?? "—"} · Zararsızlık:{" "}
          {record.vulnerability ?? "—"}
        </p>
      </div>

      <div>
        <h4 className="mb-1 text-sm font-bold text-yellow-400">
          OYUNCULAR
        </h4>

        <ul className="grid grid-cols-2 gap-1 text-sm text-zinc-300">
          {SEAT_ORDER.map((seat) => (
            <li key={seat}>
              {SEAT_LABELS[seat]}:{" "}
              {record.players[seat] ?? "—"}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-1 text-sm font-bold text-yellow-400">
          İHALE
        </h4>

        <AuctionGrid auction={record.auction as Bid[]} />
      </div>

      <div>
        <h4 className="mb-1 text-sm font-bold text-yellow-400">
          DAĞILIM
        </h4>

        <ul className="space-y-1 text-sm text-zinc-300">
          {SEAT_ORDER.map((seat) => (
            <li key={seat}>
              <span className="font-semibold text-yellow-200">
                {SEAT_LABELS[seat]}:
              </span>{" "}
              {formatHand(
                (record.deal as Deal)?.[
                  seat.toUpperCase() as keyof Deal
                ]
              )}
            </li>
          ))}
        </ul>
      </div>

      {record.contract !== null && (
        <p className="text-sm text-zinc-300">
          Kontrat: {record.contract} · Declarer:{" "}
          {record.declarer ?? "—"} · Sonuç:{" "}
          {record.result ?? "—"} · Skor:{" "}
          {record.score ?? "—"}
        </p>
      )}
    </div>
  );
}

function AuctionGrid({ auction }: { auction: Bid[] }) {
  if (!auction || auction.length === 0) {
    return (
      <p className="text-sm text-zinc-400">
        İhale kaydı yok.
      </p>
    );
  }

  const columns: string[][] = [[], [], [], []];

  auction.forEach((bid, index) => {
    columns[index % 4].push(formatBid(bid));
  });

  const maxRows = Math.max(
    ...columns.map((column) => column.length)
  );

  return (
    <div className="inline-grid grid-cols-4 gap-x-6 gap-y-1 rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-sm">
      {AUCTION_SEATS.map((seat) => (
        <span
          key={seat}
          className="font-bold text-yellow-400"
        >
          {seat}
        </span>
      ))}

      {Array.from({ length: maxRows }).map((_, row) =>
        AUCTION_SEATS.map((_, col) => (
          <span
            key={row + "-" + col}
            className="text-zinc-200"
          >
            {columns[col][row] ?? ""}
          </span>
        ))
      )}
    </div>
  );
}

