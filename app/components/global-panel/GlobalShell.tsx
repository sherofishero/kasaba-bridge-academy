"use client";

import {
  useEffect,
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

  const [panelOpen, setPanelOpen] = useState<boolean>(() =>
    typeof window !== "undefined" && window.innerWidth < 768
      ? false
      : true
  );

  const [panelWidth, setPanelWidth] =
    useState(280);

  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" && window.innerWidth < 768
      ? true
      : false
  );

  useEffect(() => {
    function updateIsMobile() {
      setIsMobile(window.innerWidth < 768);
    }

    updateIsMobile();
    window.addEventListener(
      "resize",
      updateIsMobile
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateIsMobile
      );
    };
  }, []);

  /*
   * Mobilde ilk açılışta panel kapalı gelsin.
   * Hydration sonrası genişlik netleştiğinde bir kez uygulanır.
   */
  useEffect(() => {
    if (isMobile) {
      setPanelOpen(false);
    }
  }, [isMobile]);

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
          pathname === "/salon" && panelOpen && !isMobile
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