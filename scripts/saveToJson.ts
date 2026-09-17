/* =========================================================
 * KASABA — TARİHÎ PBN -> LOCAL JSON (scripts/saveToJson.ts)
 * =========================================================
 *
 * data/pbn/*.pbn dosyalarının TAMAMINI tarar, app/lib/historical
 * parser/validator/dealKey katmanını (değiştirmeden) kullanır ve
 * benzersiz deal'leri data/pbn_hist_imports.json içine yazar.
 *
 * Çıktı yapısı: { "rows": [...], "total": N, "importedAt": "..." }
 *
 * Not: Supabase'e bağlanmaz; yalnızca yerel JSON üretir.
 * Kullanım:
 *   node node_modules/tsx/dist/cli.mjs scripts/saveToJson.ts
 */

import {
  readFileSync,
  readdirSync,
  createWriteStream,
  renameSync,
  rmSync,
  statSync,
  appendFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { splitBlocks, parseBlock, parsedToResult } from "../app/lib/historical/pbn";
import { validateDeal } from "../app/lib/historical/validate";
import { makeKsbdId } from "../app/lib/historical/dealKey";
import {
  loadManifest,
  historicalDealKeyFor,
} from "../app/lib/historical/sourceKey";

const PBN_DIR = join(process.cwd(), "data", "pbn");
const OUT_PATH = join(process.cwd(), "data", "pbn_hist_imports.json");
const LOG_PATH = join(process.cwd(), "data", "pbn_hist_imports.log");

/**
 * Konsola VE `data/pbn_hist_imports.log` dosyasına yazar.
 * Uzun süren tarama detach edilmiş bir süreçte çalıştığında ilerleme
 * kaydının kaybolmaması için (stdout'a güvenmeden) dosyaya da yazılır.
 */
function log(...parts: unknown[]) {
  const line = parts
    .map((p) => (typeof p === "string" ? p : String(p)))
    .join(" ");
  console.log(line);
  try {
    appendFileSync(LOG_PATH, `${line}\n`);
  } catch {
    /* log dosyası yazılamazsa çalışma durdurulmaz */
  }
}

function scan(dir: string, manifest: ReturnType<typeof loadManifest>) {
  const files = readdirSync(dir).filter((f) => f.endsWith(".pbn")).sort();
  const groups = new Map<string, { file: string; organiser: string; first: any; resultsJson: string[] }>();
  const rejects = new Map<string, number>();
  let totalBlocks = 0, valid = 0, unparsed = 0, fileCount = 0;

  for (const file of files) {
    fileCount++;
    log(`[${fileCount}/${files.length}] ${file}...`);
    const raw = readFileSync(join(dir, file), "utf8");
    const blocks = splitBlocks(raw.split(/\r?\n/));
    const m = manifest.get(file) ?? null;
    for (const block of blocks) {
      if (!block.tags["Deal"]) continue;
      totalBlocks++;
      const b = parseBlock(block);
      if (!b.deal) {
        unparsed++;
        continue;
      }
      const v = validateDeal(b.deal);
      if (!v.valid) {
        rejects.set(v.reason ?? "genel", (rejects.get(v.reason ?? "genel") ?? 0) + 1);
        continue;
      }
      valid++;
      // deal_key üretimi importHistoricalPbn/testDir ile BİREBİR AYNI:
      // sourceName = manifest organiser_name (yoksa ""), sourceFile = dosya adı
      const key = historicalDealKeyFor({
        manifest,
        fileName: file,
        deal: b.deal,
        dealer: b.dealer,
        vulnerability: b.vulnerability,
        boardNumber: b.boardNumber,
      });
      const res = parsedToResult(b);
      // Sonuç, bellekte nesne yerine KOMPAKT JSON STRING olarak tutulur:
      // V8 nesne grafiği ~1.4GB iken string biçimi ~10x daha az yer kaplar
      // ve page-thrashing'i tamamen önler. JSON çıktısı birebir aynıdır.
      const resJson = JSON.stringify(res);
      const g = groups.get(key);
      if (g) g.resultsJson.push(resJson);
      else
        groups.set(key, {
          file,
          organiser: m?.organiser_name ?? "",
          // parsedToResult bu blok üzerinde çalıştı; artık yalnızca row
          // üretiminde gereken alanlar tutulur.
          first: {
            deal: b.deal,
            dealer: b.dealer,
            vulnerability: b.vulnerability,
            boardNumber: b.boardNumber,
            block: {
              rbData: b.block?.rbData ?? null,
              rbImport: b.block?.rbImport ?? null,
            },
          },
          resultsJson: [resJson],
        });
    }
  }
  return { groups, totalBlocks, valid, unparsed, rejects, fileCount };
}

/**
 * Tek devasa `JSON.stringify(rows)` çağrısı yerine STREAMING yazım.
 *
 * - Her satır (row) tek tek `JSON.stringify(row)` ile serileştirilir; böylece
 *   tek parça halinde yüzlerce MB'lık bir string oluşturulmaz
 *   (Node'un ~512MB string limiti => RangeError: Invalid string length).
 * - Her yazma, stream callback'i beklenerek yapılır => gerçek backpressure.
 * - Çıktı önce `*.tmp` dosyasına yazılır, tamamlanınca atomik `rename` ile
 *   hedefe taşınır. Böylece yarıda kalan bir çalışma geçersiz/eksik JSON
 *   bırakmaz.
 * - Çıktı yapısı değişmez: { "rows": [...], "total": N, "importedAt": "..." }
 */
async function writeJsonChunked<T>(
  outPath: string,
  rowCount: number,
  importedAt: string,
  buildRow: (index: number) => T,
  onProgress?: (written: number, total: number) => void,
): Promise<number> {
  const tmpPath = `${outPath}.tmp`;
  const stream = createWriteStream(tmpPath, { encoding: "utf8" });
  /** Diske yazım için biriktirilen tampon (küçük parça yazımını önler). */
  const CHUNK_CHARS = 4 * 1024 * 1024;
  let bytes = 0;
  let queued = 0;
  let pending: string[] = [];
  let streamError: Error | null = null;
  stream.on("error", (err: Error) => {
    streamError = err;
  });

  const flush = async () => {
    if (pending.length === 0) return;
    const chunk = pending.join("");
    pending = [];
    queued = 0;
    await new Promise<void>((resolve, reject) => {
      if (streamError) return reject(streamError);
      bytes += Buffer.byteLength(chunk, "utf8");
      stream.write(chunk, (err?: Error | null) =>
        err ? reject(err) : resolve(),
      );
    });
  };

  const push = async (chunk: string) => {
    pending.push(chunk);
    queued += chunk.length;
    if (queued >= CHUNK_CHARS) await flush();
  };

  try {
    await push('{\n  "rows": [');
    for (let i = 0; i < rowCount; i++) {
      // Her satır tek tek serileştirilir (dev tek string => RangeError yok).
      // Girinti, split/map/join yerine TEK native regex geçişi ile eklenir:
      // 3000+ satırlık bir row'da küçük string çöpü üretmediği için çok hızlı.
      // buildRow artık hazır JSON string döndürüyor; doğrudan yazılır.
      const body = buildRow(i);
      await push(`${i === 0 ? "\n" : ",\n"}${body}`);
      if (onProgress && (i + 1) % 500 === 0) onProgress(i + 1, rowCount);
    }
    await push(
      `\n  ],\n  "total": ${rowCount},\n  "importedAt": ${JSON.stringify(importedAt)}\n}\n`,
    );
    await flush();

    // Stream'i kapat ve tüm tamponun diske yazılmasını bekle.
    await new Promise<void>((resolve, reject) => {
      stream.end((err?: Error | null) => (err ? reject(err) : resolve()));
    });
  } catch (err) {
    stream.destroy();
    try {
      rmSync(tmpPath, { force: true });
    } catch {
      /* tmp temizliği başarısız olsa da ana hata korunur */
    }
    throw err;
  }

  // Diske yazılan gerçek boyut doğrulanır; sonra atomik taşıma.
  const written = statSync(tmpPath).size;
  if (written !== bytes) {
    throw new Error(
      `[JSON] yazma doğrulaması başarısız: beklenen ${bytes} bayt, diskte ${written} bayt`,
    );
  }
  renameSync(tmpPath, outPath);

  return bytes;
}

async function main() {
  try {
    writeFileSync(LOG_PATH, "");
  } catch {
    /* log dosyası oluşturulamazsa çalışma durdurulmaz */
  }
  const startedAt = new Date().toISOString();
  log("=== JSON IMPORT (local-only fallback) ===");
  log(`PID          : ${process.pid}`);
  log(`Başlangıç    : ${startedAt}`);
  log(`Kaynak dizin : ${PBN_DIR}`);
  log(`Hedef dosya  : ${OUT_PATH}`);

  const manifest = loadManifest();
  const { groups, totalBlocks, valid, unparsed, rejects, fileCount } = scan(PBN_DIR, manifest);

  log("\n===== PARSE & VALIDATE =====");
  log("Dosya sayısı       :", fileCount);
  log("Board bloğu        :", totalBlocks);
  log("Geçerli board      :", valid);
  log("Reddedilen board   :", totalBlocks - valid - unparsed);
  log("Deal'i okunamayan  :", unparsed);
  for (const [reason, n] of rejects) log("   - red sebebi:", reason, "=>", n);
  log("Benzersiz deal key :", groups.size);

  const keys = [...groups.keys()].sort();
  const uniqueKeys = keys.length;
  log("\n===== JSON YAZIMI (streaming) =====");
  const importedAt = new Date().toISOString();
  let rowCount = 0;
  let firstId = "-";
  let lastId = "-";
  let travellers = 0;
  const bytes = await writeJsonChunked(
    OUT_PATH,
    keys.length,
    importedAt,
    (i) => {
      const key = keys[i];
      const g = groups.get(key)!;
      // Row yazıldıktan sonra grup bellekten bırakılır:
      // tüm rows dizisi bellekte tutulmaz => page-thrashing yok.
      groups.delete(key);
      const id = makeKsbdId(i + 1);
      const first = g.first;
      const res0 = JSON.parse(g.resultsJson[0]);
      rowCount++;
      if (rowCount === 1) firstId = id;
      lastId = id;
      travellers += g.resultsJson.length;
      // Row, results dizisi hariç tek seferde pretty-print edilir; results
      // ise taranırken hazırlanan kompakt JSON stringleri olarak gömülür.
      // Değerler ve alan sırası önceki model ile birebir aynıdır.
      const head = {
        id, dealKey: key, deal: first.deal, dealer: first.dealer, vulnerability: first.vulnerability,
        sourceName: g.organiser || "RealBridge", sourceUrl: null, sourceFile: g.file, sourceLicense: null, usageNote: "RealBridge kamuya açık PBN",
        tournamentName: null, tournamentDate: null, session: null, scoringType: null, country: null, organiser: null,
        firstBoard: null, totalBoards: null, totalTables: null,
        boardNumber: first.boardNumber, tableNumber: res0.table, round: res0.round, room: res0.room,
        homeTeam: res0.homeTeam, visitTeam: res0.visitTeam,
        northPlayer: res0.northPlayer, eastPlayer: res0.eastPlayer, southPlayer: res0.southPlayer, westPlayer: res0.westPlayer,
        contract: res0.contract, declarer: res0.declarer, openingLead: res0.openingLead,
        auction: res0.auction, auctionRaw: res0.auctionRaw, hasAuction: res0.hasAuction,
        play: res0.play, playRaw: res0.playRaw, hasPlay: res0.hasPlay,
        tricks: res0.tricks, score: res0.score, nsScore: res0.nsScore,
      };
      const metadata = { rbData: first.block.rbData ?? null, rbImport: first.block.rbImport ?? null, file: g.file };
      const importedAtRow = new Date().toISOString();
      // JSON.stringify(head, null, 2) "\n}" ile biter; son 2 karakter atılıp
      // results/metadata/importedAt/verified aynı girinti düzeniyle eklenir.
      return (
        JSON.stringify(head, null, 2).slice(0, -2)
        + `,\n  "results": [\n    ${g.resultsJson.join(",\n    ")}\n  ]`
        + `,\n  "metadata": ${JSON.stringify(metadata)},`
        + `\n  "importedAt": ${JSON.stringify(importedAtRow)},`
        + `\n  "verified": false\n}`
      );
    },
    (written, total) => log(`  ... ${written}/${total} satır yazıldı`),
  );

  log("\n===== ÖZET =====");
  log("Dosya sayısı         :", fileCount);
  log("Board bloğu (toplam) :", totalBlocks);
  log("Geçerli board        :", valid);
  log("Reddedilen board     :", totalBlocks - valid - unparsed);
  log("Benzersiz deal key   :", uniqueKeys);
  log("JSON row sayısı      :", rowCount);
  log("İlk KSB ID           :", firstId);
  log("Son KSB ID           :", lastId);
  log("Traveller (results)  :", travellers);
  log("JSON dosyası         :", OUT_PATH);
  log("Boyut                :", `${bytes} bayt (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
  log(`Bitiş                : ${new Date().toISOString()}`);
  log("DURUM                : OK");
}

main().catch((e) => { console.error(e); process.exit(1); });
