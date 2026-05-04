/** Client mirrors of game-server `publicState` payloads */

export type BJPhase = "lobby" | "playerTurn" | "dealerTurn" | "payout";

export interface CardLite {
  suit: string;
  rank: string;
}

export interface BJPlayerPublic {
  userId: string;
  name: string;
  handCount: number;
  done: boolean;
  hands?: CardLite[][];
  activeHandIndex?: number;
  canSplit?: boolean;
}

export interface BJPublicState {
  phase: BJPhase;
  dealerUp: CardLite | null;
  dealerHoleHidden: boolean;
  dealerHand?: CardLite[];
  players: BJPlayerPublic[];
  currentUserId: string | null;
  message?: string;
  lastPayout?: Record<string, number>;
}

export interface StubGameState {
  phase: "stub";
  gameType: string;
  message: string;
}

export interface ShangyouPlayerPublic {
  userId: string;
  name: string;
  handCount: number;
  hand?: { kind: string; suit?: string; rank?: string; joker?: string; id: string }[];
  finishedRank?: number;
  teamId?: 0 | 1;
}

export interface ShangyouPublicState {
  gameType: "shangyou";
  phase: "lobby" | "play" | "payout";
  players: ShangyouPlayerPublic[];
  currentUserId: string | null;
  tableCombo: { type: string; primaryPower: number; len?: number; bombLen?: number } | null;
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
  };
}

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
  phase: "lobby" | "bid" | "play" | "payout";
  players: DdzPlayerPublic[];
  currentUserId: string | null;
  landlordUserId: string | null;
  bottomCards: { kind: string; suit?: string; rank?: string; joker?: string; id: string }[] | null;
  tableCombo: { type: string; primaryPower: number; len?: number; bombLen?: number } | null;
  lastPlayUserId: string | null;
  passesSinceLastPlay: number;
  freeTable: boolean;
  bidStyle: string;
  lastPayout?: Record<string, number>;
}

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
  phase: string;
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
  lastPayout?: Record<string, number>;
}

export type GameStateUnion =
  | BJPublicState
  | ShangyouPublicState
  | DoudizhuPublicState
  | TexasPublicState
  | StubGameState;

export function isShangyouState(s: GameStateUnion): s is ShangyouPublicState {
  return "gameType" in s && s.gameType === "shangyou";
}

export function isDoudizhuState(s: GameStateUnion): s is DoudizhuPublicState {
  return "gameType" in s && s.gameType === "doudizhu";
}

export function isTexasState(s: GameStateUnion): s is TexasPublicState {
  return "gameType" in s && s.gameType === "texas";
}

export function isBlackjackState(s: GameStateUnion): s is BJPublicState {
  return "dealerUp" in s && !("gameType" in s);
}
