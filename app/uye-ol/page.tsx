"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function UyeOlPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordAgain, setShowPasswordAgain] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function uyeOl() {
    const name = username.trim();
    const mail = email.trim();

    if (!name) {
      alert("Lütfen bir kullanıcı adı giriniz.");
      return;
    }

    if (!mail) {
      alert("Lütfen e-mail adresinizi giriniz.");
      return;
    }

    if (!password) {
      alert("Lütfen bir şifre giriniz.");
      return;
    }

    if (password.length < 6) {
      alert("Şifreniz en az 6 karakter olmalıdır.");
      return;
    }

    if (password !== passwordAgain) {
      alert("Şifreler aynı değil.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: {
          data: {
            username: name,
          },
        },
      });

      if (error) {
        console.error("Supabase signup error:", error);

        if (
          error.message?.toLowerCase().includes("already") ||
          error.message?.toLowerCase().includes("registered")
        ) {
          alert("Bu e-mail adresiyle zaten bir üyelik bulunuyor.");
        } else {
          alert(`Üyelik oluşturulamadı: ${error.message}`);
        }

        return;
      }

      if (!data.user) {
        alert("Üyelik oluşturulamadı.");
        return;
      }

      // E-mail doğrulaması açık olduğu için kullanıcı
      // henüz oturum açmış olmayabilir.
      if (!data.session) {
        alert(
          "Üyeliğiniz oluşturuldu.\n\n" +
          "E-mail adresinize gönderdiğimiz doğrulama bağlantısına tıklayın. " +
          "Sonrasında Kullanıcı Adı ve Şifreniz ile giriş yapabilirsiniz."
        );

        return;
      }

      localStorage.setItem("guestName", name);
      router.push("/salon");
    } finally {
      setLoading(false);
    }
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
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-4 p-3 rounded-lg bg-black/50 border border-green-800 outline-none text-yellow-100 placeholder:text-yellow-100/50"
        />

        <div className="relative mt-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 pr-12 rounded-lg bg-black/50 border border-green-800 outline-none text-yellow-100 placeholder:text-yellow-100/50"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-300 hover:text-yellow-100"
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <div className="relative mt-4">
          <input
            type={showPasswordAgain ? "text" : "password"}
            placeholder="Şifre Tekrar"
            value={passwordAgain}
            onChange={(e) => setPasswordAgain(e.target.value)}
            className="w-full p-3 pr-12 rounded-lg bg-black/50 border border-green-800 outline-none text-yellow-100 placeholder:text-yellow-100/50"
          />

          <button
            type="button"
            onClick={() => setShowPasswordAgain(!showPasswordAgain)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-yellow-300 hover:text-yellow-100"
            aria-label={
              showPasswordAgain ? "Şifreyi gizle" : "Şifreyi göster"
            }
          >
            {showPasswordAgain ? "🙈" : "👁️"}
          </button>
        </div>

        <button
          type="button"
          onClick={uyeOl}
          disabled={loading}
          className="w-full mt-6 bg-red-700 hover:bg-red-600 rounded-lg py-3 font-bold transition text-yellow-100 disabled:opacity-50"
        >
          {loading ? "Üyelik Oluşturuluyor..." : "Üye Ol"}
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