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
