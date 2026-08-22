"use client";

import {
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from "react";

type PanelTab =
    | "SİTEDE BULUNANLAR"
    | "MESAJLAR"
    | "AYARLAR";

type GlobalPanelProps = {
    open: boolean;
    width: number;
    onOpenChange: (open: boolean) => void;
    onWidthChange: (width: number) => void;
};

const MIN_WIDTH = 240;
const MAX_WIDTH = 600;

export default function GlobalPanel({
    open,
    width,
    onOpenChange,
    onWidthChange,
}: GlobalPanelProps) {
    const [activeTab, setActiveTab] =
        useState<PanelTab>("SİTEDE BULUNANLAR");

    const resizingRef = useRef(false);

    const tabs: PanelTab[] = [
        "SİTEDE BULUNANLAR",
        "MESAJLAR",
        "AYARLAR",
    ];

    function handleResizeStart(
        event: ReactPointerEvent<HTMLDivElement>
    ) {
        event.preventDefault();

        resizingRef.current = true;

        const startX = event.clientX;
        const startWidth = width;

        event.currentTarget.setPointerCapture(
            event.pointerId
        );

        function handlePointerMove(
            moveEvent: PointerEvent
        ) {
            if (!resizingRef.current) {
                return;
            }

            /*
             * Panelin sağ kenarı sabit.
             *
             * Fare sola gittikçe panel büyür.
             * Fare sağa gittikçe panel küçülür.
             */
            const nextWidth =
                startWidth +
                (startX - moveEvent.clientX);

            onWidthChange(
                Math.min(
                    MAX_WIDTH,
                    Math.max(
                        MIN_WIDTH,
                        nextWidth
                    )
                )
            );
        }

        function handlePointerUp() {
            resizingRef.current = false;

            window.removeEventListener(
                "pointermove",
                handlePointerMove
            );

            window.removeEventListener(
                "pointerup",
                handlePointerUp
            );
        }

        window.addEventListener(
            "pointermove",
            handlePointerMove
        );

        window.addEventListener(
            "pointerup",
            handlePointerUp
        );
    }

    if (!open) {
        return (
            <button
                type="button"
                onClick={() =>
                    onOpenChange(true)
                }
                aria-label="Global paneli aç"
                className="
          fixed
          right-0
          top-1/2
          z-50
          flex
          h-24
          w-8
          -translate-y-1/2
          items-center
          justify-center
          rounded-l-lg
          border
          border-red-800
          bg-zinc-950
          text-yellow-400
          shadow-xl
          transition
          hover:bg-red-950
        "
            >
                <span className="-rotate-90 whitespace-nowrap text-[10px] font-bold tracking-wider">
                    PANEL
                </span>
            </button>
        );
    }

    return (
        <aside
            style={{
                width: `${width}px`,
            }}
            className="
    fixed
    right-0
    top-10
    z-40
    flex
    h-[calc(100vh-40px)]
    shrink-0
    flex-col
    border-l
    border-red-800
    bg-zinc-950
    text-yellow-300
    shadow-2xl
  "
        >
            {/* SOL KENARDAN GENİŞLETME / DARALTMA */}
            <div
                onPointerDown={
                    handleResizeStart
                }
                title="Panel genişliğini değiştir"
                className="
          absolute
          left-0
          top-0
          z-50
          h-full
          w-1
          cursor-ew-resize
          bg-transparent
          transition
          hover:bg-red-700
        "
            />

            {/* BAŞLIK */}
            <div className="flex items-center justify-between border-b border-red-800 px-4 py-3">
                <h2 className="text-center text-lg font-black tracking-[0.12em] text-yellow-400">
                    KASABA
                </h2>

                <button
                    type="button"
                    onClick={() =>
                        onOpenChange(false)
                    }
                    aria-label="Global paneli kapat"
                    className="
            rounded-md
            border
            border-red-800
            bg-black
            px-2
            py-1
            text-xs
            font-bold
            text-yellow-400
            transition
            hover:bg-red-950
          "
                >
                    KAPAT
                </button>
            </div>

            {/* SEKME MENÜSÜ */}
            <div className="grid grid-cols-3 border-b border-red-800">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() =>
                            setActiveTab(tab)
                        }
                        className={`
              min-h-[54px]
              px-2
              py-2
              text-xs
              font-bold
              leading-tight
              transition
              ${activeTab === tab
                                ? "bg-red-900 text-yellow-300"
                                : "bg-black text-yellow-600 hover:bg-zinc-900 hover:text-yellow-300"
                            }
            `}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* İÇERİK */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {activeTab ===
                    "SİTEDE BULUNANLAR" && (
                        <div className="p-4">
                            <div className="mb-4 border-b border-red-900 pb-2 text-sm font-bold text-yellow-400">
                                SİTEDE BULUNANLAR
                            </div>

                            <div className="space-y-2">
                                <div className="rounded-lg border border-zinc-800 bg-black px-3 py-2">
                                    <div className="font-semibold text-green-400">
                                        Shero
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        Çalışma Odası
                                    </div>
                                </div>

                                <div className="rounded-lg border border-zinc-800 bg-black px-3 py-2">
                                    <div className="font-semibold text-green-400">
                                        Kadir
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        Oyun Odası
                                    </div>
                                </div>

                                <div className="rounded-lg border border-zinc-800 bg-black px-3 py-2">
                                    <div className="font-semibold text-green-400">
                                        Zafer
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        Salonda
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                {activeTab ===
                    "MESAJLAR" && (
                        <div className="p-4">
                            <div className="mb-4 border-b border-red-900 pb-2 text-sm font-bold text-yellow-400">
                                MESAJLAR
                            </div>

                            <div className="rounded-lg border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-500">
                                Henüz özel mesajınız yok.
                            </div>
                        </div>
                    )}

                {activeTab ===
                    "AYARLAR" && (
                        <div className="p-4">
                            <div className="mb-4 border-b border-red-900 pb-2 text-sm font-bold text-yellow-400">
                                AYARLAR
                            </div>

                            <div className="rounded-lg border border-zinc-800 bg-black px-3 py-3 text-sm text-zinc-500">
                                Ayarlar bölümü daha sonra
                                burada yer alacak.
                            </div>
                        </div>
                    )}
            </div>
        </aside>
    );
}