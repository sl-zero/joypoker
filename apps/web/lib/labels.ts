// apps/web/lib/labels.ts

export function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    lobby: "等待中",
    playerTurn: "玩家回合",
    dealerTurn: "庄家回合",
    payout: "结算",
    play: "出牌中",
    bid: "叫牌中",
    stub: "暂未开放",
  };
  return map[phase] ?? phase;
}

export function gameTypeLabel(gt: string): string {
  const map: Record<string, string> = {
    blackjack: "二十一点",
    doudizhu: "斗地主",
    texas: "德州扑克",
    shangyou: "上游",
  };
  return map[gt] ?? gt;
}

export function tableFormatLabel(tf: string): string {
  const map: Record<string, string> = {
    full_ring: "满员桌",
    heads_up: "单挑",
    short_6max: "六人桌",
  };
  return map[tf] ?? tf;
}

export function limitTypeLabel(lt: string): string {
  const map: Record<string, string> = {
    no_limit: "无限注",
    pot_limit: "底池限注",
    fixed_limit: "固定限注",
  };
  return map[lt] ?? lt;
}

export function anteTypeLabel(at: string): string {
  const map: Record<string, string> = {
    none: "无前注",
    big_blind: "大盲前注",
    button: "庄位前注",
    all_players: "全员前注",
  };
  return map[at] ?? at;
}

export function bidStyleLabel(bs: string): string {
  const map: Record<string, string> = {
    grab_landlord: "抢地主",
    call_points: "叫分制",
  };
  return map[bs] ?? bs;
}

export function firstLeadLabel(fl: string): string {
  const map: Record<string, string> = {
    hearts3: "红桃 3 先出",
    spades3: "黑桃 3 先出",
    clubs3: "梅花 3 先出",
    diamonds3: "方片 3 先出",
    winner_of_last: "上局头游先出",
  };
  return map[fl] ?? fl;
}

export function scoringModeLabel(sm: string): string {
  const map: Record<string, string> = {
    rank_points: "名次分",
    none: "不计分",
  };
  return map[sm] ?? sm;
}

export function boolLabel(v: boolean): string {
  return v ? "允许" : "关闭";
}

export function boolEnableLabel(v: boolean): string {
  return v ? "启用" : "关闭";
}

export function boolYesLabel(v: boolean): string {
  return v ? "是" : "否";
}

export function comboTypeLabel(t: string, len?: number): string {
  const map: Record<string, string> = {
    single: "单张",
    pair: "对子",
    triple: "三张",
    triple_single: "三带一",
    triple_pair: "三带二",
    straight: "顺子",
    straight_pairs: "连对",
    plane: "飞机",
    four_two_singles: "四带二（单）",
    four_two_pairs: "四带二（对）",
    bomb: "炸弹",
    rocket: "火箭",
  };
  const base = map[t] ?? t;
  if (len && (t === "straight" || t === "straight_pairs" || t === "plane")) {
    return `${base}（${len} 张）`;
  }
  if (t === "bomb" && len) return `${base}（${len} 张）`;
  return base;
}

/** Texas Holdem hand rank → Chinese label. Rank from evaluate.ts (1-10 scale). */
export function texasHandLabel(rank: number): string {
  if (rank >= 10) return "皇家同花顺";
  if (rank >= 9) return "同花顺";
  if (rank >= 8) return "四条";
  if (rank >= 7) return "葫芦";
  if (rank >= 6) return "同花";
  if (rank >= 5) return "顺子";
  if (rank >= 4) return "三条";
  if (rank >= 3) return "两对";
  if (rank >= 2) return "一对";
  return "高牌";
}
