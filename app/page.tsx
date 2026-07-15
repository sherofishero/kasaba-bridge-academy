"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const menuItems = [
  { title: "Ortaklık Masası", link: "/masa" },
  { title: "Dersler", link: "/yakinda" },
  { title: "Konvansiyonlar", link: "/yakinda" },
  { title: "XXXXXX", link: "/yakinda" },
  { title: "XXXXXX", link: "/yakinda" },
  { title: "XXXXXX", link: "/yakinda" },
  { title: "XXXXXX", link: "/yakinda" },
  { title: "XXXXXX", link: "/yakinda" },
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
    <main className="min-h-screen bg-black text-white">
      {/* Üst Menü */}
      <header className="flex justify-end items-center gap-4 p-6">

  {username ? (
    <>
      <span className="text-zinc-300">
        👤 {username} (Misafir)
      </span>

      <button
        onClick={logout}
        className="text-sm border border-red-700 px-4 py-2 rounded hover:bg-red-900 transition"
      >
        ÇIKIŞ YAP
      </button>
    </>
  ) : (
    <>
      <Link
        href="/login"
        className="text-sm border border-red-700 px-4 py-2 rounded hover:bg-red-900 transition"
      >
        GİRİŞ
      </Link>

      <button className="text-sm bg-red-800 hover:bg-red-700 px-4 py-2 rounded transition">
        ÜYE OL
      </button>
    </>
  )}

</header>
      {/* Logo */}
      <section className="text-center mt-8">
        <h1 className="text-6xl font-bold tracking-widest">
          KASABALILAR
        </h1>

        <h2 className="text-3xl text-red-500 mt-2">
          BRIDGE CLUB
        </h2>

        <div className="w-40 h-px bg-red-700 mx-auto mt-6"></div>

        <div className="h-10"></div>
      </section>

      {/* Menü */}
      <section className="max-w-5xl mx-auto mt-8 px-6">
        <div className="grid grid-cols-2 gap-6">
          {menuItems.map((item, index) =>
            item.link ? (
              <Link
                key={`${item.title}-${index}`}
                href={item.link}
                className="bg-zinc-900 border border-red-800 rounded-xl p-8 text-center text-xl hover:bg-red-900 transition"
              >
                {item.title}
              </Link>
            ) : (
              <button
                key={`${item.title}-${index}`}
                className="bg-zinc-900 border border-red-800 rounded-xl p-8 text-xl hover:bg-red-900 transition"
              >
                {item.title}
              </button>
            )
          )}
        </div>
      </section>
    </main>
  );
}