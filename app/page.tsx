"use client";

import Link from "next/link";

export default function WelcomePage() {
  return (
    <main
      className="fixed inset-0 overflow-hidden"
      style={{
        backgroundColor: "#011100",
        colorScheme: "dark",
      }}
    >
      {/* 16:9 görsel alanı */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: "min(100vw, calc(100dvh * 16 / 9))",
          aspectRatio: "16 / 9",
        }}
      >
        {/* Ana görsel */}
        <img
          src="/kasabagiris16x9.png"
          alt="Kasaba Bridge Hub"
          draggable={false}
          className="absolute inset-0 block h-full w-full select-none"
        />

        {/* TEŞHİS: GİRİŞ YAP */}
        <Link
          href="/login"
          aria-label="Giriş Yap"
          className="absolute z-[9999]"
          style={{
            left: "37.5%",
            top: "82.5%",
            width: "23%",
            height: "15%",
            transform: "translate(-50%, -50%)",

            backgroundColor: "rgba(255, 0, 0, 0.35)",
            border: "4px solid red",
            pointerEvents: "auto",
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            GİRİŞ TEST
          </span>
        </Link>

        {/* TEŞHİS: ÜYE OL */}
        <Link
          href="/uye-ol"
          aria-label="Üye Ol"
          className="absolute z-[9999]"
          style={{
            left: "61.5%",
            top: "82.5%",
            width: "25%",
            height: "15%",
            transform: "translate(-50%, -50%)",

            backgroundColor: "rgba(0, 120, 255, 0.35)",
            border: "4px solid blue",
            pointerEvents: "auto",
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            ÜYE OL TEST
          </span>
        </Link>
      </div>
    </main>
  );
}