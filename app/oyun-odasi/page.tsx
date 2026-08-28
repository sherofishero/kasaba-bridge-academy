"use client";

import Link from "next/link";
import BridgeTable from "../components/BridgeTable";
import { useEffect, useRef, useState } from "react";
import { supabase, supabaseTableCommunication } from "../lib/supabase";
import { TableState } from "../lib/game";

const TABLES_PER_BATCH = 6;

function createTableIds(count: number, start: number = 1): string[] {
  return Array.from(
    { length: count },
    (_, i) => `table-${start + i}`
  );
}

export default function OyunOdasiPage() {
  const [tableIds, setTableIds] = useState<string[]>(
    createTableIds(TABLES_PER_BATCH)
  );

  const [tableStates, setTableStates] = useState<
    Record<string, TableState | null>
  >({});

  const versionsRef = useRef<Record<string, number>>({});
  const channelRef =
    useRef<ReturnType<typeof supabase.channel> | null>(null);

  const loadingMoreRef = useRef(false);

  async function loadTables(ids: string[]) {
    const entries = await Promise.all(
      ids.map(async (tableId) => {
        const state =
          await supabaseTableCommunication.getTable(tableId);

        const rowVersion = (
          state as unknown as { version?: number } | null
        )?.version;

        const version = rowVersion ?? -1;

        if (
          version >= 0 &&
          version >
            (versionsRef.current[tableId] ?? -1)
        ) {
          versionsRef.current[tableId] = version;
        }

        return [tableId, state] as const;
      })
    );

    setTableStates((prev) => {
      const next = { ...prev };

      for (const [tableId, state] of entries) {
        const version =
          (state as unknown as {
            version?: number;
          } | null)?.version ?? -1;

        if (
          version < 0 ||
          version >
            (versionsRef.current[tableId] ?? -1)
        ) {
          versionsRef.current[tableId] = Math.max(
            versionsRef.current[tableId] ?? -1,
            version
          );

          next[tableId] = state;
        } else if (!(tableId in next)) {
          next[tableId] = state;
        }
      }

      return next;
    });
  }

  useEffect(() => {
    void loadTables(tableIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("oyun-odasi:tables-live")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tables",
        },
        (payload) => {
          const row = payload.new as
            | {
                id?: string;
                version?: number;
                state?: TableState;
              }
            | null;

          if (!row?.id || !row.state) {
            return;
          }

          const match =
            row.id.match(/^table-(\d+)$/);

          if (!match) {
            return;
          }

          const tableNumber =
            Number(match[1]);

          if (
            !Number.isInteger(tableNumber) ||
            tableNumber < 1
          ) {
            return;
          }

          setTableIds((prev) => {
            if (prev.includes(row.id!)) {
              return prev;
            }

            const next = [
              ...prev,
              row.id!,
            ];

            next.sort(
              (a, b) =>
                Number(a.replace("table-", "")) -
                Number(b.replace("table-", ""))
            );

            return next;
          });

          const incomingVersion =
            row.version ?? -1;

          if (
            incomingVersion <=
            (versionsRef.current[row.id] ?? -1)
          ) {
            return;
          }

          versionsRef.current[row.id] =
            incomingVersion;

          setTableStates((prev) => ({
            ...prev,
            [row.id!]:
              row.state as TableState,
          }));
        }
      )
      .subscribe((status) => {
        console.log(
          "[OYUN ODASI] realtime status:",
          status
        );
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        void supabase.removeChannel(
          channelRef.current
        );

        channelRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (loadingMoreRef.current) {
        return;
      }

      const scrollPosition =
        window.innerHeight +
        window.scrollY;

      const pageHeight =
        document.documentElement
          .scrollHeight;

      if (
        scrollPosition <
        pageHeight - 500
      ) {
        return;
      }

      loadingMoreRef.current = true;

      setTableIds((prev) => {
        const nextStart =
          prev.length + 1;

        return [
          ...prev,
          ...createTableIds(
            TABLES_PER_BATCH,
            nextStart
          ),
        ];
      });

      window.setTimeout(() => {
        loadingMoreRef.current = false;
      }, 300);
    };

    window.addEventListener(
      "scroll",
      handleScroll
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  useEffect(() => {
    if (tableIds.length <= TABLES_PER_BATCH) {
      return;
    }

    const idsToLoad =
      tableIds.slice(-TABLES_PER_BATCH);

    void loadTables(idsToLoad);
  }, [tableIds]);

  return (
    <main
      className="min-h-screen text-yellow-300"
      style={{
        backgroundColor: "#011100",
        colorScheme: "dark",
      }}
    >
      <div className="mx-auto max-w-[1500px] border-x border-red-800">

        {/* HEADER */}
        <header className="relative flex items-center justify-between border-b border-red-800 px-8 py-4">
          <Link
            href="/salon"
            className="rounded-lg border border-red-700 px-5 py-3 transition hover:bg-red-900"
          >
            SALONA DÖN
          </Link>

          <h1 className="absolute left-1/2 -translate-x-1/2 text-3xl font-black tracking-[0.12em] text-yellow-400">
            KASABA OYUN ODASI
          </h1>
        </header>

        {/* MASALAR */}
        <section className="mx-auto mt-6 w-full max-w-[1500px] px-0 pb-10">
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 md:grid-cols-3">
            {tableIds.map((tableId) => {
              const tableNumber =
                tableId.replace("table-", "");

              return (
                <BridgeTable
                  key={tableId}
                  tableNumber={tableNumber}
                  northLabel={
                    tableStates[tableId]
                      ?.northPlayer?.name ?? "OTUR"
                  }
                  southLabel={
                    tableStates[tableId]
                      ?.southPlayer?.name ?? "OTUR"
                  }
                  eastLabel={
                    tableStates[tableId]
                      ?.eastPlayer?.name ?? "OTUR"
                  }
                  westLabel={
                    tableStates[tableId]
                      ?.westPlayer?.name ?? "OTUR"
                  }

                  onNorth={() => {
                    window.location.href =
                      `/cuha?tableId=${tableId}&seat=NORTH`;
                  }}

                  onEast={() => {
                    window.location.href =
                      `/cuha?tableId=${tableId}&seat=EAST`;
                  }}

                  onSouth={() => {
                    window.location.href =
                      `/cuha?tableId=${tableId}&seat=SOUTH`;
                  }}

                  onWest={() => {
                    window.location.href =
                      `/cuha?tableId=${tableId}&seat=WEST`;
                  }}

                  onEnter={() => {
                    window.location.href =
                      `/cuha?tableId=${tableId}`;
                  }}
                />
              );
            })}
          </div>
        </section>

        <footer className="border-t border-red-800 py-6 text-center text-lg text-yellow-500">
          © 2026 KASABA BRIDGE HUB
        </footer>
      </div>
    </main>
  );
}