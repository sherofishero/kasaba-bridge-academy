/*
 * =========================================================
 * KASABA BRIDGE — ORTAK KART OYNAMA MOTORU (play.ts)
 * =========================================================
 *
 * Bu modül KASABA'nın TÜM masa/oda türlerinde kullanılabilir,
 * masa veya oda bağımlılığı OLMAYAN saf (pure) briç kart oynama
 * kurallarını içerir.
 *
 * Deklarasyon kuralları ../auction içinde kaldı; kart oynama
 * kuralları burada toplanır. Hiçbir fonksiyon React / Supabase /
 * DOM bilmez; yalnızca veri dönüştürür. Böylece farklı sayfalar
 * aynı motoru kullanabilir.
 *
 * Sıra bilgisi ve seat tek kaynağı ../deck içindeki Seat /
 * nextSeat / ranks tanımlarıdır.
 */

import {
  type Card,
  type Deal,
  type Seat,
  type Suit,
  type Hand,
  getHand,
  nextSeat,
  ranks,
} from "./deck";

import {
  type Bid,
  type Strain,
  getLastContract,
  getPartnership,
  auctionFinished,
} from "./auction";

/* =========================================================
 * TİPLER
 * ========================================================= */

/* Oyun fazı. Tek kaynak burada değil; game.ts TableState değeri. */
export type GamePhase = "auction" | "play" | "completed";

/* Çözülmüş final kontrat. */
export type Contract = {
  level: number;
  strain: Strain;
  doubled: boolean;
  redoubled: boolean;
};

/* Bir lövede oynanmış tek kart (seat + kart). */
export type PlayedCard = {
  seat: Seat;
  card: Card;
};

/* Tamamlanmış bir löve: 4 kart + kazanan seat. */
export type Trick = {
  cards: PlayedCard[];
  winner: Seat;
};

/* =========================================================
 * KONTRAT + DECLARER + DUMMY + LEADER
 * ========================================================= */

/*
 * Dummy seat = declarer'ın partneri (N <-> S, E <-> W).
 */
export function getDummy(declarer: Seat): Seat {
  switch (declarer) {
    case "N":
      return "S";
    case "S":
      return "N";
    case "E":
      return "W";
    case "W":
      return "E";
  }
}

/*
 * Açılış atakçısı = declarer'ın SOLUNDAKİ oyuncu.
 * nextSeat(declarer) kuralına göre hesaplanır
 * (görev tanımına uygun; 3-kez nextSeat DEĞİL).
 */
export function getOpeningLeader(declarer: Seat): Seat {
  return nextSeat(declarer);
}

/*
 * Final kontratı çözer: en son verilen gerçek BID + ona uygulanan
 * DOUBLE / REDOUBLE durumları. Auction kurallarına dokunmaz,
 * yalnızca son kontrat ile onu izleyen X / XX çağrılarını okur.
 */
export function resolveContract(auction: Bid[]): Contract | null {
  const lastBid = getLastContract(auction);
  if (!lastBid || lastBid.level === undefined || lastBid.strain === undefined) {
    return null;
  }

  let doubled = false;
  let redoubled = false;

  /* Son gerçek BID'den sonra gelen çağrıları tara. */
  for (let i = auction.length - 1; i >= 0; i--) {
    const call = auction[i];
    if (call.type === "BID") {
      break;
    }
    if (call.type === "DOUBLE") {
      doubled = true;
    }
    if (call.type === "REDOUBLE") {
      redoubled = true;
    }
  }

  return {
    level: lastBid.level,
    strain: lastBid.strain,
    doubled,
    redoubled,
  };
}

/*
 * Declarer = final kontratın strain'ini İLK söyleyen, kontratı kazanan
 * partnership'in oyuncusu. Yalnızca son bid eden DEĞİLDİR.
 *
 * Örnek: N:1H, S:2H, N:4H  -> final kontrat 4H, declarer N.
 */
export function getDeclarer(auction: Bid[]): Seat | null {
  const contract = resolveContract(auction);
  if (!contract) {
    return null;
  }

  const finalSeat = getLastContract(auction)!.seat;
  const winningPartnership = getPartnership(finalSeat);

  /* Kontrat strain'ini ilk söyleyen koltuk. */
  for (const bid of auction) {
    if (bid.type === "BID" && bid.strain === contract.strain) {
      if (getPartnership(bid.seat) === winningPartnership) {
        return bid.seat;
      }
    }
  }

  return finalSeat;
}

/*
 * Auction tamamlandığında play fazına geçmek için gereken başlangıç
 * durumunu hesaplar. Auction bitmemişse null döner.
 */
export function buildPlayStart(
  auction: Bid[]
): {
  contract: Contract;
  declarer: Seat;
  dummy: Seat;
  openingLeader: Seat;
} | null {
  if (!auctionFinished(auction)) {
    return null;
  }

  const contract = resolveContract(auction);
  if (!contract) {
    /* 4 PASS = board oynanmadan biter; play fazı başlamaz. */
    return null;
  }

  const declarer = getDeclarer(auction);
  if (!declarer) {
    return null;
  }

  return {
    contract,
    declarer,
    dummy: getDummy(declarer),
    openingLeader: getOpeningLeader(declarer),
  };
}

/* =========================================================
 * RANK / KOZ KARŞILAŞTIRMA
 * ========================================================= */

/* Daha düşük index = daha yüksek rank (ranks dizisi A'dan 2'ye). */
function rankIndex(rank: string): number {
  const idx = ranks.indexOf(rank as never);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

/* Bir kart diğerini (aynı suit içinde) yener mi? */
function beatsInSuit(a: Card, b: Card): boolean {
  return rankIndex(a.rank) < rankIndex(b.rank);
}

/* =========================================================
 * YASAL KART KONTROLÜ (renk takip kuralı)
 * ========================================================= */

/*
 * Renk takip zorunluluğuna göre bir kart yasal mı kontrol eder.
 *
 * Kurallar:
 *  - Kart oyuncunun elinde gerçekten olmalı.
 *  - Löve boşsa (ilk kart) her kart yasaldır.
 *  - Lövede kart varsa: led suit'ten kartı VARSA yalnızca led suit
 *    oynanabilir (kozun varlığı renk takibini değiştirmez).
 *  - Led suit'ten kartı YOKSA istediği kartı oynayabilir.
 */
export function isPlayableCard(
  hand: Hand,
  card: Card,
  currentTrick: PlayedCard[]
): boolean {
  /* Kart gerçekten elde mi? */
  const owns = hand.some(
    (c) => c.suit === card.suit && c.rank === card.rank
  );
  if (!owns) {
    return false;
  }

  /* Löve boşsa her kart yasaldır. */
  if (currentTrick.length === 0) {
    return true;
  }

  const ledSuit: Suit = currentTrick[0].card.suit;

  /* Led suit'ten kartı var mı? */
  const hasLedSuit = hand.some((c) => c.suit === ledSuit);

  if (hasLedSuit) {
    /* Led suit'ten kart olmalı. */
    return card.suit === ledSuit;
  }

  /* Led suit yok: her kart serbest. */
  return true;
}

/*
 * Oyuncunun oynayabileceği tüm kartları döner (UI için görselleştirme;
 * motor yine de isPlayableCard ile reddeder — UI'a güvenilmez).
 */
export function playableCards(
  hand: Hand,
  currentTrick: PlayedCard[]
): Card[] {
  return hand.filter((card) => isPlayableCard(hand, card, currentTrick));
}

/* =========================================================
 * KART OYNAMA (MOTOR ÇEKİRDEĞİ)
 * ========================================================= */

export type PlayCardResult = {
  currentTrick: PlayedCard[];
  currentDeal: Deal;
};

/*
 * Bir kartı löveye oynar. Tüm doğrulamayı yapar ve motor tarafında
 * yasa dışı kartı reddeder (UI'a güvenmez). Veri değiştirmez,
 * yalnızca yeni state döner.
 *
 * ruleViolation döndürürse oyun state'i DEĞİŞMEZ.
 */
export function playCard(
  currentDeal: Deal,
  seat: Seat,
  card: Card,
  currentTrick: PlayedCard[]
):
  | { ok: true; result: PlayCardResult }
  | { ok: false; reason: string } {
  const hand = getHand(currentDeal, seat);

  if (currentTrick.some((p) => p.seat === seat)) {
    return { ok: false, reason: "Bu oyuncu bu lövede zaten oynadı." };
  }

  if (!isPlayableCard(hand, card, currentTrick)) {
    return {
      ok: false,
      reason: "Yasal olmayan kart (renk takip kuralı).",
    };
  }

  const nextTrick: PlayedCard[] = [
    ...currentTrick,
    { seat, card },
  ];

  return {
    ok: true,
    result: {
      currentTrick: nextTrick,
      currentDeal: {
        north: seat === "N" ? removeFromHand(hand, card) : currentDeal.north,
        east: seat === "E" ? removeFromHand(hand, card) : currentDeal.east,
        south: seat === "S" ? removeFromHand(hand, card) : currentDeal.south,
        west: seat === "W" ? removeFromHand(hand, card) : currentDeal.west,
      },
    },
  };
}

function removeFromHand(hand: Hand, card: Card): Hand {
  return hand.filter(
    (c) => !(c.suit === card.suit && c.rank === card.rank)
  );
}

/* =========================================================
 * TRICK WINNER
 * ========================================================= */

/*
 * Lövenin kazananını hesaplar.
 *
 * Kozsuz (NT) oyun: yalnızca led suit içindeki en yüksek kart kazanır.
 * Kozlu oyun: ya led suit'in en yüksek kartı, ya da (koz oynandıysa)
 * en yüksek koz kazanır.
 */
export function trickWinner(
  cards: PlayedCard[],
  trump: Strain
): Seat | null {
  if (cards.length === 0) {
    return null;
  }

  const isTrump = (suit: Suit): boolean =>
    trump !== "NT" && suit === (trump as Suit);

  let winner = cards[0];

  for (let i = 1; i < cards.length; i++) {
    const current = cards[i];

    /* Önceki kazanan zaten koz ise. */
    if (isTrump(winner.card.suit)) {
      if (isTrump(current.card.suit)) {
        /* Koz vs koz: yüksek koz kazanır. */
        if (beatsInSuit(current.card, winner.card)) {
          winner = current;
        }
      }
      /* Koz olmayan kart kozu yenemez. */
      continue;
    }

    /* Önceki kazanan led suit'ten (koz değil). */
    if (current.card.suit === winner.card.suit) {
      /* Aynı suit: yüksek rank kazanır. */
      if (beatsInSuit(current.card, winner.card)) {
        winner = current;
      }
    } else if (isTrump(current.card.suit)) {
      /* Koz led suit'i yener. */
      winner = current;
    }
    /* Farklı lead-suit dışı suit: kazanamaz. */
  }

  return winner.seat;
}

/* =========================================================
 * LÖVE TAMAMLANMASI
 * ========================================================= */

/*
 * Löve dolduğunda (4 kart) kazananı hesaplar, completedTricks'e taşır
 * ve currentTrick'i temizler. Yoksa mevcut state'i değiştirmeden döner.
 */
export function tryCompleteTrick(opts: {
  currentTrick: PlayedCard[];
  completedTricks: Trick[];
  trump: Strain;
}): {
  completedTricks: Trick[];
  currentTrick: PlayedCard[];
  winner: Seat | null;
  trickCompleted: boolean;
} {
  const { currentTrick, completedTricks, trump } = opts;

  if (currentTrick.length < 4) {
    return {
      completedTricks,
      currentTrick,
      winner: null,
      trickCompleted: false,
    };
  }

  const winner = trickWinner(currentTrick, trump);

  return {
    completedTricks: [
      ...completedTricks,
      { cards: currentTrick, winner: winner ?? currentTrick[0].seat },
    ],
    currentTrick: [],
    winner,
    trickCompleted: true,
  };
}

/* 13 löve tamamlandı mı? */
export function isBoardCompleted(completedTricks: Trick[]): boolean {
  return completedTricks.length >= 13;
}

/* Sıradaki oynayacak koltuk (löve başında lider, yoksa saat yönü). */
export function nextPlaySeat(
  currentTrick: PlayedCard[],
  winner: Seat | null
): Seat {
  if (currentTrick.length === 0) {
    /* Yeni löve: önceki lövenin kazananı liderdir. */
    return winner ?? "N";
  }

  /* Löve devam ediyor: son oynayanın solundaki yani nextSeat. */
  return nextSeat(currentTrick[currentTrick.length - 1].seat);
}