"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const menuItems = [
  {
    title: "OYUN ODASI",
    description: "Açık kulüp masalarına katıl.",
    href: "/yakinda",
    color: "border-red-500",
    note: "• YAKINDA AKTİF •",
    noteColor: "text-red-500",
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
    description: "Eğitim dağılımları ile çalışma.",
    href: "/egitim",
    color: "border-yellow-600",
    note: "• AKTİF MASALAR •",
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
      className="min-h-screen text-yellow-300"
      style={{
        backgroundColor: "#011100",
        colorScheme: "dark",
      }}
    >
      <div className="mx-auto max-w-[1500px] border-x border-red-800">

        {/* HEADER */}
        <header className="relative flex items-center justify-end border-b border-red-800 px-8 py-3">
          <h1 className="absolute left-1/2 -translate-x-1/2 text-4xl font-black tracking-[0.18em] text-yellow-400 drop-shadow-[0_0_10px_rgba(255,200,0,0.35)]">
            KASABA BRİDGE HUB
          </h1>

          {username ? (
            <div className="flex gap-3">
              <div className="rounded-lg border border-yellow-700 px-4 py-2 text-yellow-300">
                👤 {username} (Misafir)
              </div>

              <button
                onClick={logout}
                className="rounded-lg border border-red-700 px-4 py-2 transition hover:bg-red-900"
              >
                ÇIKIŞ YAP
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                href="/login"
                className="rounded-lg border border-red-700 px-4 py-2 transition hover:bg-red-900"
              >
                GİRİŞ
              </Link>

              <Link
                href="/uye-ol"
                className="rounded-lg bg-red-800 px-4 py-2 hover:bg-red-700"
              >
                ÜYE OL
              </Link>
            </div>
          )}
        </header>

        {/* ODALAR */}
        <section className="mx-auto max-w-[1180px] px-6 pt-6">
          <div className="grid grid-cols-4 gap-4">
            {menuItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={`flex h-[145px] flex-col justify-center rounded-2xl border ${item.color} bg-[#080808] px-5 py-4 transition hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,220,0,.18)]`}
              >
                <h2 className="text-center text-2xl font-bold leading-tight text-yellow-400">
                  {item.title}
                </h2>

                <div className="mx-auto my-3 h-[2px] w-20 bg-red-600" />

                <p className="whitespace-pre-line text-center text-base leading-6 text-yellow-200">
                  {item.description}
                </p>

                {item.note && (
                  <p
                    className={`mt-3 text-center text-sm font-semibold ${item.noteColor}`}
                  >
                    {item.note}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-red-800 py-2 text-center text-sm text-yellow-500">
          © 2026 KASABA BRIDGE HUB
        </footer>

      </div>
    </main>
  );
}