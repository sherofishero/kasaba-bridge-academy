"use client";

export default function ChatTabs() {
  return (
    <div
      className="
        flex
        border-b
        border-red-800
        bg-zinc-950
      "
    >
      <button
        className="
          flex-1
          border-r
          border-red-800
          bg-red-900
          py-2
          font-bold
          tracking-wide
          text-yellow-300
        "
      >
        SALON
      </button>

      <button
        className="
          flex-1
          py-2
          font-bold
          tracking-wide
          text-zinc-400
          hover:bg-zinc-900
          hover:text-yellow-300
        "
      >
        MASA
      </button>
    </div>
  );
}