/* =========================================================
 * KASABA — REALBRIDGE FULL PBN PARSER (historical/pbn.ts)
 * =========================================================
 * RealBridge kamuya açık "_full.pbn" sonuç dosyalarını okur, her
 * board'u KASABA'nın tarihî deal modeline normalize eder.
 * Kaynakta olmayan veri UYDURULMAZ; alanlar null kalır.
 */

import type { Card, Deal, Seat, Suit } from "../deck";
import type { Vulnerability } from "../game";
import type { HistoricalDealResult, HistoricalAuctionCall } from "./model";
import { normalizeDealer, normalizeVulnerability, SEATS, SUITS } from "./validate";

export type PbnParsedBlock = {
  raw: string[];
  tags: Record<string, string>;
  callLines: string[];
  playLines: string[];
  rbData: string[];
  rbImport: boolean;
};

export type PbnParsedBoard = {
  block: PbnParsedBlock;
  event: string | null;
  site: string | null;
  date: string | null;
  boardNumber: number | null;
  tournamentName: string | null;
  session: string | null;
  players: { north: string | null; east: string | null; south: string | null; west: string | null };
  playerIds: { north: string | null; east: string | null; south: string | null; west: string | null };
  dealer: Seat | null;
  vulnerability: Vulnerability | null;
  deal: Deal | null;
  dealRaw: string | null;
  scoring: string | null;
  competition: string | null;
  contract: string | null;
  contractParsed: {
    level: number | null;
    strain: string | null;
    doubled: boolean;
    redoubled: boolean;
  } | null;
  declarer: Seat | null;
  result: string | null;
  tricks: number | null;
  nsScore: number | null;
  score: string | null;
  scoreImp: string | null;
  scorePercentage: string | null;
  table: number | null;
  round: number | null;
  room: string | null;
  homeTeam: string | null;
  visitTeam: string | null;
  auctionStart: Seat | null;
  auction: HistoricalAuctionCall[] | null;
  auctionRaw: string | null;
  play: string[][] | null;
  playRaw: string | null;
  openingLead: string | null;
  doubleDummyTricks: string | null;
  optimumScore: string | null;
};

const STRAIN = new Set(["NT", "S", "H", "D", "C"]);

function emptyBlock(): PbnParsedBlock {
  return { raw: [], tags: {}, callLines: [], playLines: [], rbData: [], rbImport: false };
}

/* [Tag "value"] -> değer */
function parseTagLine(line: string): [string, string] | null {
  const m = /^\[([A-Za-z]+)\s+"(.*)"\]\s*$/.exec(line.trim()); if (!m) return null;
  return [m[1], m[2]];
}
/* ---------------- Deal parsing (NESW hand order + SHDC groups) ---------------- */

const RANK_FROM_PBN: Record<string, Card["rank"]> = {
  A: "A",
  K: "K",
  Q: "Q",
  J: "J",
  T: "10",
  "9": "9",
  "8": "8",
  "7": "7",
  "6": "6",
  "5": "5",
  "4": "4",
  "3": "3",
  "2": "2",
};

export function parseDealValue(raw: string | null | undefined): Deal | null {
  if (!raw) return null;
  const tokens = raw
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => t.replace(/^[NSEW]:/, ""));
  if (tokens.length !== 4) return null;

  const hands: Card[][] = [];
  for (const token of tokens) {
    const groups = token.split(".");
    const hand: Card[] = [];
    for (let g = 0; g < 4; g++) {
      const suit = SUITS[g] as Suit;
      const group = groups[g] ?? "";
      for (const ch of group) {
        const rank = RANK_FROM_PBN[ch];
        if (rank) hand.push({ suit, rank });
      }
    }
    hands.push(hand);
  }
  return { north: hands[0], east: hands[1], south: hands[2], west: hands[3] };
}

/* ---------------- Contract ---------------- */

export function parseContract(raw: string | null | undefined): {
  raw: string;
  level: number | null;
  strain: string | null;
  doubled: boolean;
  redoubled: boolean;
  played: boolean;
} | null {
  if (raw == null) return null;
  let s = raw.trim();
  if (s.length === 0) return null;
  const upper = s.toUpperCase();

  if (/^(PASS|PAS|AP|-)$/.test(upper)) {
    return { raw: s, level: null, strain: null, doubled: false, redoubled: false, played: false };
  }

  let doubled = false;
  let redoubled = false;
  if (upper.endsWith("XX")) {
    redoubled = true;
    s = s.slice(0, -2);
  } else if (upper.endsWith("X")) {
    doubled = true;
    s = s.slice(0, -1);
  }

  const m = /^([1-7])\s*([NSEWCDH]+)/i.exec(s.trim());
  if (!m) return null;
  const level = Number(m[1]);
  let strainRaw = m[2].toUpperCase();
  let strain: string;
  if (strainRaw.startsWith("NT")) strain = "NT";
  else if (STRAIN.has(strainRaw)) strain = strainRaw;
  else return null;

  return { raw, level, strain, doubled, redoubled, played: true };
}

/* ---------------- Auction ---------------- */

function parseCallToken(tok: string): HistoricalAuctionCall | null {
  const t = tok.trim();
  if (!t) return null;
  const base = t.replace(/[!*\u2605]+$/g, "").trim().toUpperCase();
  const seat = "N" as Seat;

  if (base === "PASS" || base === "P" || base === "PAS") {
    return { seat, type: "PASS", raw: tok };
  }
  if (base === "X" || base === "DOUBLE" || base === "DBL") {
    return { seat, type: "DOUBLE", raw: tok };
  }
  if (base === "XX" || base === "REDOUBLE" || base === "RDBL") {
    return { seat, type: "REDOUBLE", raw: tok };
  }

  const m = /^([1-7])\s*(NT|[CDHSN])/.exec(base);
  if (m) {
    let strainRaw = m[2];
    let strain: HistoricalAuctionCall["strain"];
    if (strainRaw === "NT" || strainRaw === "N") strain = "NT";
    else strain = strainRaw as HistoricalAuctionCall["strain"];
    return { seat, type: "BID", level: Number(m[1]), strain, raw: tok };
  }
  return null;
}

function parseAuction(
  callLines: string[],
  start: Seat | null
): HistoricalAuctionCall[] | null {
  const tokens: string[] = [];
  for (const line of callLines) {
    for (const t of line.split(/\s+/)) {
      if (t.length) tokens.push(t);
    }
  }
  if (tokens.length === 0) return null;

  const calls: HistoricalAuctionCall[] = [];
  let seatIdx = SEATS.indexOf(start ?? "N");
  if (seatIdx < 0) seatIdx = 0;
  for (const tok of tokens) {
    const call = parseCallToken(tok);
    if (!call) continue;
    call.seat = SEATS[seatIdx % 4];
    calls.push(call);
    seatIdx += 1;
  }
  return calls;
}

/* ---------------- Play ---------------- */

function parsePlayLines(playLines: string[]): string[][] {
  const tricks: string[][] = [];
  for (const line of playLines) {
    const cards = line
      .split(/\s+/)
      .filter((t) => /^[SHCD][AKQJT2-9]$/.test(t));
    if (cards.length) tricks.push(cards);
  }
  return tricks;
}

function parseInt10(v: string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(v.trim());
  return Number.isFinite(n) ? n : null;
}

function toSeat(v: string | null | undefined): Seat | null {
  const s = (v ?? "").trim().toUpperCase();
  return SEATS.includes(s as Seat) ? (s as Seat) : null;
}

function scoreNs(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = /NS\s*([+-]?\d+)/.exec(raw);
  if (m) return Number(m[1]);
  const m2 = /^([+-]?\d+)$/.exec(raw.trim());
  return m2 ? Number(m2[1]) : null;
}

function splitPlayer(rawName: string): [string | null, string | null] {
  const hashIdx = rawName.indexOf("#");
  if (hashIdx === -1) return [rawName.trim(), null];
  const name = rawName.slice(0, hashIdx).trim();
  const id = rawName.slice(hashIdx + 1).trim();
  return [name || null, id || null];
}

/* =========================================================
 * DOSYA -> BLOKLAR
 * ========================================================= */

export function splitBlocks(lines: string[]): PbnParsedBlock[] {
  const blocks: PbnParsedBlock[] = [];
  let current = emptyBlock();

  const flush = () => {
    if (current.raw.length === 0) return;
    blocks.push(current);
    current = emptyBlock();
  };

  for (const line of lines) {
    if (line.startsWith("[Event ")) flush();

    if (line.startsWith("% ")) {
      current.raw.push(line);
      if (/RBDATA/.test(line)) current.rbData.push(line);
      if (/RBIMPORT/.test(line)) current.rbImport = true;
      continue;
    }

    const parsed = parseTagLine(line);
    if (parsed) {
      if (current.raw.length === 0) current.raw.push(line);
      current.tags[parsed[0]] = parsed[1];
      continue;
    }

    if (/^[1-7](NT|[CDHS])\b|\bPASS\b|^Pass\b|^X\b|^XX\b|^P\b/i.test(line.trim())) {
      current.callLines.push(line);
      continue;
    }

    if (/^[SHCD][AKQJT2-9]\b/.test(line.trim())) {
      current.playLines.push(line);
      continue;
    }

    current.raw.push(line);
  }
  flush();
  return blocks;
}

const SEAT_TO_TAG: Record<Seat, string> = {
  N: "North",
  E: "East",
  S: "South",
  W: "West",
};

export function parseBlock(block: PbnParsedBlock): PbnParsedBoard {
  const t = block.tags;

  const players: PbnParsedBoard["players"] = {
    north: null,
    east: null,
    south: null,
    west: null,
  };
  const playerIds: PbnParsedBoard["playerIds"] = {
    north: null,
    east: null,
    south: null,
    west: null,
  };

  for (const seat of SEATS) {
    const tagName = SEAT_TO_TAG[seat];
    const rawName = t[tagName];
    if (rawName) {
      const [name, id] = splitPlayer(rawName);

      const playerKey =
        seat === "N"
          ? "north"
          : seat === "E"
            ? "east"
            : seat === "S"
              ? "south"
              : "west";

      players[playerKey] = name;
      playerIds[playerKey] = id;
    }
  }

  const dealRaw = t["Deal"] ?? null;
  const deal = parseDealValue(dealRaw);
  const contractParsed = parseContract(t["Contract"] ?? null);
  const auctionStart = toSeat(t["Auction"]);
  const auction = parseAuction(block.callLines, auctionStart);

  const tricksRaw = t["Result"] ?? null;
  const tricks = parseInt10(tricksRaw);

  const play = parsePlayLines(block.playLines);
  const openingLead =
    play && play.length > 0 && play[0].length > 0 ? play[0][0] : null;

  return {
    block,
    event: t["Event"] ?? null,
    site: t["Site"] ?? null,
    date: t["Date"] ?? null,
    boardNumber: parseInt10(t["Board"]),
    tournamentName: t["Event"] ?? null,
    session: t["Event"] ?? null,

    players,
    playerIds,

    dealer: normalizeDealer(t["Dealer"]),
    vulnerability: normalizeVulnerability(t["Vulnerable"]),
    deal,
    dealRaw,

    scoring: t["Scoring"] ?? null,
    competition: t["Competition"] ?? null,

    contract: t["Contract"] ?? null,
    contractParsed,
    declarer: toSeat(t["Declarer"]),
    result: tricksRaw,
    tricks,
    nsScore: scoreNs(t["Score"]),
    score: t["Score"] ?? null,
    scoreImp: t["ScoreIMP"] ?? null,
    scorePercentage: t["ScorePercentage"] ?? null,

    table: parseInt10(t["Table"]),
    round: parseInt10(t["Round"]),
    room: t["Room"] ?? null,
    homeTeam: t["HomeTeam"] ?? t["Home"] ?? t["HomeSide"] ?? null,
    visitTeam: t["VisitTeam"] ?? t["AwayTeam"] ?? t["Away"] ?? null,

    auctionStart,
    auction,
    auctionRaw: block.callLines.join(" ").trim(),

    play,
    playRaw: block.playLines.join(" ").trim(),
    openingLead,

    doubleDummyTricks: t["DoubleDummyTricks"] ?? null,
    optimumScore: t["OptimumScore"] ?? null,
  };
}

export function parsedToResult(b: PbnParsedBoard): HistoricalDealResult {
  return {
    tableNumber: b.table,
    round: b.round,
    room: b.room,
    homeTeam: b.homeTeam,
    visitTeam: b.visitTeam,
    position: b.room ?? null,
    players: {
      north: b.players.north,
      east: b.players.east,
      south: b.players.south,
      west: b.players.west,
    },

    auction: b.auction,
    auctionRaw: b.auctionRaw,
    hasAuction: (b.auction?.length ?? 0) > 0,

    contract: b.contract,
    level: b.contractParsed?.level ?? null,
    strain: b.contractParsed?.strain ?? null,
    doubled: b.contractParsed?.doubled ?? false,
    redoubled: b.contractParsed?.redoubled ?? false,

    declarer: b.declarer,
    result: b.result,
    tricks: b.tricks,
    tricksDeclarer: b.tricks,
    nsScore: b.nsScore,
    score: b.score,
    scoreImp: b.scoreImp,
    scorePercentage: b.scorePercentage,

    openingLead: b.openingLead,
    hasPlay: (b.play?.length ?? 0) > 0,
    play: b.play,
    playRaw: b.playRaw,

    doubleDummyTricks: b.doubleDummyTricks,
    optimumScore: b.optimumScore,
  };
}