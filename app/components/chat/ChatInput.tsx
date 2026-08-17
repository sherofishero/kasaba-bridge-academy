"use client";

import { useRef, useState } from "react";
import ChatSettings from "./ChatSettings";
import {
  sendChatMessage,
  type ChatChannel,
} from "../../lib/supabase";

type ChatTarget =
  | "SALON"
  | "MASA"
  | "RAKİPLER"
  | "İZLEYİCİLER";

type ChatInputProps = {
  chatTarget: ChatTarget;
  onChatTargetChange: (
    target: ChatTarget
  ) => void;

  isSpectator: boolean;

  tableId?: string;

  showSalon: boolean;
  showMasa: boolean;
  showRakipler: boolean;
  showIzleyiciler: boolean;

  onShowSalonChange: (
    value: boolean
  ) => void;

  onShowMasaChange: (
    value: boolean
  ) => void;

  onShowRakiplerChange: (
    value: boolean
  ) => void;

  onShowIzleyicilerChange: (
    value: boolean
  ) => void;
};

function getUserId(): string {
  const existingId =
    localStorage.getItem(
      "chatUserId"
    );

  if (existingId) {
    return existingId;
  }

  const newId =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  localStorage.setItem(
    "chatUserId",
    newId
  );

  return newId;
}

function getUserName(): string {
  return (
    localStorage
      .getItem("guestName")
      ?.trim() || "Oyuncu"
  );
}

function getUrlTableId():
  | string
  | undefined {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get("tableId") ??
    undefined
  );
}

export default function ChatInput({
  chatTarget,
  onChatTargetChange,
  isSpectator,
  tableId,
  showSalon,
  showMasa,
  showRakipler,
  showIzleyiciler,
  onShowSalonChange,
  onShowMasaChange,
  onShowRakiplerChange,
  onShowIzleyicilerChange,
}: ChatInputProps) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [message, setMessage] =
    useState("");

  function handleTargetChange(
    target: ChatTarget
  ) {
    if (
      isSpectator &&
      target === "RAKİPLER"
    ) {
      onChatTargetChange("MASA");

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });

      return;
    }

    onChatTargetChange(target);

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  async function sendMessage(
    text: string,
    target: ChatTarget,
    currentTableId?: string
  ) {
    try {
      await sendChatMessage({
        userId: getUserId(),
        userName: getUserName(),
        text,
        channel:
          target as ChatChannel,
        tableId: currentTableId,
      });
    } catch (error) {
      console.error(
        "[CHAT] Mesaj gönderilemedi:",
        error
      );
    }
  }

  function handleSend() {
    const text =
      message.trim();

    if (!text) {
      inputRef.current?.focus();
      return;
    }

    if (
      isSpectator &&
      chatTarget === "RAKİPLER"
    ) {
      onChatTargetChange("MASA");

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });

      return;
    }

    const target =
      chatTarget;

    const currentTableId =
      tableId ?? getUrlTableId();

    if (
      (target === "MASA" ||
        target === "RAKİPLER" ||
        target ===
          "İZLEYİCİLER") &&
      !currentTableId
    ) {
      alert(
        "Masa sohbeti için önce bir masaya girmeniz gerekiyor."
      );

      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });

      return;
    }

    setMessage("");

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    void sendMessage(
      text,
      target,
      currentTableId
    );
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    handleSend();
  }

  return (
    <div className="relative flex items-center gap-2 border-t border-red-800 bg-zinc-900 p-3">
      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={(event) =>
          setMessage(
            event.target.value
          )
        }
        onKeyDown={handleKeyDown}
        placeholder="Mesajınızı yazın..."
        className="
          min-w-0
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
        type="button"
        onClick={() =>
          setSettingsOpen(
            (open) => !open
          )
        }
        className="
          rounded-lg
          border
          border-red-700
          bg-black
          px-3
          py-2
          text-sm
          font-semibold
          text-yellow-300
          transition
          hover:bg-red-950
        "
      >
        AYARLAR
      </button>

      <button
        type="button"
        onClick={handleSend}
        disabled={!message.trim()}
        className="
          rounded-lg
          border
          border-red-700
          bg-red-900
          px-4
          py-2
          text-sm
          font-semibold
          text-yellow-300
          transition
          hover:bg-red-800
          disabled:cursor-not-allowed
          disabled:opacity-40
        "
      >
        GÖNDER
      </button>

      {settingsOpen && (
        <ChatSettings
          chatTarget={chatTarget}
          onTargetChange={
            handleTargetChange
          }
          isSpectator={
            isSpectator
          }
          showSalon={showSalon}
          showMasa={showMasa}
          showRakipler={
            showRakipler
          }
          showIzleyiciler={
            showIzleyiciler
          }
          onShowSalonChange={
            onShowSalonChange
          }
          onShowMasaChange={
            onShowMasaChange
          }
          onShowRakiplerChange={
            onShowRakiplerChange
          }
          onShowIzleyicilerChange={
            onShowIzleyicilerChange
          }
          onSettingsClose={() =>
            setSettingsOpen(false)
          }
        />
      )}
    </div>
  );
}