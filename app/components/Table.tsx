"use client";

import Link from "next/link";
import Hand from "./Hand";
import SuitHand from "./SuitHand";
import CardFace from "./Card";
import Auction from "./Auction";
import BiddingBox from "./BiddingBox";
import Image from "next/image";
import {
  Deal,
  type Card as BridgeCard,
  createDeck,
  shuffleDeck,
  dealHands,
} from "../lib/deck";
import { Bid, Seat, canRequestAlertExplanation } from "../lib/auction";
import type { TableState } from "../lib/game";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import TableInfoPanel from "./table/TableInfoPanel";
import {
  PrivateExplanationMessage,
  subscribeToPrivateExplanations,
} from "../lib/supabase";
import GlobalChat from "./chat/GlobalChat";
type PlayerRole =
  | "NORTH"
  | "EAST"
  | "SOUTH"
  | "WEST"
  | "SPECTATOR";

/* Direktör Çağır penceresinde sunulan hazır seçenekler. */
const DIRECTOR_OPTIONS = [
  "Masada direktöre ihtiyacım var",
  "Direktöre mesaj",
] as const;

/*
 * RESPONSIVE PHASE-1 — MASA TABAN Ã–LÃ‡ÃœLERİ VE Ã–LÃ‡EK SINIRLARI.
 *
 * Masa kÃ¶kü her zaman 1037x810 px'lik sabit bir tasarım alanıdır; iç
 * yerleÅŸim (koltuklar, ihale, eller) deÄŸiÅŸmez. Ekrana uyum yalnızca kÃ¶kün
 * tamamına uygulanan TEK bir `scale()` ile yapılır. BÃ¶ylece telefon,
 * tablet, laptop, ultrawide ve 4K ekranlarda masa mümkün olan en büyük
 * boyutta, kırpılmadan gÃ¶rünür.
 */
const TABLE_BASE_WIDTH = 1037;
const TABLE_BASE_HEIGHT = 810;
/* Ã‡ok dar telefonlarda masa okunabilir kalsın diye alt sınır. */
const TABLE_MIN_SCALE = 0.28;
/* Patolojik geniÅŸliklerde (Ã¶r. 5K/8K) absürt büyümeyi engelleyen üst sınır;
 * gerçek 4K'da (3840x2160) Ã¶lçek ~2.6 olduÄŸundan bu sınır pratikte devreye
 * girmez â†’ "mümkün olan en büyük boyut" korunur. */
const TABLE_MAX_SCALE = 3;
/* Masa kenarlara yapÄ±ÅŸmasın diye bırakılan ince pay (Ã¶lçeÄŸe dahil edilir). */
const TABLE_EDGE_GUTTER = 12;

/*
 * PROTOTİP — MOBİL DİKEY (PORTRAIT) KENAR PAYI  [geri alınabilir]
 *
 * Yalnızca mobil dikey gÃ¶rünümde geçerlidir (aÅŸaÄŸÄ±daki `isMobilePortrait`
 * ÅŸartı). Mobil yatay, tablet ve desktop bu deÄŸeri HÄ°Ã‡ gÃ¶rmez; onlar
 * TABLE_EDGE_GUTTER (12) ile birebir eskisi gibi çalÄ±ÅŸÄ±r.
 *
 * Neden sadece bu pay? Masa kÃ¶kü 1037x810 sabit olduÄŸundan Ã¶lçek
 * `min(geniÅŸlik/1037, yükseklik/810)` ile hesaplanır ve DAR olan eksen
 * belirleyicidir. Telefon dikeyde baÄŸlayıcı eksen GENÄ°ÅLİKTİR
 * (390/1037 = 0.376 < 728/810 = 0.899). Bu nedenle dikey alanı daha iyi
 * kullanmanın, eleman koordinatlarını ve 1037x810 geometrisini
 * DEÄÄ°ÅTİRMEDEN mümkün olan tek kaldıracı yatay paydır: pay 12 -> 0
 * olunca Ã¶lçek 0.353 -> 0.376'ya, masanın çizilen yüksekliÄŸi
 * 286 -> 305px'e çıkar (+19px, +%6.6) ve iki yandaki 12px'lik siyah
 * ÅŸerit kalkar.
 *
 * GERİ ALMA: bu sabiti `TABLE_EDGE_GUTTER` ile eÅŸitlemek yeterlidir
 * (tek satır) â†’ prototip tamamen devre dÄ±ÅŸÄ± kalır.
 */
const TABLE_EDGE_GUTTER_PORTRAIT = 0;

/*
 * PROTOTİP 3 — MOBİL DİKEY Ã‡ALIÅMA ALANI  [geri alınabilir]
 *
 * GÃ¶rev 2'deki non-uniform `scaleY` yaklaÅŸÄ±mı KALDIRILDI: içerik asla
 * esnetilmez. Mobil dikeyde Ã¶lçek artık daima UNIFORMDUR
 * (`scaleX === scaleY`); bunun yerine dikeyde DAHA UZUN bir çalÄ±ÅŸma alanı
 * kullanılır ve oyun elemanları bu alan içinde Y ekseninde yeniden
 * daÄŸÄ±tılır.
 *
 * Neden uzun tuval? Ã–lçek `min(geniÅŸlik/tuvalGeniÅŸliÄŸi, yükseklik/tuvalYüksekliÄŸi)`
 * ile hesaplandÄ±ÄŸÄ± için tuval yüksekliÄŸi artırılınca kutu dikeyde büyür,
 * içerik Ã¶lçeÄŸi (dolayısıyla kart/auction/yazı oranları) DEÄÄ°ÅMEZ.
 * 390x800'de: geniÅŸlik Ã¶lçeÄŸi 390/1037 = 0.376, dikey sınır 728/1600 = 0.455
 * â†’ Ã¶lçek 0.376 kalır ve masa 390 x (1600 x 0.376 = 601.7)px olur.
 *
 * Y yeniden daÄŸÄ±tımı (yalnız portre): Kuzey üst kenardan, Auction + DoÄŸu/Batı
 * ortadaki serbest bandın merkezinden, Güney ve Chat alttan çapalanır.
 *
 * GERİ ALMA: bu sabiti TABLE_BASE_HEIGHT ile eÅŸitlemek ve render'daki
 * portre sınıf dallarını kaldırmak yeterlidir â†’ yerleÅŸim eski hÃ¢line dÃ¶ner.
 */
const TABLE_PORTRAIT_CANVAS_HEIGHT = 1600;

type TableProps = {
  hands: Deal;
  setHands: React.Dispatch<React.SetStateAction<Deal>>;
  auction: Bid[];
  setAuction: React.Dispatch<React.SetStateAction<Bid[]>>;
  turn: Seat;
  setTurn: React.Dispatch<React.SetStateAction<Seat>>;
  playerRole?: PlayerRole;
  tableState: TableState | null;
  isHost?: boolean;
  isNormalGameTable?: boolean;
  /* Rol henüz async olarak Ã§Ã¶zümlenmediyse true: tüm eller
    HiddenHand/HiddenSuitHand ile gÃ¶sterilir (refresh flaÅŸÄ± Ã¶nlenir). */
  rolePending?: boolean;
  isAuctionFinished?: boolean;
  onCall?: (call: Bid) => void;
  onUndo?: () => void;
  onUndoRequest?: () => void;
  onApproveUndo?: () => void;
  onRejectUndo?: () => void;
  onCancelUndo?: () => void;
  undoRequest?: TableState["undoRequest"];
  currentUsername?: string | null;
  onPlayCard?: (card: BridgeCard, seat: Seat) => void;
  /* ALERT SİSTEMİ — sayfa (cuha/oyuncuha) tarafındaki handler'lar.
     Kendi deklarasyonu ALERT'leme (sıra gerekmez) ve rakip
     deklarasyonuna açıklama isteme (PASS dahil). */
  onBidAlert?: (bidIndex: number, explanation: string) => void;
  onRequestExplanation?: (bidIndex: number, bid: Bid) => void;
  boardResult?: {
    contract: string;
    declarer: Seat;
    result: string;
    score: number;
    scoringSide: "NS" | "EW";
  } | null;
  newBoardRequest?: TableState["newBoardRequest"];
  onApproveNewBoardRequest?: () => void;
  onRejectNewBoardRequest?: () => void;
  /* DirektÃ¶r Ã‡aÄŸÄ±r: oyuncu gÃ¶nderime bastÄ±ÄŸÄ±nda çaÄŸrılır. */
  onSendDirectorCall?: (payload: {
    type: "DIRECTOR_NEEDED" | "MESSAGE";
    message: string;
    callerName: string | null;
    callerSeatLabel: string | null;
  }) => void;
};

/* Popup'ta hangi deklarasyonun borçlu olduÄŸu açıkça gÃ¶sterilmek için
   küçük bir deklarasyon etiketi yardımcısı (Auction'daki formatBid ile
   aynı gÃ¶rüntüyü üretir; yeni oyun mantÄ±ÄŸÄ± içermez). */
function formatBidLabel(bid: Bid): string {
  switch (bid.type) {
    case "PASS":
      return "PASS";
    case "DOUBLE":
      return "X";
    case "REDOUBLE":
      return "XX";
    case "BID":
      return `${bid.level}${bid.strain ?? ""}`;
  }
}

function HiddenHand() {
  return (
    <div className="flex items-end justify-center">
      {Array.from({ length: 13 }).map((_, index) => (
        <div
          key={index}
          style={{
            marginLeft: index === 0 ? 0 : -70,
            zIndex: index,
          }}
        >
          <Image
            src="/kartimiz.png"
            alt="Kapalı kart"
            width={80}
            height={120}
            className="rounded-xl shadow-lg select-none"
          />
        </div>
      ))}
    </div>
  );
}

function HiddenSuitHand() {
  return (
    <div className="flex flex-col items-center justify-center">
      {Array.from({ length: 13 }).map((_, index) => (
        <div
          key={index}
          style={{
            marginTop: index === 0 ? 0 : -100,
            zIndex: index,
          }}
        >
          <Image
            src="/kartimiz.png"
            alt="Kapalı kart"
            width={80}
            height={120}
            className="rounded-xl shadow-lg select-none"
          />
        </div>
      ))}
    </div>
  );
}

export default function Table({
  hands,
  setHands,
  auction,
  setAuction,
  turn,
  setTurn,
  playerRole = "SPECTATOR",
  tableState,
  isHost,
  isNormalGameTable = false,
  rolePending = false,
  isAuctionFinished = false,
  onCall,
  onUndo,
  onUndoRequest,
  onApproveUndo,
  onRejectUndo,
  onCancelUndo,
  undoRequest,
  currentUsername = null,
  onPlayCard,
  onBidAlert,
  onRequestExplanation,
  boardResult,
  newBoardRequest,
  onApproveNewBoardRequest,
  onRejectNewBoardRequest,
  onSendDirectorCall,
}: TableProps) {
  /* DirektÃ¶r Ã‡aÄŸÄ±r modal durumu. */
  const [directorModalOpen, setDirectorModalOpen] =
    useState(false);
  const [selectedDirectorOption, setSelectedDirectorOption] =
    useState<string | null>(null);
  const [directorSendError, setDirectorSendError] =
    useState<string | null>(null);
  /* Mesaj kutusu pencere kapansa da saklanır; tekrar açınca
     oyuncu ek açıklama yazmaya devam edebilir. */
  const [directorMessage, setDirectorMessage] = useState("");

  /* ALERT Ã–NCESİ TAKIMI: oyuncu deklarasyondan Ã–NCE ALERT'e basar ve
     (opsiyonel) açıklama yazar. Açıklama yazmadan da deklarasyon
     verilebilir; ihale durmaz. Borç kutusundan AYRI metin tutulur. */
  const [alertArmed, setAlertArmed] = useState(false);
  const [alertPrefill, setAlertPrefill] = useState("");
  const [alertDebtText, setAlertDebtText] = useState("");

  /* Açıklama borcu popup'ı kapatıldı mı? "Daha Sonra" butonu yok — popup
     ancak "Açıklamayı Kaydet" ile kapanır; burada ayarlanan true deÄŸeri
     popup render koÅŸulunda kullanılır. */
  const [debtPopupDismissed, setDebtPopupDismissed] = useState(false);

  /* Kullanıcının kendi koltuÄŸu (SPECTATOR ise null). Kart oynama
    aÅŸamasında kendi elini tıklayarak oynaması için gereklidir.
    ALERT yükümlülÃ¼ÄŸÃ¼ hesaplarından Ã–NCE tanımlanmalıdır. */
  const playerSeat: Seat | null =
    playerRole === "NORTH"
      ? "N"
      : playerRole === "EAST"
        ? "E"
        : playerRole === "SOUTH"
          ? "S"
          : playerRole === "WEST"
            ? "W"
            : null;

  /* Seyirci mi? Açıklama talebi kanalı yalnızca gerçek oyuncular için
     baÄŸlanır (seyirciler private explanation almaz/gÃ¶ndermez). */
  const isSpectator = playerRole === "SPECTATOR";

  /* MASADAKİ KULLANICININ KENDİ declarative koltuÄŸu; AÇIKLAMA TALEPLERİ
     yalnızca bÃ¶ylesi için blokaj yaratabilir. */
  const pendingObligationForMe = (
    tableState?.pendingAlertObligations ?? []
  ).some((ob) => ob.alerterSeat === playerSeat);

  /* Açıklama yükümlülÃ¼ÄŸÃ¼ olan oyuncu kendi sırası geldiÄŸinde Ã¶nce borcunu
     temizlemek zorundadır; yoksa BiddingBox DEKLARASYON VEREMEZ (ihale
     diÄŸerleri için durmaz). Yerel fallback: sayfa handler'ı yoksa bile
     blokaj Table içinde uygulanır. */
  const myTurnBlockedByObligation =
    pendingObligationForMe &&
    tableState?.gamePhase === "auction" &&
    playerSeat !== null &&
    turn === playerSeat;

  /* Borç popup'ı: borcun HANGİ deklarasyona ait olduÄŸu popup'ta açıkça
     gÃ¶sterilir. Açıklama satırı yerine ekrana ortalanmÄ±ÅŸ modal kullanılır. */
  const myObligationBidIndex =
    (tableState?.pendingAlertObligations ?? []).find(
      (ob) => ob.alerterSeat === playerSeat
    )?.bidIndex ?? null;
  const myObligationBid =
    myObligationBidIndex !== null
      ? auction[myObligationBidIndex]
      : undefined;

  /* =========================================================
   * NORMAL (ALERT'siz) AÇIKLAMA İSTEĞİ — GİZLİ KANAL
   * İstek/cevap YALNIZCA taraflara (isteyen rakip + deklaran)
   * ulaÅŸÄ±r; partner ve diÄŸerleri bu mesajları hiç iÅŸlemez.
   * ALERT borç mekanizmasından (paylaÅŸÄ±lan TableState) AYRIDIR.
   * ========================================================= */
  const [privateIncomingRequest, setPrivateIncomingRequest] =
    useState<PrivateExplanationMessage | null>(null);
  const [privateRequestText, setPrivateRequestText] = useState("");
  const [privateResponse, setPrivateResponse] =
    useState<PrivateExplanationMessage | null>(null);

  useEffect(() => {
    if (!tableState?.tableId || !currentUsername || isSpectator) {
      return;
    }

    return subscribeToPrivateExplanations(
      tableState.tableId,
      currentUsername,
      (message) => {
        if (message.kind === "REQUEST") {
          /* Deklaranıyım: popup ANINDA açılır (sıra beklemez). */
          setPrivateIncomingRequest(message);
          setPrivateRequestText("");
        } else {
          /* İsteÄŸi ben yaptım: cevabı gÃ¶ster. */
          setPrivateResponse(message);
        }
      }
    );
  }, [tableState?.tableId, currentUsername, isSpectator]);

  /* İlk lÃ¶ve TAMAMLANDIKTAN sonra geçmiÅŸ deklarasyonlar için açıklama
     isteme KAPALIDIR (kesin sınır). Auction sürerken her zaman açık;
     atak Ã¶ncesi / ilk lÃ¶ve bitmeden açık. */
  const canAskRefined =
    !tableState || tableState.gamePhase === "auction"
      ? true
      : canRequestAlertExplanation({
        gamePhase: tableState.gamePhase,
        completedTricksCount:
          tableState.completedTricks?.length ?? 0,
      });

  /* Kendi deklarasyonu ALERT'leme — sıra gerekmez, iptal YOK. Yerel
     auction dizisi ALERT'lenir ve GÃœNCELLENMÄ°Å currentAuction masa
     state'ine yazılıp Supabase'e yayınlanır; bÃ¶ylece sonradan verilen
     ALERT flag'i + açıklaması diÄŸer oturumlara realtime ulaÅŸÄ±r (rakip
     oturumunda sarı gÃ¶rünüm + açıklama popup'ı çalÄ±ÅŸÄ±r). */
  function handleLocalBidAlert(bidIndex: number, explanation: string) {
    const target = auction[bidIndex];

    if (target && playerSeat !== null && target.seat === playerSeat) {
      const trimmed = explanation.trim();
      const nextAuction = auction.map((entry, i) =>
        i === bidIndex
          ? {
            ...entry,
            alerted: true,
            explanation:
              trimmed.length > 0 ? trimmed : entry.explanation,
            alertRequestedBy: null,
          }
          : entry
      );
      setAuction(nextAuction);

      onBidAlert?.(bidIndex, explanation);

      if (tableState) {
        const nextState: TableState = {
          ...tableState,
          currentAuction: nextAuction,
          currentTurn: turn,
        };
        void publishLocalTableState(nextState);
      }
      return;
    }

    onBidAlert?.(bidIndex, explanation);
  }

  /* Rakip deklarasyonuna açıklama isteme — HER deklarasyona (PASS dahil,
     ALERT'li/ALERT'siz fark etmeksizin) tıklanarak istek gÃ¶nderilebilir.
     İstek anında masa state'ine yazılıp yayınlanır; hedef dekleranın
     ekranında popup SIRASINI BEKLEMDEN açılır (popup koÅŸulu currentTurn
     ile baÄŸlantılı deÄŸildir; yalnızca borçlunun kendi sırasındaki yeni
     deklarasyon blokajı ayrı kural olarak korunur). Zaman penceresi:
     ihale sırasında + ilk lÃ¶ve tamamlanana kadar (canRequestAlertExplanation). */
  function handleLocalRequestExplanation(bidIndex: number, bid: Bid) {
    const seatOf = (role: PlayerRole): Seat | null =>
      role === "NORTH"
        ? "N"
        : role === "EAST"
          ? "E"
          : role === "SOUTH"
            ? "S"
            : role === "WEST"
              ? "W"
              : null;

    const requesterSeat = seatOf(playerRole);

    if (
      requesterSeat !== null &&
      bid.seat !== requesterSeat &&
      !isSpectator &&
      tableState &&
      canAskRefined
    ) {
      const already = (tableState.pendingAlertObligations ?? []).some(
        (ob) => ob.bidIndex === bidIndex && ob.alerterSeat === bid.seat
      );

      if (!already) {
        const nextState: TableState = {
          ...tableState,
          currentAuction: auction,
          currentTurn: turn,
          pendingAlertObligations: [
            ...(tableState.pendingAlertObligations ?? []),
            {
              bidIndex,
              alerterSeat: bid.seat,
              requestedBy: requesterSeat,
            },
          ],
        };
        void publishLocalTableState(nextState);
      }
    }

    onRequestExplanation?.(bidIndex, bid);
  }

  async function publishLocalTableState(
    nextState: TableState
  ): Promise<void> {
    /* Table, tableState'in sahibii deÄŸildir; yerel auction/turn
       hemen güncellenir, masa state'i abonelik üzerinden geri gelir. */
    setAuction(nextState.currentAuction ?? auction);
    setTurn(nextState.currentTurn ?? turn);

    try {
      const { supabaseTableCommunication } = await import(
        "../lib/supabase"
      );
      await supabaseTableCommunication.publishTableState(
        nextState.tableId,
        nextState
      );
    } catch (error) {
      console.error("[ALERT] MASA YAYINI BAÅARISIZ", error);
    }
  }

  /* Açıklama borcu varken sıradaki deklarasyona açıklama ekleyip borcu
     kapatma: borcu olan her kaydı kendi seat'ine aitse ALERT'li
     deklarasyona açıklamayı yazar ve yükümlülÃ¼ÄŸÃ¼ dÃ¼ÅŸÃ¼rür. */
  function resolveMyObligationWithExplanation(explanation: string) {
    if (!tableState || playerSeat === null) {
      return null;
    }

    const trimmed = explanation.trim();

    if (trimmed.length === 0) {
      return null;
    }

    const obligations = tableState.pendingAlertObligations ?? [];
    const mine = obligations.filter(
      (ob) => ob.alerterSeat === playerSeat
    );

    if (mine.length === 0) {
      return null;
    }

    const nextAuction = auction.map((entry, i) => {
      const covers = mine.some((ob) => ob.bidIndex === i);

      if (!covers) {
        return entry;
      }

      const obligation = mine.find((ob) => ob.bidIndex === i);
      const requestedBy = obligation?.requestedBy;

      return {
        ...entry,
        alerted: true,
        explanation: trimmed,
        alertRequestedBy: requestedBy != null ? requestedBy : null,
      };
    });

    const remaining = obligations.filter(
      (ob) => ob.alerterSeat !== playerSeat
    );

    const nextState: TableState = {
      ...tableState,
      currentAuction: nextAuction,
      currentTurn: turn,
      pendingAlertObligations: remaining,
    };

    void publishLocalTableState(nextState);
    return nextState;
  }

  /* Kullanıcının kendi koltuÄŸu (SPECTATOR ise null). Kart oynama
    aÅŸamasında kendi elini tıklayarak oynaması için gereklidir. */

  function undo() {
    /*
     * UNDO BUTONU — TEK AKIÅ: hem DEKLARASYON hem KART OYNAMA aÅŸamasında
     * (açılÄ±ÅŸ ataÄŸÄ± dahil) buton rakip onayına sunulan bir UNDO TALEBİ
     * açar. Kart oynama aÅŸamasında buton KESİNLİKLE auction-undo /
     * BiddingBox akÄ±ÅŸÄ±na dÃ¼ÅŸmez; geçerlilik kontrolü sayfada yapılır.
     */
    if (onUndoRequest) {
      onUndoRequest();
      return;
    }

    /* Eski fallback (onUndoRequest verilmeyen sayfalar için). */
    if (auction.length === 0) return;

    if (onUndo) {
      onUndo();
      return;
    }

    setAuction(auction.slice(0, -1));

    setTurn((current) => {
      switch (current) {
        case "N":
          return "W";
        case "E":
          return "N";
        case "S":
          return "E";
        case "W":
          return "S";
      }
    });
  }

  function newDeal() {
    setHands(
      dealHands(
        shuffleDeck(
          createDeck()
        )
      )
    );

    setAuction([]);
    setTurn("N");
  }

  /* Ã‡aÄŸÄ±ran oyuncunun koltuÄŸu (rolünden) — yÃ¶n etiketi olarak. */
  const DIRECTOR_SEAT_LABELS: Record<PlayerRole, string | null> = {
    NORTH: "Kuzey",
    EAST: "DoÄŸu",
    SOUTH: "Güney",
    WEST: "Batı",
    SPECTATOR: null,
  };

  function sendDirectorCallToDirectors() {
    const type: "DIRECTOR_NEEDED" | "MESSAGE" =
      selectedDirectorOption === "Direktöre mesaj"
        ? "MESSAGE"
        : "DIRECTOR_NEEDED";

    const message = directorMessage.trim();

    /* "Direktöre mesaj" seçildiğinde mesaj zorunludur. */
    if (type === "MESSAGE" && !message) {
      setDirectorSendError(
        "Lütfen direktöre iletilecek bir mesaj yazın."
      );
      return;
    }

    onSendDirectorCall?.({
      type,
      message:
        message ||
        (type === "DIRECTOR_NEEDED"
          ? "Masada direktöre ihtiyaç duyuluyor."
          : ""),
      callerName: currentUsername ?? null,
      callerSeatLabel: DIRECTOR_SEAT_LABELS[playerRole],
    });

    /* GÃ¶nderim sonrası modal kapanır; oyun etkilenmez.
       Buton kullanılabilir kalır, oyuncu tekrar çaÄŸÄ±rabilir. */
    setDirectorModalOpen(false);
    setDirectorSendError(null);
  }

  // Determine table view

  let bottomCards = hands.south;
  let topCards = hands.north;
  let leftCards = hands.east;
  let rightCards = hands.west;

  switch (playerRole) {
    case "NORTH":
      bottomCards = hands.north;
      topCards = hands.south;
      leftCards = hands.east;
      rightCards = hands.west;
      break;

    case "SOUTH":
      bottomCards = hands.south;
      topCards = hands.north;
      leftCards = hands.west;
      rightCards = hands.east;
      break;

    case "EAST":
      bottomCards = hands.east;
      topCards = hands.west;
      leftCards = hands.south;
      rightCards = hands.north;
      break;

    case "WEST":
      bottomCards = hands.west;
      topCards = hands.east;
      leftCards = hands.north;
      rightCards = hands.south;
      break;
  }

  /* =========================================================
   * FİZİKSEL KONUM -> GERÃ‡EK KOLTUK (Seat) EÅLEMESİ
   *
   * Ekrandaki top/bottom/left/right konumlarının hangi GERÃ‡EK
   * koltuÄŸa (N/E/S/W) karÅŸÄ±lık geldiÄŸi. GÃ¶rünürlük kararı bu Seat
   * deÄŸerlerine gÃ¶re verilir (kart dizisi referansına gÃ¶re DEÄİL).
   *
   * Kartların hangi fiziksel konumda çizileceÄŸi (topCards vb.)
   * DEÄÄ°ÅMEZ; yalnızca açık/kapalı kararı Seat üzerinden yapılır.
   * ========================================================= */
  let bottomSeat: Seat = "S";
  let topSeat: Seat = "N";
  let leftSeat: Seat = "E";
  let rightSeat: Seat = "W";

  switch (playerRole) {
    case "NORTH":
      bottomSeat = "N";
      topSeat = "S";
      leftSeat = "E";
      rightSeat = "W";
      break;

    case "SOUTH":
      bottomSeat = "S";
      topSeat = "N";
      leftSeat = "W";
      rightSeat = "E";
      break;

    case "EAST":
      bottomSeat = "E";
      topSeat = "W";
      leftSeat = "S";
      rightSeat = "N";
      break;

    case "WEST":
      bottomSeat = "W";
      topSeat = "E";
      leftSeat = "N";
      rightSeat = "S";
      break;
  }

  let bottomPlayer = tableState?.southPlayer;
  let topPlayer = tableState?.northPlayer;
  let leftPlayer = tableState?.eastPlayer;
  let rightPlayer = tableState?.westPlayer;

  switch (playerRole) {
    case "NORTH":
      bottomPlayer = tableState?.northPlayer;
      topPlayer = tableState?.southPlayer;
      leftPlayer = tableState?.eastPlayer;
      rightPlayer = tableState?.westPlayer;
      break;

    case "SOUTH":
      bottomPlayer = tableState?.southPlayer;
      topPlayer = tableState?.northPlayer;
      leftPlayer = tableState?.westPlayer;
      rightPlayer = tableState?.eastPlayer;
      break;

    case "EAST":
      bottomPlayer = tableState?.eastPlayer;
      topPlayer = tableState?.westPlayer;
      leftPlayer = tableState?.southPlayer;
      rightPlayer = tableState?.northPlayer;
      break;

    case "WEST":
      bottomPlayer = tableState?.westPlayer;
      topPlayer = tableState?.eastPlayer;
      leftPlayer = tableState?.northPlayer;
      rightPlayer = tableState?.southPlayer;
      break;
  }

  /*
   * GÃ¶rüntüleme rotasyonuna gÃ¶re ekranın üst/alt konumunun
   * GERÃ‡EK masa yÃ¶nü. BoÅŸ koltuklarda oyuncu adı yerine bu
   * yÃ¶n etiketi gÃ¶sterilir (Kuzeyâ†”Güney, DoÄŸuâ†”Batı geometrisi).
   */
  const viewSeats =
    playerRole === "NORTH"
      ? { top: "SOUTH", bottom: "NORTH" }
      : playerRole === "EAST"
        ? { top: "WEST", bottom: "EAST" }
        : playerRole === "WEST"
          ? { top: "EAST", bottom: "WEST" }
          : /* SOUTH ve SPECTATOR */ { top: "NORTH", bottom: "SOUTH" };

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("bridge-chat-role-change", {
        detail: {
          role: playerRole,
          tableId: tableState?.tableId,
        },
      })
    );
  }, [playerRole, tableState?.tableId]);

  const isTurnSeatEmpty =
    turn === "N"
      ? !tableState?.northPlayer
      : turn === "E"
        ? !tableState?.eastPlayer
        : turn === "S"
          ? !tableState?.southPlayer
          : !tableState?.westPlayer;

  const canHostBidForEmptySeat =
    !isNormalGameTable && isHost === true && isTurnSeatEmpty;
  /* Rol Ã§Ã¶zümlenmeden hiçbir el açık gÃ¶sterilmez (refresh flaÅŸÄ± Ã¶nlenir). */

  /*
   * DUMMY gÃ¶rünürlük kuralı: dummy ancak atak (opening lead) YAPILDIKTAN
   * sonra açılır. gamePhase === "play" tek baÅŸÄ±na yeterli DEÄİLDİR; ilk
   * atak kartı oynanmadan (currentTrick boÅŸken) hiçbir rakip/partner eli
   * açılmaz. Bu sayede ihale bitiminde "4 el birden açılma" hatası giderilir.
   */
  const openingLeadMade =
    (tableState?.currentTrick?.length ?? 0) > 0 ||
    (tableState?.completedTricks?.length ?? 0) > 0;
  const dummyOpen =
    tableState?.gamePhase === "play" && openingLeadMade;
  const dummySeat: Seat | null = tableState?.dummy ?? null;
  const declarerSeat: Seat | null = tableState?.declarer ?? null;

  /* Masada (merkezde) gÃ¶sterilecek oynanan kartlar kamera. */

  const displayTrickCards =
    (tableState?.currentTrick?.length ?? 0) > 0
      ? tableState?.currentTrick ?? []
      : (tableState?.completedTricks?.length ?? 0) > 0
        ? (tableState?.completedTricks ?? [])[
          (tableState?.completedTricks?.length ?? 0) - 1
        ]?.cards ?? []
        : [];

  /* Oynanan bir GERÃ‡EK koltuÄŸun kartını bu bakÄ±ÅŸ açısında hangi FİZİKSEL
   * konumda (üst/alt/sol/saÄŸ) gÃ¶stereceÄŸimizi dÃ¶ndürür. */
  function cardScreenPosition(
    seat: Seat
  ): "top" | "bottom" | "left" | "right" {
    if (seat === topSeat) return "top";
    if (seat === bottomSeat) return "bottom";
    if (seat === leftSeat) return "left";
    return "right";
  }

  /*
   * Bir GERÃ‡EK koltuÄŸun eli bu bakÄ±ÅŸ açısında açık yüz gÃ¶sterilmeli mi?
   * (kart dizisi referansı kullanılmaz; yalnızca Seat deÄŸerlerine bakılır)
   *
   *  - Spectator    : dÃ¶rt eli de gÃ¶rür.
   *  - Oyuncu       : kendi (playerSeat) elini her zaman gÃ¶rür.
   *  - dummyOpen    : dummy koltuk yalnızca atak yapıldıktan sonra açılır.
   *  - Partner      : dummy oyuncusu, declarer (ortaÄŸÄ±) elini de gÃ¶rür.
   *  - Rakipler     : declarer'ın elini asla gÃ¶rmez.
   */
  function isSeatFaceUp(seat: Seat): boolean {
    if (isSpectator) {
      return true;
    }
    if (seat === playerSeat) {
      return true;
    }
    if (dummyOpen && seat === dummySeat) {
      return true;
    }
    if (dummyOpen && playerSeat === dummySeat && seat === declarerSeat) {
      return true;
    }
    return false;
  }

  const hideTop = rolePending || !isSeatFaceUp(topSeat);
  const hideBottom = rolePending;

  /* Bu seat elinden kart oynayabilir miyim?
 * - Kendi koltuÄŸum, sıra bende iken oynarım.
 * - Declarer isem dummy elini de oynayabilirim.
 * - Sırası olmayan hiçbir oyuncu hiçbir elden oynayamaz.
 */
  const canPlayHand = (seat: Seat): boolean => {
    if (isSpectator) return false;
    if (tableState?.gamePhase !== "play") return false;
    if (tableState.playTurn !== seat) return false;  /* Sıra bu elin üstünde olmalı. */
    if (seat === tableState.dummy) {
      return playerSeat === tableState.declarer;
    }
    if (seat === playerSeat) return true;             /* Kendi elim. */
    return false;
  };

  const isMyPlayTurn = playerSeat !== null && canPlayHand(playerSeat);
  const isMyDummyPlayTurn = canPlayHand(topSeat);

  /*
   * RESPONSIVE (TELEFON â†’ 4K, TEK SİSTEM):
   * - Masa kÃ¶kü 1037x810 sabit px'tir. `scale()` yalnızca pikselleri
   *   boyar, layout kutusunu küçültmez. Bu yüzden sarmalayıcının layout
   *   kutusu gÃ¶rsel boyuta EÅİTLENİR:
   *     sarmalayıcı: absolute, geniÅŸlik = 1037*s, yükseklik = 810*s
   *     masa kÃ¶kü : absolute, origin top-left, transform: scale(s)
   *   BÃ¶ylece masa hiçbir ekranda sıkÄ±ÅŸmaz/kırpılmaz; dar ekranda küçülür,
   *   geniÅŸ ekranda (laptop/ultrawide/4K) mümkün olan en büyük boyuta çıkar.
   * - Ã–lçek = min(kullanılabilir geniÅŸlik / 1037, kullanılabilir yükseklik / 810).
   *   Kullanılabilir alan = viewport (visualViewport) eksi masa kÃ¶künün üst
   *   ofseti ve ince kenar payı. PANEL PAYI YOKTUR: GlobalPanel `fixed`
   *   overlay olarak açılır ve masa alanını küçültmez.
   * - useLayoutEffect ile paint Ã–NCESİ Ã¶lçüm â†’ ilk karede doÄŸru boyut/merkez;
   *   ResizeObserver + resize/visualViewport ile anında güncelleme.
   * - Yatay merkez: viewport ortası. Dikey: masa kÃ¶künün baÅŸlangıcından
   *   viewport altına kadar kalan alanın ortası â†’ masa daima tam gÃ¶rünür.
   * - N/E/S/W eÅŸleÅŸmesi, TableInfoPanel, auction/ALERT/Director/chat aynı.
   */
  const tableRootRef = useRef<HTMLDivElement | null>(null);

  const [tableLayout, setTableLayout] = useState<{
    /* UNIFORM Ã¶lçek (GÃ¶rev 3): scaleX === scaleY === scale.
       GÃ¶rev 2'nin non-uniform scaleY alanı kaldırıldı. */
    scale: number;
    /* Bu Ã¶lçümde kullanılan çalÄ±ÅŸma alanı yüksekliÄŸi (portre: daha uzun). */
    canvasHeight: number;
    boxWidth: number;
    boxHeight: number;
    /* Mobil dikey kompozisyon aktif mi? Render'daki Y çapaları buna bakar. */
    portrait: boolean;
    /* Sarmalayıcının masa kÃ¶kü koordinatındaki px konumu. */
    left: number;
    top: number;
  } | null>(null);

  useLayoutEffect(() => {
    function updateTableLayout() {
      const rootEl = tableRootRef.current;

      const visualWidth =
        window.visualViewport?.width ?? window.innerWidth;
      const visualHeight =
        window.visualViewport?.height ?? window.innerHeight;

      if (
        !Number.isFinite(visualWidth) ||
        !Number.isFinite(visualHeight) ||
        visualWidth <= 0 ||
        visualHeight <= 0
      ) {
        return;
      }

      /* Masa kÃ¶künün viewport içindeki baÅŸlangıcı (üstteki sayfa baÅŸlÄ±ÄŸÄ± /
         rol paneli kadar aÅŸaÄŸÄ± kayabilir). PANEL PAYI YOKTUR: GlobalPanel
         `fixed` overlay olarak açıldÄ±ÄŸÄ± için masa alanı küçülmez; referans
         doÄŸrudan viewport'tur. */
      const rootRect = rootEl?.getBoundingClientRect();
      const rootTop = Math.max(0, rootRect?.top ?? 0);
      const rootLeft = Math.max(0, rootRect?.left ?? 0);

      /* PROTOTİP — mobil dikey tespiti.
         Åart: dar (geniÅŸlik < 600px â†’ tablet/desktop dÄ±ÅŸarıda) VE dikey
         (yükseklik > geniÅŸlik â†’ mobil yatay dÄ±ÅŸarıda).
         İki koÅŸul da saÄŸlanmadıkça `false` olur; bu durumda kenar payı
         TABLE_EDGE_GUTTER (12) kalır ve hesaplar birebir eskisi gibidir. */
      const isMobilePortrait =
        visualWidth < 600 && visualHeight > visualWidth;

      const edgeGutter = isMobilePortrait
        ? TABLE_EDGE_GUTTER_PORTRAIT
        : TABLE_EDGE_GUTTER;

      const availWidth = Math.max(
        0,
        visualWidth - rootLeft - edgeGutter * 2
      );

      const availHeight = Math.max(
        0,
        visualHeight - rootTop - edgeGutter * 2
      );

      /* Ã‡alÄ±ÅŸma alanı yüksekliÄŸi: mobil dikeyde daha uzun tuval (GÃ¶rev 3),
         diÄŸer tüm ekranlarda 810 â†’ sonuç birebir eskisi gibi kalır. */
      const canvasHeight = isMobilePortrait
        ? TABLE_PORTRAIT_CANVAS_HEIGHT
        : TABLE_BASE_HEIGHT;

      /* Ã–lçek = iki eksenden DAR olanı: masa kırpılmaz, kullanılabilir
         alan mümkün olduÄŸu kadar doldurulur (telefon â†’ 4K).
         UNIFORM Ã¶lçek: X ve Y aynı deÄŸeri kullanır â†’ içerik ESKEMEZ,
         yalnızca doÄŸal oranında büyür/küçülür. */
      const fitted = Math.min(
        availWidth / TABLE_BASE_WIDTH,
        availHeight / canvasHeight
      );

      const scale =
        Number.isFinite(fitted) && fitted > 0
          ? Math.min(
            Math.max(fitted, TABLE_MIN_SCALE),
            TABLE_MAX_SCALE
          )
          : TABLE_MIN_SCALE;

      const boxWidth = TABLE_BASE_WIDTH * scale;
      const boxHeight = canvasHeight * scale;

      /* PROTOTİP doÄŸrulama logu: localhost'ta konsolda Ã¶lçümü gÃ¶sterir.
         (Production build'de çalÄ±ÅŸmaz; prototip geri alınınca silinebilir.) */
      if (process.env.NODE_ENV !== "production") {
        console.log("[TABLE RESPONSIVE PROTO]", {
          mode: isMobilePortrait ? "MOBILE_PORTRAIT" : "DEFAULT",
          edgeGutter,
          visualWidth,
          visualHeight,
          rootTop,
          availWidth,
          availHeight,
          canvas: `${TABLE_BASE_WIDTH}x${canvasHeight}`,
          /* UNIFORM Ã¶lçek: X ve Y aynı (içerik esnemez). */
          scaleX: Number(scale.toFixed(4)),
          scaleY: Number(scale.toFixed(4)),
          box: `${boxWidth.toFixed(1)}x${boxHeight.toFixed(1)}`,
        });
      }

      setTableLayout({
        scale,
        canvasHeight,
        portrait: isMobilePortrait,
        boxWidth,
        boxHeight,
        /* KÃ¶k koordinatında yatay merkez: kutu viewport ortasına oturur
           (panel payı hesaba katılmaz). */
        left: Math.max(
          0,
          rootLeft + (visualWidth - rootLeft - boxWidth) / 2
        ),
        /* KÃ¶k koordinatında dikey merkez: kÃ¶kten viewport altına kalan
           alanın ortası. Kutu bu alana sÄ±ÄŸdÄ±ÄŸÄ± için üst boÅŸluk hiçbir
           zaman negatif olmaz ve masa alt taraftan kırpılmaz. */
        top: Math.max(0, (visualHeight - rootTop - boxHeight) / 2),
      });
    }

    updateTableLayout();

    /* İlk kare sonrası bir kez daha Ã¶lç: rol seçici gibi koÅŸullu sayfa
       içeriÄŸi masa kÃ¶künün üst ofsetini kaydırabilir. */
    const raf = requestAnimationFrame(updateTableLayout);

    /* Masa kÃ¶kü yeniden boyutlanınca (panel/dvh/scroll deÄŸiÅŸimi) yeniden
       Ã¶lç. Yeni bir responsive framework kurulmaz; mevcut kÃ¶k Ã¶lçülür. */
    const rootEl = tableRootRef.current;
    const resizeObserver =
      rootEl && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateTableLayout)
        : null;
    resizeObserver?.observe(rootEl!);

    window.addEventListener("resize", updateTableLayout);
    window.visualViewport?.addEventListener(
      "resize",
      updateTableLayout
    );

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateTableLayout);
      window.visualViewport?.removeEventListener(
        "resize",
        updateTableLayout
      );
    };
  }, []);

  /* Ã–lçüm tamamlandı mı? Tamamlanana kadar (paint Ã¶ncesi tek kare)
     Tailwind `scale-*` class'ları fallback olarak devrede kalır. */
  const hasTableLayout = tableLayout !== null;

  /* PROTOTİP 3 — mobil dikey kompozisyon aktif mi?
     Yalnızca Ã¶lçüm tamamlandÄ±ÄŸÄ±nda VE portre dalı seçildiÄŸinde true olur;
     bÃ¶ylece yatay/tablet/desktop sınıfları birebir eskisi gibi kalır. */
  const isPortraitTable =
    hasTableLayout && tableLayout.portrait === true;


  console.log("[PLAY DEBUG] TURN CHECK", {
    isSpectator,
    playerSeat,
    gamePhase: tableState?.gamePhase,
    playTurn: tableState?.playTurn,
    isMyPlayTurn: isMyPlayTurn,
    isMyDummyPlayTurn,
  });
  return (
    <div
      ref={tableRootRef}
      className="relative min-h-screen overflow-x-hidden bg-zinc-900"
    >

      {/* MASA — sarmalayıcının layout kutusu masa ile AYNI gÃ¶rsel boyuttadır
          (1037*s x 810*s), bÃ¶ylece masa hiçbir ekranda kırpılmaz ve mümkün
          olan en büyük Ã¶lçeÄŸi alır. Panel payı hesaba katılmaz. */}
      <div
        className="absolute left-1/2 bottom-[-80px] -translate-x-1/2"
        style={
          hasTableLayout && tableLayout
            ? {
              position: "absolute",
              /* Yatay: kutu viewport ortasına oturur. Tablodaki tüm iç
                 mutlak Ã¶ÄŸeler masa kÃ¶küne gÃ¶re konumlandÄ±ÄŸÄ±ndan bu ofset
                 iç yerleÅŸimi etkilemez. */
              left: `${tableLayout.left}px`,
              /* Dikey: kutu, kÃ¶kten viewport altına kalan alana sÄ±ÄŸacak
                 ÅŸekilde Ã¶lçeklendi â†’ üst boÅŸluk hiçbir zaman negatif olmaz. */
              top: `${tableLayout.top}px`,
              bottom: "auto",
              right: "auto",
              transform: "none",
              translate: "none",
              width: `${tableLayout.boxWidth}px`,
              height: `${tableLayout.boxHeight}px`,
              margin: 0,
              padding: 0,
              overflow: "visible",
            }
            : undefined
        }
      >
        <div
          id="kasaba-table-root"
          className="relative w-[1037px] h-[810px] origin-center scale-[0.40] min-[420px]:scale-[0.48] sm:scale-[0.59] md:scale-[0.69] lg:scale-[0.7] rounded-[28px] bg-[var(--kasaba-table-felt)] border-16 border-[[#331704] shadow-2xl"

          style={
            hasTableLayout && tableLayout
              ? {
                position: "absolute",
                left: 0,
                top: 0,
                width: TABLE_BASE_WIDTH,
                /* Ã‡alÄ±ÅŸma alanı yüksekliÄŸi: portre 1600, diÄŸer ekranlar 810. */
                height: tableLayout.canvasHeight,
                margin: 0,
                padding: 0,
                /* Tailwind `scale-*` responsive class'larını nÃ¶tralize et;
                   Ã¶lçek tek noktadan (Ã¶lçülen px deÄŸeri) uygulanır. */
                /* PROTOTİP 3: UNIFORM Ã¶lçek — scaleX === scaleY,
                   içerik esnemez / oranı bozulmaz. */
                scale: "1",
                transformOrigin: "top left",
                transform: `scale(${tableLayout.scale})`,
              }
              : undefined
          }
        >
          <TableInfoPanel
            boardNumber={tableState?.boardNumber ?? 1}
            auction={tableState?.currentAuction ?? auction}
            phase={tableState?.gamePhase ?? "auction"}
            contract={tableState?.contract ?? null}
            declarer={tableState?.declarer ?? null}
            completedTricks={tableState?.completedTricks ?? []}
            score={boardResult?.score ?? null}
            viewerRole={
              isSpectator
                ? "SPECTATOR"
                : playerSeat === tableState?.dummy
                  ? "DUMMY"
                  : "LIVE_PLAYER"
            }
          />

          {/* TOP — KUZEY KOLTUÄU (RESPONSIVE PHASE 3.1 + PROTOTİP 3)
            * Portre dÄ±ÅŸÄ± (yatay/tablet/desktop): alt kenardan çapalı
            *   `bottom-[620px]` â†’ blok alt kenarı masa y = 190 (810 - 620).
            * Mobil dikey (PROTOTİP 3): çalÄ±ÅŸma alanı 1600'e uzadÄ±ÄŸÄ± için
            *   üst kenardan `top-[24px]` çapalanır â†’ Kuzey koltuk hissi
            *   korunur ve dikey daÄŸÄ±tımın tepesine yerleÅŸir.
            * X koordinatı HER İKİ durumda da deÄŸiÅŸmez (left-1/2). */}
          <div
            className={`absolute ${isPortraitTable
              ? "top-[24px]"
              : "bottom-[620px]"
              } left-1/2 -translate-x-1/2 flex flex-col items-center`}
          >
            {topPlayer ? (
              <button
                type="button"
                onClick={() => {
                  /*
                   * Masa oyuncu adından Ã¶zel sohbet açma isteÄŸi;
                   * üye/misafir ayrımını PrivateChatManager yapar.
                   */
                  window.dispatchEvent(
                    new CustomEvent(
                      "kasaba-open-private-chat",
                      {
                        detail: {
                          username:
                            topPlayer.name,
                        },
                      }
                    )
                  );
                }}
                title={`${topPlayer.name} ile özel sohbet`}
                className="mb-2 font-bold text-white hover:underline"
              >
                {topPlayer.name}
              </button>
            ) : (
              <div className="mb-2 font-bold text-white">
                {viewSeats.top}
              </div>
            )}

            {hideTop ? (
              <div
                style={
                  isPortraitTable
                    ? {
                      /* GÖREV 5 — yalnız mobil dikey KUZEY kapalı el:
                         uniform scale (80×120 oran korunur), origin top:
                         yukarı taşmaz, aşağı büyür (portrede altta büyük
                         boş bant var, çakışma yaratmaz). Diğer ekranlar
                         ve açık (dummy) el etkilenmez. */
                      transform: "scale(1.8)",
                      transformOrigin: "top center",
                    }
                    : undefined
                }
              >
                <HiddenHand />
              </div>
            ) : (
              <div className="-translate-y-1">
                <Hand
                  cards={topCards}
                  direction="horizontal"

                  onCardClick={
                    isMyDummyPlayTurn
                      ? (card) => onPlayCard?.(card, topSeat)
                      : undefined
                  }
                />
              </div>
            )}
          </div>

          {/* BOTTOM */}
          <div className="absolute bottom-[185px] left-1/2 -translate-x-1/2 flex flex-col items-center">
            {hideBottom ? (
              <HiddenHand />
            ) : (
              <div
                className="translate-y-2"
                style={
                  isPortraitTable
                    ? {
                      /* GÃ–REV 4 — yalnız mobil dikey South eli:
                         uniform scale (en-boy oranı korunur, esneme yok).
                         origin "bottom": kartlar yukarı doÄŸru büyür,
                         altındaki oyuncu adını kapatmaz. Dikeyde üstte
                         büyük boÅŸ bant olduÄŸundan çakÄ±ÅŸma yaratmaz. */
                      transform: "scale(1.8)",
                      transformOrigin: "bottom center",
                    }
                    : undefined
                }
              >
                <Hand
                  cards={bottomCards}
                  direction="horizontal"
                  /* GÃ–REV 4: portrede Ã¶rtÃ¼ÅŸme 8 â†’ 45 (design px). Tek sıra
                     korunur: sıra geniÅŸliÄŸi 84+12Ã—39 = 552 design px
                     (< 1005 iç alan). DiÄŸer tüm ekranlarda default 8. */
                  overlap={isPortraitTable ? 45 : undefined}
                  onCardClick={
                    isMyPlayTurn
                      ? (card) => onPlayCard?.(card, bottomSeat)
                      : undefined
                  }
                />
              </div>
            )}

            {bottomPlayer ? (
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent(
                      "kasaba-open-private-chat",
                      {
                        detail: {
                          username:
                            bottomPlayer.name,
                        },
                      }
                    )
                  );
                }}
                title={`${bottomPlayer.name} ile özel sohbet`}
                className="mt-2 font-bold text-white hover:underline"
              >
                {bottomPlayer.name}
              </button>
            ) : (
              <div className="mt-2 font-bold text-white">
                {viewSeats.bottom}
              </div>
            )}
          </div>

          {/* BATI (ekranın SOL tarafı)
            * PROTOTİP 3: portrede Auction ile aynı orta banda hizalanır
            * (auction merkezine gÃ¶re +21px), diÄŸer ekranlarda eski `36%`.
            * X koordinatı (left-8) hiç deÄŸiÅŸmez. */}
          <div
            className={`absolute left-8 ${isPortraitTable
              ? "top-[calc(50%-76px)]"
              : "top-[36%]"
              } -translate-y-1/3`}
          >
            {rolePending ? (
              <div
                className="-translate-y-6"
                style={
                  isPortraitTable
                    ? {
                      /* GÖREV 5 — portre BATI kapalı el (rol bekleme dahil):
                         uniform scale, dikey sıra yönü korunur. */
                      transform: "scale(1.8)",
                      transformOrigin: "center",
                    }
                    : undefined
                }
              >
                <HiddenSuitHand />
              </div>
            ) : isSeatFaceUp(leftSeat) ? (
              <div className="-translate-x-8 -translate-y-6 scale-[0.95]">
                <SuitHand cards={leftCards} />
              </div>
            ) : (
              <div
                className="-translate-y-6"
                style={
                  isPortraitTable
                    ? {
                      /* GÖREV 5 — yalnız mobil dikey BATI kapalı el:
                         uniform scale (80×120 korunur); dikey sıra yönü
                         aynen kalır. origin center → merkezden simetrik
                         büyür, masa içinde kalır. */
                      transform: "scale(1.8)",
                      transformOrigin: "center",
                    }
                    : undefined
                }
              >
                <HiddenSuitHand />
              </div>
            )}
          </div>

          {/* DOÄU (ekranın SAÄ tarafı)
            * PROTOTİP 3: portrede Auction ile aynı orta banda hizalanır
            * (auction merkezine gÃ¶re +20px), diÄŸer ekranlarda eski `36%`.
            * X koordinatı (right-8) hiç deÄŸiÅŸmez. */}
          <div
            className={`absolute right-8 ${isPortraitTable
              ? "top-[calc(50%-68px)]"
              : "top-[36%]"
              } -translate-y-1/2`}
          >
            {rolePending ? (
              <div
                className="translate-y-1"
                style={
                  isPortraitTable
                    ? {
                      /* GÖREV 5 — portre DOĞU kapalı el (rol bekleme dahil):
                         uniform scale, dikey sıra yönü korunur. */
                      transform: "scale(1.8)",
                      transformOrigin: "center",
                    }
                    : undefined
                }
              >
                <HiddenSuitHand />
              </div>
            ) : isSeatFaceUp(rightSeat) ? (
              <div className="translate-x-8 translate-y-2 scale-[0.95]">
                <SuitHand cards={rightCards} />
              </div>
            ) : (
              <div
                className="translate-y-1"
                style={
                  isPortraitTable
                    ? {
                      /* GÖREV 5 — yalnız mobil dikey DOĞU kapalı el:
                         uniform scale (80×120 korunur); dikey sıra yönü
                         aynen kalır. origin center → merkezden simetrik
                         büyür, masa içinde kalır. */
                      transform: "scale(1.8)",
                      transformOrigin: "center",
                    }
                    : undefined
                }
              >
                <HiddenSuitHand />
              </div>
            )}
          </div>

          {/* BOARD SONUCU */}
          {boardResult && (
            <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
              <div className="rounded-xl border-2 border-yellow-500 bg-white px-8 py-5 text-center text-zinc-900 shadow-2xl">
                <div className="text-2xl font-bold">
                  {boardResult.contract}{" "}
                  {boardResult.declarer}{" "}
                  {boardResult.result}
                </div>

                <div className="mt-2 text-xl font-semibold text-yellow-700">
                  {boardResult.scoringSide}{" "}
                  {Math.abs(boardResult.score)}
                </div>
              </div>
            </div>
          )}

          {/* YENİ EL TALEBİ */}
          {tableState?.newBoardRequest && isHost && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35">
              <div className="rounded-lg border border-yellow-600 bg-yellow-900/90 p-4 shadow-2xl">
                <div className="font-semibold text-yellow-300">
                  {tableState.newBoardRequest.requestedBy} yeni el talep ediyor.
                </div>

                <div className="mt-3 flex justify-center gap-2">
                  <button
                    onClick={() => {
                      onApproveNewBoardRequest?.();
                    }}
                    className="rounded bg-green-700 px-3 py-1 text-white hover:bg-green-600"
                  >
                    Onayla
                  </button>

                  <button
                    onClick={() => {
                      onRejectNewBoardRequest?.();
                    }}
                    className="rounded bg-red-700 px-3 py-1 text-white hover:bg-red-600"
                  >
                    Reddet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* UNDO TALEBİ KUTUSU (DEKLARASYON + KART OYNAMA) */}
          {undoRequest &&
            (() => {
              const seatLabels: Record<Seat, string> = {
                N: "North",
                E: "East",
                S: "South",
                W: "West",
              };

              const requesterLabel = seatLabels[undoRequest.requestedSeat];

              /* Gerçek insan onaycılar: dummy hariç partnership rakipleri. */
              const opponentSeats: Seat[] = (
                undoRequest.requestedSeat === "N" ||
                  undoRequest.requestedSeat === "S"
                  ? (["E", "W"] as Seat[])
                  : (["N", "S"] as Seat[])
              ).filter((s) => s !== dummySeat);

              const isResponder =
                playerSeat !== null &&
                opponentSeats.includes(playerSeat);

              const isRequester =
                currentUsername !== null &&
                undoRequest.requestedBy === currentUsername;

              const isRejected = undoRequest.rejections.length > 0;

              /* ReddedilmiÅŸ talep: kimseye Onayla/Reddet gÃ¶sterilmez. */
              if (isRejected) {
                return (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35">
                    <div className="rounded-lg border border-red-600 bg-red-900/90 p-4 shadow-2xl">
                      <div className="font-semibold text-red-300">
                        {requesterLabel}: Lütfen geri alabilir miyim?
                      </div>
                      <div className="mt-1 text-sm text-red-100">
                        {isRequester
                          ? "Talebiniz rakipler tarafından reddedildi."
                          : "Undo talebi reddedildi."}
                      </div>

                      {isRequester && (
                        <div className="mt-3 flex justify-center">
                          <button
                            onClick={() => {
                              onCancelUndo?.();
                            }}
                            className="rounded bg-zinc-700 px-3 py-1 text-white hover:bg-zinc-600"
                          >
                            Kapat
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              /* Rakiplerin ekranı: talebi kimin gÃ¶nderdiÄŸi açıkça gÃ¶rünür. */
              if (isResponder) {
                return (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35">
                    <div className="rounded-lg border border-yellow-600 bg-yellow-900/90 p-4 shadow-2xl">
                      <div className="font-semibold text-yellow-300">
                        {requesterLabel}: Lütfen geri alabilir miyim?
                      </div>
                      <div className="mt-1 text-sm text-yellow-100">
                        Son hamle geri alınacak. Onaylıyor musunuz?
                      </div>

                      <div className="mt-3 flex justify-center gap-2">
                        <button
                          onClick={() => {
                            onApproveUndo?.();
                          }}
                          className="rounded bg-green-700 px-3 py-1 text-white hover:bg-green-600"
                        >
                          Onayla
                        </button>

                        <button
                          onClick={() => {
                            onRejectUndo?.();
                          }}
                          className="rounded bg-red-700 px-3 py-1 text-white hover:bg-red-600"
                        >
                          Reddet
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              /* Talep eden + diÄŸer oyuncular/spectatorlar: bekleme ekranı. */
              return (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/35">
                  <div className="rounded-lg border border-yellow-600 bg-yellow-900/90 p-4 shadow-2xl">
                    <div className="font-semibold text-yellow-300">
                      {requesterLabel}: Lütfen geri alabilir miyim?
                    </div>
                    <div className="mt-1 text-sm text-yellow-100">
                      {isRequester
                        ? "Talebiniz rakiplerin onayına sunuldu, beklemede."
                        : "Undo talebi rakiplerin onayında."}
                    </div>
                    <div className="mt-1 text-sm text-yellow-100">
                      Onaylar: {undoRequest.approvals.length}/{opponentSeats.length}
                    </div>

                    {isRequester && (
                      <div className="mt-3 flex justify-center">
                        <button
                          onClick={() => {
                            onCancelUndo?.();
                          }}
                          className="rounded bg-red-700 px-3 py-1 text-white hover:bg-red-600"
                        >
                          İptal Et
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          {/* AUCTION / OYNANAN KARTLAR — MASA MERKEZİ
            * PROTOTİP 3: portrede bu blok, Kuzey eli ile Güney eli arasındaki
            * serbest bandın TAM MERKEZİNE oturur (`50%-80px`); diÄŸer
            * ekranlarda eski `50%-124px`. X koordinatı deÄŸiÅŸmez. */}
          <div
            className={`absolute ${isPortraitTable
              /* GÖREV 6 — %50 büyüme YUKARI: kutu (192→288 design px)
                 alt kenar sabit, üst kenar yukarı. -translate-y-1/2
                 merkez çapası olduğu için çapa y, eklenen yüksekliğin
                 yarısı kadar (48px) yukarı kaydırılır → alt kenar
                 birebir eski yerinde kalır. */
              ? "top-[calc(50%-128px)]"
              : "top-[calc(50%-124px)]"
              } left-1/2 -translate-x-1/2 -translate-y-1/2`}
          >
            {/* Oyun fazına geçince Auction kutusu masadan kalkar (AÅAMA 1).}
             * Merkezde oynanan kartlar gÃ¶rünür: N yukarı, E saÄŸa,
             * S aÅŸaÄŸÄ±, W sola; merkeze yakın, hafif Ã¶rtÃ¼ÅŸerek. */}
            {(tableState?.gamePhase === "play" && openingLeadMade) ||
              tableState?.gamePhase === "completed" ? (
              <div className="relative w-[220px] h-[150px]">
                {displayTrickCards.map((pc, i) => (
                  <div
                    key={`${pc.seat}-${i}`}
                    className={`absolute z-10 ${cardScreenPosition(pc.seat) === "top"
                      ? "left-1/2 -translate-x-1/2 top-3"
                      : cardScreenPosition(pc.seat) === "bottom"
                        ? "left-1/2 -translate-x-1/2 bottom-3"
                        : cardScreenPosition(pc.seat) === "left"
                          ? "top-1/2 -translate-y-1/2 left-3"
                          : "top-1/2 -translate-y-1/2 right-3"
                      }`}
                  >
                    <CardFace card={pc.card} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="scale-[0.95]">
                  <Auction
                    auction={auction}
                    turn={turn}
                    openingLeader={tableState?.openingLeader ?? null}
                    /* GÖREV 6 — zon gösterimi: mevcut board
                       vulnerability bilgisi (yalnız görsel sunum). */
                    vulnerability={tableState?.vulnerability ?? null}
                    /* GÖREV 6 — %50 büyütme SADECE mobil dikeyde. */
                    tallBidList={isPortraitTable}
                    viewerSeat={playerSeat}
                    gamePhase={tableState?.gamePhase ?? "auction"}
                    canRequestExplanation={canAskRefined}
                    onBidAlert={handleLocalBidAlert}
                    onRequestExplanation={handleLocalRequestExplanation}
                  />
                </div>
              </div>
            )}
          </div>

          {/* DİREKTÃ–R Ã‡AÄIR - MASANIN SOL ÃœST KÃ–ÅESİ
             * Yalnızca oyunculara gÃ¶rünür (seyirci gÃ¶remez).
             * Modal kapatıldÄ±ÄŸÄ±nda da buton aktif kalır; oyuncu
             * istediÄŸi an yeniden açıp ek açıklama yazabilir. */}
          {!isSpectator && (
            <button
              type="button"
              onClick={() => setDirectorModalOpen(true)}
              className="absolute left-0 top-0 z-50 rounded-lg bg-red-700 px-5 py-3 text-base font-bold text-white transition hover:bg-red-600"
            >
              DİREKTÖR
            </button>
          )}

          {/* UNDO - MASANIN SAÄ ÃœST KÃ–ÅESİ */}
          {!isSpectator && (
            <button
              type="button"
              onClick={undo}
              className="absolute right-0 top-0 rounded-lg bg-red-700 px-7 py-3 text-lg font-bold text-white transition hover:bg-red-600"
            >
              undo
            </button>
          )}
          <GlobalChat embeddedInTable />

        </div>
      </div>

      {/* BIDDING BOX — açıklama borcu varken SADECE borçlunun kendi
          sırası bloke olur: onCall sarmalayıcı borcu kapatmadan
          deklarasyonu geçirmez. DiÄŸer oyuncuların sırası durmaz. */}
      {!isSpectator && (
        <div className="fixed left-0 top-8 z-50">
          <BiddingBox
            auction={auction}
            setAuction={setAuction}
            turn={turn}
            setTurn={setTurn}
            playerSeat={playerSeat}
            isHost={isHost}
            isTurnSeatEmpty={isTurnSeatEmpty}
            canHostBidForEmptySeat={canHostBidForEmptySeat}
            onCall={(call) => {
              /* Borçlunun kendi deklarasyonu borcu kapatmadan geçemez. */
              if (myTurnBlockedByObligation && call.seat === playerSeat) {
                const trimmed = alertPrefill.trim();

                if (trimmed.length === 0) {
                  return;
                }

                resolveMyObligationWithExplanation(trimmed);
                setAlertPrefill("");
                return;
              }

              onCall?.(call);

              /* BaÅŸarılı deklarasyonda ALERT-Ã¶ncesi takımını sıfırla. */
              setAlertArmed(false);
              setAlertPrefill("");
            }}
            alertArmed={alertArmed}
            onToggleAlert={() => setAlertArmed((prev) => !prev)}
            alertExplanation={alertPrefill}
            onAlertExplanationChange={setAlertPrefill}
          />
        </div>
      )}

      {/* AÇIKLAMA BORCU POPUP'ı — rakip, ALERT'li (açıklamasız) bir
          deklarasyona (PASS dahil) tıklayıp açıklama istediÄŸinde borçlunun
          ekranında ortalanmÄ±ÅŸ modal açılır. Popup hangi deklarasyon için
          istendiÄŸini açıkça belirtir; ihale alanı temiz kalır. Sadece
          borçlunun kendi sırası bloke olur; diÄŸer oyuncular durmaz. */}
      {pendingObligationForMe && !debtPopupDismissed && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="ALERT açıklaması istendi"
            className="w-[400px] rounded-xl border-2 border-red-700 bg-yellow-50 p-4 shadow-2xl"
          >
            <div className="text-sm font-black text-red-800">
              AÇIKLAMA İSTEĞİ —{" "}
              {myObligationBid
                ? formatBidLabel(myObligationBid)
                : "ALERT'li deklarasyon"}
            </div>
            <p className="mt-1 text-xs font-semibold text-zinc-700">
              {myTurnBlockedByObligation
                ? "Sıran geldi; açıklamayı yazıp kaydetmeden yeni deklarasyon veremezsin. İhale diğer oyuncular için devam ediyor."
                : "Sıran gelmeden de bu popup'tan açıklamayı yazıp borcunu kapatabilirsin."}
            </p>
            <textarea
              value={alertDebtText}
              onChange={(event) => setAlertDebtText(event.target.value)}
              rows={3}
              placeholder="ALERT açıklamasını yaz..."
              className="mt-2 w-full resize-none rounded border border-red-300 bg-white px-2 py-1 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const saved =
                    resolveMyObligationWithExplanation(alertDebtText);
                  if (saved) {
                    setAlertDebtText("");
                  }
                }}
                className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500"
              >
                Açıklamayı Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DİREKTÃ–R Ã‡AÄIR MODALI
           * Saf UI: Supabase/database/realtime baÄŸlantısı yok, gerçek
           * direktÃ¶r bildirimi gÃ¶nderilmez. Modal kapanması oyunu etkilemez. */}
      {directorModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDirectorModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Direktör Çağır"
            className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-2xl border-2 border-red-800 bg-zinc-900 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-wide text-yellow-400">
                DİREKTÖR
              </h2>
              <button
                type="button"
                onClick={() => setDirectorModalOpen(false)}
                aria-label="Direktör çağrı penceresini kapat"
                className="rounded-md border border-red-700 px-3 py-1 text-lg font-bold text-red-400 transition hover:bg-red-950"
              >
                âœ•
              </button>
            </div>

            <p className="mb-3 text-sm text-zinc-400">
              Bir seçenek belirtin ya da direktöre mesaj yazın:
            </p>

            <div className="flex flex-col gap-2">
              {DIRECTOR_OPTIONS.map((option) => {
                const selected = selectedDirectorOption === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setSelectedDirectorOption(option);
                      setDirectorSendError(null);
                    }}
                    className={`rounded-lg border px-4 py-2 text-left text-base font-semibold transition ${selected
                      ? "border-yellow-400 bg-yellow-400/15 text-yellow-200"
                      : "border-red-700 bg-black text-yellow-300 hover:bg-red-950"
                      }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            <label
              htmlFor="director-message"
              className="mt-4 block text-sm text-zinc-400"
            >
              Açıklama:
            </label>
            <textarea
              id="director-message"
              value={directorMessage}
              onChange={(event) => {
                setDirectorMessage(event.target.value);
                setDirectorSendError(null);
              }}
              placeholder="Direktöre yazılacak mesaj..."
              rows={4}
              className="mt-1 w-full resize-none rounded-lg border border-red-800 bg-zinc-800 px-3 py-2 text-base text-yellow-200 placeholder-zinc-500 focus:border-yellow-500 focus:outline-none"
            />

            {directorSendError && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-red-700 bg-red-950/60 px-3 py-2 text-sm font-semibold text-red-300"
              >
                {directorSendError}
              </p>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setDirectorModalOpen(false)}
                className="rounded-lg border border-red-700 px-5 py-2 font-bold text-red-300 transition hover:bg-red-950"
              >
                Çağrıyı İptal Et
              </button>
              <button
                type="button"
                onClick={sendDirectorCallToDirectors}
                className="rounded-lg bg-red-700 px-5 py-2 font-bold text-white transition hover:bg-red-600"
              >
                Direktöre Gönder
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
