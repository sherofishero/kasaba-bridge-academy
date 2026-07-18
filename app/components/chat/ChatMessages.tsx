"use client";

const messages = [
  {
    time: "14:20",
    user: "Başkan",
    color: "text-green-400",
    text: "saat 23 maç",
  },
  {
    time: "14:21",
    user: "shero",
    color: "text-fuchsia-400",
    text: "aşkım varsa ben de varım",
  },
  {
    time: "14:22",
    user: "Kadir",
    color: "text-red-400",
    text: "başkanlık emri ile geliyoruz saat 23 te.",
  },
  {
    time: "14:20",
    user: "Zafer",
    color: "text-green-400",
    text: "rakımı alıp geliyorum",
  },
  {
    time: "14:23",
    user: "Sistem",
    color: "text-yellow-400",
    text: "Kasaba Bridge Club'a hoş geldiniz.",
  },
];

export default function ChatMessages() {
  return (
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
          className="
            mb-3
            flex
            items-start
            gap-3
            text-sm
          "
        >
          <span className="text-zinc-500">
            [{message.time}]
          </span>

          <span className={`font-semibold ${message.color}`}>
            {message.user}:
          </span>

          <span className="text-zinc-200">
            {message.text}
          </span>
        </div>
      ))}
    </div>
  );
}