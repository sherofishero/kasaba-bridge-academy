"use client";

import Link from "next/link";
import BridgeTable from "../components/BridgeTable";

export default function EgitimPage() {
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
            EĞİTİM ODASI
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
                northLabel="KUZEY"
                southLabel="GÜNEY"
                eastLabel="DOĞU"
                westLabel="BATI"

                onNorth={() => {
                  window.location.href = "/cuha?seat=NORTH";
                }}

                onEast={() => {
                  window.location.href = "/cuha?seat=EAST";
                }}

                onSouth={() => {
                  window.location.href = "/cuha?seat=SOUTH";
                }}

                onWest={() => {
                  window.location.href = "/cuha?seat=WEST";
                }}

                onEnter={() => {
                  window.location.href = "/cuha";
                }}
              />
            ))}
          </div>
        </section>

        <footer className="border-t border-red-800 py-6 text-center text-lg text-yellow-500">
          © 2026 KASABA BRIDGE CLUB
        </footer>
      </div>
    </main>
  );
}