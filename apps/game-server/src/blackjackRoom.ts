import type { Card } from "@poker/cards-core";
import {
  blackjackHandValue,
  canSplitAsPair,
  shuffle,
  standardDeck,
} from "@poker/cards-core";
import type { BlackjackRules } from "@poker/rules-schema";

export type BJPhase = "lobby" | "playerTurn" | "dealerTurn" | "payout";

export interface BJPlayer {
  userId: string;
  name: string;
  hands: Card[][];
  handDone: boolean[];
  handDoubled: boolean[];
  activeHandIndex: number;
  splitsDone: number;
  done: boolean;
}

export interface BJPlayerPublic {
  userId: string;
  name: string;
  /** 他人视角：总张数（背面） */
  handCount: number;
  done: boolean;
  /** 自己视角：各手牌 */
  hands?: Card[][];
  activeHandIndex?: number;
  /** 当前是否可点「分牌」 */
  canSplit?: boolean;
}

export interface BJPublicState {
  phase: BJPhase;
  dealerUp: Card | null;
  dealerHoleHidden: boolean;
  dealerHand?: Card[];
  players: BJPlayerPublic[];
  currentUserId: string | null;
  message?: string;
  lastPayout?: Record<string, number>;
}

export class BlackjackRoom {
  phase: BJPhase = "lobby";
  rules: BlackjackRules;
  roomId: string;
  ownerId: string;
  deck: Card[] = [];
  dealerHand: Card[] = [];
  players: BJPlayer[] = [];
  currentIndex = 0;
  lastPayout: Record<string, number> | undefined;

  constructor(roomId: string, ownerId: string, rules: BlackjackRules) {
    this.roomId = roomId;
    this.ownerId = ownerId;
    this.rules = rules;
  }

  resetLobby() {
    this.phase = "lobby";
    this.deck = [];
    this.dealerHand = [];
    this.players = [];
    this.currentIndex = 0;
    this.lastPayout = undefined;
  }

  start(members: { userId: string; name: string | null }[]) {
    if (this.phase !== "lobby") return { ok: false as const, error: "游戏进行中" };
    if (members.length < 1) return { ok: false as const, error: "至少需要一名玩家" };
    let deck: Card[] = [];
    for (let d = 0; d < this.rules.decks; d++) {
      deck = deck.concat(standardDeck());
    }
    this.deck = shuffle(deck);
    this.dealerHand = [this.draw(), this.draw()];
    this.players = members.map((m) => {
      const h0 = [this.draw(), this.draw()];
      const p: BJPlayer = {
        userId: m.userId,
        name: m.name ?? "玩家",
        hands: [h0],
        handDone: [false],
        handDoubled: [false],
        activeHandIndex: 0,
        splitsDone: 0,
        done: false,
      };
      const { total } = blackjackHandValue(h0);
      if (total === 21) p.done = true;
      return p;
    });
    this.phase = "playerTurn";
    this.currentIndex = 0;
    const autoFinished = this.advanceIfNeeded();
    if (autoFinished) {
      return { ok: true as const, autoFinished: true };
    }
    return { ok: true as const, autoFinished: false };
  }

  private draw(): Card {
    const c = this.deck.pop();
    if (!c) throw new Error("Deck exhausted");
    return c;
  }

  private currentPlayer(): BJPlayer | undefined {
    return this.players[this.currentIndex];
  }

  private activeHand(p: BJPlayer): Card[] {
    return p.hands[p.activeHandIndex];
  }

  /** 结束当前子手；若该玩家所有子手结束则标记玩家 done 并推进回合 */
  private finishActiveHand(p: BJPlayer) {
    p.handDone[p.activeHandIndex] = true;
    const next = p.handDone.findIndex((d, i) => !d);
    if (next === -1) {
      p.done = true;
      this.advanceIfNeeded();
    } else {
      p.activeHandIndex = next;
      this.maybeAutoStand21(p);
    }
  }

  /** 某子手已达 21 则自动停牌该子手 */
  private maybeAutoStand21(p: BJPlayer) {
    const h = p.hands[p.activeHandIndex];
    if (p.handDone[p.activeHandIndex]) return;
    const { total } = blackjackHandValue(h);
    if (total === 21) {
      this.finishActiveHand(p);
    }
  }

  hit(userId: string): { ok: boolean; error?: string } {
    if (this.phase !== "playerTurn") return { ok: false, error: "不是出牌阶段" };
    const cur = this.currentPlayer();
    if (!cur || cur.userId !== userId) return { ok: false, error: "未轮到你" };
    if (cur.done) return { ok: false, error: "你已结束" };
    if (cur.handDone[cur.activeHandIndex]) return { ok: false, error: "该手已结束" };
    const h = this.activeHand(cur);
    h.push(this.draw());
    const { total } = blackjackHandValue(h);
    if (total > 21) this.finishActiveHand(cur);
    else if (total === 21) this.finishActiveHand(cur);
    return { ok: true };
  }

  stand(userId: string): { ok: boolean; error?: string } {
    if (this.phase !== "playerTurn") return { ok: false, error: "不是出牌阶段" };
    const cur = this.currentPlayer();
    if (!cur || cur.userId !== userId) return { ok: false, error: "未轮到你" };
    if (cur.done) return { ok: false, error: "你已结束" };
    if (cur.handDone[cur.activeHandIndex]) return { ok: false, error: "该手已结束" };
    this.finishActiveHand(cur);
    return { ok: true };
  }

  double(userId: string): { ok: boolean; error?: string } {
    if (this.phase !== "playerTurn") return { ok: false, error: "不是出牌阶段" };
    const cur = this.currentPlayer();
    if (!cur || cur.userId !== userId) return { ok: false, error: "未轮到你" };
    if (cur.done) return { ok: false, error: "你已结束" };
    if (cur.handDone[cur.activeHandIndex]) return { ok: false, error: "该手已结束" };
    const h = this.activeHand(cur);
    if (h.length !== 2) return { ok: false, error: "仅有两张牌时可加倍" };
    h.push(this.draw());
    cur.handDoubled[cur.activeHandIndex] = true;
    this.finishActiveHand(cur);
    return { ok: true };
  }

  split(userId: string): { ok: boolean; error?: string } {
    if (this.phase !== "playerTurn") return { ok: false, error: "不是出牌阶段" };
    const cur = this.currentPlayer();
    if (!cur || cur.userId !== userId) return { ok: false, error: "未轮到你" };
    if (cur.done) return { ok: false, error: "你已结束" };
    if (this.rules.maxSplits <= 0) return { ok: false, error: "本桌不允许分牌" };
    if (cur.splitsDone >= this.rules.maxSplits) return { ok: false, error: "已达最大分牌次数" };
    if (cur.handDone[cur.activeHandIndex]) return { ok: false, error: "该手已结束" };
    const h = this.activeHand(cur);
    if (h.length !== 2) return { ok: false, error: "仅有两张牌时可分牌" };
    if (!canSplitAsPair(h[0], h[1])) return { ok: false, error: "两张牌点数不同，不能分牌" };
    const i = cur.activeHandIndex;
    const d1 = this.draw();
    const d2 = this.draw();
    cur.hands.splice(i, 1, [h[0], d1], [h[1], d2]);
    cur.handDone.splice(i, 1, false, false);
    cur.handDoubled.splice(i, 1, false, false);
    cur.splitsDone++;
    for (let j = i; j <= i + 1; j++) {
      const t = blackjackHandValue(cur.hands[j]).total;
      if (t === 21) cur.handDone[j] = true;
    }
    const next = cur.handDone.findIndex((d) => !d);
    if (next === -1) {
      cur.done = true;
      this.advanceIfNeeded();
    } else {
      cur.activeHandIndex = next;
    }
    return { ok: true };
  }

  /** @returns true if the round jumped straight to payout (all players done). */
  private advanceIfNeeded(): boolean {
    if (this.phase !== "playerTurn") return false;
    while (
      this.currentIndex < this.players.length &&
      this.players[this.currentIndex].done
    ) {
      this.currentIndex++;
    }
    if (this.currentIndex >= this.players.length) {
      this.phase = "dealerTurn";
      this.playDealer();
      this.phase = "payout";
      this.lastPayout = this.settle();
      return true;
    }
    return false;
  }

  private playDealer() {
    const hitSoft17 = this.rules.dealerHitsSoft17;
    while (true) {
      const { total, soft } = blackjackHandValue(this.dealerHand);
      if (total < 17) {
        this.dealerHand.push(this.draw());
        continue;
      }
      if (total === 17 && soft && hitSoft17) {
        this.dealerHand.push(this.draw());
        continue;
      }
      break;
    }
  }

  /** 单副手相对庄家：返回输赢分（+1/-1/0 或 blackjack 倍数） */
  private handPayoutVsDealer(
    hand: Card[],
    d: ReturnType<typeof blackjackHandValue>,
    dealerBust: boolean,
    dealerBJ: boolean,
    mult: number,
    isNaturalBlackjack: boolean,
  ): number {
    const pv = blackjackHandValue(hand);
    const playerBust = pv.total > 21;
    const playerBJ =
      isNaturalBlackjack &&
      !playerBust &&
      pv.total === 21 &&
      hand.length === 2;
    if (playerBust) return -1;
    if (dealerBust) return playerBJ ? mult : 1;
    if (playerBJ && !dealerBJ) return mult;
    if (dealerBJ && !playerBJ) return -1;
    if (dealerBJ && playerBJ) return 0;
    if (pv.total > d.total) return 1;
    if (pv.total < d.total) return -1;
    return 0;
  }

  private settle(): Record<string, number> {
    const d = blackjackHandValue(this.dealerHand);
    const dealerBust = d.total > 21;
    const dealerBJ = !dealerBust && d.total === 21 && this.dealerHand.length === 2;
    const out: Record<string, number> = {};
    const mult = this.rules.blackjackPayout;
    for (const p of this.players) {
      let sum = 0;
      for (let hi = 0; hi < p.hands.length; hi++) {
        const hand = p.hands[hi];
        if (hand.length === 0) continue;
        const naturalBj =
          p.splitsDone === 0 &&
          p.hands.length === 1 &&
          hand.length === 2 &&
          blackjackHandValue(hand).total === 21;
        const base = this.handPayoutVsDealer(hand, d, dealerBust, dealerBJ, mult, naturalBj);
        sum += p.handDoubled[hi] ? base * 2 : base;
      }
      out[p.userId] = sum;
    }
    return out;
  }

  private canSplitNow(p: BJPlayer): boolean {
    if (this.rules.maxSplits <= 0) return false;
    if (p.splitsDone >= this.rules.maxSplits) return false;
    if (p.done) return false;
    if (p.handDone[p.activeHandIndex]) return false;
    const h = this.activeHand(p);
    return h.length === 2 && canSplitAsPair(h[0], h[1]);
  }

  publicState(forUserId?: string): BJPublicState {
    const dealerUp = this.dealerHand[0] ?? null;
    const hideHole = this.phase !== "payout" && this.dealerHand.length > 1;
    const cur = this.phase === "playerTurn" ? this.currentPlayer() : undefined;
    const players: BJPlayerPublic[] = this.players.map((p) => {
      const totalCards = p.hands.reduce((s, h) => s + h.length, 0);
      const base: BJPlayerPublic = {
        userId: p.userId,
        name: p.name,
        handCount: totalCards,
        done: p.done,
      };
      if (forUserId === p.userId) {
        return {
          ...base,
          hands: p.hands.map((h) => [...h]),
          activeHandIndex: p.activeHandIndex,
          canSplit:
            forUserId === p.userId &&
            this.phase === "playerTurn" &&
            cur?.userId === p.userId &&
            this.canSplitNow(p),
        };
      }
      return base;
    });
    const base: BJPublicState = {
      phase: this.phase,
      dealerUp,
      dealerHoleHidden: hideHole,
      players,
      currentUserId: cur?.userId ?? null,
      lastPayout: this.lastPayout,
    };
    if (!hideHole && this.dealerHand.length) {
      base.dealerHand = [...this.dealerHand];
    }
    return base;
  }
}
