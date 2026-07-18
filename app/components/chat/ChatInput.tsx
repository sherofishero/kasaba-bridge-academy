"use client";

export default function ChatInput() {
  return (
    <div
      className="
        flex
        items-center
        gap-3
        border-t
        border-red-800
        bg-zinc-900
        p-3
      "
    >
      <input
        type="text"
        placeholder="Mesajınızı yazın..."
        className="
          flex-1
          rounded-lg
          border
          border-zinc-700
          bg-black
          px-4
          py-2
          text-yellow-200
          outline-none
          placeholder:text-zinc-500
          focus:border-yellow-500
        "
      />

      <button
        className="
          rounded-lg
          border
          border-red-700
          bg-red-900
          px-6
          py-2
          font-semibold
          text-yellow-300
          transition
          hover:bg-red-800
        "
      >
        GÖNDER
      </button>
    </div>
  );
}