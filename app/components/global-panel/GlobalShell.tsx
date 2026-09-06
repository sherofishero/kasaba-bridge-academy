"use client";

import {
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import GlobalPanel from "./GlobalPanel";
import { GlobalTableProvider } from "./GlobalTableContext";

type GlobalShellProps = {
  children: ReactNode;
};

export default function GlobalShell({
  children,
}: GlobalShellProps) {
  const pathname = usePathname();

  const [panelOpen, setPanelOpen] =
    useState(true);

  const [panelWidth, setPanelWidth] =
    useState(280);

  /*
   * Giriş / karşılama sayfalarında
   * global panel görünmez.
   */
  const hidePanel =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/uye-ol";

  if (hidePanel) {
    return <>{children}</>;
  }

  return (
  <GlobalTableProvider>
    <div className="flex min-h-screen w-full overflow-x-hidden">
      {/* ANA SAYFA */}
      <main
        className="min-w-0 flex-1 overflow-x-hidden"
        style={
          pathname === "/salon" && panelOpen
            ? { paddingRight: `${panelWidth}px` }
            : undefined
        }
      >
        {children}
      </main>

      {/* GLOBAL PANEL */}
      <GlobalPanel
        open={panelOpen}
        width={panelWidth}
        onOpenChange={setPanelOpen}
        onWidthChange={setPanelWidth}
      />
      </div>
    </GlobalTableProvider>
  );
}