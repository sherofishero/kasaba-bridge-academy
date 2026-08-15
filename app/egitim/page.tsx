"use client";

import Link from "next/link";
import BridgeTable from "../components/BridgeTable";
import { useEffect, useState } from "react";
import { supabaseTableCommunication } from "../lib/supabase";
import { TableState } from "../lib/game";

export default function EgitimPage() {
  const [tableStates, setTableStates] = useState<Record<string, TableState | null>>(
    {}
  );

  useEffect(() => {
    async function loadTables() {
      const entries = await Promise.all(
        Array.from({ length: 6 }, async (_, i) => {
          const tableId = `table-${i + 1}`;
          const state = await supabaseTableCommunication.getTable(tableId);

          return [tableId, state] as const;
        })
      );

      setTableStates(Object.fromEntries(entries));
    }

    void loadTables();
  }, []);
  return (
    <main className="min-h-screen bg-black text-yellow-300">
      <div className="mx-auto max-w-[1500px] border-x border-red-800">
        {/* Header with SALONA DÖN button */}
        <header className="flex items-center justify-between border-b border-red-800 px-8 py-4">
          <Link
            href="/salon"
            className="rounded-lg border border-red-700 px-5 py-3 transition hover:bg-red-900"
          >
            SALONA DÖN
          </Link>
        </header>

        {/* Training Hall Title */}
        <section className="px-8 pt-10">
          <h1 className="text-center text-5xl font-bold text-yellow-400">
            ÇALIŞMA ODASINA HOŞGELDİNİZ
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-center text-xl text-yellow-300">
            Eğitim dağılımları ile çalışma masaları.
          </p>
        </section>

        {/* Bridge Tables Grid - 3x2 responsive */}
        <section className="mx-auto mt-10 max-w-[1200px] px-6 pb-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3">
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