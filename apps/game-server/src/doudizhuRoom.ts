import type { GameCard } from "@poker/cards-core";
import {
  buildDoudizhuDeck,
  classifyDoudizhuPlay,
  doudizhuFollowOk,
  doudizhuRankPower,
  type DoudizhuCombo,
} from "@poker/cards-core";
import type { DoudizhuRules } from "@poker/rules-schema";

export type DoudizhuPhase = "lobby" | "bid" | "play" | "payout";

export interface DdzPlayerPublic {
  userId: string;
  name: string;
  handCount: number;
  hand?: { kind: string; suit?: string; rank?: string; joker?: string; id: string }[];
  isLandlord?: boolean;
  bid?: number;
}

export interface DoudizhuPublicState {
  gameType: "doudizhu";
  phase: DoudizhuPhase;
  players: DdzPlayerPublic[];
  currentUserId: string | null;
  landlordUserId: string | null;
  bottomCards: { kind: string; suit?: string; rank?: string; joker?: string; id: string }[] | null;
  tableCombo: { type: string; primaryPower: number; len?: number; bombLen?: number; cards?: { kind: string; suit?: string; rank?: string; joker?: string }[] } | null;
  lastPlayUserId: string | null;
  passesSinceLastPlay: number;
  freeTable: boolean;
  bidStyle: string;
  callPointsMax?: number;
  spring?: boolean;
  antiSpring?: boolean;
  message?: string;
  lastPayout?: Record<string, number>;
}

interface Player {
  userId: string;
  name: string;
  hand: GameCard[];
  bid: number;
}

export class DoudizhuRoom {
  phase: DoudizhuPhase = "lobby";
  rules: DoudizhuRules;
  roomId: string;
  ownerId: string;
  players: Player[] = [];
  bottom: GameCard[] = [];
  revealedBottom: GameCard[] = [];
  landlordUserId: string | null = null;
  currentSeat = 0;
  tableCombo: DoudizhuCombo | null = null;
  lastPlayUserId: string | null = null;
  passesSinceLastPlay = 0;
  freeTable = true;
  lastPayout: Record<string, number> | undefined;
  landlordPlaysCount = 0;
  farmersPlaysCount = 0;
  bidRound = 0;
  maxBidSoFar = 0;

  constructor(roomId: string, ownerId: string, rules: DoudizhuRules) {
    this.roomId = roomId;
    this.ownerId = ownerId;
    this.rules = rules;
  }

  resetLobby() {
    this.phase = "lobby";
    this.players = [];
    this.bottom = [];
    this.revealedBottom = [];
    this.landlordUserId = null;
    this.currentSeat = 0;
    this.tableCombo = null;
    this.lastPlayUserId = null;
    this.passesSinceLastPlay = 0;
    this.freeTable = true;
    this.lastPayout = undefined;
    this.landlordPlaysCount = 0;
    this.farmersPlaysCount = 0;
    this.bidRound = 0;
    this.maxBidSoFar = 0;
  }

  start(members: { userId: string; name: string | null }[]): { ok: true } | { ok: false; error: string } {
    if (this.phase !== "lobby") return { ok: false, error: "游戏进行中" };
    const need = this.rules.playerCount;
    if (members.length !== need) return { ok: false, error: `需要 ${need} 名玩家` };
    const deck = buildDoudizhuDeck(this.rules.deckCount);
    const bottomN = 3;
    const rest = deck.slice(0, deck.length - bottomN);
    this.bottom = deck.slice(deck.length - bottomN);
    const per = Math.floor(rest.length / need);
    this.players = members.map((m, i) => ({
      userId: m.userId,
      name: m.name ?? "玩家",
      hand: rest.slice(i * per, (i + 1) * per),
      bid: -1,
    }));
    const suitOrder: Record<string, number> = { S: 0, H: 1, D: 2, C: 3 };
    for (const p of this.players) {
      p.hand.sort((a, b) => {
        const pa = doudizhuRankPower(a);
        const pb = doudizhuRankPower(b);
        if (pa !== pb) return pa - pb;
        if (a.kind === "standard" && b.kind === "standard") {
          return (suitOrder[a.suit] ?? 0) - (suitOrder[b.suit] ?? 0);
        }
        return 0;
      });
    }
    this.phase = "bid";
    this.landlordUserId = null;
    this.currentSeat = 0;
    this.bidRound = 0;
    this.maxBidSoFar = 0;
    return { ok: true };
  }

  bid(userId: string, points: number | "pass" | "grab" | "nograb"): { ok: boolean; error?: string } {
    if (this.phase !== "bid") return { ok: false, error: "不是叫分阶段" };
    const p = this.players[this.currentSeat];
    if (p.userId !== userId) return { ok: false, error: "未轮到你" };
    if (p.bid >= 0) return { ok: false, error: "已叫过" };

    if (this.rules.bidStyle === "grab_landlord") {
      if (points === "grab") {
        p.bid = 3;
        for (const x of this.players) if (x.bid < 0) x.bid = 0;
        this.assignLandlord(userId);
        return { ok: true };
      }
      if (points === "nograb") {
        p.bid = 0;
      } else return { ok: false, error: "无效操作" };
      this.currentSeat = (this.currentSeat + 1) % this.players.length;
      const allBid = this.players.every((x) => x.bid >= 0);
      if (allBid) {
        const anyGrab = this.players.some((x) => x.bid === 3);
        if (!anyGrab) {
          this.resetLobby();
          return { ok: false, error: "无人叫地主" };
        }
      }
      return { ok: true };
    }

    if (points === "pass") p.bid = 0;
    else if (typeof points === "number" && points >= 0 && points <= 3) {
      if (points > 0 && points <= this.maxBidSoFar) return { ok: false, error: "叫分须更高" };
      p.bid = points;
      if (points > this.maxBidSoFar) this.maxBidSoFar = points;
    } else return { ok: false, error: "无效叫分" };

    this.currentSeat = (this.currentSeat + 1) % this.players.length;
    const allBid = this.players.every((x) => x.bid >= 0);
    if (allBid) {
      const maxB = Math.max(...this.players.map((x) => x.bid));
      const candidates = this.players.filter((x) => x.bid === maxB && x.bid > 0);
      if (candidates.length === 0) {
        this.resetLobby();
        return { ok: false, error: "无人叫分" };
      }
      const winner = candidates.reduce((a, b) =>
        this.players.indexOf(a) <= this.players.indexOf(b) ? a : b,
      );
      this.assignLandlord(winner.userId);
    }
    return { ok: true };
  }

  private assignLandlord(userId: string) {
    this.landlordUserId = userId;
    const lp = this.players.find((p) => p.userId === userId);
    this.revealedBottom = [...this.bottom];
    if (lp) lp.hand.push(...this.bottom);
    this.bottom = [];
    this.phase = "play";
    this.tableCombo = null;
    this.lastPlayUserId = null;
    this.freeTable = true;
    this.passesSinceLastPlay = 0;
    this.currentSeat = this.players.findIndex((p) => p.userId === userId);
    this.landlordPlaysCount = 0;
    this.farmersPlaysCount = 0;
  }

  private classifyOpts() {
    return {
      straightMinLength: this.rules.straightMinLength,
      allowFourWithTwoSingles: this.rules.allowFourWithTwoSingles,
      allowFourWithTwoPairs: this.rules.allowFourWithTwoPairs,
      allowLoosePlaneAttachments: this.rules.allowLoosePlaneAttachments,
    };
  }

  pass(userId: string): { ok: boolean; error?: string } {
    if (this.phase !== "play") return { ok: false, error: "不是出牌阶段" };
    const p = this.players[this.currentSeat];
    if (p.userId !== userId) return { ok: false, error: "未轮到你" };
    if (this.freeTable) return { ok: false, error: "自由出牌不可过" };
    this.passesSinceLastPlay++;
    const others = this.players.length - 1;
    if (this.passesSinceLastPlay >= others) {
      this.freeTable = true;
      this.tableCombo = null;
      this.passesSinceLastPlay = 0;
      const winSeat = this.players.findIndex((x) => x.userId === this.lastPlayUserId);
      if (winSeat >= 0) this.currentSeat = winSeat;
      return { ok: true };
    }
    this.currentSeat = (this.currentSeat + 1) % this.players.length;
    return { ok: true };
  }

  playCards(userId: string, cardIds: string[]): { ok: boolean; error?: string } {
    if (this.phase !== "play") return { ok: false, error: "不是出牌阶段" };
    if (!this.landlordUserId) return { ok: false, error: "无地主" };
    const p = this.players[this.currentSeat];
    if (p.userId !== userId) return { ok: false, error: "未轮到你" };
    const picked: GameCard[] = [];
    for (const id of cardIds) {
      const idx = p.hand.findIndex((c) => c.id === id);
      if (idx < 0) return { ok: false, error: "牌不存在" };
      picked.push(p.hand[idx]);
    }
    const combo = classifyDoudizhuPlay(picked, this.classifyOpts());
    if (!combo) return { ok: false, error: "非法牌型" };
    if (!this.freeTable && this.tableCombo && !doudizhuFollowOk(this.tableCombo, combo)) {
      return { ok: false, error: "牌不够大" };
    }
    for (const id of cardIds) {
      const idx = p.hand.findIndex((c) => c.id === id);
      p.hand.splice(idx, 1);
    }
    this.tableCombo = combo;
    this.lastPlayUserId = userId;
    this.freeTable = false;
    this.passesSinceLastPlay = 0;
    if (userId === this.landlordUserId) this.landlordPlaysCount++;
    else this.farmersPlaysCount++;

    if (p.hand.length === 0) {
      this.settleHand(userId);
      return { ok: true };
    }
    this.currentSeat = (this.currentSeat + 1) % this.players.length;
    return { ok: true };
  }

  private settleHand(winnerId: string) {
    this.phase = "payout";
    const landlordWin = winnerId === this.landlordUserId;
    const base = this.rules.baseScore;
    let mult = base;
    let spring = false;
    let anti = false;
    if (landlordWin && this.rules.springBonus && this.farmersPlaysCount === 0) spring = true;
    if (!landlordWin && this.rules.antiSpring && this.landlordPlaysCount <= 1) anti = true;
    if (spring) mult *= 2;
    if (anti) mult *= 2;

    const out: Record<string, number> = {};
    for (const p of this.players) out[p.userId] = 0;
    const L = this.landlordUserId!;
    if (landlordWin) {
      for (const p of this.players) {
        if (p.userId === L) out[p.userId] += mult * (this.players.length - 1);
        else out[p.userId] -= mult;
      }
    } else {
      for (const p of this.players) {
        if (p.userId === L) out[p.userId] -= mult * (this.players.length - 1);
        else out[p.userId] += mult;
      }
    }
    this.lastPayout = out;
  }

  publicState(forUserId?: string): DoudizhuPublicState {
    const cur = this.players[this.currentSeat];
    const toLite = (cards: GameCard[]) =>
      cards.map((c) =>
        c.kind === "standard"
          ? { kind: "standard", suit: c.suit, rank: c.rank, id: c.id }
          : { kind: "joker", joker: c.joker, id: c.id },
      );
    let bottomLite: DoudizhuPublicState["bottomCards"] = null;
    if (this.phase === "bid" && this.bottom.length > 0) bottomLite = null;
    else if (this.revealedBottom.length > 0 && this.rules.showBottomCardsAfterLandlord) {
      bottomLite = toLite(this.revealedBottom);
    }

    return {
      gameType: "doudizhu",
      phase: this.phase,
      players: this.players.map((p) => {
        const pub: DdzPlayerPublic = {
          userId: p.userId,
          name: p.name,
          handCount: p.hand.length,
          isLandlord: this.landlordUserId === p.userId,
          bid: p.bid >= 0 ? p.bid : undefined,
        };
        if (forUserId === p.userId) {
          pub.hand = p.hand.map((c) =>
            c.kind === "standard"
              ? { kind: "standard", suit: c.suit, rank: c.rank, id: c.id }
              : { kind: "joker", joker: c.joker, id: c.id },
          );
        }
        return pub;
      }),
      currentUserId:
        this.phase === "bid" || this.phase === "play" ? (cur ? cur.userId : null) : null,
      landlordUserId: this.landlordUserId,
      bottomCards: bottomLite,
      tableCombo: this.tableCombo
        ? {
            type: this.tableCombo.type,
            primaryPower: this.tableCombo.primaryPower,
            len: this.tableCombo.len,
            bombLen: this.tableCombo.bombLen,
            cards: this.tableCombo.cards.map((c) => ({
              kind: c.kind,
              suit: c.kind === "standard" ? c.suit : undefined,
              rank: c.kind === "standard" ? c.rank : undefined,
              joker: c.kind === "joker" ? c.joker : undefined,
            })),
          }
        : null,
      lastPlayUserId: this.lastPlayUserId,
      passesSinceLastPlay: this.passesSinceLastPlay,
      freeTable: this.freeTable,
      bidStyle: this.rules.bidStyle,
      spring: false,
      antiSpring: false,
      lastPayout: this.lastPayout,
    };
  }
}
