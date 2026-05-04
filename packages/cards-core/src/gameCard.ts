import type { Card, Rank, Suit } from "./deckCore";
import { shuffle, standardDeck } from "./deckCore";

export type JokerKind = "SJ" | "BJ";

/** 联机中式玩法用牌（含王牌）；与二十一点的 `Card` 分离 */
export type GameCard =
  | { kind: "standard"; suit: Suit; rank: Rank; id: string }
  | { kind: "joker"; joker: JokerKind; id: string };

let idSeq = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++idSeq}`;
}

export function resetGameCardIdCounter(): void {
  idSeq = 0;
}

export function standardGameCard(c: Card, prefix = "c"): GameCard {
  return { kind: "standard", suit: c.suit, rank: c.rank, id: nextId(prefix) };
}

export function jokerGameCard(joker: JokerKind, prefix = "j"): GameCard {
  return { kind: "joker", joker, id: nextId(prefix) };
}

/** 一副 52 张 → GameCard */
export function buildStandardGameDeck(): GameCard[] {
  resetGameCardIdCounter();
  return standardDeck().map((c) => standardGameCard(c));
}

/** n 副 52 张（无王） */
export function buildMultiStandardGameDeck(deckCount: number): GameCard[] {
  resetGameCardIdCounter();
  const out: GameCard[] = [];
  for (let d = 0; d < deckCount; d++) {
    const prefix = `d${d}`;
    for (const c of standardDeck()) {
      out.push(standardGameCard(c, prefix));
    }
  }
  return out;
}

/** 斗地主牌堆：1 副 54 / 2 副 108 */
export function buildDoudizhuDeck(deckCount: 1 | 2): GameCard[] {
  resetGameCardIdCounter();
  const out: GameCard[] = [];
  for (let d = 0; d < deckCount; d++) {
    const prefix = `d${d}`;
    for (const c of standardDeck()) out.push(standardGameCard(c, prefix));
    out.push(jokerGameCard("SJ", prefix));
    out.push(jokerGameCard("BJ", prefix));
  }
  return shuffle(out);
}

/** 上游：1 副无王；2 副四王 */
export function buildShangyouDeck(deckCount: 1 | 2): GameCard[] {
  resetGameCardIdCounter();
  if (deckCount === 1) {
    return shuffle(standardDeck().map((c) => standardGameCard(c, "d0")));
  }
  const out: GameCard[] = [];
  for (let d = 0; d < 2; d++) {
    const prefix = `d${d}`;
    for (const c of standardDeck()) out.push(standardGameCard(c, prefix));
    out.push(jokerGameCard("SJ", prefix));
    out.push(jokerGameCard("BJ", prefix));
  }
  return shuffle(out);
}

export function gameCardToLite(c: GameCard): {
  kind: string;
  suit?: string;
  rank?: string;
  joker?: string;
  id: string;
} {
  if (c.kind === "standard") {
    return { kind: "standard", suit: c.suit, rank: c.rank, id: c.id };
  }
  return { kind: "joker", joker: c.joker, id: c.id };
}

export function isRedSuit(s: Suit): boolean {
  return s === "H" || s === "D";
}
