"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LobbyPage() {
  const [username, setUsername] = useState("");
const router = useRouter();

function backToHome() {
  router.push("/");
}
  useEffect(() => {
    const name =
      localStorage.getItem("guestName") || "Misafir";

    setUsername(name);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-8">

      <div className="max-w-6xl mx-auto">
<div className="mb-8">
  <button
    onClick={backToHome}
    className="rounded-lg border border-red-700 px-4 py-2 hover:bg-red-900 transition"
  >
    ← Ana Sayfaya Dön
  </button>
</div>
        
        <h1 className="text-5xl font-bold">
          LOBİ
        </h1>

        <p className="mt-4 text-xl text-red-400">
          Hoş geldin, {username}
        </p>

        <div className="mt-10 rounded-xl border border-yellow-700 bg-yellow-950/30 p-5">

          <h2 className="text-xl font-bold text-yellow-300">
            Misafir Olarak Giriş Yaptınız
          </h2>

          <p className="mt-3 text-zinc-300">
            Şu anda misafir hesabı kullanıyorsunuz.
          </p>

          <p className="mt-2 text-zinc-400">
            Üyeliğinizi tamamladığınızda kalıcı profil,
            arkadaş listesi, masa yönetimi ve diğer
            özellikler aktif olacaktır.
          </p>

        </div>

        <div className="mt-12 rounded-xl border border-red-800 bg-zinc-900 p-6">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-2xl font-bold">
                Masa 1
              </h2>

              <p className="text-zinc-400 mt-2">
                Host : {username}
              </p>

              <p className="text-zinc-400">
                Oyuncu : 0 / 4
              </p>

              <p className="text-zinc-400">
                Seyirci : 0
              </p>

            </div>

            <Link
              href="/masa"
              className="rounded-xl bg-red-700 hover:bg-red-600 px-8 py-3 font-bold transition"
            >
              Masaya Gir
            </Link>

          </div>

        </div>

      </div>

    </main>
  );
}