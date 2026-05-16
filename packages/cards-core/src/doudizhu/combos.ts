import type { Rank } from "../deckCore";
import type { GameCard } from "../gameCard";

/** 斗地主出牌大小：3 最小 … 2 … 小王 … 大王 */
export function doudizhuRankPower(c: GameCard): number {
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

const STRAIGHT_ORDER: Rank[] = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

export type DoudizhuComboType =
  | "pass"
  | "rocket"
  | "bomb"
  | "single"
  | "pair"
  | "triple"
  | "triple_single"
  | "triple_pair"
  | "straight"
  | "straight_pairs"
  | "plane"
  | "four_two_singles"
  | "four_two_pairs";

export interface DoudizhuCombo {
  type: DoudizhuComboType;
  primaryPower: number;
  len?: number;
  bombLen?: number;
  bodyRanks?: Rank[];
  cards: GameCard[];
}

function countStd(cards: GameCard[]): Map<Rank, number> {
  const m = new Map<Rank, number>();
  for (const c of cards) {
    if (c.kind === "standard") {
      m.set(c.rank, (m.get(c.rank) ?? 0) + 1);
    }
  }
  return m;
}

function straightTopPower(ranks: Rank[], minLen: number): number | null {
  if (ranks.length < minLen) return null;
  if (ranks.some((r) => r === "2")) return null;
  const set = new Set(ranks);
  if (set.size !== ranks.length) return null;
  const idxs = ranks.map((r) => STRAIGHT_ORDER.indexOf(r));
  if (idxs.some((i) => i < 0)) return null;
  const sorted = [...idxs].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return null;
  }
  const topRank = STRAIGHT_ORDER[Math.max(...idxs)];
  return doudizhuRankPower({ kind: "standard", suit: "S", rank: topRank, id: "" });
}

export function classifyDoudizhuPlay(
  cards: GameCard[],
  opts: {
    straightMinLength: number;
    allowFourWithTwoSingles: boolean;
    allowFourWithTwoPairs: boolean;
    allowLoosePlaneAttachments: boolean;
  },
): DoudizhuCombo | null {
  if (cards.length === 0) return null;
  const jokers = cards.filter((c) => c.kind === "joker");
  const std = cards.filter((c): c is Extract<GameCard, { kind: "standard" }> => c.kind === "standard");

  // 火箭：两副各 2 王共 4 张；一副 2 王
  if (jokers.length === cards.length) {
    if (jokers.length === 2 && jokers.some((j) => j.joker === "SJ") && jokers.some((j) => j.joker === "BJ")) {
      return { type: "rocket", primaryPower: 100, cards };
    }
    if (jokers.length === 4 && jokers.filter((j) => j.joker === "SJ").length === 2) {
      return { type: "rocket", primaryPower: 100, cards };
    }
  }

  // 单张王（大王或小王）
  if (jokers.length === 1 && cards.length === 1) {
    return { type: "single", primaryPower: doudizhuRankPower(jokers[0]), cards };
  }

  if (jokers.length > 0 && jokers.length !== cards.length) {
    // 王不能与非王组合（除火箭和单张王）
    return null;
  }

  const m = countStd(cards);
  const byCount = [...m.entries()].sort((a, b) => b[1] - a[1]);

  // 炸弹 4+
  if (byCount.length === 1 && byCount[0][1] >= 4) {
    const r = byCount[0][0];
    return {
      type: "bomb",
      primaryPower: doudizhuRankPower({ kind: "standard", suit: "S", rank: r, id: "" }),
      bombLen: byCount[0][1],
      cards,
    };
  }

  const n = cards.length;
  if (n === 1 && std.length === 1) {
    return { type: "single", primaryPower: doudizhuRankPower(std[0]), cards };
  }
  if (n === 2 && byCount.length === 1 && byCount[0][1] === 2) {
    const r = byCount[0][0];
    return {
      type: "pair",
      primaryPower: doudizhuRankPower({ kind: "standard", suit: "S", rank: r, id: "" }),
      cards,
    };
  }
  if (n === 3 && byCount.length === 1 && byCount[0][1] === 3) {
    const r = byCount[0][0];
    return {
      type: "triple",
      primaryPower: doudizhuRankPower({ kind: "standard", suit: "S", rank: r, id: "" }),
      cards,
    };
  }

  // 三带一
  if (n === 4 && byCount.length === 2) {
    const triple = byCount.find(([, c]) => c === 3);
    const single = byCount.find(([, c]) => c === 1);
    if (triple && single) {
      return {
        type: "triple_single",
        primaryPower: doudizhuRankPower({ kind: "standard", suit: "S", rank: triple[0], id: "" }),
        cards,
      };
    }
  }
  // 三带二（一对）
  if (n === 5 && byCount.length === 2) {
    const triple = byCount.find(([, c]) => c === 3);
    const pair = byCount.find(([, c]) => c === 2);
    if (triple && pair) {
      return {
        type: "triple_pair",
        primaryPower: doudizhuRankPower({ kind: "standard", suit: "S", rank: triple[0], id: "" }),
        cards,
      };
    }
  }

  // 顺子
  if (n >= opts.straightMinLength) {
    const ranks = std.map((c) => c.rank);
    const top = straightTopPower(ranks, opts.straightMinLength);
    if (top !== null && ranks.length === n) {
      return { type: "straight", primaryPower: top, len: n, cards };
    }
  }

  // 连对：至少 3 连对
  if (n >= 6 && n % 2 === 0) {
    const pairRanks = [...m.entries()].filter(([, c]) => c === 2).map(([r]) => r);
    if (pairRanks.length === n / 2) {
      const top = straightTopPower(pairRanks, 3);
      if (top !== null) {
        return { type: "straight_pairs", primaryPower: top, len: pairRanks.length, cards };
      }
    }
  }

  // 飞机（简化）：m 组连续三张 + m 单/对子；严格模式附件数匹配
  // 实现从略：allowLoosePlaneAttachments 为 false 时要求每组带齐

  // 四带二
  if (n === 6 && opts.allowFourWithTwoSingles) {
    const four = byCount.find(([, c]) => c === 4);
    const singles = byCount.filter(([, c]) => c === 1);
    if (four && singles.length === 2) {
      return {
        type: "four_two_singles",
        primaryPower: doudizhuRankPower({ kind: "standard", suit: "S", rank: four[0], id: "" }),
        cards,
      };
    }
  }
  if (n === 8 && opts.allowFourWithTwoPairs) {
    const four = byCount.find(([, c]) => c === 4);
    const pairs = byCount.filter(([, c]) => c === 2);
    if (four && pairs.length === 2) {
      return {
        type: "four_two_pairs",
        primaryPower: doudizhuRankPower({ kind: "standard", suit: "S", rank: four[0], id: "" }),
        cards,
      };
    }
  }

  void opts.allowLoosePlaneAttachments;
  return null;
}

function comboTier(c: DoudizhuCombo): number {
  if (c.type === "rocket") return 1e9;
  if (c.type === "bomb") return 1e8 + (c.bombLen ?? 4) * 1e4 + c.primaryPower;
  const typeW: Record<string, number> = {
    single: 1,
    pair: 2,
    triple: 3,
    triple_single: 4,
    triple_pair: 5,
    straight: 6,
    straight_pairs: 7,
    plane: 8,
    four_two_singles: 9,
    four_two_pairs: 10,
  };
  return (typeW[c.type] ?? 0) * 1e6 + c.primaryPower + (c.len ?? 0) * 0.01;
}

export function doudizhuComboBeats(a: DoudizhuCombo, b: DoudizhuCombo): boolean {
  if (a.type === "rocket") return b.type !== "rocket";
  if (b.type === "rocket") return false;
  if (a.type === "bomb") {
    if (b.type === "bomb") return comboTier(a) > comboTier(b);
    return true;
  }
  if (b.type === "bomb") return false;
  if (a.type !== b.type || (a.len ?? 0) !== (b.len ?? 0)) return false;
  return a.primaryPower > b.primaryPower;
}

export function doudizhuFollowOk(table: DoudizhuCombo | null, play: DoudizhuCombo): boolean {
  if (!table) return true;
  return doudizhuComboBeats(play, table);
}
