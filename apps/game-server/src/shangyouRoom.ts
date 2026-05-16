import type { GameCard } from "@poker/cards-core";
import {
  buildShangyouDeck,
  classifyShangyouPlay,
  shangyouFollowOk,
  shangyouRankPower,
  type ShangyouCombo,
} from "@poker/cards-core";
import type { ShangyouRules } from "@poker/rules-schema";

export type ShangyouPhase = "lobby" | "play" | "payout";

export interface ShangyouPlayerPublic {
  userId: string;
  name: string;
  handCount: number;
  /** 自己可见 */
  hand?: { kind: string; suit?: string; rank?: string; joker?: string; id: string }[];
  finishedRank?: number;
  teamId?: 0 | 1;
}

export interface ShangyouPublicState {
  gameType: "shangyou";
  phase: ShangyouPhase;
  players: ShangyouPlayerPublic[];
  currentUserId: string | null;
  tableCombo: { type: string; primaryPower: number; len?: number; bombLen?: number; cards?: { kind: string; suit?: string; rank?: string; joker?: string }[] } | null;
  lastPlayUserId: string | null;
  passesSinceLastPlay: number;
  freeTable: boolean;
  message?: string;
  lastPayout?: Record<string, number>;
  rulesEcho: {
    teamMode: boolean;
    mustFollowPattern: boolean;
    mustAnnounceLastCount: boolean;
    scoringMode: string;
    allowTripleSingle: boolean;
  };
}

interface Player {
  userId: string;
  name: string;
  hand: GameCard[];
}

export class ShangyouRoom {
  phase: ShangyouPhase = "lobby";
  rules: ShangyouRules;
  roomId: string;
  ownerId: string;
  players: Player[] = [];
  /** 出牌顺序座位索引 */
  currentSeat = 0;
  tableCombo: ShangyouCombo | null = null;
  lastPlayUserId: string | null = null;
  passesSinceLastPlay = 0;
  freeTable = true;
  lastPayout: Record<string, number> | undefined;
  lastRoundFirstUserId: string | null = null;
  finishOrder: string[] = [];
  spectatorUserIds: Set<string> = new Set();

  constructor(roomId: string, ownerId: string, rules: ShangyouRules) {
    this.roomId = roomId;
    this.ownerId = ownerId;
    this.rules = rules;
  }

  resetLobby() {
    this.phase = "lobby";
    this.players = [];
    this.currentSeat = 0;
    this.tableCombo = null;
    this.lastPlayUserId = null;
    this.passesSinceLastPlay = 0;
    this.freeTable = true;
    this.lastPayout = undefined;
    this.finishOrder = [];
    this.spectatorUserIds.clear();
  }

  private teamOfSeat(seat: number): 0 | 1 {
    return seat % 2 === 0 ? 0 : 1;
  }

  private findFirstLeader(): number {
    const n = this.players.length;
    if (this.rules.firstLeadRule === "winner_of_last" && this.lastRoundFirstUserId) {
      const idx = this.players.findIndex((p) => p.userId === this.lastRoundFirstUserId);
      if (idx >= 0) return idx;
    }
    const need: Record<string, { suit: "H" | "S" | "C" | "D"; rank: "3" }> = {
      hearts3: { suit: "H", rank: "3" },
      spades3: { suit: "S", rank: "3" },
      clubs3: { suit: "C", rank: "3" },
      diamonds3: { suit: "D", rank: "3" },
    };
    const rule = this.rules.firstLeadRule;
    if (rule === "winner_of_last") return 0;
    const { suit, rank } = need[rule] ?? need.hearts3;
    for (let i = 0; i < n; i++) {
      if (this.players[i].hand.some((c) => c.kind === "standard" && c.suit === suit && c.rank === rank)) {
        return i;
      }
    }
    return 0;
  }

  start(members: { userId: string; name: string | null }[], spectatorIds?: string[]): { ok: true } | { ok: false; error: string } {
    if (this.phase !== "lobby") return { ok: false, error: "游戏进行中" };
    if (members.length !== this.rules.playerCount) {
      return { ok: false, error: `需要 ${this.rules.playerCount} 名玩家` };
    }
    this.spectatorUserIds = new Set(spectatorIds ?? []);
    const deck = buildShangyouDeck(this.rules.deckCount);
    if (deck.length % members.length !== 0) {
      return { ok: false, error: "牌数无法均分" };
    }
    const per = deck.length / members.length;
    this.players = members.map((m, i) => ({
      userId: m.userId,
      name: m.name ?? "玩家",
      hand: deck.slice(i * per, (i + 1) * per),
    }));
    const suitOrder: Record<string, number> = { S: 0, H: 1, D: 2, C: 3 };
    for (const p of this.players) {
      p.hand.sort((a, b) => {
        const pa = shangyouRankPower(a);
        const pb = shangyouRankPower(b);
        if (pa !== pb) return pa - pb;
        if (a.kind === "standard" && b.kind === "standard") {
          return (suitOrder[a.suit] ?? 0) - (suitOrder[b.suit] ?? 0);
        }
        return 0;
      });
    }
    this.finishOrder = [];
    this.phase = "play";
    this.tableCombo = null;
    this.lastPlayUserId = null;
    this.passesSinceLastPlay = 0;
    this.freeTable = true;
    this.currentSeat = this.findFirstLeader();
    return { ok: true };
  }

  private advanceTurn() {
    this.currentSeat = (this.currentSeat + 1) % this.players.length;
  }

  private activePlayers(): Player[] {
    return this.players.filter((p) => !this.finishOrder.includes(p.userId));
  }

  private resolveTrickIfAllPassed(): boolean {
    const active = this.activePlayers();
    if (active.length <= 1) return false;
    if (!this.tableCombo || !this.lastPlayUserId) return false;
    if (this.passesSinceLastPlay < active.length - 1) return false;
    this.freeTable = true;
    this.tableCombo = null;
    this.passesSinceLastPlay = 0;
    const winSeat = this.players.findIndex((p) => p.userId === this.lastPlayUserId);
    if (winSeat >= 0) this.currentSeat = winSeat;
    while (this.finishOrder.includes(this.players[this.currentSeat].userId)) {
      this.currentSeat = (this.currentSeat + 1) % this.players.length;
    }
    return true;
  }

  private finishIfEmpty(p: Player) {
    if (p.hand.length > 0) return;
    if (!this.finishOrder.includes(p.userId)) {
      this.finishOrder.push(p.userId);
    }
    if (this.finishOrder.length === 1) {
      this.lastRoundFirstUserId = p.userId;
    }
    const active = this.players.filter((x) => !this.finishOrder.includes(x.userId));
    if (active.length === 0) {
      this.settleRound();
      return;
    }
    if (active.length === 1) {
      this.finishOrder.push(active[0].userId);
      this.settleRound();
      return;
    }
    this.freeTable = true;
    this.tableCombo = null;
    this.passesSinceLastPlay = 0;
    let s = this.players.findIndex((x) => x.userId === p.userId);
    do {
      s = (s + 1) % this.players.length;
    } while (this.finishOrder.includes(this.players[s].userId));
    this.currentSeat = s;
  }

  private settleRound() {
    this.phase = "payout";
    const n = this.players.length;
    if (this.rules.scoringMode === "none") {
      this.lastPayout = {};
      for (const p of this.players) this.lastPayout[p.userId] = 0;
      return;
    }
    const scores: Record<string, number> = {};
    for (const p of this.players) scores[p.userId] = 0;
    const head = this.finishOrder[0];
    const last = this.finishOrder[n - 1];
    if (head) scores[head] += this.rules.headScore;
    if (last) scores[last] -= this.rules.headScore * this.rules.lastPlaceMultiplier;
    this.lastPayout = scores;
  }

  pass(userId: string): { ok: boolean; error?: string } {
    if (this.phase !== "play") return { ok: false, error: "不是出牌阶段" };
    const seat = this.players.findIndex((p) => p.userId === userId);
    if (seat !== this.currentSeat) return { ok: false, error: "未轮到你" };
    if (this.finishOrder.includes(userId)) return { ok: false, error: "你已出完" };
    if (this.freeTable) return { ok: false, error: "自由出牌不可要不起" };
    this.passesSinceLastPlay++;
    if (this.resolveTrickIfAllPassed()) return { ok: true };
    this.advanceTurn();
    while (this.finishOrder.includes(this.players[this.currentSeat].userId)) {
      this.currentSeat = (this.currentSeat + 1) % this.players.length;
    }
    return { ok: true };
  }

  playCards(
    userId: string,
    cardIds: string[],
    announce?: 1 | 2,
  ): { ok: boolean; error?: string } {
    if (this.phase !== "play") return { ok: false, error: "不是出牌阶段" };
    const seat = this.players.findIndex((p) => p.userId === userId);
    if (seat !== this.currentSeat) return { ok: false, error: "未轮到你" };
    const p = this.players[seat];
    if (this.finishOrder.includes(userId)) return { ok: false, error: "你已出完" };
    const picked: GameCard[] = [];
    for (const id of cardIds) {
      const idx = p.hand.findIndex((c) => c.id === id);
      if (idx < 0) return { ok: false, error: "牌不存在" };
      picked.push(p.hand[idx]);
    }
    const combo = classifyShangyouPlay(picked, {
      allowBomb: this.rules.allowBomb,
      allowJokerBomb: this.rules.allowJokerBomb && this.rules.deckCount === 2,
      allowTripleSingle: this.rules.allowTripleSingle,
    });
    if (!combo) return { ok: false, error: "非法牌型" };

    if (this.rules.mustAnnounceLastCount) {
      const total = p.hand.length;
      if (total <= 2 && picked.length === total) {
        if (announce !== 1 && announce !== 2) return { ok: false, error: "请先报单或报双" };
        if (announce !== total) return { ok: false, error: "报牌张数与剩余不符" };
      }
    }

    if (!this.freeTable && this.tableCombo) {
      if (!shangyouFollowOk(this.tableCombo, combo, this.rules.mustFollowPattern)) {
        return { ok: false, error: "牌型不够大或不符合跟牌规则" };
      }
    }

    for (const id of cardIds) {
      const idx = p.hand.findIndex((c) => c.id === id);
      p.hand.splice(idx, 1);
    }

    this.tableCombo = combo;
    this.lastPlayUserId = userId;
    this.freeTable = false;
    this.passesSinceLastPlay = 0;

    const emptied = p.hand.length === 0;
    this.finishIfEmpty(p);
    if (emptied) return { ok: true };

    if (p.hand.length > 0) {
      this.advanceTurn();
      while (this.finishOrder.includes(this.players[this.currentSeat].userId)) {
        this.currentSeat = (this.currentSeat + 1) % this.players.length;
      }
    }
    return { ok: true };
  }

  publicState(forUserId?: string): ShangyouPublicState {
    const cur = this.players[this.currentSeat];
    const isSpectator = forUserId ? this.spectatorUserIds.has(forUserId) : false;
    const players: ShangyouPlayerPublic[] = this.players.map((p, seat) => {
      const rank = this.finishOrder.indexOf(p.userId);
      const base: ShangyouPlayerPublic = {
        userId: p.userId,
        name: p.name,
        handCount: p.hand.length,
        finishedRank: rank >= 0 ? rank + 1 : undefined,
        teamId: this.rules.teamMode && this.rules.playerCount === 4 ? this.teamOfSeat(seat) : undefined,
      };
      if (forUserId === p.userId || isSpectator) {
        return {
          ...base,
          hand: p.hand.map((c) =>
            c.kind === "standard"
              ? { kind: "standard", suit: c.suit, rank: c.rank, id: c.id }
              : { kind: "joker", joker: c.joker, id: c.id },
          ),
        };
      }
      return base;
    });

    return {
      gameType: "shangyou",
      phase: this.phase,
      players,
      currentUserId: this.phase === "play" && cur ? cur.userId : null,
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
      lastPayout: this.lastPayout,
      rulesEcho: {
        teamMode: this.rules.teamMode,
        mustFollowPattern: this.rules.mustFollowPattern,
        mustAnnounceLastCount: this.rules.mustAnnounceLastCount,
        scoringMode: this.rules.scoringMode,
        allowTripleSingle: this.rules.allowTripleSingle,
      },
    };
  }
}
