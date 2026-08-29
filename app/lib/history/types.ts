/*
 * =========================================================
 * KASABA HISTORY — ORTAK VERİ MODELİ
 * =========================================================
 *
 * Tüm oyun türlerinin (oyun/çalışma/eğitim masası, takım maçı,
 * turnuva) History kayıtlarını TAŞIYAN tek şema.
 *
 * Tasarım ilkeleri:
 *  - Kayıt yalnızca TAMAMLANMIŞ board'lar için yazılır; "tamamlanmış"
 *    tanımı engine'e parametre olarak verilir (kalıcı gömülü DEĞİL).
 *  - contract/declarer/result/score/play_record alanları skorlama
 *    motoru geldiğinde doldurulmak üzere NULLABLE'dır. Sahte veri
 *    üretilmez; dolmayan alanlar null kalır.
 *  - Takım maçı iki masa ilişkisi otherTableRef ile taşınır.
 *  - Turnuva hiyerarşisi round + boardSequence ile taşınır
 *    (board sayısı turnuva tanımından gelir).
 *  - completionState ileriye dönük ayrılmıştır (şu an yalnızca
 *    tamamlanmış board'lar yazıldığından 'COMPLETED' sabitidir).
 */

export type GameType =
  | "GAME"
  | "TRAINING"
  | "EDUCATION"
  | "TEAM_MATCH"
  | "TOURNAMENT";

export const GAME_TYPES: readonly GameType[] = [
  "GAME",
  "TRAINING",
  "EDUCATION",
  "TEAM_MATCH",
  "TOURNAMENT",
];

/* Masa koltuklarındaki oyuncu adları (boş koltuk null). */
export type TablePlayersSnapshot = {
  north: string | null;
  east: string | null;
  south: string | null;
  west: string | null;
};

export type HistoryRecord = {
  id: string;

  gameType: GameType;

  /* Masanın/bağlamın kimliği. */
  tableId: string;

  boardNumber: number;

  /* Turnuva/takım hiyerarşisi için (kullanılmıyorsa null). */
  round: number | null;
  boardSequence: number | null;

  /* Snapshot verisi. */
  players: TablePlayersSnapshot;
  deal: unknown; /* Deal (app/lib/deck) */
  auction: unknown; /* Bid[] (app/lib/auction) */
  dealer: string | null;
  vulnerability: string | null;

  /* Skorlama motoru geldiğinde doldurulacak nullable alanlar. */
  contract: string | null;
  declarer: string | null;
  result: string | null;
  score: number | null;
  playRecord: unknown | null;

  /* Takım maçı: diğer masanın referansı (kullanılmıyorsa null). */
  otherTableRef: string | null;

  completionState: "COMPLETED";

  completedAt: string;
};
