"use client";

import { useEffect, useState } from "react";
import {
  subscribeToTableDirectorCalls,
} from "../lib/supabase";
import type { DirectorCall } from "../lib/game";
import { getTableNumberFromId } from "../lib/game";

export const DIRECTOR_CALL_TYPE_LABELS: Record<
  DirectorCall["type"],
  string
> = {
  DIRECTOR_NEEDED: "Masada direktöre ihtiyacım var",
  MESSAGE: "Direktöre mesaj",
};

type DirectorCallBannerProps = {
  tableId: string | null;
  /* Kullanıcı bu masanın aktif direktörü mü? Host her zaman direktördür. */
  isDirector: boolean;
  gameLabel: string;
  matchLabel: string;
};

/*
 * Aktif direktörlere (şu an: host) gelen Direktör Çağrılarını gösteren
 * bildirim paneli. Realtime broadcast kanalına abone olur; oyun,
 * ihale veya kart oynama asla etkilenmez.
 */
export default function DirectorCallBanner({
  tableId,
  isDirector,
  gameLabel,
  matchLabel,
}: DirectorCallBannerProps) {
  const [calls, setCalls] = useState<DirectorCall[]>([]);

  useEffect(() => {
    if (!tableId || !isDirector) {
      return;
    }

    const unsubscribe =
      subscribeToTableDirectorCalls(tableId, (call) => {
        setCalls((prev) => [...prev.slice(-4), call]);
      });

    return unsubscribe;
  }, [tableId, isDirector]);

  if (!isDirector || calls.length === 0) {
    return null;
  }

  const dismiss = (id: string) => {
    setCalls((prev) => prev.filter((call) => call.id !== id));
  };

  const now = new Date().toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed right-4 top-16 z-[120] flex w-[360px] max-w-[90vw] flex-col gap-3">
      {calls.map((call) => (
        <div
          key={call.id}
          role="alert"
          className="overflow-hidden rounded-xl border-2 border-red-800 bg-zinc-950 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-red-900 bg-red-950/60 px-4 py-2">
            <span className="font-black tracking-wide text-red-300">
              DİREKTÖR ÇAĞRISI
            </span>
            <button
              type="button"
              onClick={() => dismiss(call.id)}
              aria-label="Direktör çağrısını kapat"
              className="rounded px-1.5 text-lg leading-none text-red-300 transition hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="whitespace-pre-wrap px-4 py-3 font-mono text-sm leading-relaxed text-yellow-100">
            {`Turnuva / Etkinlik: ${gameLabel}
Maç: ${matchLabel}
Masa: ${getTableNumberFromId(call.tableId)}`}
          </div>

          <div className="border-t border-zinc-800 px-4 py-2 text-sm text-zinc-200">
            <span className="font-bold text-yellow-300">
              Çağıran:
            </span>{" "}
            {call.callerSeatLabel
              ? `${call.callerSeatLabel} - `
              : ""}
            {call.callerName || "Bilinmeyen"}
          </div>

          <div className="px-4 pb-2 text-sm text-zinc-200">
            <span className="font-bold text-yellow-300">Tür:</span>{" "}
            {DIRECTOR_CALL_TYPE_LABELS[call.type] ?? call.type}
          </div>

          {call.message ? (
            <div className="px-4 pb-3 text-sm text-zinc-200">
              <span className="font-bold text-yellow-300">Mesaj:</span>{" "}
              {call.message}
            </div>
          ) : null}

          <div className="px-4 pb-2 text-right text-xs text-zinc-500">
            {now}
          </div>
        </div>
      ))}
    </div>
  );
}