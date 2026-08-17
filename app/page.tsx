"use client";

import Link from "next/link";
import Image from "next/image";

export default function WelcomePage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden text-white"
      style={{
        backgroundColor: "#011100",
        colorScheme: "dark",
      }}
    >
            <Image
        src="/kasabagiris16x9.png"
        alt="Kasaba Bridge Hub"
        fill
        priority
        className="object-contain scale-[1.03] pointer-events-none"
      />

      {/* Gerçek butonlar */}
      <div className="absolute inset-0 z-10">

        {/* GİRİŞ YAP */}
        <Link
          href="/login"
          className="absolute left-[40%] top-[76%] z-50 h-[58px] w-[220px] -translate-x-1/2 cursor-pointer rounded-lg"
          aria-label="Giriş Yap"
        >
          <span className="sr-only">Giriş Yap</span>
        </Link>

        {/* ÜYE OL */}
        <Link
          href="/uye-ol"
          className="absolute left-[60%] top-[76%] z-50 h-[58px] w-[220px] -translate-x-1/2 cursor-pointer rounded-lg"
          aria-label="Üye Ol"
        >
          <span className="sr-only">Üye Ol</span>
        </Link>

      </div>
    </main>
  );
}