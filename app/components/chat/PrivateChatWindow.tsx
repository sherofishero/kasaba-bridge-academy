"use client";

/*
 * =========================================================
 * PRIVATE CHAT WINDOW
 * =========================================================
 *
 * Tek bir özel sohbet baloncuğu. Tasarım kuralı:
 * yalnızca siyah/beyaz + kırmızı GÖNDER butonu.
 *
 * Sorumlulukları:
 *   - konum/boyut (sürükleme + kenar esnetme) — yerel state
 *   - mesaj akışını görüntüleme
 *   - ilk konuşmada gizlilik bildirimini gösterme
 *
 * Konuşma mantığı (conversation açma, geçmiş, realtime,
 * gönderim) PrivateChatManager'dadır; bu bileşen sunuma odaklıdır.
 */

import { useEffect, useRef, useState } from "react";

import type {
  PrivateChatMessage,
} from "../../lib/privateChat";

type ResizeDirection =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

type PrivateChatWindowStatus =
  | "loading"
  | "ready"
  | "error";

type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type PrivateChatWindowProps = {
  peerUsername: string;
  status: PrivateChatWindowStatus;
  errorMessage: string;
  showPrivacyNotice: boolean;
  messages: PrivateChatMessage[];
  myUserId: string | null;
  zIndex: number;
  orderIndex: number;
  onSend: (text: string) => void;
  onClose: () => void;
  onFocus: () => void;
  onNoticeAccept: () => void;
};

const MIN_WIDTH = 260;
const MIN_HEIGHT = 180;
const MAX_WIDTH = 520;
const MAX_HEIGHT = 640;

const INITIAL_WIDTH = 320;
const INITIAL_HEIGHT = 420;

const MARGIN = 16;
const CASCADE_STEP = 26;

function formatTimestamp(
  value: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--.--.-- --:--";
  }

  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PrivateChatWindow({
  peerUsername,
  status,
  errorMessage,
  showPrivacyNotice,
  messages,
  myUserId,
  zIndex,
  orderIndex,
  onSend,
  onClose,
  onFocus,
  onNoticeAccept,
}: PrivateChatWindowProps) {
  const dragOffset = useRef({
    x: 0,
    y: 0,
  });

  const resizeStart = useRef<{
    dir: ResizeDirection;
    pointerX: number;
    pointerY: number;
    rect: Rect;
  } | null>(null);

  const scrollRef =
    useRef<HTMLDivElement>(null);

  const inputRef =
    useRef<HTMLInputElement>(null);

  const [rect, setRect] =
    useState<Rect | null>(null);

  const [dragging, setDragging] =
    useState(false);

  const [
    resizeDirection,
    setResizeDirection,
  ] = useState<ResizeDirection | null>(
    null
  );

  const [draft, setDraft] = useState("");

  /*
   * İlk açılış: ekranın sol-alt köşesi.
   * Açık baloncuğa göre küçük kademe ofseti,
   * alttaki baloncukların başlığı görünsün diye.
   */
  useEffect(() => {
    const viewportWidth =
      window.innerWidth;
    const viewportHeight =
      window.innerHeight;

    const offset =
      Math.min(orderIndex, 8) *
      CASCADE_STEP;

    setRect({
      left: Math.min(
        MARGIN + offset,
        viewportWidth - MIN_WIDTH - MARGIN
      ),
      top: Math.max(
        viewportHeight -
          INITIAL_HEIGHT -
          MARGIN -
          offset,
        MARGIN
      ),
      width: INITIAL_WIDTH,
      height: INITIAL_HEIGHT,
    });
    // Bilinçli olarak yalnızca mount'ta hesaplanır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clampRect(next: Rect): Rect {
    const viewportWidth =
      window.innerWidth;
    const viewportHeight =
      window.innerHeight;

    return {
      left: Math.min(
        Math.max(next.left, -next.width + 60),
        viewportWidth - 60
      ),
      top: Math.min(
        Math.max(next.top, 0),
        viewportHeight - 40
      ),
      width: Math.min(
        Math.max(next.width, MIN_WIDTH),
        Math.min(MAX_WIDTH, viewportWidth - 16)
      ),
      height: Math.min(
        Math.max(next.height, MIN_HEIGHT),
        Math.min(MAX_HEIGHT, viewportHeight - 16)
      ),
    };
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (!rect) return;

    event.preventDefault();
    onFocus();
    dragOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    setDragging(true);
  }

  function startResize(
    event: React.PointerEvent<HTMLDivElement>,
    dir: ResizeDirection
  ) {
    if (!rect) return;

    event.preventDefault();
    event.stopPropagation();
    setResizeDirection(dir);
    resizeStart.current = {
      dir,
      pointerX: event.clientX,
      pointerY: event.clientY,
      rect,
    };
  }

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (dragging && rect) {
        const nextLeft =
          event.clientX - dragOffset.current.x;
        const nextTop =
          event.clientY - dragOffset.current.y;
        setRect(
          clampRect({
            ...rect,
            left: nextLeft,
            top: nextTop,
          })
        );
        return;
      }

      const start = resizeStart.current;

      if (
        !resizeDirection ||
        !start
      ) {
        return;
      }

      const deltaX =
        event.clientX - start.pointerX;
      const deltaY =
        event.clientY - start.pointerY;
      const base = start.rect;

      let { left, top, width, height } =
        base;

      if (start.dir.includes("e")) {
        width = base.width + deltaX;
      }

      if (start.dir.includes("s")) {
        height = base.height + deltaY;
      }

      if (start.dir.includes("w")) {
        width = base.width - deltaX;
        left = base.left + deltaX;
      }

      if (start.dir.includes("n")) {
        height = base.height - deltaY;
        top = base.top + deltaY;
      }

      setRect(clampRect({ left, top, width, height }));
    }

    function stop() {
      setDragging(false);
      setResizeDirection(null);
      resizeStart.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
    };
  }, [dragging, resizeDirection, rect]);

  /*
   * Yeni mesaj gelince otomatik en alta kay.
   */
  useEffect(() => {
    const container = scrollRef.current;

    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTop =
        container.scrollHeight;
    });
  }, [messages.length, status]);

  /*
   * Mesaj alanı görünür olduğu anda (baloncuk hazır,
   * gizlilik bildirimi geçilmiş) input'u otomatik odakla;
   * kullanıcı tıklamadan yazmaya başlayabilsin.
   */
  useEffect(() => {
    if (
      status !== "ready" ||
      showPrivacyNotice
    ) {
      return;
    }

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [status, showPrivacyNotice]);

  function handleSend() {
    const text = draft.trim();

    if (!text || status !== "ready") {
      return;
    }

    setDraft("");
    onSend(text);
  }

  if (!rect) {
    return null;
  }

  const isMessageAreaVisible =
    status === "ready" && !showPrivacyNotice;

  return (
    <div
      onPointerDown={onFocus}
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        zIndex,
      }}
      className="
        fixed
        flex
        flex-col
        border
        border-black
        bg-white
        text-black
        shadow-[0_4px_14px_rgba(0,0,0,0.35)]
      "
    >
      {/* Üst başlık */}
      <div
        onPointerDown={(event) => {
          if (
            (event.target as HTMLElement)
              .tagName === "BUTTON"
          ) {
            return;
          }

          startDrag(event);
        }}
        className="
          flex
          shrink-0
          cursor-move
          select-none
          items-center
          justify-between
          border-b
          border-black
          bg-white
          px-3
          py-2
          touch-none
        "
      >
        <span
          title={peerUsername}
          className="max-w-[240px] truncate text-sm font-bold"
        >
          {peerUsername}
        </span>

        <button
          type="button"
          aria-label="Kapat"
          onClick={onClose}
          className="ml-2 shrink-0 px-1 text-lg leading-none text-black/60 hover:text-black"
        >
          ✕
        </button>
      </div>

      {/* İçerik alanı */}
      {status === "loading" && (
        <div className="flex flex-1 items-center justify-center text-xs text-black/60">
          Yükleniyor...
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-1 items-center justify-center px-6 text-center text-xs font-bold">
          {errorMessage ||
            "Özel sohbet açılamadı."}
        </div>
      )}

      {showPrivacyNotice && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 text-xs leading-5"
        >
          <div className="text-center text-sm font-bold">
            🔒 Özel Sohbet
          </div>

          <p className="mt-3 font-semibold">
            Bu konuşma yalnızca siz ve{" "}
            {peerUsername} arasında
            gerçekleşir.
          </p>

          <p className="mt-2">
            Mesajlarınız güvenli şekilde
            veritabanında saklanır. Diğer
            kullanıcılar, site yöneticileri veya
            KASABA yönetimi bu konuşmanın
            içeriğini göremez.
          </p>

          <p className="mt-2">
            Özel sohbetler de KASABA kullanım
            kurallarına tabidir. Hakaret, tehdit,
            taciz ve hukuka aykırı içerikler
            yasaktır.
          </p>

          <button
            type="button"
            onClick={onNoticeAccept}
            className="
              mt-4
              w-full
              border
              border-black
              bg-white
              py-2
              text-xs
              font-bold
              transition
              hover:bg-black
              hover:text-white
            "
          >
            Anladım, Sohbete Başla
          </button>
        </div>
      )}

      {isMessageAreaVisible && (
        <>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto bg-white px-3 py-2"
          >
            {messages.length === 0 && (
              <div className="pt-8 text-center text-xs text-black/50">
                Henüz mesaj yok.
              </div>
            )}

            {messages.map((message) => {
              const isMine =
                myUserId !== null &&
                message.senderId.toLowerCase() ===
                  myUserId.toLowerCase();

              return (
                <div
                  key={message.id}
                  className={`mb-2 flex ${
                    isMine
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] ${
                      isMine
                        ? "items-end"
                        : "items-start"
                    } flex flex-col`}
                  >
                    <span className="px-1 text-[10px] text-black/60">
                      {isMine ? "Siz" : peerUsername}
                      {" · "}
                      {formatTimestamp(
                        message.createdAt
                      )}
                    </span>

                    <span
                      className={`whitespace-pre-wrap break-words rounded px-2 py-1 text-sm ${
                        isMine
                          ? "bg-black text-white"
                          : "border border-black bg-white"
                      }`}
                    >
                      {message.message}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mesaj yazma alanı */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
            className="flex shrink-0 gap-2 border-t border-black bg-white p-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={draft}
              maxLength={2000}
              onChange={(event) =>
                setDraft(event.target.value)
              }
              placeholder="Mesaj yaz..."
              className="
                min-w-0
                flex-1
                rounded-none
                border
                border-black/40
                bg-white
                px-2
                py-1
                text-sm
                text-black
                outline-none
                placeholder:text-black/40
                focus:border-black
              "
            />

            <button
              type="submit"
              disabled={!draft.trim()}
              className="
                shrink-0
                bg-red-600
                px-3
                py-1
                text-xs
                font-bold
                uppercase
                tracking-wide
                text-white
                transition
                hover:bg-red-700
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              GÖNDER
            </button>
          </form>
        </>
      )}
      {/* Kenar esnetme tutamaçları */}
      <div
        onPointerDown={(event) => startResize(event, "n")}
        className="absolute -top-1 left-3 right-3 h-2 cursor-ns-resize touch-none"
      />
      <div
        onPointerDown={(event) => startResize(event, "s")}
        className="absolute -bottom-1 left-3 right-3 h-2 cursor-ns-resize touch-none"
      />
      <div
        onPointerDown={(event) => startResize(event, "e")}
        className="absolute -right-1 bottom-3 top-3 w-2 cursor-ew-resize touch-none"
      />
      <div
        onPointerDown={(event) => startResize(event, "w")}
        className="absolute -left-1 bottom-3 top-3 w-2 cursor-ew-resize touch-none"
      />
      <div
        onPointerDown={(event) => startResize(event, "ne")}
        className="absolute -right-2 -top-2 h-4 w-4 cursor-nesw-resize touch-none"
      />
      <div
        onPointerDown={(event) => startResize(event, "nw")}
        className="absolute -left-2 -top-2 h-4 w-4 cursor-nwse-resize touch-none"
      />
      <div
        onPointerDown={(event) => startResize(event, "se")}
        className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize touch-none"
      />
      <div
        onPointerDown={(event) => startResize(event, "sw")}
        className="absolute -bottom-2 -left-2 h-4 w-4 cursor-nesw-resize touch-none"
      />
    </div>
  );
}
