"use client";

import { useState } from "react";
import ChatSettings from "./ChatSettings";
import {
  sendChatMessage,
  type ChatChannel,
} from "../../lib/supabase";

type ChatTarget = "SALON" | "MASA" | "RAKİPLER";

type ChatInputProps = {
  chatTarget: ChatTarget;
  onChatTargetChange: (target: ChatTarget) => void;

  showSalon: boolean;
  showMasa: boolean;
  showRakipler: boolean;

  onShowSalonChange: (value: boolean) => void;
  onShowMasaChange: (value: boolean) => void;
  onShowRakiplerChange: (value: boolean) => void;
};

function getUserId(): string {
  const existingId = localStorage.getItem("chatUserId");

  if (existingId) {
    return existingId;
  }

  const newId =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem("chatUserId", newId);

  return newId;
}

function getUserName(): string {
  return localStorage.getItem("guestName")?.trim() || "Oyuncu";
}

function getTableId(): string | undefined {
  const params = new URLSearchParams(window.location.search);
  return params.get("tableId") ?? undefined;
}

export default function ChatInput({
  chatTarget,
  onChatTargetChange,
  showSalon,
  showMasa,
  showRakipler,
  onShowSalonChange,
  onShowMasaChange,
  onShowRakiplerChange,
}: ChatInputProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  function handleTargetChange(target: ChatTarget) {
    onChatTargetChange(target);
  }

  async function handleSend() {
    const text = message.trim();

    if (!text || sending) {
      return;
    }

    const tableId = getTableId();

    if (
      (chatTarget === "MASA" || chatTarget === "RAKİPLER") &&
      !tableId
    ) {
      alert("Masa sohbeti için önce bir masaya girmeniz gerekiyor.");
      return;
    }

    setSending(true);

    try {
      await sendChatMessage({
        userId: getUserId(),
        userName: getUserName(),
        text,
        channel: chatTarget as ChatChannel,
        tableId,
      });

      setMessage("");
    } catch (error) {
      console.error("[CHAT] Mesaj gönderilemedi:", error);

      alert("Mesaj gönderilemedi. Lütfen bağlantınızı kontrol edin.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="relative flex items-center gap-2 border-t border-red-800 bg-zinc-900 p-3">
      <input
        type="text"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Mesajınızı yazın..."
        disabled={sending}
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
          disabled:opacity-50
        "
      />

      <button
        type="button"
        onClick={() => setSettingsOpen((open) => !open)}
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
        onClick={() => void handleSend()}
        disabled={!message.trim() || sending}
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
        {sending ? "..." : "GÖNDER"}
      </button>

      {settingsOpen && (
        <ChatSettings
          chatTarget={chatTarget}
          onTargetChange={handleTargetChange}
          showSalon={showSalon}
          showMasa={showMasa}
          showRakipler={showRakipler}
          onShowSalonChange={onShowSalonChange}
          onShowMasaChange={onShowMasaChange}
          onShowRakiplerChange={onShowRakiplerChange}
        />
      )}
    </div>
  );
}