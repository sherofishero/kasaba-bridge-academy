/*
 * Seat artık tek kaynaktan (deck.ts) gelir; geriye dönük uyumluluk
 * için buradan yeniden dışa aktarılır. Böylece mevcut import'lar
 * bozulmaz ve tip uyumsuzluğu ortadan kalkar.
 */
import type { Seat } from "./deck";
export type { Seat };

export type Strain =
  | "C"
  | "D"
  | "H"
  | "S"
  | "NT";

export type BidType =
  | "BID"
  | "PASS"
  | "DOUBLE"
  | "REDOUBLE";

export type Bid = {
  seat: Seat;
  type: BidType;

  level?: 1 | 2 | 3 | 4 | 5 | 6 | 7;

  strain?: Strain;

  /* =========================================================
   * ALERT SİSTEMİ
   *
   * - alerted   : bu deklarasyon ALERT olarak işaretlendi mi?
   * - explanation: ALERT açıklaması (metin).
   *
   * Gizlilik kuralı: açıklamayı yalnızca ALERT'i veren oyuncu,
   * rakipler ve seyirciler görebilir. ALERT'i verenin partneri
   * açıklamayı GÖREMEZ (görünürlük render tarafında kilitlenir).
   *
   * Açıklamasız ALERT'e rakip açıklama isterse, açıklama verilene
   * dek alerter kendi sırasında yeni deklarasyon veremez (ihale ise
   * durmaz). Tek (iptal yok) ALERT sistemi.
   * ========================================================= */
  alerted?: boolean;
  explanation?: string;
};

const strainOrder: Record<Strain, number> = {
  C: 0,
  D: 1,
  H: 2,
  S: 3,
  NT: 4,
};

export function getLastContract(
  auction: Bid[]
): Bid | undefined {
  for (let i = auction.length - 1; i >= 0; i--) {
    if (auction[i].type === "BID") {
      return auction[i];
    }
  }

  return undefined;
}
export function getLastCall(
  auction: Bid[]
): Bid | undefined {
  return auction.at(-1);
}

export function isHigherBid(
  level: number,
  strain: Strain,
  lastBid?: Bid
) {
  if (!lastBid) return true;

  if (
    lastBid.level === undefined ||
    lastBid.strain === undefined
  ) {
    return true;
  }

  if (level > lastBid.level) {
    return true;
  }

  if (level < lastBid.level) {
    return false;
  }

  return (
    strainOrder[strain] >
    strainOrder[lastBid.strain]
  );
}

export function isLegalBid(
  auction: Bid[],
  level: number,
  strain: Strain
) {
  const lastContract = getLastContract(auction);

  return isHigherBid(
    level,
    strain,
    lastContract
  );
}



 export function canDouble(
  auction: Bid[],
  turn: Seat
) {
  const lastContract = getLastContract(auction);

  if (!lastContract) {
    return false;
  }

  // Aynı ortaklığın kontratını double edemez.
  if (
    getPartnership(lastContract.seat) ===
    getPartnership(turn)
  ) {
    return false;
  }

  // Son kontrattan sonra tekrar DOUBLE yapılmış mı?
  for (let i = auction.length - 1; i >= 0; i--) {
    const call = auction[i];

    if (call.type === "BID") {
      break;
    }

    if (call.type === "DOUBLE") {
      return false;
    }

    if (call.type === "REDOUBLE") {
      return false;
    }
  }

  return true;
}

export function canRedouble(
  auction: Bid[],
  turn: Seat
) {
  let lastDouble: Bid | undefined;

  for (let i = auction.length - 1; i >= 0; i--) {
    const call = auction[i];

    if (call.type === "BID") {
      break;
    }

    if (call.type === "REDOUBLE") {
      return false;
    }

    if (call.type === "DOUBLE") {
      lastDouble = call;
      break;
    }
  }

  if (!lastDouble) {
    return false;
  }

  return (
    getPartnership(lastDouble.seat) !==
    getPartnership(turn)
  );
}
export function auctionFinished(
  auction: Bid[]
) {
  if (auction.length < 4) {
    return false;
  }

  const lastThree = auction.slice(-3);

  return lastThree.every(
    (call) => call.type === "PASS"
  );
}

export function getPartnership(
  seat: Seat
): "NS" | "EW" {
  return seat === "N" || seat === "S"
    ? "NS"
    : "EW";
}

/* =========================================================
 * ALERT SİSTEMİ — SAF YARDIMCILAR
 * ========================================================= */

/* Bu deklarasyon ALERT olarak işaretlenmiş mi? */
export function isAlerted(bid: Bid): boolean {
  return bid.alerted === true;
}

/*
 * Bir kullanıcı bu deklarasyonun ALERT bilgisini (işaretini,
 * açıklamasını) görebilir mi?
 *
 * Kurallar:
 *  - Seyirci (viewerSeat === null): her zaman görür.
 *  - Deklarasyonu veren (alerter): kendi ALERT'ini görür.
 *  - Rakip (farklı partnership): her zaman görür.
 *  - ALERT'i verenin PARTNERİ:
 *      · İhale sırasında (gamePhase === "auction"): GÖRMEZ.
 *      · Kart oyununa geçildiğinde (gamePhase === "play" / "completed"):
 *        GÖRER — ilgili deklarasyona tıklayarak ALERT bilgisini ve
 *        varsa açıklamasını görebilir.
 *
 * Bu kural ALERT açıklamasının olup olmadığından bağımsızdır;
 * boş açıklamalı ALERT'de de partner ihale sırasında göremez.
 */
export function canViewExplanation(
  bid: Bid,
  viewerSeat: Seat | null,
  gamePhase?: "auction" | "play" | "completed"
): boolean {
  if (!bid.alerted) {
    return false;
  }
  if (viewerSeat === null) {
    return true;
  }
  if (viewerSeat === bid.seat) {
    return true;
  }
  if (getPartnership(viewerSeat) !== getPartnership(bid.seat)) {
    return true;
  }
  // Partner: ihale sırasında göremez, oyun başladıktan sonra görür.
  if (gamePhase === "auction") {
    return false;
  }
  return true;
}

/*
 * Açıklama isteme zaman penceresi.
 *
 * - İhale sürerken (gamePhase === "auction"): her zaman açık.
 * - İhale bitmiş, oyun başlamış (gamePhase === "play"): yalnızca ilk
 *   löve TAMAMLANMADAN önce açık (atak öncesi + ilk löve bitmeden).
 * - İlk löve tamamlandıysa (completedTricks.length >= 1) veya board
 *   bittiyse ("completed"): KAPALI — kesin sınır.
 */
export function canRequestAlertExplanation(args: {
  gamePhase: "auction" | "play" | "completed";
  completedTricksCount: number;
}): boolean {
  if (args.gamePhase === "completed") {
    return false;
  }
  if (args.gamePhase === "play") {
    return args.completedTricksCount < 1;
  }
  return true;
}