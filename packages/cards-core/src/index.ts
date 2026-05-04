export type { Suit, Rank, Card } from "./deckCore";
export { RANKS, standardDeck, shuffle } from "./deckCore";

export type { GameCard, JokerKind } from "./gameCard";
export {
  buildDoudizhuDeck,
  buildMultiStandardGameDeck,
  buildShangyouDeck,
  buildStandardGameDeck,
  gameCardToLite,
  isRedSuit,
  jokerGameCard,
  resetGameCardIdCounter,
  standardGameCard,
} from "./gameCard";

import type { Card, Rank, Suit } from "./deckCore";
import { RANKS } from "./deckCore";

const RANK_ORDER: Record<Rank, number> = {
  A: 1,
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
};

/** Blackjack value: A as 11 when it helps and does not bust */
export function blackjackHandValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "A") {
      aces += 1;
      total += 11;
    } else if (["J", "Q", "K"].includes(c.rank)) {
      total += 10;
    } else {
      total += RANK_ORDER[c.rank];
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  const soft = aces > 0 && total <= 21;
  return { total, soft };
}

/** 是否允许分牌：两张牌点数相同（按 rank，10/J/Q/K 互不混分） */
export function canSplitAsPair(a: Card, b: Card): boolean {
  return a.rank === b.rank;
}

export function cardKey(c: Card): string {
  return `${c.suit}${c.rank}`;
}

export function parseCardKey(key: string): Card | null {
  const suits: Suit[] = ["S", "H", "D", "C"];
  const suit = key[0] as Suit;
  if (!suits.includes(suit)) return null;
  const rankPart = key.slice(1) as Rank;
  if (!RANKS.includes(rankPart)) return null;
  return { suit, rank: rankPart };
}

export * from "./shangyou/combos";
export * from "./doudizhu/combos";
export * from "./texas/evaluate";
