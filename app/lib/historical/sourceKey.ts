/* =========================================================
 * KASABA — ORTAK KAYNAK METADATA + DEAL KEY (historical/sourceKey.ts)
 * =========================================================
 *
 * Bütün import/test scriptleri deal_key'i TEK NOKTADAN üretir.
 * Daha önce importHistoricalPbn.ts manifest'ten `organiser_name`,
 * testDir.ts sabit "realbridge", saveToJson.ts "" kullanıyordu;
 * bu üçü farklı anahtarlar üretiyordu. Artık hepsi:
 *
 *   sourceName : manifest'teki organiser_name (yoksa "")
 *   sourceFile : yerel .pbn dosya adı
 *   boardNumber: PBN board numarası
 *
 * parametreleriyle buildDealKey çağırır => birebir aynı anahtar.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildDealKey } from "./dealKey";
import type { Deal, Seat } from "../deck";
import type { Vulnerability } from "../game";

export type ManifestEntry = {
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

const MANIFEST_PATH = join(process.cwd(), "data", "pbn_manifest.json");

export function loadManifest(): Map<string, ManifestEntry> {
  const map = new Map<string, ManifestEntry>();
  try {
    const json = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
    const sessions: ManifestEntry[] = json.sessions ?? json ?? [];
    for (const s of sessions) {
      if (!s?.pbn_file_name) continue;
      map.set(s.pbn_file_name, s);
      map.set((s.pbn_file_url ?? "").split("/").pop() ?? s.pbn_file_name, s);
    }
  } catch {
    console.warn("[MANIFEST] data/pbn_manifest.json yok; sourceName boş (\"\") kullanılacak.");
  }
  return map;
}

/**
 * Tekrarlanabilir tek nokta deal_key üretimi.
 * Tüm scriptler (import / saveToJson / testDir) BUNU kullanmak zorundadır.
 */
export function historicalDealKeyFor(input: {
  manifest: Map<string, ManifestEntry>;
  fileName: string;
  deal: Deal;
  dealer: Seat | null;
  vulnerability: Vulnerability | null;
  boardNumber: number | null;
}): string {
  const m = input.manifest.get(input.fileName) ?? null;
  return buildDealKey({
    deal: input.deal,
    dealer: input.dealer,
    vulnerability: input.vulnerability,
    sourceName: m?.organiser_name ?? "",
    sourceFile: input.fileName,
    boardNumber: input.boardNumber,
  });
}
