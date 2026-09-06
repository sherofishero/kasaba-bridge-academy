"use client";

import {
    useRef,
    useState,
    useSyncExternalStore,
    type CSSProperties,
    type PointerEvent as ReactPointerEvent,
} from "react";
import HistoryPanel from "../history/HistoryPanel";

type MainPanelTab =
    | "BULUNANLAR"
    | "MESAJ"
    | "GEÇMİŞ"
    | "SEÇENEKLER";

type SubTab =
    | "ARKADAŞLAR"
    | "YÖNETİCİLER"
    | "İZLEYİCİLER"
    | "BİLDİRİM"
    | "MESAJ"
    | "MASA"
    | "DİĞER MASALAR"
    | "GEÇMİŞ OYNADIKLARIM"
    | "GEÇMİŞ TURNUVALARIM"
    | "MASA SEÇENEKLERİ"
    | "SİTE AYARLARI"
    | "MASA AYARLARI"
    | "SOHBET AYARLARI"
    | "SES AYARLARI";

type GlobalPanelProps = {
    open: boolean;
    width: number;
    onOpenChange: (open: boolean) => void;
    onWidthChange: (width: number) => void;
};

const MIN_WIDTH = 300;
const MAX_WIDTH = 650;

const mainTabs: MainPanelTab[] = [
    "BULUNANLAR",
    "MESAJ",
    "GEÇMİŞ",
    "SEÇENEKLER",
];

const subTabs: Record<MainPanelTab, SubTab[]> = {
    BULUNANLAR: [
        "ARKADAŞLAR",
        "YÖNETİCİLER",
        "İZLEYİCİLER",
    ],

    MESAJ: [
        "BİLDİRİM",
        "MESAJ",
    ],

    GEÇMİŞ: [
        "MASA",
        "DİĞER MASALAR",
        "GEÇMİŞ OYNADIKLARIM",
        "GEÇMİŞ TURNUVALARIM",
    ],

    SEÇENEKLER: [
        "MASA SEÇENEKLERİ",
        "SİTE AYARLARI",
        "MASA AYARLARI",
        "SOHBET AYARLARI",
        "SES AYARLARI",
    ],
};

export default function GlobalPanel({
    open,
    width,
    onOpenChange,
    onWidthChange,
}: GlobalPanelProps) {
    const [activeTab, setActiveTab] =
        useState<MainPanelTab>("BULUNANLAR");

    const [activeSubTab, setActiveSubTab] =
        useState<SubTab>("ARKADAŞLAR");

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
             * Panelin sağ kenarı sabittir.
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

    /*
     * PANEL KAPALI
     */
    if (!open) {
    return (
        <button
            type="button"
            onClick={() => {
                onWidthChange(280);
                onOpenChange(true);
            }}
            aria-label="Global paneli aç"
            className="
                fixed
                right-0
                top-1/2
                z-50
                flex
                h-28
                w-9
                -translate-y-1/2
                items-center
                justify-center
                rounded-l-lg
                border
                border-[#050440]
                bg-zinc-950
                text-yellow-400
                shadow-xl
                transition
                hover:bg-[#050440]
            "
        >
            <span
                className="
                    whitespace-nowrap
                    text-[10px]
                    font-bold
                    tracking-[0.18em]
                    [writing-mode:vertical-rl]
                "
            >
                PANEL
            </span>
        </button>
    );
}

    /*
     * PANEL AÇIK
     */
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
                border-l
                border-[#050440]
                bg-zinc-950
                text-yellow-300
                shadow-2xl
            "
        >
            {/* PANEL GENİŞLİK TUTAMAÇI */}
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
                    hover:bg-[#050440]
                "
            />

            {/* ANA PANEL İÇERİĞİ */}
            <div className="flex min-w-0 flex-1 flex-col">
                {/* PANEL BAŞLIĞI */}
                <div
                    style={{
                        "--history-scale": Math.min(
                            1,
                            Math.max(0.84, 0.84 + ((width - 300) / 350) * 0.16)
                        ),
                    } as CSSProperties}
                    className="
                        flex
                        h-14
                        shrink-0
                        items-center
                        justify-between
                        border-b
                        border-[#050440]
                        px-4
                    "
                >
                    <h2
                        className="
                            text-base
                            font-black
                            tracking-[0.12em]
                            text-yellow-400
                        "
                    >
                        {activeTab}
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
                            border-[#050440]
                            bg-[#fcfcfc]
                            px-2
                            py-1
                            text-xs
                            font-red
                            text-red-400
                            transition
                            hover:bg-[#050440]
                        "
                    >
                        KAPAT
                    </button>
                </div>

                {/* ALT MENÜLER */}
                <div
                    className="
                        shrink-0
                        border-b
                        border-[#050440]
                        bg-[#fcfcfc]
                    "
                >
                    <div
                        className="
        flex
        flex-nowrap
        overflow-x-auto
        scrollbar-thin
        scrollbar-thumb-[#050440]
        scrollbar-track-[#fcfcfc]
    "
                    >
                        {subTabs[activeTab].map(
                            (tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() =>
                                        setActiveSubTab(
                                            tab
                                        )
                                    }
                                    className={`
                                        min-h-[46px]
                                        shrink-0
                                        whitespace-nowrap
                                        border-r
                                        border-[#050440]
                                        px-[calc(0.75rem*var(--history-scale))]
                                        py-[calc(0.5rem*var(--history-scale))]
                                        text-[calc(0.75rem*var(--history-scale))]
                                        font-bold
                                        leading-tight
                                        transition
                                        last:border-r-0
                                        ${activeSubTab ===
                                            tab
                                            ? "bg-[#050440] text-yellow-300"
                                            : "bg-[#fcfcfc] text-yellow-600 hover:bg-zinc-900 hover:text-yellow-300"
                                        }
                                    `}
                                >
                                    {tab}
                                </button>
                            )
                        )}
                    </div>
                </div>

                {/* İÇERİK ALANI */}
                <div
                    className="
                        min-h-0
                        flex-1
                        overflow-y-auto
                    "
                >
                    <PanelContent
                        activeTab={activeTab}
                        activeSubTab={activeSubTab}
                        panelWidth={width}
                    />
                </div>
            </div>

            {/* SAĞ DİKEY ANA MENÜ */}
            <nav
                aria-label="Global panel menüsü"
                className="
                    flex
                    w-12
                    shrink-0
                    flex-col
                    border-l
                    border-[#050440]
                    bg-[#fcfcfc]
                "
            >
                {mainTabs.map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() =>
                            handleMainTabChange(tab)
                        }
                        aria-label={tab}
                        aria-pressed={
                            activeTab === tab
                        }
                        className={`
                            relative
                            flex
                            min-h-24
                            flex-1
                            items-center
                            justify-center
                            border-b
                            border-[#050440]
                            px-1
                            transition
                            last:border-b-0
                            ${activeTab === tab
                                ? "bg-[#050440] text-yellow-300"
                                : "bg-[#fcfcfc] text-yellow-600 hover:bg-zinc-900 hover:text-yellow-300"
                            }
                        `}
                    >
                        {activeTab === tab && (
                            <span
                                className="
                                    absolute
                                    left-0
                                    top-0
                                    h-full
                                    w-[3px]
                                    bg-yellow-400
                                "
                            />
                        )}

                        <span
                            className="
                                whitespace-nowrap
                                text-[12px]
                                font-black
                                tracking-[0.16em]
                                [writing-mode:vertical-rl] [text-orientation:mixed]
                            "
                        >
                            {tab}
                        </span>
                    </button>
                ))}
            </nav>
        </aside>
    );
}

/* =========================================================
   PANEL CONTENT
   ========================================================= */

type PanelContentProps = {
    activeTab: MainPanelTab;
    activeSubTab: SubTab;
    panelWidth: number;
};

function PanelContent({
    activeTab,
    activeSubTab,
    panelWidth,
}: PanelContentProps) {
    if (activeTab === "BULUNANLAR") {
        return (
            <FoundContent
                activeSubTab={activeSubTab}
            />
        );
    }

    if (activeTab === "MESAJ") {
        return (
            <MessageContent
                activeSubTab={activeSubTab}
            />
        );
    }

    if (activeTab === "GEÇMİŞ") {
        return (
            <HistoryContent
                activeSubTab={activeSubTab}
                panelWidth={panelWidth}
            />
        );
    }

    return (
        <SettingsContent
            activeSubTab={activeSubTab}
        />
    );
}

/* =========================================================
   BULUNANLAR
   ========================================================= */

function FoundContent({
    activeSubTab,
}: {
    activeSubTab: SubTab;
}) {
    return null;
}

/* =========================================================
   MESAJ
   ========================================================= */

function MessageContent({
    activeSubTab,
}: {
    activeSubTab: SubTab;
}) {
    return null;
}

/* =========================================================
   GEÇMİŞ
   ========================================================= */

function HistoryContent({
    activeSubTab,
    panelWidth,
}: {
    activeSubTab: SubTab;
    panelWidth: number;
}) {
    /*
     * MASA:
     * Kullanıcının o anda bulunduğu masa.
     * Oyuncu olabilir veya izleyici olabilir.
     *
     * DİĞER MASALAR:
     * Aynı board'ın diğer masalarda
     * nasıl oynandığını gösterir.
     *
     * GEÇMİŞ OYNADIKLARIM:
     * Tamamlanmış eski oyunlar.
     *
     * GEÇMİŞ TURNUVALARIM:
     * Tamamlanmış turnuvalar.
     */

    if (activeSubTab === "MASA") {
        return (
            <CurrentTableContent panelWidth={panelWidth} />
        );
    }

    if (
        activeSubTab ===
        "DİĞER MASALAR"
    ) {
        return (
            <OtherTablesContent />
        );
    }

    if (
        activeSubTab ===
        "GEÇMİŞ OYNADIKLARIM"
    ) {
        return (
            <PastGamesContent />
        );
    }

    return (
        <PastTournamentsContent />
    );
}

/* =========================================================
   GEÇMİŞ > MASA
   ========================================================= */

function CurrentTableContent({ panelWidth }: { panelWidth: number }) {
    const tableId = useSyncExternalStore(
        () => () => undefined,
        () =>
            new URLSearchParams(
                window.location.search
            ).get("tableId")?.trim() ?? null,
        () => null
    );

    if (!tableId) {
        return (
            <div className="min-h-full bg-white p-3 text-sm text-black">
                Masa geçmişini görmek için bir masa seçin.
            </div>
        );
    }

    return (
        <HistoryPanel
            tableId={tableId}
            gameType="TRAINING"
            embedded
            panelWidth={panelWidth}
            onClose={() => undefined}
        />
    );
}

/* =========================================================
   GEÇMİŞ > DİĞER MASALAR
   ========================================================= */

function OtherTablesContent() {
    return (
        <div className="min-h-full bg-white p-3 text-sm text-black">
            Bu board için diğer masa sonuçları burada gösterilecek.
        </div>
    );
}
/* =========================================================
   GEÇMİŞ > OYNADIKLARIM
   ========================================================= */

function PastGamesContent() {
    return (
        <div className="min-h-full bg-white p-3 text-sm text-black">
            Oynadığınız geçmiş oyunlar burada gösterilecek.
        </div>
    );
}

/* =========================================================
   GEÇMİŞ > TURNUVALARIM
   ========================================================= */

function PastTournamentsContent() {
    return (
        <div className="min-h-full space-y-2 bg-white p-3 text-sm text-black">
            <div className="rounded border border-zinc-300 bg-white p-2">
                <div className="mb-1 text-xs font-bold uppercase">
                    Takım Maçı
                </div>
                <p>Takım maçı geçmişi burada gösterilecek.</p>
            </div>
            <div className="rounded border border-zinc-300 bg-white p-2">
                <div className="mb-1 text-xs font-bold uppercase">
                    Turnuva
                </div>
                <p>Turnuva geçmişi burada gösterilecek.</p>
            </div>
        </div>
    );
}

/* =========================================================
   SEÇENEKLER
   ========================================================= */

function SettingsContent({
    activeSubTab,
}: {
    activeSubTab: SubTab;
}) {
    return null;
}