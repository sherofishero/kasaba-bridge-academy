"use client";

import Link from "next/link";

export default function WelcomePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white">

      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#111_0%,#000_70%)]" />

      {/* Decorative Suit Symbols */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">

        <div className="absolute left-8 top-8 text-[260px] font-bold text-white/10 drop-shadow-2xl">
          ♠
        </div>

        <div className="absolute right-12 top-20 text-[220px] font-bold text-red-700/20 drop-shadow-2xl">
          ♥
        </div>

        <div className="absolute left-16 bottom-8 text-[230px] font-bold text-white/10 drop-shadow-2xl">
          ♣
        </div>

        <div className="absolute right-12 bottom-10 text-[240px] font-bold text-red-700/20 drop-shadow-2xl">
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
      <section className="relative z-10">

        {/* Outer Shadow */}
        <div className="rounded-[30px] bg-black p-5 shadow-[0_0_60px_rgba(0,0,0,0.9)]">

          {/* Wooden Frame */}
          <div
            className="
            rounded-[26px]
            border-[18px]
            border-[#3f220d]
            bg-[#5a3315]
            p-4
            shadow-[0_0_30px_rgba(0,0,0,.8)]
          "
          >

            {/* Green Felt */}
            <div
              className="
              rounded-xl
              border
              border-[#b89b54]
              bg-[#114b1f]
              px-28
              py-20
              text-center
              shadow-inner
            "
            >              <h1
                className="
                text-8xl
                font-black
                tracking-[0.35em]
                text-red-600
                drop-shadow-[0_4px_10px_rgba(0,0,0,.9)]
              "
              >
                KASABA
              </h1>

              <div className="mx-auto my-8 h-[2px] w-72 bg-[#b89b54]" />

              <h2
                className="
                text-5xl
                font-extrabold
                tracking-[0.28em]
                text-yellow-300
                drop-shadow-[0_3px_6px_rgba(0,0,0,.8)]
              "
              >
                Bridge Club
              </h2>

              <Link
                href="/salon"
                className="mt-8 inline-block rounded-lg bg-red-800 px-8 py-3 font-bold tracking-wider transition hover:bg-red-700"
              >
                MASAYA OTUR
              </Link>

            </div>

          </div>

        </div>

      </section>

      {/* Bottom Text */}
      <footer
        className="
        absolute
        bottom-6
        text-center
        text-[11px]
        tracking-[0.25em]
        text-gray-500
        "
        >
        © 2026 KASABA BRIDGE CLUB • ALL RIGHTS RESERVED
      </footer>

    </main>
  );
}
