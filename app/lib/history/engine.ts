/*
 * =========================================================
 * KASABA HISTORY — ENGINE
 * =========================================================
 *
 * Tek motor; tüm masa türleri bu API'yi kullanır:
 *   - recordBoardIfCompleted : tamamlanmış board'u kaydeder (idempotent)
 *   - listTableHistory       : masanın kayıtlarını sıralı döner
 *   - clearForTable          : masanın kayıtlarını temizler
 *                              (gelecekteki SIFIRLA için altyapı;
 *                               sunucu RPC'si ile çalışır)
 *
 * TAMAMLANMIŞLIK TANIMI KALICI DEĞİLDİR:
 *   recordBoardIfCompleted'a isteğe bağlı isCompleted predicate'i
 *   verilir. Bugünkü varsayılan auctionFinished'dir; kart oynama
 *   ve skorlama motoru geldiğinde predicate değiştirilir, şema
 *   (contract/result/score/play_record nullable alanları) aynı kalır.
 *
 * Idempotency: kayıt ID'si deterministiktir
 *   (hist:{gameType}:{tableId}:board:{boardNumber}[:seq]) ve upsert
 *   ile yazılır; aynı board'u iki oyuncunun istemcisi birden kaydetse
 *   tek satır oluşur.
 */

import { supabase } from "../supabase";
import { auctionFinished, type Bid } from "../auction";
import {
  GAME_TYPES,
  type GameType,
  type HistoryRecord,
  type TablePlayersSnapshot,
} from "./types";

export type BoardSnapshotInput = {
  gameType: GameType;
  tableId: string;
  boardNumber: number;

  /* Turnuva/takım için ileriye dönük (kullanılmıyorsa null). */
  round?: number | null;
  boardSequence?: number | null;

  dealer?: string | null;
  vulnerability?: string | null;
  players: TablePlayersSnapshot;
  deal: unknown;
  auction: Bid[];

  /* Takım maçı: diğer masa referansı (kullanılmıyorsa null). */
  otherTableRef?: string | null;
};

/* Bugünkü tamamlanmışlık tanımı: ihale bitti.
   Kart oynama/skorlama geldiğinde bu predicate değişecek. */
export function isBoardCompletedByAuction(
  input: Pick<BoardSnapshotInput, "auction">
): boolean {
  return auctionFinished(input.auction);
}

export type BoardCompletionCheck = (
  input: BoardSnapshotInput
) => boolean;

function buildRecordId(
  input: BoardSnapshotInput
): string {
  const seq =
    input.boardSequence != null
      ? `:seq${input.boardSequence}`
      : "";

  return `hist:${input.gameType}:${input.tableId}:board:${input.boardNumber}${seq}`;
}

export async function recordBoardIfCompleted(
  input: BoardSnapshotInput,
  isCompleted: BoardCompletionCheck = isBoardCompletedByAuction
): Promise<void> {
  if (!isCompleted(input)) {
    return;
  }

  if (
    !GAME_TYPES.includes(input.gameType)
  ) {
    return;
  }

  const row = {
    id: buildRecordId(input),
    game_type: input.gameType,
    table_id: input.tableId,
    board_number: input.boardNumber,
    round: input.round ?? null,
    board_sequence: input.boardSequence ?? null,
    players: input.players,
    deal: input.deal,
    auction: input.auction,
    dealer: input.dealer ?? null,
    vulnerability: input.vulnerability ?? null,
    /* Skorlama motoru gelince doldurulacak; şimdilik null. */
    contract: null,
    declarer: null,
    result: null,
    score: null,
    play_record: null,
    other_table_ref: input.otherTableRef ?? null,
    completion_state: "COMPLETED" as const,
  };

  const { error } = await supabase
    .from("history_records")
    .upsert(row, { onConflict: "id" });

  if (error) {
    console.error(
      "[HISTORY] Board kaydı yazılamadı:",
      error.message
    );
  }
}

function rowToRecord(
  row: Record<string, unknown>
): HistoryRecord {
  return {
    id: String(row.id),
    gameType: row.game_type as GameType,
    tableId: String(row.table_id),
    boardNumber: Number(row.board_number),
    round: (row.round as number | null) ?? null,
    boardSequence:
      (row.board_sequence as number | null) ?? null,
    players: row.players as TablePlayersSnapshot,
    deal: row.deal,
    auction: row.auction,
    dealer: (row.dealer as string | null) ?? null,
    vulnerability:
      (row.vulnerability as string | null) ?? null,
    contract: (row.contract as string | null) ?? null,
    declarer: (row.declarer as string | null) ?? null,
    result: (row.result as string | null) ?? null,
    score: (row.score as number | null) ?? null,
    playRecord: (row.play_record as unknown | null) ?? null,
    otherTableRef:
      (row.other_table_ref as string | null) ?? null,
    completionState: "COMPLETED",
    completedAt: String(row.completed_at ?? ""),
  };
}

export async function listTableHistory(
  tableId: string
): Promise<HistoryRecord[]> {
  const { data, error } = await supabase
    .from("history_records")
    .select("*")
    .eq("table_id", tableId)
    .order("board_number", { ascending: true });

  if (error) {
    console.error(
      "[HISTORY] Geçmiş okunamadı:",
      error.message
    );
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[]).map(
    rowToRecord
  );
}

/*
 * Gelecekteki SIFIRLA / yaşam döngüsü temizliği için altyapı.
 * Silme client'tan yapılmaz; sunucudaki clear_table_history
 * security definer RPC'si (0008) çalıştırılır.
 */
export async function clearForTable(
  tableId: string
): Promise<boolean> {
  const { error } = await supabase.rpc(
    "clear_table_history",
    { p_table_id: tableId }
  );

  if (error) {
    console.error(
      "[HISTORY] Geçmiş temizlenemedi:",
      error.message
    );
    return false;
  }

  return true;
}
