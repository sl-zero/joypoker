import type { Rank } from "../deckCore";
import type { GameCard } from "../gameCard";

const STRAIGHT_ORDER: Rank[] = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

/** 3 最小 … 2 最大；王更大 */
export function shangyouRankPower(c: GameCard): number {
  if (c.kind === "joker") return c.joker === "SJ" ? 16 : 17;
  const o: Record<Rank, number> = {
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
    "2": 15,
  };
  return o[c.rank];
}

export type ShangyouComboType =
  | "single"
  | "pair"
  | "triple"
  | "straight"
  | "bomb"
  | "jokerBomb";

export interface ShangyouCombo {
  type: ShangyouComboType;
  primaryPower: number;
  len?: number;
  bombLen?: number;
  cards: GameCard[];
}

function countRanks(cards: GameCard[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of cards) {
    const k = c.kind === "joker" ? `J${c.joker}` : c.rank;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/** 返回顺子「比较用顶张」power；非法 null */
function straightTopPower(std: Extract<GameCard, { kind: "standard" }>[]): number | null {
  if (std.length < 5) return null;
  const ranks = std.map((c) => c.rank);
  const set = new Set(ranks);
  if (set.size !== ranks.length) return null;

  // A-2-3-4-5（A 当小）
  if (
    set.size === 5 &&
    set.has("A") &&
    set.has("2") &&
    set.has("3") &&
    set.has("4") &&
    set.has("5")
  ) {
    return shangyouRankPower({ kind: "standard", suit: "S", rank: "5", id: "" });
  }
  if (set.has("2")) return null;

  const idxs = ranks.map((r) => STRAIGHT_ORDER.indexOf(r));
  if (idxs.some((i) => i < 0)) return null;
  const sorted = [...idxs].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return null;
  }
  const topRank = STRAIGHT_ORDER[Math.max(...idxs)];
  return shangyouRankPower({ kind: "standard", suit: "S", rank: topRank, id: "" });
}

/** 解析一手牌型；非法返回 null */
export function classifyShangyouPlay(
  cards: GameCard[],
  opts: { allowBomb: boolean; allowJokerBomb: boolean },
): ShangyouCombo | null {
  if (cards.length === 0) return null;
  const n = cards.length;

  const jokers = cards.filter((c) => c.kind === "joker");
  if (jokers.length === n && n === 4 && opts.allowJokerBomb) {
    return { type: "jokerBomb", primaryPower: 99, bombLen: 4, cards };
  }

  const std = cards.filter((c): c is Extract<GameCard, { kind: "standard" }> => c.kind === "standard");
  if (std.length !== n) {
    if (n === 1 && cards[0].kind === "joker") {
      return {
        type: "single",
        primaryPower: shangyouRankPower(cards[0]),
        cards,
      };
    }
    return null;
  }

  const m = countRanks(cards);
  const entries = [...m.entries()].sort((a, b) => b[1] - a[1]);

  if (entries.length === 1 && entries[0][1] >= 4) {
    if (!opts.allowBomb) return null;
    const rank = entries[0][0] as Rank;
    const bombLen = entries[0][1];
    return {
      type: "bomb",
      primaryPower: shangyouRankPower({ kind: "standard", suit: "S", rank, id: "" }),
      bombLen,
      cards,
    };
  }

  if (n === 1) {
    return { type: "single", primaryPower: shangyouRankPower(cards[0]), cards };
  }

  if (n === 2) {
    if (entries.length === 1 && entries[0][1] === 2) {
      const r = entries[0][0] as Rank;
      return {
        type: "pair",
        primaryPower: shangyouRankPower({ kind: "standard", suit: "S", rank: r, id: "" }),
        cards,
      };
    }
    return null;
  }

  if (n === 3) {
    if (entries.length === 1 && entries[0][1] === 3) {
      const r = entries[0][0] as Rank;
      return {
        type: "triple",
        primaryPower: shangyouRankPower({ kind: "standard", suit: "S", rank: r, id: "" }),
        cards,
      };
    }
    return null;
  }

  if (n >= 5) {
    const top = straightTopPower(std);
    if (top === null) return null;
    return { type: "straight", primaryPower: top, len: n, cards };
  }

  return null;
}

function bombTier(c: ShangyouCombo): number {
  if (c.type === "jokerBomb") return 1_000_000 + (c.bombLen ?? 4);
  if (c.type === "bomb") return 100_000 + (c.bombLen ?? 4) * 1000 + c.primaryPower;
  return c.primaryPower + (c.len ?? 0) * 0.01;
}

/** a 是否比 b 大（炸弹管非炸；同型比 primary） */
export function shangyouComboBeats(a: ShangyouCombo, b: ShangyouCombo): boolean {
  const aBomb = a.type === "bomb" || a.type === "jokerBomb";
  const bBomb = b.type === "bomb" || b.type === "jokerBomb";
  if (aBomb && !bBomb) return true;
  if (!aBomb && bBomb) return false;
  if (aBomb && bBomb) return bombTier(a) > bombTier(b);
  if (a.type !== b.type || (a.len ?? 0) !== (b.len ?? 0)) return false;
  return a.primaryPower > b.primaryPower;
}

/** 跟牌是否合法 */
export function shangyouFollowOk(
  table: ShangyouCombo | null,
  play: ShangyouCombo,
  mustFollowPattern: boolean,
): boolean {
  if (!table) return true;
  const tBomb = table.type === "bomb" || table.type === "jokerBomb";
  const pBomb = play.type === "bomb" || play.type === "jokerBomb";
  if (pBomb && !tBomb) return true;
  if (!pBomb && tBomb) return false;
  if (pBomb && tBomb) return shangyouComboBeats(play, table);
  if (play.type !== table.type || (play.len ?? 0) !== (table.len ?? 0)) return false;
  if (mustFollowPattern) return play.primaryPower > table.primaryPower;
  return play.primaryPower < table.primaryPower;
}
