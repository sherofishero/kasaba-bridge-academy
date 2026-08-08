"use client";

import Link from "next/link";
import SignBoard from "./components/SignBoard";export default function WelcomePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#204d30] via-[#11361f] to-[#06120a] text-white">

      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(35,90,50,0.15)_0%,rgba(5,15,8,0.85)_75%)]" />
      {/* Decorative Suit Symbols */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">

        {/* Decorative playing card suits */}

<div className="absolute left-48 top-16 text-[230px] font-bold text-black drop-shadow-[0_8px_12px_rgba(0,0,0,0.9)]">
  ♠
</div>

<div className="absolute right-48 top-16 text-[220px] font-bold text-red-600 drop-shadow-[0_8px_12px_rgba(0,0,0,0.9)]">
  ♥
</div>

<div className="absolute left-48 bottom-16 text-[230px] font-bold text-black drop-shadow-[0_8px_12px_rgba(0,0,0,0.9)]">
  ♣
</div>

<div className="absolute right-48 bottom-16 text-[240px] font-bold text-red-600 drop-shadow-[0_8px_12px_rgba(0,0,0,0.9)]">
  ♦
</div>

      </div>

      {/* Top Menu */}
      <header className="absolute right-10 top-8 z-20 flex gap-4">

        <Link
          href="/login"
          className="rounded-md border border-red-700 bg-black/40 px-6 py-3 font-semibold tracking-wider transition hover:bg-red-900"
        >
          GİRİŞ YAP
        </Link>

        <button className="rounded-md bg-red-800 px-6 py-3 font-semibold tracking-wider transition hover:bg-red-700">
          ÜYE OL
        </button>

      </header>
      {/* Sign */}
      <section className="relative z-10 flex w-full justify-center">
        <SignBoard />
      </section>

      {/* Bottom Text */}
      <footer
        className="
        absolute
        bottom-6
        text-center
        text-[11px]
        tracking-[0.25em]
        text-yellow-500
        "
      >
        © 2026 KASABA BRIDGE HUB • ALL RIGHTS RESERVED
      </footer>

    </main>
  );
}
