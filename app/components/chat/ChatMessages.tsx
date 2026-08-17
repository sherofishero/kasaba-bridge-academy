"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  subscribeToChat,
  type ChatMessage as RealtimeChatMessage,
} from "../../lib/supabase";

type ChatMessagesProps = {
  showSalon: boolean;
  showMasa: boolean;
  showRakipler: boolean;
  showIzleyiciler?: boolean;
  tableId?: string;
};

type ChatChannel =
  | "SALON"
  | "MASA"
  | "RAKİPLER"
  | "İZLEYİCİLER";

type ChatMessage = {
  id: string;
  time: string;
  user: string;
  color: string;
  text: string;
  channel: ChatChannel;
};

const initialMessages: ChatMessage[] = [
  {
    id: "demo-1",
    time: "14:20",
    user: "Başkan",
    color: "text-green-400",
    text: "saat 23 maç",
    channel: "SALON",
  },
  {
    id: "demo-2",
    time: "14:21",
    user: "shero",
    color: "text-fuchsia-400",
    text: "aşkım varsa ben de varım",
    channel: "SALON",
  },
  {
    id: "demo-3",
    time: "14:22",
    user: "Kadir",
    color: "text-red-400",
    text: "başkanlık emri ile geliyoruz saat 23 te.",
    channel: "MASA",
  },
  {
    id: "demo-4",
    time: "14:20",
    user: "Zafer",
    color: "text-fuchsia-400",
    text: "rakımı alıp geliyorum",
    channel: "RAKİPLER",
  },
  {
    id: "demo-5",
    time: "14:23",
    user: "Sistem",
    color: "text-yellow-400",
    text: "Kasaba Bridge Hub'a hoş geldiniz.",
    channel: "SALON",
  },
];

function formatTime(
  timestamp: string
): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMessageColor(
  message: RealtimeChatMessage
): string {
  if (message.channel === "SALON") {
    return "text-green-400";
  }

  if (message.channel === "MASA") {
    return "text-red-400";
  }

  return "text-fuchsia-400";
}

function getChannelLabel(
  channel: ChatChannel
): string {
  switch (channel) {
    case "SALON":
      return "salon";

    case "MASA":
      return "masa";

    case "RAKİPLER":
      return "rakipler";

    case "İZLEYİCİLER":
      return "izleyiciler";
  }
}

function convertRealtimeMessage(
  message: RealtimeChatMessage
): ChatMessage {
  return {
    id: message.id,
    time: formatTime(message.timestamp),
    user: message.userName,
    color: getMessageColor(message),
    text: message.text,
    channel: message.channel,
  };
}

export default function ChatMessages({
  showSalon,
  showMasa,
  showRakipler,
  showIzleyiciler = true,
  tableId,
}: ChatMessagesProps) {
  const [messages, setMessages] =
    useState<ChatMessage[]>(
      initialMessages
    );

  const messagesContainerRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container =
      messagesContainerRef.current;

    if (!container) {
      return;
    }

    requestAnimationFrame(() => {
      container.scrollTop =
        container.scrollHeight;
    });
  }, [
    messages,
    showSalon,
    showMasa,
    showRakipler,
    showIzleyiciler,
  ]);

  /*
   * Supabase Realtime bağlantıları.
   *
   * Masa ID'si artık URL'den değil,
   * gerçek masa durumundan GlobalChat
   * üzerinden gelir.
   */
  useEffect(() => {
    const unsubscribeSalon =
      subscribeToChat(
        "SALON",
        (message) => {
          const nextMessage =
            convertRealtimeMessage(
              message
            );

          setMessages(
            (currentMessages) => {
              if (
                currentMessages.some(
                  (item) =>
                    item.id ===
                    nextMessage.id
                )
              ) {
                return currentMessages;
              }

              return [
                ...currentMessages,
                nextMessage,
              ];
            }
          );
        }
      );

    let unsubscribeTable:
      | (() => void)
      | null = null;

    if (tableId) {
      unsubscribeTable =
        subscribeToChat(
          "MASA",
          (message) => {
            const nextMessage =
              convertRealtimeMessage(
                message
              );

            setMessages(
              (currentMessages) => {
                if (
                  currentMessages.some(
                    (item) =>
                      item.id ===
                      nextMessage.id
                  )
                ) {
                  return currentMessages;
                }

                return [
                  ...currentMessages,
                  nextMessage,
                ];
              }
            );
          },
          tableId
        );
    }

    return () => {
      unsubscribeSalon();
      unsubscribeTable?.();
    };
  }, [tableId]);

  const visibleMessages =
    messages.filter((message) => {
      if (
        message.channel ===
        "SALON"
      ) {
        return showSalon;
      }

      if (
        message.channel ===
        "MASA"
      ) {
        return showMasa;
      }

      if (
        message.channel ===
        "RAKİPLER"
      ) {
        return showRakipler;
      }

      if (
        message.channel ===
        "İZLEYİCİLER"
      ) {
        return showIzleyiciler;
      }

      return false;
    });

  return (
    <div
      ref={messagesContainerRef}
      className="
        min-h-0
        flex-1
        overflow-y-auto
        bg-black
        px-4
        py-3
      "
    >
      {visibleMessages.map(
        (message, index) => (
          <div
            key={`${message.id}-${index}`}
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

            <span
              className={`font-semibold ${message.color}`}
            >
              {message.user}
            </span>

            {message.channel !==
              "MASA" && (
              <span className="text-zinc-500">
                &gt;{" "}
                {getChannelLabel(
                  message.channel
                )}
                :
              </span>
            )}

            <span className="text-zinc-200">
              {message.text}
            </span>
          </div>
        )
      )}

      {visibleMessages.length ===
        0 && (
        <div
          className="
            flex
            h-full
            items-center
            justify-center
            text-sm
            text-zinc-600
          "
        >
          Görüntülenecek sohbet yok.
        </div>
      )}
    </div>
  );
}