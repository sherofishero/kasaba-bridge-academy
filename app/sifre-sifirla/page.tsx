"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

/*
 * Şifre Sıfırlama
 *
 * Supabase Auth recovery mailindeki bağlantı bu sayfaya döner.
 * - PKCE flow: URL'de ?code=... gelir, exchangeCodeForSession ile oturum açılır.
 * - Implicit flow: URL hash'inde #access_token=...&type=recovery gelir,
 *   supabase-js bunu otomatik yakalar (detectSessionInUrl).
 * Oturum açıldıktan sonra kullanıcı yeni şifresini belirler
 * (supabase.auth.updateUser). Mevcut auth altyapısı değiştirilmedi.
 */
export default function SifreSifirlaPage() {
  const [status, setStatus] = useState<"checking" | "ready" | "error">(
    "checking"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordAgain, setShowPasswordAgain] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function completeRecovery() {
      try {
        // PKCE code parametresi varsa oturuma çevir.
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");

        if (code) {
          const { error } =
            await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            throw error;
          }
        }

        if (!cancelled) {
          setStatus("ready");
        }
      } catch (error) {
        console.error("Şifre sıfırlama bağlantısı geçersiz:", error);

        if (!cancelled) {
          setErrorMessage(
            "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. " +
              "Lütfen yeni bir sıfırlama maili talep edin."
          );
          setStatus("error");
        }
      }
    }

    void completeRecovery();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updatePassword() {
    if (!password) {
      alert("Lütfen yeni şifrenizi giriniz.");
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
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error("Şifre güncellenemedi:", error);
        alert(
          "Şifreniz güncellenemedi: " +
            (error.message ?? "Bilinmeyen bir hata oluştu.")
        );
        return;
      }

      setSuccessMessage(
        "Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz."
      );

      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  }

  /* UI aşağıda */

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
          Yeni Şifre Belirle
        </h1>

        {status === "checking" && (
          <p className="text-yellow-200 text-center mt-6">
            Bağlantı doğrulanıyor...
          </p>
        )}

        {status === "error" && (
          <>
            <div className="mt-6 rounded-lg border border-red-700 bg-red-950/40 p-4">
              <p className="text-sm text-red-300">{errorMessage}</p>
            </div>

            <Link
              href="/sifremi-unuttum"
              className="block text-center mt-6 text-yellow-400 hover:text-yellow-200"
            >
              Yeni Sıfırlama Maili Talep Et
            </Link>
          </>
        )}

        {status === "ready" && successMessage && (
          <>
            <div className="mt-6 rounded-lg border border-green-700 bg-green-950/40 p-4">
              <p className="text-sm text-green-200">{successMessage}</p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full mt-6 bg-red-700 hover:bg-red-600 rounded-lg py-3 font-bold transition text-yellow-100"
            >
              Giriş Ekranına Git
            </button>
          </>
        )}

        {status === "ready" && !successMessage && (
          <>
            <p className="text-yellow-200 text-center mt-3">
              Lütfen yeni şifrenizi girin.
            </p>

            <div className="relative mt-6">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Yeni Şifre"
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
                placeholder="Yeni Şifre Tekrar"
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
              onClick={updatePassword}
              disabled={loading}
              className="w-full mt-6 bg-red-700 hover:bg-red-600 rounded-lg py-3 font-bold transition text-yellow-100 disabled:opacity-50"
            >
              {loading ? "Kaydediliyor..." : "Şifreyi Güncelle"}
            </button>
          </>
        )}

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
