"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const menuItems = [
  {
    title: "OYUN ODASI",
    description: "Açık kulüp masalarına katıl.",
    href: "/oyun-odasi",
    color: "border-red-500",
    note: "• ODAMIZ AÇIK •",
    noteColor: "text-green-500",
  },
  {
    title: "TURNUVA ODASI",
    description: "İkili ve takım maçları.",
    href: "/yakinda",
    color: "border-red-500",
    note: "• YAKINDA AKTİF •",
    noteColor: "text-red-500",
  },
  {
    title: "ÇALIŞMA ODASI",
    description: "Özel el dağılımları ile çalışma.",
    href: "/egitim",
    color: "border-yellow-600",
    note: "• ÇALIŞMA ODAMIZ AÇIK •",
    noteColor: "text-green-500",
  },
  {
    title: "EĞİTİM ODASI",
    description: "Eğitimler burada verilecek.",
    href: "/yakinda",
    color: "border-red-600",
    note: "• YAKINDA AKTİF •",
    noteColor: "text-red-500",
  },
  {
    title: "EL ANALİZİ",
    description: "Dağılımlar üzerinde çalışmalar.",
    href: "/yakinda",
    color: "border-red-500",
    note: "• YAKINDA AKTİF •",
    noteColor: "text-red-500",
  },
  {
    title: "FORUM",
    description: "Kulüp üyeleriyle fikir alışverişi.",
    href: "/yakinda",
    color: "border-red-500",
    note: "• YAKINDA AKTİF •",
    noteColor: "text-red-500",
  },
  {
    title: "KULÜBÜMÜZ",
    description: "Duyurular ve kulüp bilgileri.",
    href: "/yakinda",
    color: "border-red-500",
    note: "• YAKINDA AKTİF •",
    noteColor: "text-red-500",
  },
  {
    title: "KÜTÜPHANE",
    description: "Yayınlar, sistemler ve anlaşmalar.",
    href: "/yakinda",
    color: "border-red-500",
    note: "• YAKINDA AKTİF •",
    noteColor: "text-red-500",
  },
];

export default function Home() {
  const [username, setUsername] = useState("");

  useEffect(() => {
    const name =
      localStorage.getItem("guestName");

    if (name) {
      setUsername(name);
    }
  }, []);

  function logout() {
    localStorage.removeItem("guestName");
    window.location.reload();
  }

  return (
    <main
      className="min-h-screen w-full max-w-full overflow-x-hidden text-yellow-300"
      style={{
        backgroundColor: "#011100",
        colorScheme: "dark",
      }}
    >
      <div className="mx-auto w-full max-w-full overflow-x-hidden md:max-w-[1500px] md:border-x md:border-red-800">

        {/* HEADER */}
        <header className="relative flex flex-col items-center gap-2 border-b border-red-800 px-4 py-2 sm:px-6 md:min-h-[76px] md:flex-row md:items-center md:justify-end md:gap-3 md:px-8 md:py-3">
          <h1 className="order-first w-full text-center text-lg font-black leading-tight tracking-[0.1em] text-yellow-400 drop-shadow-[0_0_10px_rgba(255,200,0,0.35)] sm:text-2xl md:absolute md:left-1/2 md:order-none md:w-auto md:-translate-x-1/2 md:text-4xl md:tracking-[0.18em]">
            KASABA BRİDGE HUB
          </h1>

          {username ? (
            <div className="flex w-full flex-wrap items-center justify-center gap-2 md:w-auto md:flex-nowrap md:justify-end md:gap-3">
              <div className="max-w-full truncate rounded-lg border border-yellow-700 px-3 py-1.5 text-sm text-yellow-300 md:px-4 md:py-2 md:text-base">
                👤 {username} 
              </div>

              <button
                onClick={logout}
                className="rounded-lg border border-red-700 px-3 py-1.5 text-sm transition hover:bg-red-900 md:px-4 md:py-2 md:text-base"
              >
                ÇIKIŞ YAP
              </button>
            </div>
          ) : (
            <div className="flex w-full flex-wrap items-center justify-center gap-2 md:w-auto md:flex-nowrap md:justify-end md:gap-3">
              <Link
                href="/login"
                className="rounded-lg border border-red-700 px-3 py-1.5 text-sm transition hover:bg-red-900 md:px-4 md:py-2 md:text-base"
              >
                GİRİŞ
              </Link>

              <Link
                href="/uye-ol"
                className="rounded-lg bg-red-800 px-3 py-1.5 text-sm hover:bg-red-700 md:px-4 md:py-2 md:text-base"
              >
                ÜYE OL
              </Link>
            </div>
          )}
        </header>

        {/* ODALAR */}
        <section className="mx-auto w-full max-w-[1180px] px-3 pb-4 pt-3 sm:px-6 sm:pt-6 md:pb-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
            {menuItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={`flex min-h-[108px] flex-col justify-center rounded-2xl border ${item.color} bg-[#080808] px-4 py-3 transition hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,220,0,.18)] md:h-[145px] md:min-h-0 md:px-5 md:py-4`}
              >
                <h2 className="text-center text-xl font-bold leading-tight text-yellow-400 md:text-2xl">
                  {item.title}
                </h2>

                <div className="mx-auto my-2 h-[2px] w-20 bg-red-600 md:my-3" />

                <p className="whitespace-pre-line text-center text-sm leading-5 text-yellow-200 md:text-base md:leading-6">
                  {item.description}
                </p>

                {item.note && (
                  <p
                    className={`mt-2 text-center text-xs font-semibold sm:text-sm md:mt-3 ${item.noteColor}`}
                  >
                    {item.note}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-red-800 px-3 py-2 text-center text-xs text-yellow-500 sm:text-sm">
          © 2026 KASABA BRIDGE HUB
        </footer>

      </div>
    </main>
  );
}