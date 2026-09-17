

/* =========================================================
 * KASABA — TARİHÎ DEAL FETCHER (historical/fetcher.ts)
 * =========================================================
 *
 * Tarihî deal havuzuna tek giriş noktası. İki kaynak destekler:
 *
 *   1) LOCAL  : data/pbn_hist_imports.json (saveToJson.ts çıktısı)
 *      ~400MB'lık JSON dosyası hiçbir zaman tamamen parse edilmez;
 *      dosya ham metin olarak okunur, row sınırları depth-scan ile
 *      bulunur ve yalnızca dealKey/dealer/vulnerability/boardNumber
 *      "başlık index'i" çıkarılır. İstenen row'un gövdesi talep
 *      üzerine (lazy) parse edilir.
 *
 *   2) SUPABASE : historical_deals tablosu (RLS: public SELECT).
 *      Local bulunamazsa otomatik fallback.
 *
 * Node.js / server tarafında kullanım içindir (fs kullanır).
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { supabase } from "../supabase";
import type { Deal, Seat } from "../deck";
import type { Vulnerability } from "../game";
import { canonicalDealString } from "./dealKey";

/* ------------------------------------------------------------------ */
/* Tipler                                                              */
/* ------------------------------------------------------------------ */

/** Oyuncunun kendi elindeki sonucu (app/lib/scoring ScoreResult uyumlu). */
export type PlayerScoreResult = {
  /** Deklarer tarafının pozitif skoru (undertrick'te negatif). */
  score: number;
  /** Skoru alan taraf. */
  scoringSide: "NS" | "EW";
};

/** Traveller öğesi için gereken minimum alan (HistoricalDealResult alt kümesi). */
export type TravellerResultLike = {
  nsScore: number | null;
};

export type HistoricalComparison = {
  /** Traveller'daki karşılaştırılabilir sonuç sayısı. */
  samples: number;
  /** Matchpoint yüzdesi (0-100). samples === 0 ise null. */
  matchpointPct: number | null;
  /** Butler IMP ortalaması (diğer sonuçlara göre). samples < 2 ise null. */
  imp: number | null;
  beats: number;
  ties: number;
  loses: number;
};

export type HistoricalDealRow = {
  id: string;
  dealKey: string;
  deal: Deal;
  dealer: Seat | null;
  vulnerability: Vulnerability | null;
  sourceName: string;
  sourceFile: string;
  boardNumber: number | null;
  results: TravellerResultLike[];
  [k: string]: unknown;
};

/* ------------------------------------------------------------------ */
/* Local JSON index (lazy, tek seferlik)                               */
/* ------------------------------------------------------------------ */

type RowIndexEntry = {
  start: number;
  end: number;
  dealKey: string | null;
  dealer: string | null;
  vulnerability: string | null;
  boardNumber: number | null;
};

type LocalIndex = {
  buffer: string;
  rows: RowIndexEntry[];
  byKey: Map<string, number>;
};

const LOCAL_JSON_PATH = join(process.cwd(), "data", "pbn_hist_imports.json");

let localIndex: LocalIndex | null = null;
let localIndexPromise: Promise<LocalIndex | null> | null = null;

/**
 * Ham metni depth-scan eder ve `rows: [ ... ]` içindeki her bir row
 * objesinin (start,end) aralığını çıkarır. Row'lar pretty-print edilmiş
 * tam JSON objeleridir; stringler JSON.stringify ile serileştirildiği
 * için ham tırnak kaçışı güvenli biçimde ele alınır.
 */
function scanRowBounds(buffer: string): RowIndexEntry[] {
  const entries: RowIndexEntry[] = [];
  const rowsStart = buffer.indexOf('"rows"');
  if (rowsStart === -1) return entries;

  // depth 2 = row objesinin başladığı seviye ( { "rows": [ <-1  { <-2 )
  let depth = 0;
  let inString = false;
  let escaped = false;
  let rowStart = -1;

  for (let i = rowsStart; i < buffer.length; i++) {
    const c = buffer.charCodeAt(i);
    if (inString) {
      if (escaped) escaped = false;
      else if (c === 92 /* \ */) escaped = true;
      else if (c === 34 /* " */) inString = false;
      continue;
    }
    if (c === 34) {
      inString = true;
      continue;
    }
    if (c === 123 /* { */) {
      depth++;
      if (depth === 2) rowStart = i;
      continue;
    }
    if (c === 125 /* } */) {
      depth--;
      if (depth === 2 && rowStart >= 0) {
        entries.push({
          start: rowStart,
          end: i + 1,
          dealKey: null,
          dealer: null,
          vulnerability: null,
          boardNumber: null,
        });
        rowStart = -1;
      }
    }
  }
  return entries;
}

function headSlice(buffer: string, e: RowIndexEntry): string {
  // results dizisi row sonunda; başlık + board bilgisi ilk kısımdadır.
  const resIdx = buffer.indexOf('"results"', e.start);
  const headEnd = resIdx > 0 && resIdx < e.end ? resIdx : e.end;
  return buffer.slice(e.start, Math.min(headEnd, e.start + 64 * 1024));
}

function indexEntryMeta(buffer: string, e: RowIndexEntry): void {
  const head = headSlice(buffer, e);
  let m = /"dealKey"\s*:\s*"(HD-[0-9a-fA-F]+)"/.exec(head);
  e.dealKey = m ? m[1] : null;
  m = /"dealer"\s*:\s*"([NESW])"/.exec(head);
  e.dealer = m ? m[1] : null;
  m = /"vulnerability"\s*:\s*"([A-Za-z]+)"/.exec(head);
  e.vulnerability = m ? m[1] : null;
  m = /"boardNumber"\s*:\s*(\d+)/.exec(head);
  e.boardNumber = m ? Number(m[1]) : null;
}

function buildLocalIndex(): LocalIndex | null {
  if (!existsSync(LOCAL_JSON_PATH)) return null;
  const buffer = readFileSync(LOCAL_JSON_PATH, "utf8");
  const rows = scanRowBounds(buffer);
  const byKey = new Map<string, number>();
  for (let i = 0; i < rows.length; i++) {
    indexEntryMeta(buffer, rows[i]);
    if (rows[i].dealKey && !byKey.has(rows[i].dealKey!)) {
      byKey.set(rows[i].dealKey!, i);
    }
  }
  return { buffer, rows, byKey };
}

async function getLocalIndex(): Promise<LocalIndex | null> {
  if (localIndex) return localIndex;
  if (!localIndexPromise) {
    localIndexPromise = Promise.resolve(buildLocalIndex()).then((idx) => {
      localIndex = idx;
      return idx;
    });
  }
  return localIndexPromise;
}

function parseLocalRow(buffer: string, e: RowIndexEntry): HistoricalDealRow | null {
  try {
    const row = JSON.parse(buffer.slice(e.start, e.end)) as HistoricalDealRow;
    if (!row || !row.deal) return null;
    return row;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Supabase fallback                                                   */
/* ------------------------------------------------------------------ */

type SupabaseDealRow = {
  id: string;
  deal_key: string;
  deal: Deal;
  dealer: Seat | null;
  vulnerability: Vulnerability | null;
  source_name: string;
  source_file: string;
  board_number: number | null;
  results: TravellerResultLike[];
  [k: string]: unknown;
};

function mapSupabaseRow(r: SupabaseDealRow): HistoricalDealRow {
  const row: HistoricalDealRow = {
    ...r,
    dealKey: r.deal_key,
    dealer: r.dealer ?? null,
    vulnerability: r.vulnerability ?? null,
    sourceName: r.source_name,
    sourceFile: r.source_file,
    boardNumber: r.board_number,
    results: Array.isArray(r.results) ? r.results : [],
  } as unknown as HistoricalDealRow;
  return row;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** deal_key'e göre deal getirir: önce local JSON, yoksa Supabase. */
export async function getDealByHash(dealKey: string): Promise<HistoricalDealRow | null> {
  if (!dealKey) return null;

  const idx = await getLocalIndex();
  if (idx) {
    const i = idx.byKey.get(dealKey);
    if (i !== undefined) {
      const row = parseLocalRow(idx.buffer, idx.rows[i]);
      if (row) return row;
    }
  }

  // Supabase fallback
  try {
    const { data, error } = await supabase
      .from("historical_deals")
      .select("*")
      .eq("deal_key", dealKey)
      .maybeSingle();
    if (error) {
      console.error("[FETCHER] supabase getDealByHash:", error.message);
      return null;
    }
    return data ? mapSupabaseRow(data as SupabaseDealRow) : null;
  } catch (e) {
    console.error("[FETCHER] supabase getDealByHash:", e);
    return null;
  }
}

/**
 * Board bilgisine (dealer + zon + tam 52 kartlı deal) göre arar.
 * Local: dealer+vuln eşleşen adaylarda canonicalDealString birebir
 * karşılaştırması yapılır. Supabase: dealer/vuln filtresi sonrası
 * aynı canonical doğrulaması.
 */
export async function getDealByBoardInfo(
  dealer: Seat | null,
  vulnerability: Vulnerability | null,
  cards: Deal
): Promise<HistoricalDealRow | null> {
  const target = canonicalDealString(cards);

  // 1) Local
  const idx = await getLocalIndex();
  if (idx) {
    for (const e of idx.rows) {
      if (dealer !== null && e.dealer !== dealer) continue;
      if (vulnerability !== null && e.vulnerability !== vulnerability) continue;
      const row = parseLocalRow(idx.buffer, e);
      if (!row) continue;
      if (canonicalDealString(row.deal) === target) return row;
    }
  }

  // 2) Supabase fallback
  try {
    let query = supabase.from("historical_deals").select("*");
    if (dealer) query = query.eq("dealer", dealer);
    if (vulnerability) query = query.eq("vulnerability", vulnerability);
    const { data, error } = await query;
    if (error) {
      console.error("[FETCHER] supabase getDealByBoardInfo:", error.message);
      return null;
    }
    for (const r of (data ?? []) as SupabaseDealRow[]) {
      if (!r?.deal) continue;
      if (canonicalDealString(r.deal) === target) return mapSupabaseRow(r);
    }
    return null;
  } catch (e) {
    console.error("[FETCHER] supabase getDealByBoardInfo:", e);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Matchpoint / IMP karşılaştırması                                    */
/* ------------------------------------------------------------------ */

/**
 * Standart WBF IMP dönüşümü: |diff| eşik aralığına göre IMP.
 * 10-40 → 1 IMP, 50-80 → 2, ... 2500+ → 21.
 */
const IMP_BOUNDARIES = [
  10, 50, 90, 130, 170, 220, 280, 330, 380, 430,
  500, 600, 750, 900, 1100, 1300, 1500, 1750, 2000, 2250, 2500,
] as const;

export function scoreDiffToImp(diff: number): number {
  const a = Math.abs(diff);
  let imp = 0;
  for (const b of IMP_BOUNDARIES) {
    if (a >= b) imp++;
    else break;
  }
  return diff >= 0 ? imp : -imp;
}

/**
 * Oyuncunun oynadığı elin skorunu, aynı deal'in tarihsel traveller
 * sonuçlarıyla (208k havuzundaki ilgili satırın `results` dizisi)
 * karşılaştırır.
 *
 * - Matchpoint %: oyuncunun geçtiği (+0.5 beraberlik) sonuç oranı.
 * - IMP: diğer tüm sonuçlara göre skor farkının IMP karşılığının
 *   ortalaması (Butler tarzı). Player'ın kendi sonucu traveller
 *   verisinde "diğer masalar" olarak kabul edilir.
 *
 * perspective: karşılaştırmanın bakış tarafı; varsayılan "NS" —
 * oyuncu skoru ve traveller `nsScore` NS bakışıyla doğrudan kıyaslanır.
 */
export function calculateHistoricalComparison(
  playerScore: PlayerScoreResult,
  travellerResults: TravellerResultLike[],
  options?: { perspective?: "NS" | "EW" }
): HistoricalComparison {
  const perspective = options?.perspective ?? "NS";
  const sign = perspective === "NS" ? 1 : -1;
  const playerNs =
    playerScore.scoringSide === "NS" ? playerScore.score : -playerScore.score;
  const playerView = sign * playerNs;

  const others: number[] = [];
  for (const r of travellerResults ?? []) {
    if (typeof r?.nsScore !== "number" || Number.isNaN(r.nsScore)) continue;
    others.push(sign * r.nsScore);
  }

  const samples = others.length;
  if (samples === 0) {
    return { samples: 0, matchpointPct: null, imp: null, beats: 0, ties: 0, loses: 0 };
  }

  let beats = 0, ties = 0, loses = 0, impSum = 0;
  for (const o of others) {
    if (playerView > o) beats++;
    else if (playerView === o) ties++;
    else loses++;
    impSum += scoreDiffToImp(playerView - o);
  }

  const matchpointPct = (100 * (beats + 0.5 * ties)) / samples;
  const imp = samples >= 2 ? impSum / samples : null;

  return { samples, matchpointPct, imp, beats, ties, loses };
}

/** Test/inceleme için: local index hazır mı ve kaç row var? */
export async function getLocalStats(): Promise<{ loaded: boolean; rowCount: number } | null> {
  const idx = await getLocalIndex();
  if (!idx) return null;
  return { loaded: true, rowCount: idx.rows.length };
}
