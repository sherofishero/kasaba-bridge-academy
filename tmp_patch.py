import os
from pathlib import Path

BASE = Path(r"C:\Users\Seref\kasaba-bridge-academy")
GS = BASE / "app" / "components" / "global-panel" / "GlobalShell.tsx"
GP = BASE / "app" / "components" / "global-panel" / "GlobalPanel.tsx"

NEW_GS = """\
"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  const [panelWidth, setPanelWidth] = useState(280);
  const [shellReady, setShellReady] = useState(false);

  useEffect(() => {
    setShellReady(true);
    return () => {
      /* no-op */
    };
  }, []);

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
        className="relative min-h-screen"
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
          className="min-w-0 w-full overflow-x-hidden"
          style={{
            width: "100%",
            maxWidth: "100vw",
            minWidth: 0,
            paddingRight: "0px",
          }}
        >
          {children}
        </main>

        {/* PANEL AÇMA DÜĞMESİ */}
        {!panelOpen && (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="fixed right-2 top-2 z-40 rounded-md border border-yellow-700 bg-yellow-300 px-2 py-1 text-xs font-bold text-black shadow hover:bg-yellow-200"
            aria-label="Panel aç"
          >
            Panel
          </button>
        )}

        {/* GLOBAL PANEL (OVERLAY) */}
        {panelOpen && (
          <div
            className="fixed inset-0 z-50"
            onClick={() => setPanelOpen(false)}
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <div
              className="flex justify-end h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <GlobalPanel
                open={panelOpen}
                width={panelWidth}
                onOpenChange={setPanelOpen}
                onWidthChange={setPanelWidth}
              />
            </div>
          </div>
        )}
      </div>
    </GlobalTableProvider>
  );
}
"""


def patch_global_panel(raw: str) -> str:
    head_marker = "    const resizingRef = useRef(false);\n\n"
    idx = raw.find(head_marker)
    if idx == -1:
        raise RuntimeError("head marker not found")
    head = raw[: idx + len(head_marker)]

    tail_start = raw.find(
        "\n    function handleRe", idx
    )
    if tail_start == -1:
        raise RuntimeError("tail start not found")

    new_mid = """\
    const [activeTab, setActiveTab] =
        useState<MainPanelTab>("BULUNANLAR");

    const [activeSubTab, setActiveSubTab] =
        useState<SubTab>("ÇEVRİMİÇİ");

    const resizingRef = useRef(false);

    function handleMainTabChange(
        tab: MainPanelTab
    ) {
        setActiveTab(tab);

        const firstSubTab = subTabs[tab][0];

        if (firstSubTab) {
            setActiveSubTab(firstSubTab);
        }
    }
"""
    return head + new_mid + raw[tail_start:]


def main() -> None:
    GS.write_text(NEW_GS, encoding="utf-8")
    raw = GP.read_text(encoding="utf-8")
    GP.write_text(patch_global_panel(raw), encoding="utf-8")
    print("done")


if __name__ == "__main__":
    main()
