"use client";

import ChatHeader from "./ChatHeader";
import ChatTabs from "./ChatTabs";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

export default function GlobalChat() {
  return (
    <div
      className="
        fixed
        bottom-0
        left-0
        right-0
        h-72
        bg-zinc-950
        border-t
        border-red-800
        shadow-2xl
        flex
        flex-col
        z-50
      "
    >
      <ChatHeader />

      <ChatTabs />

      <ChatMessages />

      <ChatInput />
    </div>
  );
}