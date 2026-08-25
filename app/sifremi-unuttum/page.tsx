"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

/*
 * Şifremi Unuttum
 *
 * Supabase Auth'un mevcut password reset (recovery) akışını kullanır.
 * Reset maili, production adresimizdeki /sifre-sifirla sayfasına
 * dönmesi için redirectTo parametresiyle gönderilir.
 */
const PRODUCTION_RESET_URL =
  "https://www.kasababridge.hub.com/sifre-sifirla";

export default function SifremiUnuttumPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function sendResetEmail() {
    const mail = email.trim();

    if (!mail) {
      setErrorMessage("Lütfen e-mail adresinizi giriniz.");
      return;
    }

    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(mail, {
        redirectTo: PRODUCTION_RESET_URL,
      });

      if (error) {
        console.error("Şifre sıfırlama maili gönderilemedi:", error);
        setErrorMessage(
          "Şifre sıfırlama maili gönderilemedi: " +
            (error.message ?? "Bilinmeyen bir hata oluştu.")
        );
        return;
      }

      setSuccessMessage(
        "Şifre sıfırlama bağlantısı e-mail adresinize gönderildi. " +
          "Lütfen e-mail kutunuzu kontrol edin."
      );
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
      <div className="absolute inset-0 bg-black/35" />

      {/* Form kutusu */}
      <div className="relative z-10 w-full max-w-md bg-[#0b2415]/90 border border-red-800 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-center text-yellow-300">
          Şifremi Unuttum
        </h1>

        <p className="text-yellow-200 text-center mt-3">
          Üyelikte kullandığınız e-mail adresini girin. Size şifre sıfırlama
          bağlantısı gönderelim.
        </p>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mt-6 p-3 rounded-lg bg-black/50 border border-green-800 outline-none text-yellow-100 placeholder:text-yellow-100/50"
        />

        {successMessage && (
          <div className="mt-4 rounded-lg border border-green-700 bg-green-950/40 p-4">
            <p className="text-sm text-green-200">{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-lg border border-red-700 bg-red-950/40 p-4">
            <p className="text-sm text-red-300">{errorMessage}</p>
          </div>
        )}

        <button
          type="button"
          onClick={sendResetEmail}
          disabled={loading}
          className="w-full mt-6 bg-red-700 hover:bg-red-600 rounded-lg py-3 font-bold transition text-yellow-100 disabled:opacity-50"
        >
          {loading ? "Gönderiliyor..." : "Sıfırlama Maili Gönder"}
        </button>

        <Link
          href="/login"
          className="block text-center mt-6 text-yellow-400 hover:text-yellow-200"
        >
          Giriş Ekranına Dön
        </Link>
      </div>
    </main>
  );
}
