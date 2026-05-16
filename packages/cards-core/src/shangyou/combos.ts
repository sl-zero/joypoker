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
  | "triple_single"
  | "straight"
  | "straight_pairs"
  | "plane"
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
  opts: { allowBomb: boolean; allowJokerBomb: boolean; allowTripleSingle: boolean },
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

  // 炸弹（4+ 同点）
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

  // 单张
  if (n === 1) {
    return { type: "single", primaryPower: shangyouRankPower(cards[0]), cards };
  }

  // 对子
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

  // 三张
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

  // 三带一
  if (n === 4 && opts.allowTripleSingle) {
    const triple = entries.find(([, c]) => c === 3);
    const single = entries.find(([, c]) => c === 1);
    if (triple && single) {
      return {
        type: "triple_single",
        primaryPower: shangyouRankPower({ kind: "standard", suit: "S", rank: triple[0] as Rank, id: "" }),
        cards,
      };
    }
  }

  // 连对：至少 3 连对，≥6 张且偶数
  if (n >= 6 && n % 2 === 0) {
    const pairRanks = entries.filter(([, c]) => c === 2).map(([r]) => r as Rank);
    if (pairRanks.length === n / 2) {
      const idxs = pairRanks.map((r) => STRAIGHT_ORDER.indexOf(r));
      if (!idxs.includes(-1) && !pairRanks.includes("2" as Rank)) {
        const sorted = [...idxs].sort((a, b) => a - b);
        let isConsecutive = true;
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i] !== sorted[i - 1] + 1) { isConsecutive = false; break; }
        }
        if (isConsecutive && sorted.length >= 3) {
          const topRank = STRAIGHT_ORDER[sorted[sorted.length - 1]];
          return {
            type: "straight_pairs",
            primaryPower: shangyouRankPower({ kind: "standard", suit: "S", rank: topRank, id: "" }),
            len: pairRanks.length,
            cards,
          };
        }
      }
    }
  }

  // 顺子（≥5 张单顺）
  if (n >= 5) {
    const top = straightTopPower(std);
    if (top !== null) {
      return { type: "straight", primaryPower: top, len: n, cards };
    }
  }

  // 飞机：≥2 组连续三张 + 附件（严格模式匹配）
  if (n >= 6) {
    const triples = entries.filter(([, c]) => c >= 3).map(([r]) => r as Rank);
    if (triples.length >= 2) {
      const idxs = triples.map((r) => STRAIGHT_ORDER.indexOf(r));
      if (!idxs.includes(-1)) {
        const sorted = [...idxs].sort((a, b) => a - b);
        let bestEnd = -1;
        let bestStart = -1;
        let runStart = 0;
        for (let i = 1; i <= sorted.length; i++) {
          if (i < sorted.length && sorted[i] === sorted[i - 1] + 1) continue;
          if (i - runStart >= 2 && i - runStart > bestEnd - bestStart) {
            bestStart = runStart;
            bestEnd = i;
          }
          runStart = i;
        }
        if (bestEnd - bestStart >= 2) {
          const planeRanks = sorted.slice(bestStart, bestEnd).map((i) => STRAIGHT_ORDER[i]);
          const planeLen = planeRanks.length;
          const planeCards = std.filter((c) => planeRanks.includes(c.rank as Rank));
          const attachments = std.filter((c) => !planeRanks.includes(c.rank as Rank));
          const am = countRanks(attachments);
          const aEntries = [...am.entries()];
          const singleAttach = aEntries.filter(([, c]) => c === 1);
          const pairAttach = aEntries.filter(([, c]) => c === 2);

          // 飞机带单：每组三张带 1 张单牌
          if (singleAttach.length === planeLen && attachments.length === planeLen) {
            const topRank = planeRanks[planeRanks.length - 1];
            return {
              type: "plane",
              primaryPower: shangyouRankPower({ kind: "standard", suit: "S", rank: topRank, id: "" }),
              len: planeLen,
              cards,
            };
          }
          // 飞机带对：每组三张带 1 个对子
          if (pairAttach.length === planeLen && attachments.length === planeLen * 2) {
            const topRank = planeRanks[planeRanks.length - 1];
            return {
              type: "plane",
              primaryPower: shangyouRankPower({ kind: "standard", suit: "S", rank: topRank, id: "" }),
              len: planeLen,
              cards,
            };
          }
          // 飞机不带（三张的连续组即纯飞机）
          if (attachments.length === 0 && planeCards.length === n) {
            const topRank = planeRanks[planeRanks.length - 1];
            return {
              type: "plane",
              primaryPower: shangyouRankPower({ kind: "standard", suit: "S", rank: topRank, id: "" }),
              len: planeLen,
              cards,
            };
          }
        }
      }
    }
  }

  return null;
}

function bombTier(c: ShangyouCombo): number {
  if (c.type === "jokerBomb") return 1_000_000 + (c.bombLen ?? 4);
  if (c.type === "bomb") return 100_000 + (c.bombLen ?? 4) * 1000 + c.primaryPower;
  return c.primaryPower + (c.len ?? 0) * 0.01;
}

function isBomb(t: ShangyouComboType): boolean {
  return t === "bomb" || t === "jokerBomb";
}

/** a 是否比 b 大（炸弹管非炸；同型比 primary） */
export function shangyouComboBeats(a: ShangyouCombo, b: ShangyouCombo): boolean {
  const aB = isBomb(a.type);
  const bB = isBomb(b.type);
  if (aB && !bB) return true;
  if (!aB && bB) return false;
  if (aB && bB) return bombTier(a) > bombTier(b);
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
  const tB = isBomb(table.type);
  const pB = isBomb(play.type);
  if (pB && !tB) return true;
  if (!pB && tB) return false;
  if (pB && tB) return shangyouComboBeats(play, table);
  if (play.type !== table.type || (play.len ?? 0) !== (table.len ?? 0)) return false;
  if (mustFollowPattern) return play.primaryPower > table.primaryPower;
  return play.primaryPower < table.primaryPower;
}
