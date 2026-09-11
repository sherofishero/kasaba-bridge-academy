import {
  Bid,
  getPartnership,
  canViewExplanation,
} from "../lib/auction";
import {
  useEffect,
  useRef,
  useState,
} from "react";

type AuctionProps = {
  auction: Bid[];
  turn: "W" | "N" | "E" | "S";
  openingLeader?: "W" | "N" | "E" | "S" | null;

  /* ALERT SİSTEMİ */
  /* Kullanıcının koltuğu; seyirci ise null. Açıklama gizliliği ve
     kendi/rakip ayrımı bu değere göre yapılır. */
  viewerSeat?: "W" | "N" | "E" | "S" | null;
  /* İhbar aşamasının durumu; partnerin ALERT görebilmesi için
     oyun aşamasına geçiş kritiktir (auction/play/completed).
     Seyirciler ve rakipler için bu alan yoksayılır. */
  gamePhase?: "auction" | "play" | "completed";
  /* Açıklama isteyebilme izni. İlk löve TAMAMLANANA kadar true kalır;
     ilk löve bitince false olur (açıklama isteği kapanır). Seyirci
     ALERT veremez ama (penceredeyken) mevcut açıklamaları görebilir. */
  canRequestExplanation?: boolean;
  /* Kendi deklarasyonunu ALERT'leme / açıklama verme (iptal YOK). */
  onBidAlert?: (bidIndex: number, explanation: string) => void;
  /* Rakip deklarasyonuna açıklama isteme (PASS dahil). */
  onRequestExplanation?: (bidIndex: number, bid: Bid) => void;
};

function suitSymbol(strain: "C" | "D" | "H" | "S") {
  switch (strain) {
    case "C":
      return "♣";
    case "D":
      return "♦";
    case "H":
      return "♥";
    case "S":
      return "♠";
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

  /* ALERT / AÇIKLAMA POPUP DURUMLARI.
     Popup'lar Auction kutusunun ALTINDA satır olarak DEĞİL, ekrana
     ortalanmış modal olarak açılır. */
  const [alertPopup, setAlertPopup] = useState<{
    index: number;
    text: string;
  } | null>(null);
  const [infoPopup, setInfoPopup] = useState<{
    bid: Bid;
    message: string | null;
  } | null>(null);

  /* HOVER KURALI: mouse yalnızca görsel hover efekti verir.
     onMouseEnter/onMouseLeave ile HİÇBİR state değişikliği, request
     veya broadcast yapılmaz. Açıklama isteği yalnızca CLICK ile. */

  /* KENDİ deklarasyonuna tıklama → ALERT popup (sıra gerekmez, iptal yok).
     Seyirci (viewerSeat === null) ALERT veremez. */
  function handleBidClick(bid: Bid, bidIndex: number) {
    const isOwn = viewerSeat === bid.seat;

    if (isOwn) {
      if (bid.alerted) {
        /* Zaten ALERT'li → popup'ta açıklamayı göster; iptal YOK. */
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

    /* RAKİP deklarasyonuna tıklama → AÇIKLAMA İSTEME (PASS dahil).
       Açıklama zaten görünür biçimde mevcutsa popup'ta gösterilir;
       yoksa (pencere açıksa) tıklama ile açıklama isteği gönderilir.
       ALERT'i verenin ORTAĞISI, ihale sırasında ALERT bilgisini
       göremez; bu durumda açıklama isteği de gönderilmez. */
    if (canViewExplanation(bid, viewerSeat, gamePhase) && bid.explanation) {
      setInfoPopup({ bid, message: null });
      return;
    }

    /* Partner (aynı partnership) açıklama isteği gönderemez — ALERT
       gizliliği bu seviyede de korunmalıdır. */
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

    /* İstek YALNIZCA tıklamayla gönderilir. */
    onRequestExplanation(bidIndex, bid);
    setInfoPopup({
      bid,
      message: `${formatBid(bid)} için AÇIKLAMA İSTEĞİ gönderildi.`,
    });
  }

  /* ALERT popup gönderimi — açıklama boş bırakılabilir (ALERT açıklamasız
     da geçerlidir; ihale durmaz). İptal mekanizması yoktur. */
  function submitAlertPopup() {
    if (!alertPopup) {
      return;
    }

    onBidAlert?.(alertPopup.index, alertPopup.text.trim());
    setAlertPopup(null);
  }

  return (
    <div className="bg-yellow-200 rounded-xl border border-red-700 shadow-xl p-3 w-[320px]">

      <div className="grid grid-cols-4 text-center mb-2 font-bold text-zinc-900">
        <div>N</div>
        <div>E</div>
        <div>S</div>
        <div>W</div>
      </div>

      <div
        ref={auctionScrollRef}
        className="min-h-[110px] max-h-[110px] overflow-y-auto space-y-1"
      >
        {rows.length === 0 ? (
          <div className="text-center text-zinc-600 italic mt-12">
            Açık artırma henüz başlamadı
          </div>
        ) : (
          rows.map((row, r) => (
            <div
              key={r}
              className="grid grid-cols-4 gap-1"
            >
              {row.map((cell, c) => {
                /* Boş hücre. */
                if (!cell) {
                  return (
                    <div
                      key={c}
                      className="bg-amber-50 rounded py-1 h-10 flex items-center justify-center"
                    />
                  );
                }

                const { bid, index } = cell;
                const alerted = bid.alerted === true;

                /* HOVER KURALI: yalnızca görsel CSS hover efekti
                   (hover:brightness). Mouse enter/leave'de HİÇBİR
                   handler, request veya state değişikliği YOK. */
                return (
                  <button
                    key={c}
                    type="button"
                    title={
                      bid.alerted
                        ? `${formatBid(bid)} (ALERT)`
                        : formatBid(bid)
                    }
                    onClick={() => handleBidClick(bid, index)}
                    className={`rounded py-1 px-1 h-10 flex items-center justify-center font-bold text-lg relative transition hover:brightness-95 ${
                      alerted
                        ? "bg-yellow-400 ring-2 ring-red-700"
                        : "bg-amber-50"
                    }`}
                  >
                    <span className={textColor(bid)}>
                      {formatBid(bid)}
                    </span>

                    {/* ALERT rozeti — ALERT'li deklarasyonlar belirginleşir.
                      Partner (Auction viewerSeat), ihale sırasında bu işaretini
                      göremez; oyun aşamasına geçildikten sonra görür. */}
                    {alerted && canViewExplanation(bid, viewerSeat, gamePhase) && (
                      <span className="absolute -top-1.5 -right-1.5 rounded bg-red-700 px-1 text-[9px] leading-tight font-black text-white">
                        A
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* =========================================================
       * POPUP'lar — ihale alanının altında SATIR YOK. Açıklama
       * girişi ve açıklama görüntüleme ekrana ortalanmış modal
       * (popup) olarak açılır.
       * ========================================================= */}
      {alertPopup && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70">
          <div className="w-[360px] rounded-xl border-2 border-red-700 bg-yellow-50 p-4 shadow-2xl">
            <div className="text-sm font-black text-red-800">
              ALERT — {formatBid(auction[alertPopup.index])}
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
                kapatır; verilmiş bir ALERT geri alınmaz. Açıklama boş
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

      <div className="mt-3 text-center text-black font-semibold">
        {openingLeader ? `Atak ${openingLeader}` : `Sıra: ${turn}`}
      </div>

    </div>
  );
}