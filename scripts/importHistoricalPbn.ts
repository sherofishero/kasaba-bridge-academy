/* =========================================================
 * KASABA — TARİHÎ REALBRIDGE PBN İMPORTER (scripts/importHistoricalPbn.ts)
 * =========================================================
 *
 * data/pbn/*.pbn dosyalarını okur, app/lib/historical parser'ı ile
 * her board'u doğrular, benzersiz deal'ler için deterministik deal_key
 * üretir, KSB-###### ID atar ve Supabase historical_deals'a upsert eder.
 *
 * Duplicate kontrolü: aynı deal+dealer+zon+kaynak+board numarası aynı
 * deal_key'e düşer; masa sonuçları `results` (traveller) dizisinde
 * toplanır. Upsert (onConflict deal_key) idempotenttir.
 *
 * Kullanım:
 *   node node_modules/tsx/dist/cli.mjs scripts/importHistoricalPbn.ts
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { supabase } from "../app/lib/supabase";
import {
  splitBlocks,
  parseBlock,
  parsedToResult,
  type PbnParsedBoard,
} from "../app/lib/historical/pbn";
import { validateDeal } from "../app/lib/historical/validate";
import { makeKsbdId, parseKsbdSeq } from "../app/lib/historical/dealKey";
import {
  loadManifest,
  historicalDealKeyFor,
  type ManifestEntry,
} from "../app/lib/historical/sourceKey";
import type { HistoricalDealInsert, HistoricalDealResult } from "../app/lib/historical/model";

const PBN_DIR = join(process.cwd(), "data", "pbn");

type GroupAcc = {
  meta: ManifestEntry | null;
  first: PbnParsedBoard | null;
  results: HistoricalDealResult[];
};

function resultOf(meta: ManifestEntry | null, b: PbnParsedBoard): HistoricalDealResult {
  return parsedToResult(b);
}

async function fetchExistingKeys(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("historical_deals")
      .select("deal_key,id")
      .range(from, from + 999);
    if (error || !data || data.length === 0) break;
    for (const r of data) map.set(String(r.deal_key), String(r.id));
    if (data.length < 1000) break;
    from += 1000;
  }
  return map;
}

function buildInsert(
  key: string,
  g: GroupAcc,
  id: string
): HistoricalDealInsert {
  const m = g.meta;
  const first = g.first!;
  const nowIso = new Date().toISOString();
  const firstResult = g.results[0] ?? resultOf(m, first);

  return {
    id,
    dealKey: key,
    deal: first.deal!,
    dealer: first.dealer,
    vulnerability: first.vulnerability,
    sourceName: m?.organiser_name ?? "RealBridge",
    sourceUrl: m?.pbn_file_url ?? "",
    sourceFile: m?.pbn_file_name ?? String(first.block.raw[0] ?? ""),
    sourceLicense: "Public — RealBridge PBN Results Files (kamuya açık sonuç dosyaları)",
    usageNote:
      "RealBridge tarafından kamuya açık yayınlanan Full PBN sonuç dosyalarından " +
      "aktarılır. Kaynağın yeniden kullanım koşulu için orijinal sayfa ve RealBridge " +
      "kullanım notlarına bakılır; bu depo kişisel/akademik oynama ve doğrulama içindir.",
    tournamentName: first.tournamentName ?? m?.description ?? null,
    tournamentDate: first.date ?? m?.session_date ?? null,
    session: first.session ?? m?.description ?? null,
    scoringType: m?.scoring_type ?? first.scoring ?? null,
    boardNumber: first.boardNumber,
    country: m?.country ?? null,
    organiser: m?.organiser_name ?? null,
    firstBoard: m?.first_board ?? null,
    totalBoards: m?.no_of_boards ?? null,
    totalTables: m?.no_of_tables ?? null,
    tableNumber: first.table,
    round: first.round,
    room: first.room,
    homeTeam: first.homeTeam,
    visitTeam: first.visitTeam,
    northPlayer: first.players.north,
    eastPlayer: first.players.east,
    southPlayer: first.players.south,
    westPlayer: first.players.west,
    contract: firstResult.contract,
    declarer: firstResult.declarer,
    openingLead: firstResult.openingLead,
    auction: firstResult.auction,
    auctionRaw: firstResult.auctionRaw,
    hasAuction: firstResult.hasAuction,
    play: firstResult.play,
    playRaw: firstResult.playRaw,
    hasPlay: firstResult.hasPlay,
    tricks: firstResult.tricks,
    score: firstResult.score,
    nsScore: firstResult.nsScore,
    results: g.results,
    metadata: {
      country: m?.country ?? null,
      organiser: m?.organiser_name ?? null,
      firstBoard: m?.first_board ?? null,
      totalBoards: m?.no_of_boards ?? null,
      totalTables: m?.no_of_tables ?? null,
      rbData: first.block.rbData,
      rbImport: first.block.rbImport,
    },
    importedAt: nowIso,
    verified: false,
  };
}

function dbRow(row: HistoricalDealInsert): Record<string, unknown> {
  return {
    id: row.id,
    deal_key: row.dealKey,
    deal: row.deal,
    dealer: row.dealer,
    vulnerability: row.vulnerability,
    source_name: row.sourceName,
    source_url: row.sourceUrl,
    source_file: row.sourceFile,
    source_license: row.sourceLicense,
    usage_note: row.usageNote,
    tournament_name: row.tournamentName,
    tournament_date: row.tournamentDate,
    session: row.session,
    scoring_type: row.scoringType,
    country: row.country,
    organiser: row.organiser,
    first_board: row.firstBoard,
    total_boards: row.totalBoards,
    total_tables: row.totalTables,
    board_number: row.boardNumber,
    table_number: row.tableNumber,
    round: row.round,
    room: row.room,
    home_team: row.homeTeam,
    visit_team: row.visitTeam,
    north_player: row.northPlayer,
    east_player: row.eastPlayer,
    south_player: row.southPlayer,
    west_player: row.westPlayer,
    contract: row.contract,
    declarer: row.declarer,
    opening_lead: row.openingLead,
    auction: row.auction,
    auction_raw: row.auctionRaw,
    has_auction: row.hasAuction,
    play: row.play,
    play_raw: row.playRaw,
    has_play: row.hasPlay,
    tricks: row.tricks,
    score: row.score,
    ns_score: row.nsScore,
    results: row.results,
    metadata: row.metadata,
    imported_at: row.importedAt,
    verified: row.verified,
  };
}

async function main() {
  const manifest = loadManifest();
  const files = readdirSync(PBN_DIR).filter((f) => f.endsWith(".pbn")).sort();

  const stats = {
    files: files.length,
    boardBlocks: 0,
    valid: 0,
    rejected: 0,
    unique: 0,
    extraTables: 0,
    withAuction: 0,
    withPlay: 0,
  };
  const rejects = new Map<string, number>();
  const groups = new Map<string, GroupAcc>();

  for (const file of files) {
    const m = manifest.get(file) ?? null;
    const raw = readFileSync(join(PBN_DIR, file), "utf8");
    const blocks = splitBlocks(raw.split(/\r?\n/));
    for (const block of blocks) {
      if (!block.tags["Deal"]) continue;
      stats.boardBlocks++;
      const b = parseBlock(block);
      if (!b.deal) continue;
      const v = validateDeal(b.deal);
      if (!v.valid) {
        stats.rejected++;
        rejects.set(v.reason ?? "genel", (rejects.get(v.reason ?? "genel") ?? 0) + 1);
        continue;
      }
      stats.valid++;

      const key = historicalDealKeyFor({
        manifest,
        fileName: file,
        deal: b.deal,
        dealer: b.dealer,
        vulnerability: b.vulnerability,
        boardNumber: b.boardNumber,
      });
      const res = parsedToResult(b);
      const existing = groups.get(key);
      if (existing) {
        existing.results.push(res);
        stats.extraTables++;
      } else {
        groups.set(key, { meta: m, first: b, results: [res] });
        stats.unique++;
      }
      if (res.hasAuction) stats.withAuction++;
      if (res.hasPlay) stats.withPlay++;
    }
  }

  console.log("\n===== PARSE & VALIDATE =====");
  console.log("PBN dosya   :", stats.files);
  console.log("Board bloğu :", stats.boardBlocks);
  console.log("Geçerli el  :", stats.valid);
  console.log("Reddedilen  :", stats.rejected);
  for (const [r, n] of rejects) console.log("   -", r, ":", n);
  console.log("Benzersiz   :", stats.unique, "deal/board");
  console.log("Ek masa     :", stats.extraTables, "sonuç (traveller)");
  console.log("Auction'lı  :", stats.withAuction, "| Play'lı:", stats.withPlay);

  const existing = await fetchExistingKeys();
  const seqs = [...existing.values()].map(parseKsbdSeq);
  let nextSeq = seqs.length ? Math.max(...seqs) + 1 : 1;

  const keys = [...groups.keys()].sort();
  const rows: HistoricalDealInsert[] = [];
  let newKeys = 0;
  let dupKeys = 0;

  for (const key of keys) {
    const g = groups.get(key)!;
    const id = existing.get(key);
    if (id) {
      dupKeys++;
      rows.push(buildInsert(key, g, id));
    } else {
      rows.push(buildInsert(key, g, makeKsbdId(nextSeq)));
      nextSeq++;
      newKeys++;
    }
  }

  console.log("\n===== UPSERT =====");
  // Statement timeout'u önlemek için batch boyutu 200 -> 50 düşürüldü.
  // Upsert onConflict: "deal_key" ile idempotent; tekrar çalıştırma güvenli.
  const BATCH = 50;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("historical_deals")
      .upsert(chunk.map(dbRow), { onConflict: "deal_key" });
    if (error) {
      console.error(`[IMPORT] upsert ${i}..${i + chunk.length}:`, error.message);
    } else {
      upserted += chunk.length;
    }
  }

  console.log("Yazılan satır :", upserted, "/", rows.length);
  console.log("Yeni KSB ID   :", newKeys);
  console.log("Mevcut(dup)   :", dupKeys);
  console.log("ID aralığı    :", rows.length ? `${rows[0].id} .. ${rows[rows.length - 1].id}` : "-");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});