"use client";

import Link from "next/link";
import BridgeTable from "../components/BridgeTable";
import { useEffect, useRef, useState } from "react";
import { supabase, supabaseTableCommunication } from "../lib/supabase";
import { TableState } from "../lib/game";

/*
 * Çalışma Odası'nda canlı izlenen masalar.
 * Gelecekte masa sayısı artarsa yalnızca bu set güncellenir.
 */
const TABLE_IDS = new Set([
  "table-1",
  "table-2",
  "table-3",
  "table-4",
  "table-5",
  "table-6",
]);

export default function EgitimPage() {
  const [tableStates, setTableStates] = useState<Record<string, TableState | null>>(
    {}
  );

  /*
   * Masa başına görülen en yüksek `version`.
   * Hem ilk getTable() sonuçları hem Realtime event'leri bunu günceller;
   * böylece geç dönen eski bir snapshot asla daha yeni state'i EZEMEZ.
   */
  const versionsRef = useRef<Record<string, number>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    async function loadTables() {
      const entries = await Promise.all(
        Array.from({ length: 6 }, async (_, i) => {
          const tableId = `table-${i + 1}`;
          const state = await supabaseTableCommunication.getTable(tableId);

          // İlk snapshot'ın version'ını işle: bu masa için daha önce
          // Realtime event'i uygulandıysa (daha yüksek version),
          // eski snapshot state'e yazılmaz.
          // (version, tables satır kolonudur; TableState icinde degildir.)
          const rowVersion = (
            state as unknown as { version?: number } | null
          )?.version;
          const version = rowVersion ?? -1;
          if (
            version >= 0 &&
            version > (versionsRef.current[tableId] ?? -1)
          ) {
            versionsRef.current[tableId] = version;
            setTableStates((prev) => ({ ...prev, [tableId]: state }));
          }

          return [tableId, state] as const;
        })
      );

      setTableStates((prev) => {
        const next = { ...prev };
        for (const [tableId, state] of entries) {
          const version =
            (state as unknown as { version?: number } | null)?.version ?? -1;
          if (version < 0 || version > (versionsRef.current[tableId] ?? -1)) {
            versionsRef.current[tableId] = Math.max(
              versionsRef.current[tableId] ?? -1,
              version
            );
            next[tableId] = state;
          }
        }
        return next;
      });
    }

    void loadTables();

    /*
     * Tek Realtime channel ile public.tables UPDATE olayları dinlenir.
     * Yalnızca Çalışma Odası masaları (table-1..table-6) uygulanır.
     *
     * Bu abonelik SADECE OKUMA yapar; seat/host/joinOrder gibi alanlar
     * istemciden hiçbir zaman yazılmaz (otorite: SQL RPC'leri).
     */
    const channel = supabase
      .channel("egitim:tables-live")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tables",
        },
        (payload) => {
          const row = payload.new as
            | { id?: string; version?: number; state?: TableState }
            | null;

          console.log("[EGITIM] pg_change:", {
            id: row?.id,
            version: row?.version,
            state: row?.state,
          });

          if (!row?.id || !row.state) {
            console.log("[EGITIM] event ignored:", {
              id: row?.id,
              incomingVersion: row?.version,
              currentVersion: versionsRef.current[row?.id ?? ""] ?? -1,
              reason: "payload'da id veya state yok",
            });
            return;
          }

          if (!TABLE_IDS.has(row.id)) {
            console.log("[EGITIM] event ignored:", {
              id: row.id,
              incomingVersion: row.version,
              currentVersion: versionsRef.current[row.id] ?? -1,
              reason: `${row.id} Çalışma Odası masa listesinde değil (table-1..6)`,
            });
            return;
          }

          // Stale-event koruması: aynı veya daha eski version reddedilir.
          const incomingVersion = row.version ?? -1;
          if (
            incomingVersion <= (versionsRef.current[row.id] ?? -1)
          ) {
            console.log("[EGITIM] event ignored:", {
              id: row.id,
              incomingVersion,
              currentVersion: versionsRef.current[row.id] ?? -1,
              reason:
                "aynı veya daha eski version (stale-event / race koruması)",
            });
            return;
          }

          versionsRef.current[row.id] = incomingVersion;

          console.log("[EGITIM] state applied:", {
            id: row.id,
            version: incomingVersion,
          });

          setTableStates((prev) => ({
            ...prev,
            [row.id!]: row.state as TableState,
          }));
        }
      )
      .subscribe((status) => {
        console.log("[EGITIM] realtime status:", status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);
  return (
    <main
      className="min-h-screen text-yellow-300"
      style={{
        backgroundColor: "#011100",
        colorScheme: "dark",
      }}
    >      <div className="mx-auto max-w-[1500px] border-x border-red-800">
        {/* Header with SALONA DÖN button */}
        <header className="relative flex items-center justify-between border-b border-red-800 px-8 py-4">
          <Link
            href="/salon"
            className="rounded-lg border border-red-700 px-5 py-3 transition hover:bg-red-900"
          >
            SALONA DÖN
          </Link>

          <h1 className="absolute left-1/2 -translate-x-1/2 text-3xl font-black tracking-[0.12em] text-yellow-400">
            KASABA ÇALIŞMA ODASI
          </h1>
        </header>

        {/* Bridge Tables Grid - 3x2 responsive */}
        <section className="mx-auto mt-6 w-full max-w-[1500px] px-0 pb-10">
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <BridgeTable
                key={i + 1}
                tableNumber={(i + 1).toString()}
                northLabel={
                  tableStates[`table-${i + 1}`]?.northPlayer?.name ?? "OTUR"
                }
                southLabel={
                  tableStates[`table-${i + 1}`]?.southPlayer?.name ?? "OTUR"
                }
                eastLabel={
                  tableStates[`table-${i + 1}`]?.eastPlayer?.name ?? "OTUR"
                }
                westLabel={
                  tableStates[`table-${i + 1}`]?.westPlayer?.name ?? "OTUR"
                }
                onNorth={() => {
                  window.location.href = `/cuha?tableId=table-${i + 1}&seat=NORTH`;
                }}

                onEast={() => {
                  window.location.href = `/cuha?tableId=table-${i + 1}&seat=EAST`;
                }}

                onSouth={() => {
                  window.location.href = `/cuha?tableId=table-${i + 1}&seat=SOUTH`;
                }}

                onWest={() => {
                  window.location.href = `/cuha?tableId=table-${i + 1}&seat=WEST`;
                }}

                onEnter={() => {
                  window.location.href = "/cuha";
                }}
              />
            ))}
          </div>
        </section>

        <footer className="border-t border-red-800 py-6 text-center text-lg text-yellow-500">
          © 2026 KASABA BRIDGE HUB
        </footer>
      </div>
    </main>
  );
}