/* KASABA — RealBridge PBN toplu indirici (paralel)
 * Hedef: toplam benzersiz board >= TARGET (dosyalardan no_of_boards toplamı).
 * Zaten data/pbn'de varsa atlar. fetch kullanır (browser UA set edilir).
 */
import { writeFileSync, existsSync, readFileSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "data", "pbn");
const MANIFEST = join(process.cwd(), "data", "pbn_manifest.json");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";
const TARGET = Number(process.env.TARGET ?? 10500);
const CONCURRENCY = Number(process.env.CONC ?? 12);

type Session = {
  country: string;
  organiser_name: string;
  session_date: string;
  description: string;
  scoring_type: string;
  first_board: number;
  no_of_boards: number;
  no_of_tables: number;
  pbn_file_name: string;
  pbn_file_url: string;
};

mkdirSync(OUT, { recursive: true });
const json = JSON.parse(readFileSync(MANIFEST, "utf8"));
const sessions: Session[] = (json.sessions ?? json) as Session[];

const selected = sessions
  .filter(
    (s) =>
      ["Matchpoints", "IMPs", "BAM"].includes(s.scoring_type) &&
      Number(s.no_of_boards) >= 16 &&
      Number(s.no_of_boards) <= 64 &&
      Number(s.no_of_tables) >= 2
  )
  .sort((a, b) => Number(b.no_of_boards) - Number(a.no_of_boards));

const existing = new Set(readdirSync(OUT).filter((f) => f.endsWith(".pbn")));

let cumulative = 0;
let totalBoardsUpTo = 0;
const queue: { name: string; url: string; boards: number }[] = [];
for (const s of selected) {
  if (totalBoardsUpTo >= TARGET) break;
  if (existing.has(s.pbn_file_name)) {
    totalBoardsUpTo += Number(s.no_of_boards);
    cumulative += Number(s.no_of_boards);
    continue;
  }
  queue.push({ name: s.pbn_file_name, url: s.pbn_file_url, boards: Number(s.no_of_boards) });
  totalBoardsUpTo += Number(s.no_of_boards);
}

let idx = 0;
let failed = 0;
let done = 0;
async function worker() {
  while (idx < queue.length) {
    const job = queue[idx++];
    if (cumulative >= TARGET) return;
    try {
      const res = await fetch(job.url, { headers: { "user-agent": UA } });
      if (!res.ok) { console.log("HTTP", res.status, job.name); failed++; continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 500) { console.log("küçük/boş:", job.name); failed++; continue; }
      writeFileSync(join(OUT, job.name), buf);
      cumulative += job.boards;
      done++;
      if (done % 50 === 0) console.log(`... indirildi=${done} kümülatif=${cumulative}/${TARGET}`);
    } catch (e) {
      failed++;
      if (failed < 20) console.log("hata:", job.name, (e as Error).message);
    }
  }
}

async function main() {
  console.log(`Hedef=${TARGET} Sekans=${queue.length} ZatenVar=${existing.size}`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log("==== DOWNLOAD SUMMARY ====");
  console.log("indirilen:", done, "hata:", failed, "kümülatifBoard:", cumulative, "/", TARGET);
}

main().catch((e) => { console.error(e); process.exit(1); });