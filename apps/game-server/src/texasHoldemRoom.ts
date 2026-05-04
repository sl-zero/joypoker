import type { Card } from "@poker/cards-core";
import {
  bestTexasHandFromBoard,
  compareTexasStrength,
  shuffle,
  standardDeck,
} from "@poker/cards-core";
import type { TexasHoldemRules } from "@poker/rules-schema";

export type TexasPhase =
  | "lobby"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "showdown"
  | "payout";

export interface TexasPlayerPublic {
  userId: string;
  name: string;
  stack: number;
  folded: boolean;
  currentBet: number;
  totalCommitted: number;
  hole?: { suit: string; rank: string }[];
  mucked?: boolean;
}

export interface TexasPublicState {
  gameType: "texas";
  phase: TexasPhase;
  players: TexasPlayerPublic[];
  buttonSeat: number;
  sbSeat: number;
  bbSeat: number;
  currentActorSeat: number | null;
  board: { suit: string; rank: string }[];
  pot: number;
  sidePots: { amount: number; eligibleUserIds: string[] }[];
  street: number;
  toCall: number;
  minRaise: number;
  lastRaiseSize: number;
  smallBlind: number;
  bigBlind: number;
  limitType: string;
  ritPending?: boolean;
  ritAgreed?: string[];
  lastPayout?: Record<string, number>;
}

interface TPlayer {
  userId: string;
  name: string;
  stack: number;
  folded: boolean;
  hole: Card[];
  currentBet: number;
  totalCommitted: number;
  mucked: boolean;
}

export class TexasHoldemRoom {
  phase: TexasPhase = "lobby";
  rules: TexasHoldemRules;
  roomId: string;
  ownerId: string;
  players: TPlayer[] = [];
  board: Card[] = [];
  deck: Card[] = [];
  buttonSeat = 0;
  pot = 0;
  sidePots: { amount: number; eligibleUserIds: string[] }[] = [];
  street = 0;
  currentActorSeat: number | null = null;
  toCall = 0;
  minRaise = 0;
  lastRaiseSize = 0;
  lastAggressorSeat: number | null = null;
  lastPayout: Record<string, number> | undefined;
  ritPending = false;
  ritAgreed = new Set<string>();
  actingOrder: number[] = [];
  actCursor = 0;
  actedThisStreet: boolean[] = [];
  stackAtHandStart: Map<string, number> = new Map();

  constructor(roomId: string, ownerId: string, rules: TexasHoldemRules) {
    this.roomId = roomId;
    this.ownerId = ownerId;
    this.rules = rules;
  }

  seatMod(i: number): number {
    const n = this.players.length;
    return ((i % n) + n) % n;
  }

  resetLobby() {
    this.phase = "lobby";
    this.players = [];
    this.board = [];
    this.deck = [];
    this.pot = 0;
    this.sidePots = [];
    this.street = 0;
    this.currentActorSeat = null;
    this.lastPayout = undefined;
    this.ritPending = false;
    this.ritAgreed.clear();
  }

  start(members: { userId: string; name: string | null }[]): { ok: true } | { ok: false; error: string } {
    if (this.phase !== "lobby") return { ok: false, error: "游戏进行中" };
    const n = members.length;
    if (n < 2) return { ok: false, error: "至少 2 人" };
    if (n > this.rules.maxPlayers) return { ok: false, error: "人数超过桌限" };
    const bb = this.rules.bigBlind;
    const buyIn = bb * this.rules.minBuyInBb;
    this.players = members.map((m) => ({
      userId: m.userId,
      name: m.name ?? "玩家",
      stack: buyIn,
      folded: false,
      hole: [],
      currentBet: 0,
      totalCommitted: 0,
      mucked: false,
    }));
    this.buttonSeat = 0;
    this.startHandInternals();
    return { ok: true };
  }

  private sbBbSeats(): { sbSeat: number; bbSeat: number } {
    const n = this.players.length;
    if (n === 2) {
      return { sbSeat: this.buttonSeat, bbSeat: this.seatMod(this.buttonSeat + 1) };
    }
    return {
      sbSeat: this.seatMod(this.buttonSeat + 1),
      bbSeat: this.seatMod(this.buttonSeat + 2),
    };
  }

  private startHandInternals() {
    const d = shuffle(standardDeck());
    this.deck = [...d];
    this.board = [];
    this.pot = 0;
    this.sidePots = [];
    this.street = 0;
    this.ritPending = false;
    this.ritAgreed.clear();
    this.lastAggressorSeat = null;
    this.actedThisStreet = this.players.map(() => false);
    for (const p of this.players) {
      p.folded = false;
      p.hole = [this.deck.pop()!, this.deck.pop()!];
      p.currentBet = 0;
      p.totalCommitted = 0;
      p.mucked = false;
    }
    const { sbSeat, bbSeat } = this.sbBbSeats();
    const sb = this.rules.smallBlind;
    const bb = this.rules.bigBlind;
    this.postBlind(sbSeat, sb);
    this.postBlind(bbSeat, bb);
    this.postAntes(bbSeat);
    this.stackAtHandStart = new Map(this.players.map((p) => [p.userId, p.stack]));
    this.toCall = bb;
    this.minRaise = bb;
    this.lastRaiseSize = bb;
    this.phase = "preflop";
    this.buildActingOrder(bbSeat);
    this.pickNextActor();
  }

  private postBlind(seat: number, amt: number) {
    const p = this.players[seat];
    const pay = Math.min(amt, p.stack);
    p.stack -= pay;
    p.currentBet += pay;
    p.totalCommitted += pay;
    this.pot += pay;
  }

  private postAntes(bbSeat: number) {
    const mult = this.rules.anteMultiplierOfBb;
    if (mult <= 0) return;
    const ante = this.rules.bigBlind * mult;
    if (this.rules.anteType === "none") return;
    if (this.rules.anteType === "all_players") {
      for (let i = 0; i < this.players.length; i++) {
        const pay = Math.min(ante, this.players[i].stack);
        this.players[i].stack -= pay;
        this.players[i].totalCommitted += pay;
        this.pot += pay;
      }
    } else if (this.rules.anteType === "big_blind") {
      const pay = Math.min(ante, this.players[bbSeat].stack);
      this.players[bbSeat].stack -= pay;
      this.players[bbSeat].totalCommitted += pay;
      this.pot += pay;
    } else if (this.rules.anteType === "button") {
      const pay = Math.min(ante, this.players[this.buttonSeat].stack);
      this.players[this.buttonSeat].stack -= pay;
      this.players[this.buttonSeat].totalCommitted += pay;
      this.pot += pay;
    }
  }

  private buildActingOrder(firstSeat: number) {
    this.actingOrder = [];
    const n = this.players.length;
    let s = this.seatMod(firstSeat + 1);
    for (let k = 0; k < n; k++) {
      this.actingOrder.push(s);
      s = this.seatMod(s + 1);
    }
    this.actCursor = 0;
  }

  private maxStreetBet(): number {
    return Math.max(0, ...this.players.map((p) => p.currentBet));
  }

  private canTakeVoluntaryAction(seat: number): boolean {
    const p = this.players[seat];
    if (p.folded) return false;
    if (p.stack === 0) return false;
    const maxB = this.maxStreetBet();
    if (p.currentBet < maxB) return true;
    return !this.actedThisStreet[seat];
  }

  private pickNextActor() {
    const n = this.actingOrder.length;
    for (let k = 0; k < n; k++) {
      const seat = this.actingOrder[this.actCursor % n];
      this.actCursor++;
      if (this.canTakeVoluntaryAction(seat)) {
        this.currentActorSeat = seat;
        return;
      }
    }
    this.goNextStreetOrShowdown();
  }

  private goNextStreetOrShowdown() {
    for (const p of this.players) p.currentBet = 0;
    this.actedThisStreet = this.players.map(() => false);
    this.toCall = 0;
    this.minRaise = this.rules.bigBlind;
    this.lastRaiseSize = this.rules.bigBlind;
    this.lastAggressorSeat = null;
    const alive = this.players.filter((p) => !p.folded);
    if (alive.length === 1) {
      this.awardPotTo(alive[0].userId);
      return;
    }
    if (this.street === 0) {
      this.street = 1;
      this.board.push(this.deck.pop()!, this.deck.pop()!, this.deck.pop()!);
      this.deck.pop();
      this.phase = "flop";
    } else if (this.street === 1) {
      this.street = 2;
      this.deck.pop();
      this.board.push(this.deck.pop()!);
      this.phase = "turn";
    } else if (this.street === 2) {
      this.street = 3;
      this.deck.pop();
      this.board.push(this.deck.pop()!);
      this.phase = "river";
    } else {
      this.phase = "showdown";
      this.resolveShowdown();
      return;
    }
    this.buildActingOrder(this.buttonSeat);
    this.actCursor = 0;
    this.pickNextActor();
  }

  fold(userId: string): { ok: boolean; error?: string } {
    if (this.phase === "payout") return { ok: false, error: "本手已结束" };
    const seat = this.currentActorSeat;
    if (seat === null) return { ok: false, error: "无法操作" };
    if (this.players[seat].userId !== userId) return { ok: false, error: "未轮到你" };
    this.players[seat].folded = true;
    this.actedThisStreet[seat] = true;
    this.afterAction();
    return { ok: true };
  }

  check(userId: string): { ok: boolean; error?: string } {
    const seat = this.currentActorSeat;
    if (seat === null) return { ok: false, error: "无法操作" };
    if (this.players[seat].userId !== userId) return { ok: false, error: "未轮到你" };
    const maxB = this.maxStreetBet();
    if (this.players[seat].currentBet < maxB) return { ok: false, error: "不能过牌" };
    this.actedThisStreet[seat] = true;
    this.afterAction();
    return { ok: true };
  }

  call(userId: string): { ok: boolean; error?: string } {
    const seat = this.currentActorSeat;
    if (seat === null) return { ok: false, error: "无法操作" };
    if (this.players[seat].userId !== userId) return { ok: false, error: "未轮到你" };
    const p = this.players[seat];
    const maxB = this.maxStreetBet();
    const need = maxB - p.currentBet;
    const pay = Math.min(need, p.stack);
    p.stack -= pay;
    p.currentBet += pay;
    p.totalCommitted += pay;
    this.pot += pay;
    this.actedThisStreet[seat] = true;
    this.afterAction();
    return { ok: true };
  }

  raiseTo(userId: string, totalLevel: number): { ok: boolean; error?: string } {
    const seat = this.currentActorSeat;
    if (seat === null) return { ok: false, error: "无法操作" };
    if (this.players[seat].userId !== userId) return { ok: false, error: "未轮到你" };
    const p = this.players[seat];
    const maxB = this.maxStreetBet();
    const minTotal = maxB + this.minRaise;
    if (totalLevel < minTotal && p.stack + p.currentBet >= minTotal) {
      return { ok: false, error: "加注须至少到最小加注额" };
    }
    const target = Math.min(totalLevel, p.currentBet + p.stack);
    const need = target - p.currentBet;
    const pay = Math.min(need, p.stack);
    p.stack -= pay;
    p.currentBet += pay;
    p.totalCommitted += pay;
    this.pot += pay;
    this.lastAggressorSeat = seat;
    const newMax = this.maxStreetBet();
    this.lastRaiseSize = Math.max(this.rules.bigBlind, newMax - maxB);
    this.minRaise = this.lastRaiseSize;
    this.toCall = newMax;
    this.actedThisStreet = this.players.map(() => false);
    this.actedThisStreet[seat] = true;
    this.afterAction();
    return { ok: true };
  }

  private afterAction() {
    const alive = this.players.filter((p) => !p.folded);
    if (alive.length === 1) {
      this.awardPotTo(alive[0].userId);
      return;
    }
    this.pickNextActor();
  }

  private awardPotTo(winnerId: string) {
    this.phase = "payout";
    const w = this.players.find((p) => p.userId === winnerId);
    if (w) w.stack += this.pot;
    this.lastPayout = {};
    for (const p of this.players) {
      const start = this.stackAtHandStart.get(p.userId) ?? p.stack;
      this.lastPayout[p.userId] = Math.round((p.stack - start) * 100) / 100;
    }
    this.pot = 0;
    this.currentActorSeat = null;
    this.buttonSeat = this.seatMod(this.buttonSeat + 1);
  }

  private resolveShowdown() {
    const contenders = this.players.filter((p) => !p.folded);
    if (contenders.length === 1) {
      this.awardPotTo(contenders[0].userId);
      return;
    }
    let best = contenders[0];
    let bestEv = bestTexasHandFromBoard(best.hole, this.board);
    for (let i = 1; i < contenders.length; i++) {
      const ev = bestTexasHandFromBoard(contenders[i].hole, this.board);
      if (compareTexasStrength(ev, bestEv) > 0) {
        best = contenders[i];
        bestEv = ev;
      }
    }
    this.awardPotTo(best.userId);
  }

  ritAgree(userId: string): { ok: boolean; error?: string } {
    if (!this.rules.allowRunItTwice || !this.ritPending) return { ok: false, error: "当前无需发两次" };
    this.ritAgreed.add(userId);
    return { ok: true };
  }

  newHand(): void {
    if (this.phase === "payout") {
      this.startHandInternals();
    }
  }

  publicState(forUserId?: string): TexasPublicState {
    const { sbSeat, bbSeat } = this.sbBbSeats();
    return {
      gameType: "texas",
      phase: this.phase,
      players: this.players.map((p) => {
        const pub: TexasPlayerPublic = {
          userId: p.userId,
          name: p.name,
          stack: Math.round(p.stack * 100) / 100,
          folded: p.folded,
          currentBet: Math.round(p.currentBet * 100) / 100,
          totalCommitted: Math.round(p.totalCommitted * 100) / 100,
          mucked: p.mucked,
        };
        if (forUserId === p.userId || (this.phase === "showdown" && this.rules.exposeCardsAtShowdown)) {
          pub.hole = p.hole.map((c) => ({ suit: c.suit, rank: c.rank }));
        }
        return pub;
      }),
      buttonSeat: this.buttonSeat,
      sbSeat,
      bbSeat,
      currentActorSeat: this.currentActorSeat,
      board: this.board.map((c) => ({ suit: c.suit, rank: c.rank })),
      pot: Math.round(this.pot * 100) / 100,
      sidePots: this.sidePots,
      street: this.street,
      toCall: this.toCall,
      minRaise: this.minRaise,
      lastRaiseSize: this.lastRaiseSize,
      smallBlind: this.rules.smallBlind,
      bigBlind: this.rules.bigBlind,
      limitType: this.rules.limitType,
      ritPending: this.ritPending,
      ritAgreed: [...this.ritAgreed],
      lastPayout: this.lastPayout,
    };
  }
}
