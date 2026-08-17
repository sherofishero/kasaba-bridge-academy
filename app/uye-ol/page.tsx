"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UyeOlPage() {
  const [username, setUsername] = useState("");
  const router = useRouter();

  function uyeOl() {
    const name = username.trim();

    if (!name) {
      alert("Lütfen bir kullanıcı adı giriniz.");
      return;
    }

    localStorage.setItem("guestName", name);
    router.push("/salon");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#011100] text-yellow-100 flex items-center justify-center px-6">

      {/* Ana sayfa atmosferi */}
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center blur-[3px] opacity-70"
        style={{
          backgroundImage: 'url("/kasabagiris16x9.png")',
        }}
      />

      {/* Koyu perde */}
      <div className="absolute inset-0 bg-black/25" />

      {/* Üyelik kutusu */}
      <div className="relative z-10 w-full max-w-md bg-[#0b2415]/90 border border-red-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">

        <h1 className="text-4xl font-bold text-center text-yellow-300">
          Üye Ol
        </h1>

        <p className="text-yellow-200 text-center mt-3">
          Kasaba Bridge Hub
        </p>

        <input
          type="text"
          placeholder="Kullanıcı Adı"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mt-8 p-3 rounded-lg bg-black/50 border border-green-800 outline-none text-yellow-100 placeholder:text-yellow-100/50"
        />

        <input
          type="password"
          placeholder="Şifre"
          className="w-full mt-4 p-3 rounded-lg bg-black/50 border border-green-800 outline-none text-yellow-100 placeholder:text-yellow-100/50"
        />

        <button
          type="button"
          onClick={uyeOl}
          className="w-full mt-6 bg-red-700 hover:bg-red-600 rounded-lg py-3 font-bold transition text-yellow-100"
        >
          Üye Ol
        </button>

        <Link
          href="/"
          className="block text-center mt-6 text-yellow-400 hover:text-yellow-200"
        >
          Geri Dön
        </Link>

      </div>
    </main>
  );
}