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
   * - alerted         : bu deklarasyon ALERT olarak işaretlendi mi?
   * - explanation     : ALERT açıklaması (metin).
   * - alertRequestedBy: rakip tarafından istenen ALERT ise, isteyen
   *                     oyuncunun koltuğu (kendi ALERT'ında null/undefined).
   *
   * Gizlilik kuralı:
   *  1. Seyirci (viewerSeat === null) → her zaman görür.
   *  2. Kendi ALERT'ı (alertRequestedBy yok) ise:
   *      - deklarasyonu veren ve iki rakibi görür,
   *      - ALERT'i verenin PARTNERİ asla görmez (ihale/oyun fark etmez).
   *  3. Rakibi tarafından istenen ALERT (alertRequestedBy !== null) ise:
   *      - sadece deklarasyonu veren ve requester görür,
   *      - bu iki oyuncunun dışındakiler (partnerler ve diğer rakip) görmez,
   *      - seyirci yine görür.
   * ========================================================= */
  alerted?: boolean;
  explanation?: string;
  alertRequestedBy?: Seat | null;
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

/* Bir kullanıcı bu deklarasyonun ALERT bilgisini (işaretini,
 * açıklamasını) görebilir mi? alertRequestedBy ile istenen
 * ALERT'ler sadece bid sahibi ve requester tarafından görülür;
 * seyirciler her zaman görür. Kendi ALERT'ı için partner kesinlikle
 * göremez; rakibi tarafından istenen ALERT için ise sadece bid sahibi
 * ve requester görür, diğer tüm oyuncular (partnerler ve diğer rakip)
 * görmez.
 *
 * Kurallar:
 *  1. Seyirci (viewerSeat === null) → her zaman görür.
 *  2. alertRequestedBy yok (kendi ALERT'ı):
 *        - deklarasyonu veren (alerter) → görür,
 *        - iki rakibi (farklı partnership) → görür,
 *        - ALERT'i verenin PARTNERİ → asla görmez.
 *  3. alertRequestedBy varsa (rakibi tarafından istenmiş ALERT):
 *        - deklarasyonu veren → görür,
 *        - requester → görür,
 *        - diğer tüm oyuncular (bid sahibinin partneri ve diğer rakip)
 *          → görmez.
 *  4. Seyirci yine görür.
 */
export function canViewExplanation(
  bid: Bid,
  viewerSeat: Seat | null,
  _gamePhase?: "auction" | "play" | "completed"
): boolean {
  if (!bid.alerted) {
    return false;
  }

  // 1. Seyirci her zaman görür.
  if (viewerSeat === null) {
    return true;
  }

  // 2. Deklarasyonu veren her zaman kendi ALERT'ini görür.
  if (viewerSeat === bid.seat) {
    return true;
  }

  // 3. Rakibi tarafından istenmiş ALERT: sadece bid sahibi ve requester görür.
  if (bid.alertRequestedBy != null) {
    return viewerSeat === bid.alertRequestedBy;
  }

  // 4. Kendi ALERT'ı (alertRequestedBy yok):
  //    - rakibi (farklı partnership) → görür,
  //    - partner → kesinlikle göremez.
  if (getPartnership(viewerSeat) !== getPartnership(bid.seat)) {
    return true;
  }

  return false;
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