/* =========================================================
 * KASABA — TARİHÎ TURNUVA DEAL VERİ MODELİ (historical/model.ts)
 * =========================================================
 *
 * RealBridge'in kamuya açık Full PBN / sonuç dosyalarından içe
 * aktarılan gerçek turnuva board'larının KASABA tarafındaki veri
 * modeli.
 *
 * Bir "historical deal", kaynak turnuvadaki bir (dealer, zon,
 * tam deal) kombinasyonudur. Aynı deal aynı board numarasında
 * birden fazla masada oynandıysa, tüm masa sonuçları tek satırın
 * `results` (traveller) dizisinde saklanır.
 *
 * Mevcut canlı oyun sistemiyle uyum için `deal` alanı app/lib/deck
 * 'in `Deal` tipiyle aynı şekildedir ({ north, east, south, west }
 * her biri `Card[]`). Dealer/Vulnerability de mevcut game.ts
 * tipleriyle aynıdır.
 */

import type { Deal, Seat } from "../deck";
import type { Vulnerability } from "../game";

/** PBN içinde her masa için oynanmış kart (suited PBN kodu, örn "DA"). */
export type PbnPlayedCard = string;

/** Bir Auction çağrısı (normalize). */
export type HistoricalAuctionCall = {
  seat: Seat;
  type: "PASS" | "DOUBLE" | "REDOUBLE" | "BID";
  level?: number;
  strain?: "C" | "D" | "H" | "S" | "NT";
  /** Kaynaktaki ham metin (alert işaretleri vb. korunur). */
  raw: string;
};

/** Tek masadaki tam sonuç (traveller öğesi). */
export type HistoricalDealResult = {
  tableNumber: number | null;
  round: number | null;
  room: string | null;
  homeTeam: string | null;
  visitTeam: string | null;
  position: string | null;

  players: {
    north: string | null;
    east: string | null;
    south: string | null;
    west: string | null;
  };

  auction: HistoricalAuctionCall[] | null;
  auctionRaw: string | null;
  hasAuction: boolean;

  contract: string | null;
  level: number | null;
  strain: string | null;
  doubled: boolean;
  redoubled: boolean;

  declarer: Seat | null;
  result: string | null;
  tricks: number | null;
  tricksDeclarer: number | null;
  nsScore: number | null;
  score: string | null;
  scoreImp: string | null;
  scorePercentage: string | null;

  openingLead: string | null;
  hasPlay: boolean;
  play: PbnPlayedCard[][] | null;
  playRaw: string | null;

  doubleDummyTricks: string | null;
  optimumScore: string | null;
};

/** Supabase `historical_deals` satırına yazılacak veri. */
export type HistoricalDealInsert = {
  id: string;
  dealKey: string;
  deal: Deal;
  dealer: Seat | null;
  vulnerability: Vulnerability | null;

  sourceName: string;
  sourceUrl: string;
  sourceFile: string;
  sourceLicense: string | null;
  usageNote: string | null;

  tournamentName: string | null;
  tournamentDate: string | null;
  session: string | null;
  scoringType: string | null;

  boardNumber: number | null;
  country: string | null;
  organiser: string | null;
  firstBoard: number | null;
  totalBoards: number | null;
  totalTables: number | null;

  /** Tek masanın referans bilgileri (ilk masadan). */
  tableNumber: number | null;
  round: number | null;
  room: string | null;
  homeTeam: string | null;
  visitTeam: string | null;

  /** Referans (ilk) masa oyuncuları. */
  northPlayer: string | null;
  eastPlayer: string | null;
  southPlayer: string | null;
  westPlayer: string | null;

  /** Referans (ilk) masa oyun bilgileri. */
  contract: string | null;
  declarer: Seat | null;
  openingLead: string | null;
  auction: HistoricalAuctionCall[] | null;
  auctionRaw: string | null;
  hasAuction: boolean;
  play: PbnPlayedCard[][] | null;
  playRaw: string | null;
  hasPlay: boolean;
  tricks: number | null;
  score: string | null;
  nsScore: number | null;

  /** Traveller: aynı deal'i oynayan TÜM masaların sonuçları. */
  results: HistoricalDealResult[];

  /** Kaynak %RBDATA / %RBIMPORT dahil ek metadata. */
  metadata: Record<string, unknown>;

  importedAt: string;
  verified: boolean;
};