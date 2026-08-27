"use client";

/*
 * =========================================================
 * PRIVATE CHAT MANAGER
 * =========================================================
 *
 * Tüm özel sohbet baloncuklarının orkestratörü:
 *   - nick'e tıklama eventi ("kasaba-open-private-chat") dinler
 *   - üye doğrulaması + username -> Auth UUID çözümlemesi
 *   - conversation açma/bulma, geçmiş yükleme, realtime abonelik
 *   - en fazla 12 açık baloncuk, üst üste yığılma, odak/z-sırası
 *   - gizlilik bildirimi (konuşma başına, localStorage ile hatırlanır)
 *
 * Root layout'ta monte edilir; App Router layout'ları sayfa
 * geçişlerinde state koruduğı için baloncuklar site genelinde kalır.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchConversationMessages,
  getCurrentUserAuthId,
  getOrCreateConversation,
  getProfileIdByUsername,
  sendPrivateMessage,
  subscribeToPrivateMessages,
  type PrivateChatMessage,
} from "../../lib/privateChat";
import PrivateChatWindow from "./PrivateChatWindow";

const MAX_OPEN_WINDOWS = 12;
const BASE_Z_INDEX = 1000;
const NOTICE_KEY_PREFIX = "kasaba-dm-notice:";
const OPEN_EVENT = "kasaba-open-private-chat";

type ChatWindowState = {
  key: string;
  peerUsername: string;
  peerUuid: string;
  conversationId: string | null;
  status: "loading" | "ready" | "error";
  errorMessage: string;
  messages: PrivateChatMessage[];
  showPrivacyNotice: boolean;
};

type OpenEventDetail = {
  username?: string;
};

function sortMessages(
  items: PrivateChatMessage[]
): PrivateChatMessage[] {
  return [...items].sort((a, b) => {
    const timeA =
      Date.parse(a.createdAt) || 0;
    const timeB =
      Date.parse(b.createdAt) || 0;

    return timeA - timeB;
  });
}

export default function PrivateChatManager() {
  const [windows, setWindows] =
    useState<ChatWindowState[]>([]);

  const [myUserId, setMyUserId] =
    useState<string | null>(null);

  const [notice, setNotice] =
    useState<string | null>(null);

  const windowsRef =
    useRef<ChatWindowState[]>([]);

  const channelsRef = useRef(
    new Map<
      string,
      () => void
    >()
  );

  const openingRef = useRef(false);

  useEffect(() => {
    windowsRef.current = windows;
  }, [windows]);

  const showInfo = useCallback(
    (message: string) => {
      setNotice(message);
    },
    []
  );

  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(
      () => setNotice(null),
      4000
    );

    return () =>
      clearTimeout(timer);
  }, [notice]);

  const focusChat = useCallback(
    (key: string) => {
      setWindows((current) => {
        const index = current.findIndex(
          (item) => item.key === key
        );

        if (
          index < 0 ||
          index === current.length - 1
        ) {
          return current;
        }

        const next = [...current];
        const [entry] = next.splice(index, 1);
        next.push(entry);

        return next;
      });
    },
    []
  );

  function appendMessage(
    key: string,
    message: PrivateChatMessage
  ) {
    setWindows((current) =>
      current.map((item) => {
        if (item.key !== key) {
          return item;
        }

        if (
          item.messages.some(
            (existing) =>
              existing.id === message.id
          )
        ) {
          return item;
        }

        return {
          ...item,
          messages: sortMessages([
            ...item.messages,
            message,
          ]),
        };
      })
    );
  }

  function patchWindow(
    key: string,
    patch: Partial<ChatWindowState>
  ) {
    setWindows((current) =>
      current.map((item) =>
        item.key === key
          ? { ...item, ...patch }
          : item
      )
    );
  }

  const requestOpen = useCallback(
    async (rawUsername: string) => {
      const username =
        rawUsername.trim();

      if (
        !username ||
        openingRef.current
      ) {
        return;
      }

      openingRef.current = true;

      try {
        const me =
          await getCurrentUserAuthId();

        if (!me) {
          showInfo(
            "Özel sohbet yalnızca kayıtlı üyeler arasında açılabilir."
          );
          return;
        }

        setMyUserId(me);

        const normalized =
          username.toLowerCase();

        const existing =
          windowsRef.current.find(
            (item) =>
              item.peerUsername.toLowerCase() ===
              normalized
          );

        if (existing) {
          focusChat(existing.key);
          return;
        }

        if (
          windowsRef.current.length >=
          MAX_OPEN_WINDOWS
        ) {
          showInfo(
            `Aynı anda en fazla ${MAX_OPEN_WINDOWS} özel sohbet açılabilir.`
          );
          return;
        }

        const peerUuid =
          await getProfileIdByUsername(
            username
          );

        if (!peerUuid) {
          showInfo(
            `${username} için özel sohbet açılamadı: bu isimle kayıtlı üye profili bulunamadı (misafir kullanıcıların profili veritabanında tutulmaz).`
          );
          return;
        }

        if (
          peerUuid.toLowerCase() ===
          me.toLowerCase()
        ) {
          showInfo(
            "Kendinizle özel sohbet açamazsınız."
          );
          return;
        }

        const key = `dm:${peerUuid.toLowerCase()}`;

        if (
          windowsRef.current.some(
            (item) => item.key === key
          )
        ) {
          focusChat(key);
          return;
        }

        const placeholder: ChatWindowState = {
          key,
          peerUsername: username,
          peerUuid,
          conversationId: null,
          status: "loading",
          errorMessage: "",
          messages: [],
          showPrivacyNotice: false,
        };

        setWindows((current) => [
          ...current,
          placeholder,
        ]);

        const conversationId =
          await getOrCreateConversation(
            me,
            peerUuid
          );

        if (!conversationId) {
          patchWindow(key, {
            status: "error",
            errorMessage:
              "Konuşma başlatılamadı. Daha sonra tekrar deneyin.",
          });
          return;
        }

        let history: PrivateChatMessage[] = [];

        try {
          history =
            await fetchConversationMessages(
              conversationId
            );
        } catch {
          patchWindow(key, {
            status: "error",
            errorMessage:
              "Geçmiş mesajlar yüklenemedi.",
          });
          return;
        }

        const unsubscribe =
          subscribeToPrivateMessages(
            conversationId,
            (message) =>
              appendMessage(key, message)
          );

        channelsRef.current.set(
          key,
          unsubscribe
        );

        const showNotice =
          typeof window === "undefined"
            ? false
            : !window.localStorage.getItem(
                `${NOTICE_KEY_PREFIX}${conversationId}`
              );

        patchWindow(key, {
          conversationId,
          status: "ready",
          messages: sortMessages(history),
          showPrivacyNotice: showNotice,
        });
      } finally {
        openingRef.current = false;
      }
    },
    [focusChat, showInfo]
  );

  const closeChat = useCallback(
    (key: string) => {
      const unsubscribe =
        channelsRef.current.get(key);

      if (unsubscribe) {
        unsubscribe();
        channelsRef.current.delete(key);
      }

      setWindows((current) =>
        current.filter(
          (item) => item.key !== key
        )
      );
    },
    []
  );

  /*
   * Baloncuk kapatılınca X yalnızca pencereyi kaldırır;
   * conversation ve mesajlar veritabanında kalır.
   */
  useEffect(() => {
    return () => {
      channelsRef.current.forEach(
        (unsubscribe) => unsubscribe()
      );
      channelsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    function handleOpenEvent(
      event: Event
    ) {
      const detail =
        (event as CustomEvent<OpenEventDetail>)
          .detail;

      if (!detail?.username) {
        return;
      }

      void requestOpen(detail.username);
    }

    window.addEventListener(
      OPEN_EVENT,
      handleOpenEvent
    );

    return () => {
      window.removeEventListener(
        OPEN_EVENT,
        handleOpenEvent
      );
    };
  }, [requestOpen]);

  async function sendMessageFor(
    key: string,
    text: string
  ) {
    const entry =
      windowsRef.current.find(
        (item) => item.key === key
      );

    if (
      !entry?.conversationId ||
      !myUserId
    ) {
      return;
    }

    try {
      const saved =
        await sendPrivateMessage(
          entry.conversationId,
          myUserId,
          text
        );

      appendMessage(key, saved);
    } catch (error) {
      console.error(
        "[PRIVATE_CHAT] Mesaj gönderilemedi:",
        error
      );
      showInfo("Mesaj gönderilemedi.");
    }
  }

  function acceptNotice(key: string) {
    const entry =
      windowsRef.current.find(
        (item) => item.key === key
      );

    if (!entry?.conversationId) {
      return;
    }

    try {
      window.localStorage.setItem(
        `${NOTICE_KEY_PREFIX}${entry.conversationId}`,
        "1"
      );
    } catch {
      /* localStorage kullanılamıyorsa bildirim
         yalnızca bu oturumda bir daha gösterilmez. */
    }

    patchWindow(key, {
      showPrivacyNotice: false,
    });
  }

  return (
    <>
      {windows.map((entry, index) => (
        <PrivateChatWindow
          key={entry.key}
          peerUsername={entry.peerUsername}
          status={entry.status}
          errorMessage={entry.errorMessage}
          showPrivacyNotice={
            entry.showPrivacyNotice
          }
          messages={entry.messages}
          myUserId={myUserId}
          zIndex={BASE_Z_INDEX + index}
          orderIndex={index}
          onSend={(text) =>
            void sendMessageFor(
              entry.key,
              text
            )
          }
          onClose={() =>
            closeChat(entry.key)
          }
          onFocus={() =>
            focusChat(entry.key)
          }
          onNoticeAccept={() =>
            acceptNotice(entry.key)
          }
        />
      ))}

      {notice && (
        <div className="fixed bottom-4 left-1/2 z-[2000] -translate-x-1/2 border border-black bg-white px-4 py-2 text-xs font-bold text-black shadow-[0_4px_14px_rgba(0,0,0,0.35)]">
          {notice}
        </div>
      )}
    </>
  );
}
