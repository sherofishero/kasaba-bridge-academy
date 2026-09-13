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

  const [panelOpen, setPanelOpen] = useState<boolean>(false);

  const [panelWidth, setPanelWidth] =
    useState(280);

  /*
   * İlk paint'te mobil kabul edilir; ölçüm genişliği kanıtlarsa
   * desktop'a geçilir. Böylece şişmiş layout viewport + SSR anında
   * panel/padding Salon'u genişletemez.
   */
  const [isMobile, setIsMobile] = useState<boolean>(true);

  const [shellReady, setShellReady] = useState(false);

  useEffect(() => {
    function updateIsMobile() {
      const visualWidth =
        window.visualViewport?.width ?? window.innerWidth;

      /* Desktop yalnızca iki ölçüm de genişse kanıtlanır. */
      const provenWide =
        window.innerWidth >= 768 && visualWidth >= 768;

      setIsMobile(!provenWide);
      setShellReady(true);

      if (provenWide) {
        setPanelOpen(true);
      } else {
        setPanelOpen(false);
      }
    }

    updateIsMobile();
    window.addEventListener(
      "resize",
      updateIsMobile
    );
    window.visualViewport?.addEventListener(
      "resize",
      updateIsMobile
    );

    return () => {
      window.removeEventListener(
        "resize",
        updateIsMobile
      );
      window.visualViewport?.removeEventListener(
        "resize",
        updateIsMobile
      );
    };
  }, []);

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
    <div
      className="flex min-h-screen"
      style={{
        width: "100%",
        maxWidth: "100vw",
        minWidth: 0,
        margin: 0,
        padding: 0,
        overflowX: "clip",
      }}
    >
      {/* ANA SAYFA */}
      <main
        className="min-w-0 flex-1 overflow-x-hidden"
        style={{
          width: "100%",
          maxWidth: "100vw",
          minWidth: 0,
          paddingRight:
            pathname === "/salon" &&
            shellReady &&
            panelOpen &&
            !isMobile
              ? `${panelWidth}px`
              : "0px",
        }}
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