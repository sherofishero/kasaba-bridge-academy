/* =========================================================
 * KASABA — TARİHÎ DEAL DOĞRULAMA (historical/validate.ts)
 * =========================================================
 *
 * 52 kart, her elde 13 kart, duplicate olmaması ve dealer/zon
 * geçerlilik kontrolleri. Mevcut app/lib/deck tiplerini kullanır.
 */

import type { Card, Deal, Seat, Suit } from "../deck";
import type { Vulnerability } from "../game";

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const VALID_RANKS = new Set([
  "A",
  "K",
  "Q",
  "J",
  "10",
  "9",
  "8",
  "7",
  "6",
  "5",
  "4",
  "3",
  "2",
]);
export const SEATS: Seat[] = ["N", "E", "S", "W"];
export const VALID_VULNERABILITIES: Vulnerability[] = [
  "None",
  "NS",
  "EW",
  "Both",
];

export function cardKey(card: Card): string {
  return `${card.suit}${card.rank}`;
}

/** Bir elin 13 kart mı ve geçerli kart mı olduğunu doğrular. */
export function isValidHand(cards: Card[]): {
  valid: boolean;
  reason: string | null;
} {
  if (cards.length !== 13) {
    return { valid: false, reason: `el ${cards.length} kart içeriyor (13 olmalı)` };
  }
  const seen = new Set<string>();
  for (const c of cards) {
    if (!SUITS.includes(c.suit)) {
      return { valid: false, reason: `geçersiz suit: ${c.suit}` };
    }
    if (!VALID_RANKS.has(c.rank)) {
      return { valid: false, reason: `geçersiz rank: ${c.rank}` };
    }
    const k = cardKey(c);
    if (seen.has(k)) {
      return { valid: false, reason: `duplicate kart: ${k}` };
    }
    seen.add(k);
  }
  return { valid: true, reason: null };
}

/** Tüm deal bozulmamış mı: 4 el x 13, toplam 52 benzersiz kart. */
export function validateDeal(deal: Deal): {
  valid: boolean;
  reason: string | null;
} {
  const seats: Seat[] = ["N", "E", "S", "W"];
  const keyOf: Record<Seat, keyof Deal> = {
    N: "north",
    E: "east",
    S: "south",
    W: "west",
  };
  const all = new Set<string>();
  for (const seat of seats) {
    const hand = deal[keyOf[seat]];
    const chk = isValidHand(hand);
    if (!chk.valid) {
      return {
        valid: false,
        reason: `${seat} (${chk.reason})`,
      };
    }
    for (const card of hand) {
      const k = cardKey(card);
      if (all.has(k)) {
        return { valid: false, reason: `${seat}: duplicate ${k}` };
      }
      all.add(k);
    }
  }
  if (all.size !== 52) {
    return { valid: false, reason: `kart sayısı ${all.size} (52 olmalı)` };
  }
  return { valid: true, reason: null };
}

export function isValidSeat(v: string | null | undefined): v is Seat {
  return !!v && SEATS.includes(v as Seat);
}

export function isValidVulnerability(
  v: string | null | undefined
): v is Vulnerability {
  return !!v && VALID_VULNERABILITIES.includes(v as Vulnerability);
}

/** PBN zon kodunu KASABA Vulnerability değerine çevirir. */
export function normalizeVulnerability(raw: string | null | undefined):
  | Vulnerability
  | null {
  switch ((raw ?? "").trim()) {
    case "-":
    case "":
    case "None":
    case "none":
      return "None";
    case "NS":
    case "N-S":
      return "NS";
    case "EW":
    case "E-W":
      return "EW";
    case "All":
    case "Both":
    case "all":
    case "both":
      return "Both";
    default:
      return null;
  }
}

/** PBN dealer kodu -> Seat (geçersizse null). */
export function normalizeDealer(raw: string | null | undefined): Seat | null {
  const v = (raw ?? "").trim().toUpperCase();
  return isValidSeat(v) ? v : null;
}