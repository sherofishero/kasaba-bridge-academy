"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [memberUsername, setMemberUsername] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [guestUsername, setGuestUsername] = useState("");

  const router = useRouter();

  function memberLogin() {
    const name = memberUsername.trim();

    if (!name) {
      alert("Lütfen kullanıcı adınızı giriniz.");
      return;
    }

    if (!memberPassword) {
      alert("Lütfen şifrenizi giriniz.");
      return;
    }

    localStorage.setItem("guestName", name);
    router.push("/salon");
  }

  function guestLogin() {
    const name = guestUsername.trim();

    if (!name) {
      alert("Lütfen bir kullanıcı adı giriniz.");
      return;
    }

    localStorage.setItem("guestName", name);
    router.push("/salon");
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#011100] text-white flex items-center justify-center px-6"
    >
      {/* Ana sayfa atmosferi */}
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center blur-[3px] opacity-70"
        style={{
          backgroundImage: 'url("/kasabagiris16x9.png")',
        }}
      />

      {/* Koyu perde */}
      <div className="absolute inset-0 bg-black/45" />

      {/* Formlar */}
      <div className="relative z-10 w-full max-w-5xl">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ÜYE GİRİŞİ */}
          <div className="bg-[#0b2415]/90 border border-red-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
            <h1 className="text-3xl font-bold text-center text-yellow-300">
              Üye Girişi
            </h1>

            <p className="text-yellow-200 text-center mt-3">
              Kasaba Bridge Hub üyesiyim
            </p>

            <input
              type="text"
              placeholder="Kullanıcı Adı"
              value={memberUsername}
              onChange={(e) => setMemberUsername(e.target.value)}
              className="w-full mt-8 p-3 rounded-lg bg-black/50 border border-green-800 outline-none"
            />

            <input
              type="password"
              placeholder="Şifre"
              value={memberPassword}
              onChange={(e) => setMemberPassword(e.target.value)}
              className="w-full mt-4 p-3 rounded-lg bg-black/50 border border-green-800 outline-none"
            />

            <button
              type="button"
              onClick={memberLogin}
              className="w-full mt-6 bg-red-700 hover:bg-red-600 rounded-lg py-3 font-bold transition"
            >
              Giriş Yap
            </button>
          </div>

          {/* MİSAFİR GİRİŞİ */}
          <div className="bg-[#0b2415]/90 border border-yellow-700 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
            <h1 className="text-3xl font-bold text-center text-yellow-300">
              Misafir Girişi
            </h1>

            <p className="text-yellow-200 text-center mt-3">
              Üye olmadan kulübe katılabilirsiniz.
            </p>
            <div className="mt-6 rounded-xl border border-yellow-700 bg-yellow-950/30 p-4">
              <p className="text-sm text-zinc-300 leading-6">
                Misafir kullanıcılar kulübe giriş yapabilir, açık masaları
                görüntüleyebilir ve davet edildiklerinde masalara katılabilir.
              </p>

              <p className="mt-3 text-sm text-zinc-400 leading-6">
                Misafir hesabı geçicidir. Kalıcı profil oluşturmak ve tüm
                özelliklerden yararlanmak için üyelik oluşturabilirsiniz.
              </p>
            </div>

            <input
              type="text"
              placeholder="Misafir Kullanıcı Adı"
              value={guestUsername}
              onChange={(e) => setGuestUsername(e.target.value)}
              className="w-full mt-6 p-3 rounded-lg bg-black/50 border border-yellow-800 outline-none"
            />

            <button
              type="button"
              onClick={guestLogin}
              className="w-full mt-6 bg-yellow-700 hover:bg-yellow-600 rounded-lg py-3 font-bold transition"
            >
              Misafir Olarak Giriş
            </button>

            <Link
              href="/uye-ol"
              className="block text-center mt-5 text-yellow-300 hover:text-yellow-200"
            >
              Üye Olmak İstiyorum
            </Link>
          </div>

        </div>

        <Link
          href="/"
          className="block text-center mt-8 text-yellow-400 hover:text-white"
        >
          Geri Dön
        </Link>

      </div>
    </main>
  );
}