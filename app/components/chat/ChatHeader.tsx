"use client";

export default function ChatHeader() {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        border-b
        border-red-800
        bg-zinc-900
        px-4
        py-2
      "
    >
      <div
        className="
          text-lg
          font-bold
          tracking-wide
          text-yellow-400
        "
      >
        SOHBET
      </div>

      <div
        className="
          flex
          items-center
          gap-2
        "
      >
        <button
          className="
            rounded-md
            border
            border-zinc-700
            px-2
            py-1
            text-sm
            text-yellow-300
            hover:bg-zinc-800
          "
          title="Alt Yerleşim"
        >
          ⬇
        </button>

        <button
          className="
            rounded-md
            border
            border-zinc-700
            px-2
            py-1
            text-sm
            text-yellow-300
            hover:bg-zinc-800
          "
          title="Sol Yerleşim"
        >
          ⬅
        </button>

        <button
          className="
            rounded-md
            border
            border-zinc-700
            px-2
            py-1
            text-sm
            text-yellow-300
            hover:bg-zinc-800
          "
          title="Sağ Yerleşim"
        >
          ➡
        </button>

        <button
          className="
            rounded-md
            border
            border-zinc-700
            px-2
            py-1
            text-sm
            text-yellow-300
            hover:bg-zinc-800
          "
          title="Ayarlar"
        >
          ⚙
        </button>

        <button
          className="
            rounded-md
            border
            border-red-700
            px-2
            py-1
            text-sm
            text-red-300
            hover:bg-red-900
          "
          title="Daralt"
        >
          ─
        </button>
      </div>
    </div>
  );
}