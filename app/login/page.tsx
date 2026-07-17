"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");

const router = useRouter();

function guestLogin() {
  const name = username.trim();

  if (!name) {
    alert("Lütfen bir kullanıcı adı giriniz.");
    return;
  }

  localStorage.setItem("guestName", name);

  router.push("/salon");
}
    return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md bg-zinc-900 border border-red-800 rounded-2xl p-8">
        <h1 className="text-4xl font-bold text-center">
          Giriş Yap
        </h1>

        <p className="text-zinc-400 text-center mt-3">
          Kasabalılar Bridge Academy
        </p>

        <input
  type="text"
  placeholder="Kullanıcı Adı"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  className="w-full mt-8 p-3 rounded-lg bg-zinc-800 border border-zinc-700 outline-none"
/>

        <input
          type="password"
          placeholder="Şifre"
          className="w-full mt-4 p-3 rounded-lg bg-zinc-800 border border-zinc-700 outline-none"
        />

        
         <button
  onClick={guestLogin} 
          className="w-full mt-6 bg-red-700 hover:bg-red-600 rounded-lg py-3 font-bold transition"
        >
          Giriş Yap
        </button>

        <Link
          href="/"
          className="block text-center mt-6 text-zinc-400 hover:text-white"
        >
          Ana Sayfaya Dön
        </Link>

        <div className="mt-8 rounded-xl border border-yellow-700 bg-yellow-950/30 p-4">
          <h2 className="text-lg font-bold text-yellow-300">
            Misafir Girişi
          </h2>

          <p className="mt-3 text-sm text-zinc-300 leading-6">
            Şu anda <span className="font-semibold">misafir</span> olarak giriş
            yapıyorsunuz.
          </p>

          <p className="mt-2 text-sm text-zinc-400 leading-6">
            Misafir kullanıcılar kulübe giriş yapabilir, açık masaları
            görüntüleyebilir ve davet edildiklerinde masalara katılabilir.
          </p>

          <p className="mt-2 text-sm text-zinc-400 leading-6">
            Kalıcı profil oluşturmak, arkadaş eklemek, masa yönetmek ve tüm
            özelliklerden yararlanmak için üyeliğinizi tamamlamanız gerekir.
          </p>

          <p className="mt-3 text-sm font-semibold text-yellow-300">
            Misafir hesabı geçicidir.
          </p>

          <div className="mt-5 flex gap-3">
            <button className="flex-1 rounded-lg bg-red-700 py-2 font-bold hover:bg-red-600 transition">
              Üyeliği Tamamla
            </button>

            <button className="flex-1 rounded-lg border border-zinc-600 py-2 font-bold hover:bg-zinc-800 transition">
              Daha Sonra
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
