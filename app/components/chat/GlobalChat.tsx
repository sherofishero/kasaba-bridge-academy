"use client";

import { useEffect, useRef, useState } from "react";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

type ChatTarget = "SALON" | "MASA" | "RAKİPLER";

type Position = {
  x: number;
  y: number;
};

type Size = {
  width: number;
  height: number;
};

type ResizeDirection =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

const MIN_WIDTH = 300;
const MIN_HEIGHT = 180;

export default function GlobalChat() {
  const chatRef = useRef<HTMLDivElement>(null);

  const dragOffset = useRef({
    x: 0,
    y: 0,
  });

  const resizeStart = useRef({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    left: 0,
    top: 0,
  });

  const [position, setPosition] = useState<Position | null>(null);

  const [size, setSize] = useState<Size>({
    width: 420,
    height: 280,
  });

  const [dragging, setDragging] = useState(false);

  const [resizeDirection, setResizeDirection] =
    useState<ResizeDirection | null>(null);

  const [chatTarget, setChatTarget] =
    useState<ChatTarget>("SALON");

  const [showSalon, setShowSalon] = useState(true);
  const [showMasa, setShowMasa] = useState(true);
  const [showRakipler, setShowRakipler] = useState(true);

  /*
   * Chatbox ilk açıldığında alt-ortada başlar.
   */
  useEffect(() => {
    const initialWidth = 420;
    const initialHeight = 280;

    setPosition({
      x: Math.max(0, (window.innerWidth - initialWidth) / 2),
      y: Math.max(0, window.innerHeight - initialHeight - 16),
    });
  }, []);

  /*
   * Sürükleme
   */
  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!dragging || !position) return;

      const maxX = Math.max(0, window.innerWidth - size.width);
      const maxY = Math.max(0, window.innerHeight - size.height);

      const newX = Math.min(
        Math.max(0, event.clientX - dragOffset.current.x),
        maxX
      );

      const newY = Math.min(
        Math.max(0, event.clientY - dragOffset.current.y),
        maxY
      );

      setPosition({
        x: newX,
        y: newY,
      });
    }

    function handlePointerUp() {
      setDragging(false);
    }

    if (dragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragging, position, size]);

  /*
   * Yeniden boyutlandırma
   */
  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!resizeDirection || !position) return;

      const start = resizeStart.current;

      let newWidth = start.width;
      let newHeight = start.height;
      let newX = start.left;
      let newY = start.top;

      const deltaX = event.clientX - start.x;
      const deltaY = event.clientY - start.y;

      if (
        resizeDirection === "e" ||
        resizeDirection === "ne" ||
        resizeDirection === "se"
      ) {
        newWidth = start.width + deltaX;
      }

      if (
        resizeDirection === "w" ||
        resizeDirection === "nw" ||
        resizeDirection === "sw"
      ) {
        newWidth = start.width - deltaX;
        newX = start.left + deltaX;
      }

      if (
        resizeDirection === "s" ||
        resizeDirection === "se" ||
        resizeDirection === "sw"
      ) {
        newHeight = start.height + deltaY;
      }

      if (
        resizeDirection === "n" ||
        resizeDirection === "ne" ||
        resizeDirection === "nw"
      ) {
        newHeight = start.height - deltaY;
        newY = start.top + deltaY;
      }

      if (newWidth < MIN_WIDTH) {
        if (
          resizeDirection === "w" ||
          resizeDirection === "nw" ||
          resizeDirection === "sw"
        ) {
          newX = start.left + start.width - MIN_WIDTH;
        }

        newWidth = MIN_WIDTH;
      }

      if (newHeight < MIN_HEIGHT) {
        if (
          resizeDirection === "n" ||
          resizeDirection === "ne" ||
          resizeDirection === "nw"
        ) {
          newY = start.top + start.height - MIN_HEIGHT;
        }

        newHeight = MIN_HEIGHT;
      }

      const maxWidth = window.innerWidth - newX;
      const maxHeight = window.innerHeight - newY;

      newWidth = Math.min(newWidth, maxWidth);
      newHeight = Math.min(newHeight, maxHeight);

      newX = Math.max(0, newX);
      newY = Math.max(0, newY);

      setPosition({
        x: newX,
        y: newY,
      });

      setSize({
        width: newWidth,
        height: newHeight,
      });
    }

    function handlePointerUp() {
      setResizeDirection(null);
    }

    if (resizeDirection) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [resizeDirection, position]);

  /*
   * Chatbox sürükleme başlangıcı
   */
  function startDragging(event: React.PointerEvent<HTMLDivElement>) {
    if (resizeDirection) return;

    const target = event.target as HTMLElement;

    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("[data-chat-settings]")
    ) {
      return;
    }

    const chat = chatRef.current;

    if (!chat) return;

    const rect = chat.getBoundingClientRect();

    dragOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    setDragging(true);
  }

  /*
   * Yeniden boyutlandırma başlangıcı
   */
  function startResize(
    event: React.PointerEvent<HTMLDivElement>,
    direction: ResizeDirection
  ) {
    event.stopPropagation();

    const chat = chatRef.current;

    if (!chat || !position) return;

    resizeStart.current = {
      x: event.clientX,
      y: event.clientY,
      width: size.width,
      height: size.height,
      left: position.x,
      top: position.y,
    };

    setResizeDirection(direction);
  }

  if (!position) {
    return null;
  }

  return (
    <div
      ref={chatRef}
      onPointerDown={startDragging}
      className="
        fixed
        z-50
        overflow-visible
        rounded-2xl
        border
        border-red-800
        bg-zinc-950
        shadow-2xl
        select-none
      "
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
      }}
    >
      <div className="flex h-full w-full flex-col overflow-visible rounded-2xl">
        <ChatMessages
          showSalon={showSalon}
          showMasa={showMasa}
          showRakipler={showRakipler}
        />

        <ChatInput
          chatTarget={chatTarget}
          onChatTargetChange={setChatTarget}
          showSalon={showSalon}
          showMasa={showMasa}
          showRakipler={showRakipler}
          onShowSalonChange={setShowSalon}
          onShowMasaChange={setShowMasa}
          onShowRakiplerChange={setShowRakipler}
        />
      </div>

      {/* Kuzey */}
      <div
        onPointerDown={(event) => startResize(event, "n")}
        className="absolute left-3 right-3 -top-1 h-2 cursor-ns-resize"
      />

      {/* Güney */}
      <div
        onPointerDown={(event) => startResize(event, "s")}
        className="absolute left-3 right-3 -bottom-1 h-2 cursor-ns-resize"
      />

      {/* Doğu */}
      <div
        onPointerDown={(event) => startResize(event, "e")}
        className="absolute top-3 bottom-3 -right-1 w-2 cursor-ew-resize"
      />

      {/* Batı */}
      <div
        onPointerDown={(event) => startResize(event, "w")}
        className="absolute top-3 bottom-3 -left-1 w-2 cursor-ew-resize"
      />

      {/* Kuzey-Doğu */}
      <div
        onPointerDown={(event) => startResize(event, "ne")}
        className="absolute -right-2 -top-2 h-4 w-4 cursor-nesw-resize"
      />

      {/* Kuzey-Batı */}
      <div
        onPointerDown={(event) => startResize(event, "nw")}
        className="absolute -left-2 -top-2 h-4 w-4 cursor-nwse-resize"
      />

      {/* Güney-Doğu */}
      <div
        onPointerDown={(event) => startResize(event, "se")}
        className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize"
      />

      {/* Güney-Batı */}
      <div
        onPointerDown={(event) => startResize(event, "sw")}
        className="absolute -bottom-2 -left-2 h-4 w-4 cursor-nesw-resize"
      />
    </div>
  );
}