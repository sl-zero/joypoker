import type { Card, Rank, Suit } from "../deckCore";

const RANK_VAL: Record<Rank, number> = {
  "2": 2,
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
};

/** 类别越大越强；同类别比 kickers 字典序 */
export interface TexasHandStrength {
  category: number;
  kickers: number[];
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function isFlush(cards: Card[]): boolean {
  const s = cards[0].suit;
  return cards.every((c) => c.suit === s);
}

function isStraightVals(vals: number[]): boolean {
  const u = [...new Set(vals)].sort((a, b) => a - b);
  if (u.length !== 5) return false;
  if (u[4] === 14 && u[0] === 2 && u[1] === 3 && u[2] === 4 && u[3] === 5) return true; // A-5 wheel
  for (let i = 1; i < u.length; i++) {
    if (u[i] !== u[i - 1] + 1) return false;
  }
  return true;
}

function evalFive(cards: Card[]): TexasHandStrength {
  const vals = cards.map((c) => RANK_VAL[c.rank]).sort((a, b) => b - a);
  const flush = isFlush(cards);
  const straight = isStraightVals(vals);
  const counts = new Map<number, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  const wheel = vals.includes(14) && vals.includes(5) && vals.includes(4) && vals.includes(3) && vals.includes(2);
  const straightHigh = wheel ? 5 : Math.max(...vals);

  if (flush && straight) {
    return { category: 8, kickers: [straightHigh] };
  }
  if (groups[0][1] === 4) {
    const quad = groups[0][0];
    const kicker = groups[1][0];
    return { category: 7, kickers: [quad, kicker] };
  }
  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return { category: 6, kickers: [groups[0][0], groups[1][0]] };
  }
  if (flush) {
    return { category: 5, kickers: [...vals].sort((a, b) => b - a) };
  }
  if (straight) {
    return { category: 4, kickers: [straightHigh] };
  }
  if (groups[0][1] === 3) {
    const kickers = vals.filter((v) => v !== groups[0][0]).sort((a, b) => b - a);
    return { category: 3, kickers: [groups[0][0], ...kickers] };
  }
  if (groups[0][1] === 2 && groups[1][1] === 2) {
    const highs = [groups[0][0], groups[1][0]].sort((a, b) => b - a);
    const kicker = groups[2][0];
    return { category: 2, kickers: [...highs, kicker] };
  }
  if (groups[0][1] === 2) {
    const kickers = vals.filter((v) => v !== groups[0][0]).sort((a, b) => b - a);
    return { category: 1, kickers: [groups[0][0], ...kickers] };
  }
  return { category: 0, kickers: [...vals].sort((a, b) => b - a) };
}

export function bestTexasHandFromBoard(hole: Card[], board: Card[]): TexasHandStrength {
  const all = [...hole, ...board];
  if (all.length < 5) return { category: -1, kickers: [] };
  const fives = combinations(all, 5);
  let best = evalFive(fives[0]);
  for (let i = 1; i < fives.length; i++) {
    const e = evalFive(fives[i]);
    if (compareTexasStrength(e, best) > 0) best = e;
  }
  return best;
}

export function compareTexasStrength(a: TexasHandStrength, b: TexasHandStrength): number {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const d = (a.kickers[i] ?? 0) - (b.kickers[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export function compareHoleBoards(aHole: Card[], aBoard: Card[], bHole: Card[], bBoard: Card[]): number {
  return compareTexasStrength(
    bestTexasHandFromBoard(aHole, aBoard),
    bestTexasHandFromBoard(bHole, bBoard),
  );
}
