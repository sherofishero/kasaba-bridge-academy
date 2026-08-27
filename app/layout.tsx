import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GlobalChat from "./components/chat/GlobalChat";
import PrivateChatManager from "./components/chat/PrivateChatManager";
import GlobalShell from "./components/global-panel/GlobalShell";
import SessionGuard from "./components/SessionGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kasaba Bridge Hub",
  description: "Kasaba Bridge Hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionGuard />

        <GlobalShell>
          {children}
        </GlobalShell>

        <GlobalChat />

        <PrivateChatManager />
      </body>
    </html>
  );
}