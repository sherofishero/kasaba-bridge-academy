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
import { supabase } from "../../lib/supabase";
import {
  fetchConversationMessages,
  getCurrentUserAuthId,
  getOrCreateConversation,
  getProfileIdByUsername,
  getUsernameByAuthId,
  sendPrivateMessage,
  subscribeToInboxMessages,
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

  const myUserIdRef =
    useRef<string | null>(null);

  const inboxUnsubscribeRef =
    useRef<(() => void) | null>(null);

  const openingKeysRef =
    useRef(new Set<string>());

  const handlerRef =
    useRef<
      ((message: PrivateChatMessage) => void) | null
    >(null);

  useEffect(() => {
    windowsRef.current = windows;
  }, [windows]);

  useEffect(() => {
    myUserIdRef.current = myUserId;
  }, [myUserId]);

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

      openingKeysRef.current.delete(key);

      setWindows((current) =>
        current.filter(
          (item) => item.key !== key
        )
      );
    },
    []
  );

  /*
 * Gelen DM mesajından otomatik pencere açma (alıcı tarafı).
 *
 * conversation zaten vardır (gönderen getOrCreateConversation
 * ile açtı); burada sadece geçmişi yükler ve aynı conversation
 * için realtime aboneliğini kurar. Alıcı daha önce bu kişiyle
 * hiç sohbet açmamış olabilir. Nick, gönderen UUID'sinden
 * çözülür (getUsernameByAuthId; erişim yoksa "Üye" yedek).
 */
  async function openChatFromMessage(
    message: PrivateChatMessage
  ) {
    const myId =
      myUserIdRef.current;

    if (!myId) {
      return;
    }

    const sender =
      message.senderId;

    /* Kendine mesajla iki balon açılmasın. */
    if (
      sender.toLowerCase() ===
      myId.toLowerCase()
    ) {
      return;
    }

    const key =
      `dm:${sender.toLowerCase()}`;
    const conversationId =
      message.conversationId;

    /* Zaten açık (manuel) ya da açılımda -> çoğalma yok. */
    if (channelsRef.current.has(key)) {
      return;
    }
    if (openingKeysRef.current.has(key)) {
      return;
    }

    openingKeysRef.current.add(key);

    setWindows((current) =>
      current.some(
        (item) => item.key === key
      )
        ? current
        : [
          ...current,
          {
            key,
            peerUsername: "Üye",
            peerUuid: sender,
            conversationId,
            status: "loading",
            errorMessage: "",
            messages: [],
            showPrivacyNotice: false,
          } as ChatWindowState,
        ]
    );

    const peerUsername =
      (await getUsernameByAuthId(sender)) ||
      "Üye";
    patchWindow(key, { peerUsername });

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
      openingKeysRef.current.delete(key);
      return;
    }

    /* Gelecek mesajlar için aynı conversation'ın Realtime
       aboneliğini kur (manuel açma akışıyla tutarlı).
       appendMessage id'ye göre dedup yaptığından inbox + bu
       abonelik aynı mesajı çoğaltmaz. */
    const unsubscribe =
      subscribeToPrivateMessages(
        conversationId,
        (next) => appendMessage(key, next)
      );
    channelsRef.current.set(key, unsubscribe);

    /* Gizlilik bildirimi (mevcut akış, değişmedi). */
    let showNotice = false;
    try {
      showNotice = !window.localStorage.getItem(
        `${NOTICE_KEY_PREFIX}${conversationId}`
      );
    } catch {
      /* localStorage kullanılamıyorsa yalnızca
         bu oturumda bir kere gösterilir. */
    }

    /* Tarihçeyi + açılım sırasında gelen mesajları
       id'ye göre birleştir. */
    setWindows((current) =>
      current.map((item) => {
        if (item.key !== key) {
          return item;
        }

        const merged = new Map<
          string,
          PrivateChatMessage
        >();

        for (const m of item.messages) {
          merged.set(m.id, m);
        }
        for (const h of history) {
          merged.set(h.id, h);
        }
        merged.set(message.id, message);

        return {
          ...item,
          conversationId,
          status: "ready",
          messages: sortMessages(
            Array.from(merged.values())
          ),
          showPrivacyNotice: showNotice,
        };
      })
    );

    focusChat(key);
  }

  /*
   * Gelen DM mesajının yönlendirmesi:
   *   - kendin mesaj → geç (gönderen penceresinde eklenir)
   *   - açık pencere  → mesajı ekle + odakla
   *   - açılımda      → placeholder'a ekle (dedup)
   *   - 12 limit      → bildir, kapatma
   *   - yoksa         → openChatFromMessage
   */
  function handleIncomingMessage(
    message: PrivateChatMessage
  ) {
    const myId =
      myUserIdRef.current;

    if (!myId) {
      return;
    }

    if (message.senderId === myId) {
      return;
    }

    const conversationId =
      message.conversationId;

    const existing =
      windowsRef.current.find(
        (item) =>
          item.conversationId ===
          conversationId
      );

    if (existing) {
      appendMessage(existing.key, message);
      focusChat(existing.key);
      return;
    }

    const key =
      `dm:${message.senderId.toLowerCase()}`;

    if (openingKeysRef.current.has(key)) {
      appendMessage(key, message);
      return;
    }

    if (
      windowsRef.current.length >=
      MAX_OPEN_WINDOWS
    ) {
      showInfo(
        `Aynı anda en fazla ${MAX_OPEN_WINDOWS} özel sohbet açabilirsiniz.`
      );
      return;
    }

    void openChatFromMessage(message);
  }

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

  /*
   * Gelen özel mesaj bildirimini (alıcı tarafı) dinler.
   *
   * subscribeToInboxMessages, RLS'ye göre yalnızca katılımcı
   * olduğumuz conversation'lara ait messages INSERT'lerini yaşar.
   * Kimliği doğrulanmış (authenticated) kullanıcılar için kurulur;
   * misafirler için özel sohbet yoktur.
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const me = await getCurrentUserAuthId();

      if (cancelled || !me) {
        return;
      }

      setMyUserId(me);

      const unsubscribe =
        subscribeToInboxMessages(
          (message) => {
            void handlerRef.current?.(
              message
            );
          }
        );

      if (cancelled) {
        unsubscribe();
        return;
      }

      inboxUnsubscribeRef.current =
        unsubscribe;
    })();

    return () => {
      cancelled = true;
      inboxUnsubscribeRef.current?.();
    };
  }, []);

  function getMyTableId(): string | null {
    if (typeof window === "undefined") {
      return null;
    }

    return new URLSearchParams(
      window.location.search
    ).get("tableId");
  }

  async function getPeerInMyTable(
    myTableId: string,
    peerName: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from("tables")
      .select("state")
      .eq("id", myTableId)
      .single();

    if (error || !data?.state) {
      return false;
    }

    const state = data.state as {
      northPlayer?: { id?: string; name?: string } | null;
      eastPlayer?: { id?: string; name?: string } | null;
      southPlayer?: { id?: string; name?: string } | null;
      westPlayer?: { id?: string; name?: string } | null;
      spectators?: Array<{
        id?: string;
        name?: string;
      }>;
    };

    const target = peerName.trim().toLowerCase();

    const players = [
      state.northPlayer,
      state.eastPlayer,
      state.southPlayer,
      state.westPlayer,
    ];

    const isPlayer = players.some((player) =>
      player &&
      (
        player.id?.trim().toLowerCase() === target ||
        player.name?.trim().toLowerCase() === target
      )
    );

    if (isPlayer) {
      return true;
    }

    return (
      state.spectators?.some(
        (spectator) =>
          spectator.id?.trim().toLowerCase() === target ||
          spectator.name?.trim().toLowerCase() === target
      ) ?? false
    );
  }

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
    const myTableId =
      getMyTableId();

    if (myTableId) {
      const sameTable =
        await getPeerInMyTable(
          myTableId,
          entry.peerUsername
        );

      if (sameTable) {
        showInfo(
          "Aynı masadaki oyuncular özel mesaj gönderemez."
        );
        return;
      }
    }

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

  /* Gelen mesaj handler'ini her render güncel tut; inboxRealtime
     callback'i bunu ref üzerinden çağırır (stale closure yok). */
  handlerRef.current = handleIncomingMessage;

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
