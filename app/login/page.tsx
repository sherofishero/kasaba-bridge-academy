"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const [memberUsername, setMemberUsername] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [guestUsername, setGuestUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // E-mail doğrulaması tamamlanmamış kullanıcının e-mail adresi.
  // Bu durumda "Doğrulama mailini tekrar gönder" seçeneği sunulur.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const router = useRouter();

  async function memberLogin() {
    const name = memberUsername.trim();

    if (!name) {
      alert("Lütfen kullanıcı adınızı giriniz.");
      return;
    }

    if (!memberPassword) {
      alert("Lütfen şifrenizi giriniz.");
      return;
    }

    setLoading(true);
    setUnconfirmedEmail(null);
    setResendMessage(null);

    try {
      // 1. Kullanıcı adına göre profili bul
      const { data: userEmail, error: profileError } =
        await supabase.rpc("get_email_by_username", {
          p_username: name,
        });

      if (profileError || !userEmail) {
        alert("Kullanıcı adı veya şifre hatalı.");
        return;
      }

      // 2. Bulunan e-mail + şifre ile Supabase Auth'a giriş yap
      const { data, error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: memberPassword,
      });

      if (error || !data.user) {
        // E-mail doğrulaması tamamlanmamışsa kullanıcıya
        // "şifre hatalı" yerine açık bir uyarı göster.
        const errorCode =
          (error as { code?: string } | null)?.code ?? "";
        const errorMessage = error?.message?.toLowerCase() ?? "";

        if (
          errorCode === "email_not_confirmed" ||
          errorMessage.includes("not confirmed") ||
          errorMessage.includes("confirm")
        ) {
          setUnconfirmedEmail(userEmail);
          return;
        }

        alert("Kullanıcı adı veya şifre hatalı.");
        return;
      }

      // 3. Bu giriş için benzersiz bir oturum ID'si oluştur
      const sessionId = crypto.randomUUID();

      // 4. Bu kullanıcı için aktif oturumu kaydet
      const { error: sessionError } = await supabase
        .from("user_sessions")
        .upsert({
          user_id: data.user.id,
          session_id: sessionId,
          updated_at: new Date().toISOString(),
        });

      if (sessionError) {
        console.error("Session kaydedilemedi:", sessionError);
        alert("Oturum oluşturulamadı.");
        return;
      }

      // 5. Oturum ID'sini tarayıcıda sakla
      localStorage.setItem("kasabaSessionId", sessionId);
      localStorage.setItem("guestName", name);

      // 6. Salona geç
      router.push("/salon");
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmationEmail() {
    if (!unconfirmedEmail) {
      return;
    }

    setResendLoading(true);
    setResendMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: unconfirmedEmail,
      });

      if (error) {
        console.error("Doğrulama maili gönderilemedi:", error);
        setResendMessage(
          "Doğrulama maili gönderilemedi: " +
            (error.message ?? "Bilinmeyen bir hata oluştu.")
        );
        return;
      }

      setResendMessage(
        "Doğrulama maili tekrar gönderildi. Lütfen e-mail kutunuzu kontrol edin."
      );
    } finally {
      setResendLoading(false);
    }
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

            <div className="relative mt-4">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Şifre"
                value={memberPassword}
                onChange={(e) => setMemberPassword(e.target.value)}
                className="w-full p-3 pr-12 rounded-lg bg-black/50 border border-green-800 outline-none"
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

            {unconfirmedEmail && (
              <div className="mt-4 rounded-lg border border-red-700 bg-red-950/40 p-4">
                <p className="text-sm font-bold text-red-300">
                  E-mail adresinizi doğrulamanız gerekiyor.
                </p>

                <p className="mt-1 text-sm text-zinc-300">
                  Giriş yapmadan önce e-mail adresinize gönderdiğimiz
                  doğrulama bağlantısına tıklayın.
                </p>

                <button
                  type="button"
                  onClick={resendConfirmationEmail}
                  disabled={resendLoading}
                  className="mt-3 w-full bg-green-700 hover:bg-green-600 rounded-lg py-2 text-sm font-bold transition disabled:opacity-50"
                >
                  {resendLoading
                    ? "Gönderiliyor..."
                    : "Doğrulama Mailini Tekrar Gönder"}
                </button>

                {resendMessage && (
                  <p className="mt-2 text-sm text-yellow-200">
                    {resendMessage}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={memberLogin}
              disabled={loading}
              className="w-full mt-6 bg-red-700 hover:bg-red-600 rounded-lg py-3 font-bold transition disabled:opacity-50"
            >
              {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
            </button>

            <Link
              href="/sifremi-unuttum"
              className="block text-center mt-4 text-sm text-yellow-300 hover:text-yellow-200"
            >
              Şifremi Unuttum
            </Link>
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