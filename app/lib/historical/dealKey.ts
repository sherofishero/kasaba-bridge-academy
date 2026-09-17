/* =========================================================
 * KASABA — TARİHÎ DEAL ANAHTARI (historical/dealKey.ts)
 * =========================================================
 *
 * - deal_key : duplicate kontrolü için deterministik anahtar.
 *   Aynı (tam deal + dealer + zon + kaynak turnuva + kaynak dosya
 *   + board numarası) => aynı anahtar. Farklı masa sonuçları aynı
 *   board'a aitse aynı anahtara düşer ve tek satır + traveller olur.
 *
 * - KSB ID  : KASABA'nın kendi benzersiz Deal ID'si (örn. KSB-000001).
 *   Import sırasında sıralı atanır.
 */

import type { Deal, Seat } from "../deck";
import type { Vulnerability } from "../game";
import { cardKey, SEATS } from "./validate";

/** Deterministic 31-bit hash (murmur3 x86-32 benzeri, saf JS). */
export function murmur3_32(str: string, seed = 0): number {
  let h1 = seed >>> 0;
  const remainder = str.length & 3;
  const bytes = str.length - remainder;
  let i = 0;
  const k1High = Math.pow(2, 21) - 1;

  while (i < bytes) {
    let k1 =
      (str.charCodeAt(i) & 0xff) |
      ((str.charCodeAt(i + 1) & 0xff) << 8) |
      ((str.charCodeAt(i + 2) & 0xff) << 16) |
      ((str.charCodeAt(i + 3) & 0xff) << 24);
    i += 4;

    k1 = Math.imul(k1 | 0, 0xcc9e2d51);
    k1 &= 0xffffffff;
    k1 = ((k1 << 15) | (k1 >>> 17)) & 0xffffffff;
    k1 = Math.imul(k1 | 0, 0x1b873593);
    k1 &= 0xffffffff;

    h1 ^= k1 >>> 0;
    h1 = ((h1 << 13) | (h1 >>> 19)) & 0xffffffff;
    h1 =
      (Math.imul(h1 | 0, 5) & 0xffffffff) + 0xe6546b64;
    h1 &= 0xffffffff;
  }

  let k1 = 0;
  for (let j = remainder - 1; j >= 0; j--) {
    k1 ^= str.charCodeAt(i + j) & 0xff;
    k1 <<= 8;
  }
  if (remainder > 0) {
    k1 = Math.imul(k1 | 0, 0xcc9e2d51);
    k1 &= 0xffffffff;
    k1 = ((k1 << 15) | (k1 >>> 17)) & 0xffffffff;
    k1 = Math.imul(k1 | 0, 0x1b873593);
    k1 &= 0xffffffff;
    h1 ^= k1 >>> 0;
  }

  h1 ^= str.length >>> 0;
  h1 ^= h1 >>> 16;
  h1 = Math.imul(h1 | 0, 0x85ebca6b);
  h1 &= 0xffffffff;
  h1 ^= h1 >>> 13;
  h1 = Math.imul(h1 | 0, 0xc2b2ae35);
  h1 &= 0xffffffff;
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
}

/** Tam deal'in kanonik string hali (her el sıralı kartlar). */
export function canonicalDealString(deal: Deal): string {
  const keyOf: Record<Seat, keyof Deal> = {
    N: "north",
    E: "east",
    S: "south",
    W: "west",
  };
  return SEATS.map((seat) =>
    [...deal[keyOf[seat]]]
      .map(cardKey)
      .sort()
      .join("")
  ).join("|");
}

/**
 * Deterministik duplicate anahtarı.
 *
 * Not: `deal/source` dışındaki alanlar NULL olamaz; kaynakta eksik
 * olan alan "" olarak geçer ve anahtar yine üretilir. Sürekli aynı
 * girdi => aynı anahtar.
 */
export function buildDealKey(input: {
  deal: Deal;
  dealer: Seat | null;
  vulnerability: Vulnerability | null;
  sourceName: string;
  sourceFile: string;
  boardNumber: number | null;
}): string {
  const join = [
    canonicalDealString(input.deal),
    input.dealer ?? "",
    input.vulnerability ?? "",
    input.sourceName ?? "",
    input.sourceFile ?? "",
    input.boardNumber != null ? String(input.boardNumber) : "",
  ].join("::");
  return `HD-${murmur3_32(join).toString(16).padStart(8, "0")}`;
}

/** Sayısal kısmından KSB ID üretir (000001 -> 6 hane). */
export function makeKsbdId(seq: number): string {
  return `KSB-${String(seq).padStart(6, "0")}`;
}

/** "KSB-123456" -> 123456 */
export function parseKsbdSeq(id: string): number {
  const m = /KSB-(\d+)/.exec(id ?? "");
  return m ? Number(m[1]) : 0;
}