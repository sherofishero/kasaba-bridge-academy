"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  loadChatHistory,
  subscribeToChat,
  type ChatMessage as RealtimeChatMessage,
} from "../../lib/supabase";

type ChatMessagesProps = {
  showSalon: boolean;
  showMasa: boolean;
  showRakipler: boolean;
  showIzleyiciler?: boolean;
  tableId?: string;
  isSpectator: boolean;
  /**
   * Yalnızca Cuha/Oyuncuha masa sayfalarında kullanılır.
   * true iken mesaj paneli AUCTION kutusuyla aynı sarı fonu (`bg-yellow-200`)
   * kullanır ve mesaj sahibi renkleri sarı zemin üzerinde okunur hale getirilir.
   * Küresel (Salon) sohbet davranışını değiştirmez.
   */
  yellowBg?: boolean;
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

const initialMessages: ChatMessage[] = [];

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

/*
 * Masa sayfalarında sarı (bg-yellow-200) zemin üzerinde okunurluğu korumak
 * için kanal renklerinin daha koyu karşılıklarını döndürür.
 */
function readableOnYellow(cssColor: string): string {
  switch (cssColor) {
    case "text-green-400":
      return "text-green-800";
    case "text-red-400":
      return "text-red-800";
    default:
      return "text-purple-800";
  }
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
  isSpectator,
  yellowBg = false,
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
   * Masa ID'si gerçek masa durumundan
   * GlobalChat üzerinden gelir.
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

  /*
   * Kalıcı geçmiş yüklemesi (migration 0005).
   *
   * Mount / masa değişiminde SALON + (masa girildiyse) MASA
   * geçmişi DB'den çekilir. Realtime'dan o sırada gelmiş
   * mesajlar id bazlı birleştirmeyle korunur; böylece geçmiş
   * yükleme sırasında gelen mesaj kaybolmaz ve hiçbir mesaj
   * iki kez görünmez.
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const salonRows =
          await loadChatHistory("SALON");

        const tableRows = tableId
          ? await loadChatHistory(
              "MASA",
              tableId
            )
          : [];

        if (cancelled) {
          return;
        }

        const salonHistory =
          salonRows.map(
            convertRealtimeMessage
          );

        const tableHistory =
          tableRows.map(
            convertRealtimeMessage
          );

        setMessages((current) => {
          const merged = [
            ...salonHistory,
            ...tableHistory,
          ];

          const seen = new Set(
            merged.map(
              (item) => item.id
            )
          );

          /*
           * Geçmiş yüklenirken realtime'dan gelmiş
           * mesajlar sıralarının sonuna eklenir.
           */
          for (const item of current) {
            if (!seen.has(item.id)) {
              merged.push(item);
              seen.add(item.id);
            }
          }

          return merged;
        });
      } catch (error) {
        console.error(
          "[CHAT] Geçmiş yüklenemedi:",
          error
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tableId]);

  const visibleMessages =
    messages.filter((message) => {
      /*
       * GÜVENLİK FİLTRESİ
       *
       * Oyuncu izleyici sohbetini göremez.
       */
      if (
        !isSpectator &&
        message.channel ===
          "İZLEYİCİLER"
      ) {
        return false;
      }

      /*
       * GÜVENLİK FİLTRESİ
       *
       * İzleyici rakipler sohbetini göremez.
       */
      if (
        isSpectator &&
        message.channel ===
          "RAKİPLER"
      ) {
        return false;
      }

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
      className={`
        min-h-0
        flex-1
        overflow-y-auto
        px-4
        py-1
        ${yellowBg ? "bg-yellow-200" : "bg-white"}
      `}
    >
      {visibleMessages.map(
        (message, index) => (
          <div
            key={`${message.id}-${index}`}
            className="
              mb-1
              flex
              items-start
              gap-3
              text-sm
            "
          >
              <span className="text-black">
              [{message.time}]
            </span>

            <button
              type="button"
              onClick={() => {
                /*
                 * Özel sohbet, chat katmanından bağımsız olarak
                 * PrivateChatManager tarafından yönetilir.
                 * Sadece tıklama eventi yayınlanır.
                 */
                window.dispatchEvent(
                  new CustomEvent(
                    "kasaba-open-private-chat",
                    {
                      detail: {
                        username: message.user,
                      },
                    }
                  )
                );
              }}
              title={`${message.user} ile özel sohbet`}
              className={`cursor-pointer font-semibold hover:underline ${yellowBg
                ? readableOnYellow(message.color)
                : message.color
                }`}
            >
              {message.user}
            </button>

            {message.channel !==
              "MASA" && (
              <span className="text-black">
                &gt;{" "}
                {getChannelLabel(
                  message.channel
                )}
                :
              </span>
            )}

            <span className="text-black">
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
            text-black
          "
        >
          Görüntülenecek sohbet yok.
        </div>
      )}
    </div>
  );
}
