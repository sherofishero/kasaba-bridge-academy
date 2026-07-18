"use client";

type PrivateChatWindowProps = {
  playerName?: string;
};

const messages = [
  {
    from: "Kadir",
    text: "seni seviyorum brom",
  },
  {
    from: "Ben",
    text: "ben de seni seviyorum brom",
  },
];

export default function PrivateChatWindow({
  playerName = "Oyuncu",
}: PrivateChatWindowProps) {
  return (
    <div
      className="
        fixed
        bottom-4
        right-4
        w-80
        h-[420px]
        rounded-xl
        border
        border-red-800
        bg-zinc-950
        shadow-2xl
        flex
        flex-col
        z-[60]
      "
    >
      {/* Header */}
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
        <div className="font-bold text-yellow-300">
          {playerName}
        </div>

        <button
          className="
            text-red-400
            hover:text-red-300
          "
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        className="
          flex-1
          overflow-y-auto
          bg-black
          px-4
          py-3
        "
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className="mb-3"
          >
            <div className="font-semibold text-sky-400">
              {message.from}
            </div>

            <div className="text-zinc-200">
              {message.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div
        className="
          flex
          gap-2
          border-t
          border-red-800
          bg-zinc-900
          p-3
        "
      >
        <input
          type="text"
          placeholder="Mesaj yaz..."
          className="
            flex-1
            rounded-lg
            border
            border-zinc-700
            bg-black
            px-3
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
            px-4
            py-2
            font-semibold
            text-yellow-300
            hover:bg-red-800
          "
        >
          Gönder
        </button>
      </div>
    </div>
  );
}