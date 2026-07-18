"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const menuItems = [
  {
    title: "EĞİTİM ODALARI",
    description: "eğitimlerimiz burada verilecek",
    href: "/yakinda",
    color: "border-red-600",
    note: "• Yakında Aktif •",
    noteColor: "text-red-500",
  },
  {
    title: "ÇALIŞMA ODALARI",
    description: "Eğitim dağılımları ile\nçalışma masaları.",
    href: "/egitim",
    color: "border-yellow-600",
    note: "• Mevcut Masamız Burada •",
    noteColor: "text-green-500",
  },
  {
    title: "OYUN ODALARI",
    description: "Açık kulüp masalarını gör,\nkatıl veya yeni masa oluştur.",
    href: "/yakinda",
    color: "border-yellow-600",
  },
  {
    title: "TURNUVA ODASI",
    description: "ikili, takım maçları\nve sonuçlar.",
    href: "/yakinda",
    color: "border-yellow-600",
  },
  {
    title: "EL ANALİZİ",
    description: "Dağılımlar üzerinde\nçalışmalar.",
    href: "/yakinda",
    color: "border-yellow-600",
  },
  {
    title: "FORUM",
    description: "Kulüp üyeleriyle fikir\nalışverişi yap.",
    href: "/yakinda",
    color: "border-yellow-600",
  },
  {
    title: "KULÜBÜMÜZ",
    description: "Duyurular ve kulüp\nbilgileri.",
    href: "/yakinda",
    color: "border-yellow-600",
  },
  {
    title: "KÜTÜPHANE ODASI",
    description: "briç yayınları,sistem ve ortaklık anlaşmaları.",
    href: "/yakinda",
    color: "border-yellow-600",
  },
];

const messages = [
  { time: "02:12", name: "Başkan", color: "text-green-400", text: "saat 23 maç" },
  { time: "02:13", name: "shero", color: "text-fuchsia-400", text: "brom yoksa bende yokum" },
  { time: "02:14", name: "Zafer", color: "text-sky-400", text: "rakımı alıp geliyorum" },
  { time: "02:15", name: "Kadir", color: "text-red-400", text: "madem başkanlık emri, mecbur geleceğiz" },
  { time: "02:15", name: "Sistem", color: "text-yellow-300", text: "Hoş geldin shero!" },
];

export default function Home() {
  const [username, setUsername] = useState("");

  useEffect(() => {
    const name = localStorage.getItem("guestName");

    if (name) {
      setUsername(name);
    }
  }, []);

  function logout() {
    localStorage.removeItem("guestName");
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-black text-yellow-300">
      <div className="mx-auto max-w-[1500px] border-x border-red-800">
        <header className="flex items-center justify-end border-b border-red-800 px-8 py-4">
          {username ? (
            <div className="flex gap-4">
              <div className="rounded-lg border border-yellow-700 px-5 py-3 text-yellow-300">
                👤 {username} (Misafir)
              </div>

              <button
                onClick={logout}
                className="rounded-lg border border-red-700 px-5 py-3 transition hover:bg-red-900"
              >
                ÇIKIŞ YAP
              </button>
            </div>
          ) : (
            <div className="flex gap-4">
              <Link
                href="/login"
                className="rounded-lg border border-red-700 px-5 py-3 transition hover:bg-red-900"
              >
                GİRİŞ
              </Link>

              <button className="rounded-lg bg-red-800 px-5 py-3 hover:bg-red-700">
                ÜYE OL
              </button>
            </div>
          )}
        </header>

        <section className="px-8 pt-10">
          <div className="mx-auto flex w-full max-w-[760px] items-center gap-8 rounded-3xl border-2 border-red-600 bg-[#120808] px-10 py-8 shadow-[0_0_40px_rgba(255,0,0,.35)]">
            <div className="text-8xl">🂡</div>

            <div>
              <h1 className="text-7xl font-black tracking-wide text-yellow-400">
                MASA AÇ
              </h1>

              <p className="mt-3 text-2xl text-yellow-300">
                Hemen yeni bir masa oluştur
              </p>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-4xl text-center text-2xl leading-10 text-yellow-300">
            Eğitim, ortaklık geliştirme, online masa,
            turnuva ve analiz araçlarını tek çatı altında
            buluşturan dijital briç kulübüne hoş geldiniz.
          </p>
        </section>

        <section className="mx-auto mt-10 max-w-[1180px] px-6">
          <div className="grid grid-cols-4 gap-5">
            {menuItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className={`rounded-2xl border ${item.color} bg-[#080808] p-6 transition hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,220,0,.18)]`}
              >
                <div className="text-center text-5xl">
                  {item.icon}
                </div>

                <h2 className="mt-4 text-center text-3xl font-bold text-yellow-400">
                  {item.title}
                </h2>

                <div className="mx-auto my-4 h-[2px] w-28 bg-red-600"></div>

                <p className="whitespace-pre-line text-center text-lg leading-8 text-yellow-200">
                  {item.description}
                </p>

                {item.note && (
                  <p className={`mt-4 text-center font-semibold ${item.noteColor}`}>
                    {item.note}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
        <section className="mx-auto mt-8 max-w-[1180px] px-6 pb-10">
          <div className="rounded-2xl border border-yellow-700 bg-[#050505]">
            <div className="flex items-center justify-between border-b border-yellow-700 px-5 py-3">
              <h3 className="text-3xl font-bold text-yellow-400">
                💬 SOHBET
              </h3>

              <div className="flex gap-5 text-3xl">
                <span>😊</span>
                <span>👥</span>
              </div>
            </div>

            <div className="h-64 overflow-y-auto px-5 py-4 text-xl">
              {messages.map((msg, index) => (
                <div key={index} className="mb-3 flex gap-3">
                  <span className="text-zinc-500">
                    [{msg.time}]
                  </span>

                  <span className={msg.color}>
                    {msg.name}:
                  </span>

                  <span className="text-zinc-200">
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-4 border-t border-yellow-700 p-4">
              <input
                type="text"
                placeholder="Mesajınızı yazın..."
                className="flex-1 rounded-lg border border-zinc-700 bg-black px-4 py-3 text-lg text-yellow-200 outline-none focus:border-yellow-500"
              />

              <button className="rounded-lg border border-red-700 bg-red-900 px-8 py-3 text-lg font-semibold text-yellow-300 transition hover:bg-red-800">
                GÖNDER
              </button>
            </div>
          </div>
        </section>

        <footer className="border-t border-red-800 py-6 text-center text-lg text-yellow-500">
          © 2026 KASABA BRIDGE CLUB
        </footer>
      </div>
    </main>
  );
}

