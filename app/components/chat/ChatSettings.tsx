"use client";

export default function ChatSettings() {
  return (
    <div
      className="
        absolute
        top-12
        right-4
        w-56
        rounded-xl
        border
        border-red-800
        bg-zinc-950
        shadow-2xl
        overflow-hidden
      "
    >
      <button
        className="
          w-full
          px-4
          py-3
          text-left
          text-yellow-300
          hover:bg-zinc-900
        "
      >
        📍 Alta Yerleştir
      </button>

      <button
        className="
          w-full
          px-4
          py-3
          text-left
          text-yellow-300
          hover:bg-zinc-900
        "
      >
        ⬅ Sola Yerleştir
      </button>

      <button
        className="
          w-full
          px-4
          py-3
          text-left
          text-yellow-300
          hover:bg-zinc-900
        "
      >
        ➡ Sağa Yerleştir
      </button>

      <div className="border-t border-red-800" />

      <button
        className="
          w-full
          px-4
          py-3
          text-left
          text-yellow-300
          hover:bg-zinc-900
        "
      >
        🗕 Daralt
      </button>

      <button
        className="
          w-full
          px-4
          py-3
          text-left
          text-red-400
          hover:bg-red-950
        "
      >
        ✕ Kapat
      </button>
    </div>
  );
}