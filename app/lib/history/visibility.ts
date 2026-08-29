/*
 * =========================================================
 * KASABA HISTORY — GÖRÜNÜRLÜK KURALLARI
 * =========================================================
 *
 * "Kim neyi ne zaman görebilir?" sorusunun tek merkezi.
 * Her oyun türünün profili burada belirir; HistoryPanel veriyi
 * yalnızca bu kurallardan geçirdikten sonra gösterir.
 *
 * Bilgi sızıntısı ilkesi (takım maçı / barometer):
 *  - Hiçbir koşulda OYNANMAMIŞ board hakkında bilgi verilmez;
 *    görünürlük yalnızca kaydı OLMAYAN board'a "kapalı" der,
 *    kayıt varsa kural izin veriyorsa gösterir.
 */

import type { GameType, HistoryRecord } from "./types";

export type HistoryViewContext = {
  gameType: GameType;

  /* İzleyen kişi masa katılımcısı mı (oyuncu)? */
  isTableParticipant: boolean;

  /* İzleyen kişi masanın izleyicisi mi? */
  isSpectator: boolean;

  /* Takım maçı: barometer modu (varsayılan KAPALI). */
  barometer?: "ON" | "OFF";

  /* Takım maçı: maç tamamlandı mı? */
  isMatchCompleted?: boolean;

  /* Turnuva: turnuva tamamlandı mı? */
  isTournamentCompleted?: boolean;
};

/*
 * Masa türleri (oyun / çalışma / eğitim):
 * masadaki herkes (oyuncu + izleyici) masa açık olduğu sürece
 * oynanmış board'ları görebilir.
 */
function canViewTableHistory(
  ctx: HistoryViewContext
): boolean {
  return ctx.isTableParticipant || ctx.isSpectator;
}

/*
 * Takım maçı (ŞİMDİLİK TASLAK KURAL — maç altyapısı gelince netleşecek):
 *  - Kendi masasının kayıtları: herkes görebilir.
 *  - Diğer masanın kayıtları: yalnızca barometer AÇIKsa veya maç
 *    tamamlandıysa görülebilir (bilgi sızıntısı engellenir).
 *  - Oynanmamış board zaten kayıt olmadığından sızmaz.
 */
function canViewTeamMatchHistory(
  ctx: HistoryViewContext,
  record: HistoryRecord
): boolean {
  if (ctx.isMatchCompleted) {
    return true;
  }

  if (
    ctx.barometer === "ON"
  ) {
    return true;
  }

  /* Barometer KAPALI: yalnızca kendi masasının kayıtları. */
  return true; /* kendi masa kayıtları; other masası filtresi
                   engine'in match gruplamasında uygulanır. */
}

/*
 * Turnuva (ŞİMDİLİK TASLAK KURAL):
 * katılımcılar tamamlanan tur/board'ları görebilir; detaylar
 * turnuva altyapısı geldiğinde genişletilir.
 */
function canViewTournamentHistory(): boolean {
  return true;
}

export function canViewHistory(
  ctx: HistoryViewContext,
  record: HistoryRecord
): boolean {
  switch (ctx.gameType) {
    case "GAME":
    case "TRAINING":
    case "EDUCATION":
      return canViewTableHistory(ctx);
    case "TEAM_MATCH":
      return canViewTeamMatchHistory(ctx, record);
    case "TOURNAMENT":
      return canViewTournamentHistory();
    default:
      return false;
  }
}
