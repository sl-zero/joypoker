import { z } from "zod";

export const gameTypeSchema = z.enum(["blackjack", "doudizhu", "texas", "shangyou"]);

export const blackjackRulesSchema = z.object({
  gameType: z.literal("blackjack"),
  dealerHitsSoft17: z.boolean(),
  decks: z.number().int().min(1).max(8),
  blackjackPayout: z.number().min(1).max(2),
  maxSplits: z.number().int().min(0).max(3),
  doubleAfterSplit: z.boolean(),
  custom: z.record(z.unknown()).default({}),
});

export const doudizhuRulesSchema = z.object({
  gameType: z.literal("doudizhu"),
  allowRocket: z.boolean(),
  bombDoublesScore: z.boolean(),
  springBonus: z.boolean(),
  /** 3 人经典斗地主 / 4 人场（部分地方玩法） */
  playerCount: z.union([z.literal(3), z.literal(4)]).default(3),
  /** 使用 1 副或 2 副牌 */
  deckCount: z.union([z.literal(1), z.literal(2)]).default(1),
  /** 抢地主 vs 叫分制 */
  bidStyle: z.enum(["grab_landlord", "call_points"]).default("grab_landlord"),
  /** 底分 / 叫分基准 */
  baseScore: z.number().int().min(1).max(64).default(1),
  /** 允许四带二（两张单牌） */
  allowFourWithTwoSingles: z.boolean().default(true),
  /** 允许四带两对 */
  allowFourWithTwoPairs: z.boolean().default(true),
  /** 顺子最少张数（通常 5） */
  straightMinLength: z.number().int().min(3).max(12).default(5),
  /** 叫地主后亮底牌三张 */
  showBottomCardsAfterLandlord: z.boolean().default(false),
  /** 启用反春（地主仅出少量牌即输的惩罚） */
  antiSpring: z.boolean().default(true),
  /** 飞机可少带牌（地方桌协商，默认严格） */
  allowLoosePlaneAttachments: z.boolean().default(false),
  custom: z.record(z.unknown()).default({}),
});

export const texasHoldemRulesSchema = z.object({
  gameType: z.literal("texas"),
  smallBlind: z.number().positive(),
  bigBlind: z.number().positive(),
  tableFormat: z.enum(["full_ring", "heads_up", "short_6max"]).default("full_ring"),
  maxPlayers: z.number().int().min(2).max(10).default(9),
  limitType: z.enum(["no_limit", "pot_limit", "fixed_limit"]).default("no_limit"),
  /** 固定限注时：小注 = 大盲的几倍（大注为小注 2 倍，常见 2/4 盲对应 2） */
  fixedBetMultiplierOfBb: z.number().int().min(1).max(8).default(2),
  anteType: z.enum(["none", "big_blind", "button", "all_players"]).default("none"),
  /** 前注 = 大盲 × 倍数（0 表示仅 anteType 决定有无） */
  anteMultiplierOfBb: z.number().min(0).max(2).default(0),
  straddleAllowed: z.boolean().default(false),
  /** 最小带入（大盲倍数） */
  minBuyInBb: z.number().positive().default(20),
  /** 最大带入（大盲倍数） */
  maxBuyInBb: z.number().positive().default(100),
  /** 允许发两次（run it twice）协商 */
  allowRunItTwice: z.boolean().default(false),
  /** 全下时是否亮牌（边池简化时可关） */
  exposeCardsAtShowdown: z.boolean().default(true),
  custom: z.record(z.unknown()).default({}),
});

export const shangyouRulesSchema = z.object({
  gameType: z.literal("shangyou"),
  teamMode: z.boolean(),
  playerCount: z.union([z.literal(2), z.literal(4)]).default(4),
  deckCount: z.union([z.literal(1), z.literal(2)]).default(2),
  /** 谁先出牌 */
  firstLeadRule: z
    .enum(["hearts3", "spades3", "clubs3", "diamonds3", "winner_of_last"])
    .default("hearts3"),
  /** 必须跟牌型与更大（否则可垫小牌视地方规则） */
  mustFollowPattern: z.boolean().default(true),
  /** 允许炸弹（四张同点） */
  allowBomb: z.boolean().default(true),
  /** 王炸/大小王作炸弹（2 副牌常见） */
  allowJokerBomb: z.boolean().default(true),
  /** 是否允许三带一 */
  allowTripleSingle: z.boolean().default(true),
  /** 最后一手必须报单/报双（部分桌） */
  mustAnnounceLastCount: z.boolean().default(false),
  /** 计分：头游二游名次分 / 仅娱乐不计分 */
  scoringMode: z.enum(["rank_points", "none"]).default("rank_points"),
  /** 头游基础分 */
  headScore: z.number().int().min(1).max(50).default(3),
  /** 末游扣分倍率（相对头游） */
  lastPlaceMultiplier: z.number().min(0.5).max(4).default(2),
  custom: z.record(z.unknown()).default({}),
});

export const ruleProfileSchema = z.discriminatedUnion("gameType", [
  blackjackRulesSchema,
  doudizhuRulesSchema,
  texasHoldemRulesSchema,
  shangyouRulesSchema,
]);

export type GameType = z.infer<typeof gameTypeSchema>;
export type BlackjackRules = z.infer<typeof blackjackRulesSchema>;
export type DoudizhuRules = z.infer<typeof doudizhuRulesSchema>;
export type TexasHoldemRules = z.infer<typeof texasHoldemRulesSchema>;
export type ShangyouRules = z.infer<typeof shangyouRulesSchema>;
export type RuleProfile = z.infer<typeof ruleProfileSchema>;

import blackjackClassicJson from "./presets/blackjack-classic.json";
import doudizhuClassicJson from "./presets/doudizhu-classic.json";
import doudizhuCallPointsJson from "./presets/doudizhu-call-points.json";
import doudizhuFourJson from "./presets/doudizhu-four-player.json";
import texasClassicJson from "./presets/texas-classic.json";
import texasHeadsUpJson from "./presets/texas-heads-up.json";
import texasMicroJson from "./presets/texas-microstakes.json";
import shangyouClassicJson from "./presets/shangyou-classic.json";
import shangyouTeamJson from "./presets/shangyou-team-2v2.json";
import shangyouSingleJson from "./presets/shangyou-single-deck.json";

export const PRESET_BLACKJACK_CLASSIC = blackjackRulesSchema.parse(blackjackClassicJson);
export const PRESET_DOUDIZHU_CLASSIC = doudizhuRulesSchema.parse(doudizhuClassicJson);
export const PRESET_DOUDIZHU_CALL_POINTS = doudizhuRulesSchema.parse(doudizhuCallPointsJson);
export const PRESET_DOUDIZHU_FOUR_PLAYER = doudizhuRulesSchema.parse(doudizhuFourJson);

export const PRESET_TEXAS_CLASSIC = texasHoldemRulesSchema.parse(texasClassicJson);
export const PRESET_TEXAS_HEADS_UP = texasHoldemRulesSchema.parse(texasHeadsUpJson);
export const PRESET_TEXAS_MICROSTAKES = texasHoldemRulesSchema.parse(texasMicroJson);

export const PRESET_SHANGYOU_CLASSIC = shangyouRulesSchema.parse(shangyouClassicJson);
export const PRESET_SHANGYOU_TEAM_2V2 = shangyouRulesSchema.parse(shangyouTeamJson);
export const PRESET_SHANGYOU_SINGLE_DECK = shangyouRulesSchema.parse(shangyouSingleJson);

export function parseRuleProfile(input: unknown): RuleProfile {
  const r = ruleProfileSchema.parse(input);
  if (r.gameType === "texas") {
    if (r.bigBlind < r.smallBlind) {
      throw new z.ZodError([
        {
          code: "custom",
          path: ["bigBlind"],
          message: "大盲须大于等于小盲",
        },
      ]);
    }
    if (r.maxBuyInBb < r.minBuyInBb) {
      throw new z.ZodError([
        {
          code: "custom",
          path: ["maxBuyInBb"],
          message: "最大带入须≥最小带入",
        },
      ]);
    }
  }
  return r;
}
