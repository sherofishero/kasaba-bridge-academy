import {
  Bid,
  getPartnership,
  canViewExplanation,
} from "../lib/auction";
import type { Vulnerability } from "../lib/game";
import {
  useEffect,
  useRef,
  useState,
} from "react";

type AuctionProps = {
  auction: Bid[];
  turn: "W" | "N" | "E" | "S";
  openingLeader?: "W" | "N" | "E" | "S" | null;

  /* GÃ–REV 6 â€” ZON GÃ–STERİMİ (yalnız gÃ¶rsel):
     Board'un mevcut vulnerability bilgisi ("None"|"NS"|"EW"|"Both").
     N-E-S-W yÃ¶n satırında zonda olan yÃ¶n kırmızı zemin/beyaz yazı ile
     gÃ¶sterilir. Bid verisi ve Auction iÅŸlevi ETKİLENMEZ. */
  vulnerability?: Vulnerability | null;

  /* GÃ–REV 6 â€” MOBİL DİKEY %50 BÃœYÃœTME (yalnız gÃ¶rsel):
     true iken bid listesi 104px yerine 200px olur; kutu ~192â†’288px
     büyür (Ã—1.5). GeniÅŸlik, yazı ve sütun düzeni deÄŸiÅŸmez. */
  tallBidList?: boolean;

  /* ALERT SİSTEMİ */
  /* Kullanıcının koltuÄŸu; seyirci ise null. Açıklama gizliliÄŸi ve
     kendi/rakip ayrımı bu deÄŸere gÃ¶re yapılır. */
  viewerSeat?: "W" | "N" | "E" | "S" | null;
  /* İhbar aÅŸamasının durumu; partnerin ALERT gÃ¶rebilmesi için
     oyun aÅŸamasına geçiÅŸ kritiktir (auction/play/completed).
     Seyirciler ve rakipler için bu alan yoksayılır. */
  gamePhase?: "auction" | "play" | "completed";
  /* Açıklama isteyebilme izni. İlk lÃ¶ve TAMAMLANANA kadar true kalır;
     ilk lÃ¶ve bitince false olur (açıklama isteÄŸi kapanır). Seyirci
     ALERT veremez ama (penceredeyken) mevcut açıklamaları gÃ¶rebilir. */
  canRequestExplanation?: boolean;
  /* Kendi deklarasyonunu ALERT'leme / açıklama verme (iptal YOK). */
  onBidAlert?: (bidIndex: number, explanation: string) => void;
  /* Rakip deklarasyonuna açıklama isteme (PASS dahil). */
  onRequestExplanation?: (bidIndex: number, bid: Bid) => void;
};

function suitSymbol(strain: "C" | "D" | "H" | "S") {
  switch (strain) {
    case "C":
      return "\u2663"; /* ♣ */
    case "D":
      return "\u2666"; /* ♦ */
    case "H":
      return "\u2665"; /* ♥ */
    case "S":
      return "\u2660"; /* ♠ */
  }
}

function formatBid(bid: Bid) {
  switch (bid.type) {
    case "PASS":
      return "PASS";
    case "DOUBLE":
      return "X";
    case "REDOUBLE":
      return "XX";
    case "BID":
      return `${bid.level}${bid.strain === "NT"
        ? "NT"
        : suitSymbol(bid.strain!)
        }`;
  }
}

function textColor(bid: Bid) {
  if (bid.type !== "BID") return "text-black";

  switch (bid.strain) {
    case "H":
    case "D":
      return "text-red-600";

    case "NT":
      return "text-sky-500";

    case "S":
    case "C":
      return "text-black";

    default:
      return "text-black";
  }
}

export default function Auction({
  auction,
  turn,
  openingLeader = null,
  vulnerability = null,
  tallBidList = false,
  viewerSeat = null,
  gamePhase,
  canRequestExplanation = true,
  onBidAlert,
  onRequestExplanation,
}: AuctionProps) {
  const auctionScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollContainer = auctionScrollRef.current;

    if (!scrollContainer) {
      return;
    }

    requestAnimationFrame(() => {
      scrollContainer.scrollTop =
        scrollContainer.scrollHeight;
    });
  }, [auction]);

  interface AuctionCell {
    bid: Bid;
    index: number;
  }

  const rows: (AuctionCell | null)[][] = [];

  if (auction.length > 0) {
    const seatIndex: Record<"N" | "E" | "S" | "W", number> = {
      N: 0,
      E: 1,
      S: 2,
      W: 3,
    };

    let currentRow: (AuctionCell | null)[] = [null, null, null, null];
    let lastColumn = -1;

    auction.forEach((bid, index) => {
      const column = seatIndex[bid.seat];

      if (column <= lastColumn) {
        rows.push(currentRow);
        currentRow = [null, null, null, null];
      }

      currentRow[column] = { bid, index };
      lastColumn = column;
    });

    rows.push(currentRow);
  }

  /* ALERT / AÃ‡IKLAMA POPUP DURUMLARI.
     Popup'lar Auction kutusunun ALTINDA satır olarak DEÄİL, ekrana
     ortalanmÄ±ÅŸ modal olarak açılır. */
  const [alertPopup, setAlertPopup] = useState<{
    index: number;
    text: string;
  } | null>(null);
  const [infoPopup, setInfoPopup] = useState<{
    bid: Bid;
    message: string | null;
  } | null>(null);

  /* HOVER KURALI: mouse yalnızca gÃ¶rsel hover efekti verir.
     onMouseEnter/onMouseLeave ile HÄ°Ã‡BİR state deÄŸiÅŸikliÄŸi, request
     veya broadcast yapılmaz. Açıklama isteÄŸi yalnızca CLICK ile. */

  /* KENDİ deklarasyonuna tıklama â†’ ALERT popup (sıra gerekmez, iptal yok).
     Seyirci (viewerSeat === null) ALERT veremez. */
  function handleBidClick(bid: Bid, bidIndex: number) {
    const isOwn = viewerSeat === bid.seat;

    if (isOwn) {
      if (bid.alerted) {
        /* Zaten ALERT'li â†’ popup'ta açıklamayı gÃ¶ster; iptal YOK. */
        setInfoPopup({
          bid,
          message:
            bid.explanation && bid.explanation.length > 0
              ? null
              : "Bu deklarasyon ALERT'li; açıklama yazılmadı.",
        });
        return;
      }

      if (!onBidAlert) {
        return;
      }

      setAlertPopup({ index: bidIndex, text: "" });
      return;
    }

    /* RAKİP deklarasyonuna tıklama â†’ AÃ‡IKLAMA İSTEME (PASS dahil).
       Açıklama zaten gÃ¶rünür biçimde mevcutsa popup'ta gÃ¶sterilir;
       yoksa (pencere açıksa) tıklama ile açıklama isteÄŸi gÃ¶nderilir.
       ALERT'i verenin ORTAÄISI, ihale sırasında ALERT bilgisini
       gÃ¶remez; bu durumda açıklama isteÄŸi de gÃ¶nderilmez. */
    if (canViewExplanation(bid, viewerSeat, gamePhase) && bid.explanation) {
      setInfoPopup({ bid, message: null });
      return;
    }

    /* Partner (aynı partnership) açıklama isteÄŸi gÃ¶nderemez â€” ALERT
       gizliliÄŸi bu seviyede de korunmalıdır. */
    if (
      viewerSeat !== null &&
      getPartnership(viewerSeat) === getPartnership(bid.seat)
    ) {
      setInfoPopup({
        bid,
        message: "Bu deklarasyon için açıklama talep edilemez.",
      });
      return;
    }

    if (canRequestExplanation === false || !onRequestExplanation) {
      setInfoPopup({
        bid,
        message: "Bu deklarasyon için açıklama isteme süresi doldu.",
      });
      return;
    }

    /* İstek YALNIZCA tıklamayla gÃ¶nderilir. */
    onRequestExplanation(bidIndex, bid);
    setInfoPopup({
      bid,
      message: `${formatBid(bid)} için AÇIKLAMA İSTEĞİ gönderildi.`,
    });
  }

  /* ALERT popup gÃ¶nderimi â€” açıklama boÅŸ bırakılabilir (ALERT açıklamasız
     da geçerlidir; ihale durmaz). İptal mekanizması yoktur. */
  function submitAlertPopup() {
    if (!alertPopup) {
      return;
    }

    onBidAlert?.(alertPopup.index, alertPopup.text.trim());
    setAlertPopup(null);
  }

  return (
    <div className="bg-yellow-200 rounded-xl border border-red-700 shadow-xl p-3 w-[572px]">

      {/* GÃ–REV 6 â€” YÃ–N SATIRI + ZON GÃ–STERİMİ:
          N-E-S-W sırası aynen korunur. Zonda olan yÃ¶n kırmızı zemin +
          beyaz yazı; zon dÄ±ÅŸÄ±/satır varsayılanı mevcut sade gÃ¶rünüm
          (koyu yazı). Hiçbir yÃ¶n zonda deÄŸilse (None/undefined) tümü
          koyu yazı ile kalır. */}{" "}
      <div className="grid grid-cols-4 text-center mb-1 font-black text-xl">
        {(["N", "E", "S", "W"] as const).map((seat) => {
          const seatVulnerable =
            vulnerability != null &&
            (vulnerability === "Both" ||
              (vulnerability === "NS" &&
                (seat === "N" || seat === "S")) ||
              (vulnerability === "EW" &&
                (seat === "E" || seat === "W")));

          return (
            <div
              key={seat}
              className={
                seatVulnerable
                  ? "mx-1 rounded bg-red-700 text-white"
                  : "text-zinc-900"
              }
            >
              {seat}
            </div>
          );
        })}
      </div>

      <div
        ref={auctionScrollRef}
        /* GÃ–REV 6 â€” tallBidList: yalnız mobil dikeyde liste 104â†’200px
           (kutu toplam ~192â†’288px, Ã—1.5). DiÄŸer ekranlarda 104 aynen. */
        className={
          tallBidList
            ? "min-h-[200px] max-h-[200px] overflow-y-auto space-y-1 pr-1"
            : "min-h-[104px] max-h-[104px] overflow-y-auto space-y-1 pr-1"
        }
      >
        {/* GÖREV: "Açık artırma henüz başlamadı" mesajı kaldırıldı.
            Liste boşken alan mevcut düzeni korumak için boş bırakılır
            (min-h/[max-h] ile yükseklik değişmez; kutu boyutu aynı). */}
        {rows.length !== 0 &&
          rows.map((row, r) => (
            <div
              key={r}
              className="grid grid-cols-4 gap-1"
            >
              {row.map((cell, c) => {
                /* BoÅŸ hücre. */
                if (!cell) {
                  return (
                    <div
                      key={c}
                      className="bg-amber-50 rounded py-1 h-13 flex items-center justify-center text-xl"
                    />
                  );
                }

                const { bid, index } = cell;
                const canSeeAlert = canViewExplanation(bid, viewerSeat, gamePhase);

                /* HOVER KURALI: yalnızca gÃ¶rsel CSS hover efekti
                   (hover:brightness). Mouse enter/leave'de HÄ°Ã‡BİR
                   handler, request veya state deÄŸiÅŸikliÄŸi YOK. */
                return (
                  <button
                    key={c}
                    type="button"
                    title={
                      canSeeAlert
                        ? `${formatBid(bid)} (ALERT)`
                        : formatBid(bid)
                    }
                    onClick={() => handleBidClick(bid, index)}
                    className={`rounded py-1 px-1 h-13 flex items-center justify-center font-black text-3xl relative transition hover:brightness-95 ${
                      canSeeAlert
                        ? "bg-yellow-400 ring-2 ring-red-700"
                        : "bg-amber-50"
                    }`}
                  >
                    <span className={textColor(bid)}>
                      {formatBid(bid)}
                    </span>

                    {/* ALERT rozeti â€” ALERT'li deklarasyonlar belirginleÅŸir.
                      Partner (Auction viewerSeat), ihale sırasında bu iÅŸaretini
                      gÃ¶remez; oyun aÅŸamasına geçildikten sonra gÃ¶rür. */}
                    {bid.alerted && canViewExplanation(bid, viewerSeat, gamePhase) && (
                      <span className="absolute -top-1.5 -right-1.5 rounded bg-red-700 px-1 text-[9px] leading-tight font-black text-white">
                        A
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
      </div>

      {/* =========================================================
       * POPUP'lar â€” ihale alanının altında SATIR YOK. Açıklama
       * giriÅŸi ve açıklama gÃ¶rüntüleme ekrana ortalanmÄ±ÅŸ modal
       * (popup) olarak açılır.
       * ========================================================= */}
      {alertPopup && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70">
          <div className="w-[360px] rounded-xl border-2 border-red-700 bg-yellow-50 p-4 shadow-2xl">
            <div className="text-sm font-black text-red-800">
              ALERT â€” {formatBid(auction[alertPopup.index])}
            </div>
            <textarea
              value={alertPopup.text}
              onChange={(event) =>
                setAlertPopup({
                  index: alertPopup.index,
                  text: event.target.value,
                })
              }
              rows={3}
              placeholder="ALERT açıklaması (opsiyonel)... "
              className="mt-2 w-full resize-none rounded border border-red-300 bg-white px-2 py-1 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none"
            />
            {/* İptal mekanizması YOKTUR: "Kapat" yalnızca popup'ı
                kapatır; verilmiÅŸ bir ALERT geri alınmaz. Açıklama boÅŸ
                bırakılarak da ALERT verilebilir (ihale durmaz). */}
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAlertPopup(null)}
                className="rounded border border-zinc-400 px-3 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={submitAlertPopup}
                className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500"
              >
                ALERT Ver
              </button>
            </div>
          </div>
        </div>
      )}

      {infoPopup && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70">
          <div className="w-[360px] rounded-xl border border-amber-500 bg-amber-50 p-4 shadow-2xl">
            <div className="text-sm font-black text-zinc-900">
              {formatBid(infoPopup.bid)}
              {infoPopup.bid.alerted &&
               canViewExplanation(
                 infoPopup.bid,
                 viewerSeat,
                 gamePhase
               ) ? " (ALERT)" : ""}
            </div>
            {canViewExplanation(infoPopup.bid, viewerSeat, gamePhase) &&
            infoPopup.bid.explanation ? (
              <div className="mt-2 max-h-32 overflow-y-auto text-sm text-zinc-800">
                <span className="font-black text-zinc-900">
                  Açıklama:
                </span>{" "}
                {infoPopup.bid.explanation}
              </div>
            ) : infoPopup.message ? (
              <div className="mt-2 text-sm font-semibold text-red-700">
                {infoPopup.message}
              </div>
            ) : null}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setInfoPopup(null)}
                className="rounded border border-zinc-400 px-3 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-1 text-center text-black font-bold text-lg">
        {openingLeader ? `Atak ${openingLeader}` : `Sıra: ${turn}`}
      </div>

    </div>
  );
}