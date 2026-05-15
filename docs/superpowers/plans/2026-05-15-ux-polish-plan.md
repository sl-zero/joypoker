# UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add logout, tooltip hints, dynamic rule summaries, and full Chinese localization to the JoyPoker web frontend.

**Architecture:** Four independent features across 4 files. `labels.ts` provides shared i18n mappings consumed by editor and game room pages. Each feature is self-contained with no cross-feature coupling.

**Tech Stack:** Next.js 16, React 19, next-auth, Tailwind CSS v4, TypeScript, Zod (rules-schema)

---

## File Structure

| File | Role |
|------|------|
| `apps/web/lib/labels.ts` | **NEW** — Chinese label maps and formatting helpers |
| `apps/web/app/page.tsx` | **MODIFY** — Feature 1: logout button + confirm dialog |
| `apps/web/app/editor/page.tsx` | **MODIFY** — Feature 2: tooltip `Tip` component + Feature 4: Chinese option labels |
| `apps/web/app/rooms/[roomId]/RoomExperience.tsx` | **MODIFY** — Feature 3: dynamic rule summaries + Feature 4: full i18n |

---

### Task 1: Create shared Chinese labels module

**Files:**
- Create: `apps/web/lib/labels.ts`

- [ ] **Step 1: Write labels.ts**

```typescript
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
```

- [ ] **Step 2: Type-check**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to labels.ts

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/labels.ts
git commit -m "feat: add shared Chinese labels module for i18n"
```

---

### Task 2: Homepage logout button

**Files:**
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/app/logout-button.tsx`

- [ ] **Step 1: Rewrite page.tsx to use client logout component**

```tsx
import Link from "next/link";
import { auth } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export default async function HomePage() {
  const session = await auth();
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">扑克规则编辑器</h1>
        <p className="mt-2 text-[var(--muted)]">
          预设经典玩法、编辑地方规则、建房联机；已接通二十一点、上游、斗地主、德州扑克服务端状态机、计分与聊天。
        </p>
      </div>
      <nav className="flex flex-wrap gap-4">
        <Link
          className="rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white hover:opacity-90"
          href="/editor"
        >
          规则编辑器
        </Link>
        <Link
          className="rounded-lg border border-[var(--muted)] px-4 py-2 hover:bg-[var(--surface)]"
          href="/join"
        >
          加入房间
        </Link>
        {!session ? (
          <>
            <Link className="rounded-lg px-4 py-2 underline" href="/login">
              登录
            </Link>
            <Link className="rounded-lg px-4 py-2 underline" href="/register">
              注册
            </Link>
          </>
        ) : (
          <span className="flex items-center gap-3 text-[var(--muted)]">
            <span>已登录：{session.user?.email}</span>
            <LogoutButton />
          </span>
        )}
      </nav>
      <section className="rounded-xl border border-white/10 bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--text)]">新手提示</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>默认使用 SQLite（<code className="text-[var(--text)]">apps/web/.env</code> 中 DATABASE_URL）；若改 PostgreSQL 再配库与迁移</li>
          <li>
            终端 1：<code className="text-[var(--text)]">npm run dev:web</code>；终端 2：
            <code className="text-[var(--text)]">npm run dev:game</code>
          </li>
          <li>建房时选择玩法类型；人数须符合该玩法（如斗地主 3/4 人、上游 2/4 人）。</li>
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Create logout-button.tsx**

```tsx
"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function LogoutButton() {
  const [show, setShow] = useState(false);

  async function confirm() {
    await signOut({ redirect: false });
    setShow(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShow(true)}
        className="text-xs px-2 py-0.5 rounded border border-white/20 hover:bg-white/10 transition-colors"
      >
        退出登录
      </button>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-6 shadow-2xl w-80">
            <p className="text-sm text-[var(--text)]">确定退出登录？</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShow(false)}
                className="rounded-lg border border-white/20 px-4 py-1.5 text-sm text-[var(--muted)] hover:bg-white/5"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirm}
                className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/page.tsx apps/web/app/logout-button.tsx
git commit -m "feat: add logout button with confirmation dialog on homepage"
```

---

### Task 3: Editor tooltip hints + Chinese option labels

**Files:**
- Modify: `apps/web/app/editor/page.tsx`

- [ ] **Step 1: Add tooltip text constants and Tip component**

Insert after the `presetBar` function (after line 41), before `export default function EditorPage()`:

```tsx
/* ---- tooltip texts ---- */

const TIP_H17 = "Soft 17 = A+6，牌面为 17 但 A 可计 1。H17 时庄家继续要牌；关闭则为 S17，庄家停在 17。";
const TIP_SPLIT = "首两张同 rank 可分成两手独立下注，每手可继续要牌、停牌或加倍。";
const TIP_DAS = "分牌后的每手可额外下注一倍筹码再抽一张牌（Double After Split）。";
const TIP_STRAIGHT_MIN = "连续单牌的最低长度，常见 5 张，部分地方规则放宽到 3-4 张。";
const TIP_ROCKET = "大王+小王的组合，最大的炸弹牌型，可压任意牌。";
const TIP_BOMB_DOUBLE = "每出现一个炸弹，当局总分翻倍。";
const TIP_SPRING = "一方一张牌未出即结束，对手得分翻倍。";
const TIP_ANTI_SPRING = "地主仅出了一手牌后即被农民出完，惩罚性计分翻倍。";
const TIP_FOUR_TWO_SINGLES = "四张同点牌可带两张单牌一起出。";
const TIP_FOUR_TWO_PAIRS = "四张同点牌可带两个对子一起出。";
const TIP_LOOSE_PLANE = "连续三张的飞机牌型，允许所带牌数不足，常见于地方桌协商规则。";
const TIP_SHOW_BOTTOM = "确定地主后，公开三张底牌给所有人看。";
const TIP_STRADDLE = "UTG 位在发牌前主动投入 2× 大盲，获得翻前最后行动权。";
const TIP_RIT = "双方 All-in 后发两次公共牌（转牌+河牌），各赢半池，降低波动。";
const TIP_ANTE = "翻牌前所有/部分玩家强制投入的额外筹码（Ante），与盲注独立。";
const TIP_EXPOSE = "河牌圈结束后，剩余玩家必须亮出底牌比较牌型。";
const TIP_LIMIT = "NL 可随时全下任意筹码；PL 最多下注底池大小；FL 每轮下注额固定。";
const TIP_FOLLOW_PATTERN = "跟牌时必须出相同类型的牌型且点数更大；关闭则可垫小牌。";
const TIP_ANNOUNCE = "剩余 1-2 张牌时必须声明张数，防止偷跑。";
const TIP_RANK_POINTS = "按出完顺序排名计分，头游（第 1 名）得满分，末游扣分。";
const TIP_HEAD_SCORE = "每局最先出完牌的玩家获得的基础分。";

/* ---- Tip component ---- */

function Tip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group ml-1 align-middle">
      <span className="inline-flex items-center justify-center w-[15px] h-[15px] rounded-full border border-[var(--muted)] text-[var(--muted)] text-[10px] leading-none font-bold cursor-help">
        ?
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 bg-[var(--surface)] border border-white/10 rounded-lg px-3 py-2 text-xs text-[var(--text)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed">
        {text}
      </span>
    </span>
  );
}
```

- [ ] **Step 2: Add Tip icons to Blackjack labels**

In the BJ `<section>`:

After "庄家软 17 要牌（H17）" (line 147):
```tsx
庄家软 17 要牌（H17）<Tip text={TIP_H17} />
```

After "最大分牌次数（0=关闭；每成功分牌一次计一次，可多次分到多手）" (line 175):
```tsx
最大分牌次数<Tip text={TIP_SPLIT} />（0=关闭；每成功分牌一次计一次，可多次分到多手）
```

After "分牌后允许加倍" (line 196):
```tsx
分牌后允许加倍<Tip text={TIP_DAS} />
```

- [ ] **Step 3: Add Tip icons to Doudizhu labels**

After "顺子最少张数（3–12）" (line 269):
```tsx
顺子最少张数<Tip text={TIP_STRAIGHT_MIN} />（3–12）
```

After "允许王炸" (line 289):
```tsx
允许王炸<Tip text={TIP_ROCKET} />
```

After "炸弹翻倍计分" (line 297):
```tsx
炸弹翻倍计分<Tip text={TIP_BOMB_DOUBLE} />
```

After "春天加成" (line 305):
```tsx
春天加成<Tip text={TIP_SPRING} />
```

After "允许四带二（单牌）" (line 315):
```tsx
允许四带二（单牌）<Tip text={TIP_FOUR_TWO_SINGLES} />
```

After "允许四带两对" (line 325):
```tsx
允许四带两对<Tip text={TIP_FOUR_TWO_PAIRS} />
```

After "确定地主后亮底牌" (line 335):
```tsx
确定地主后亮底牌<Tip text={TIP_SHOW_BOTTOM} />
```

After "启用反春" (line 343):
```tsx
启用反春<Tip text={TIP_ANTI_SPRING} />
```

After "飞机可少带（地方桌）" (line 353):
```tsx
飞机可少带（地方桌）<Tip text={TIP_LOOSE_PLANE} />
```

- [ ] **Step 4: Add Tip icons to Texas labels**

After "下注结构" label (line 428):
```tsx
下注结构<Tip text={TIP_LIMIT} />
```

After "前注类型" label (line 461):
```tsx
前注类型<Tip text={TIP_ANTE} />
```

After "允许 Straddle" (line 531):
```tsx
允许 Straddle<Tip text={TIP_STRADDLE} />
```

After "允许 Run it twice" (line 541):
```tsx
允许 Run it twice<Tip text={TIP_RIT} />
```

After "摊牌亮牌" (line 551):
```tsx
摊牌亮牌<Tip text={TIP_EXPOSE} />
```

- [ ] **Step 5: Add Tip icons to Shangyou labels**

After "计分方式" label (line 632):
```tsx
计分方式<Tip text={TIP_RANK_POINTS} />
```

After "头游基础分（1–50）" (line 647):
```tsx
头游基础分<Tip text={TIP_HEAD_SCORE} />（1–50）
```

After "必须跟牌型且更大" (line 686):
```tsx
必须跟牌型且更大<Tip text={TIP_FOLLOW_PATTERN} />
```

After "王炸 / 双王炸弹" (line 706):
```tsx
王炸 / 双王炸弹<Tip text={TIP_ROCKET} />
```

After "最后一手报张数" (line 719):
```tsx
最后一手报张数<Tip text={TIP_ANNOUNCE} />
```

- [ ] **Step 6: Type-check**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/editor/page.tsx
git commit -m "feat: add tooltip hints for game terms on editor page"
```

---

### Task 4: Game page dynamic rule summaries + full Chinese localization

**Files:**
- Modify: `apps/web/app/rooms/[roomId]/RoomExperience.tsx`

- [ ] **Step 1: Update imports**

Replace the import block (lines 1-20) with:

```tsx
"use client";

import { useSession } from "next-auth/react";
import { io } from "socket.io-client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BJPublicState,
  DoudizhuPublicState,
  GameStateUnion,
  ShangyouPublicState,
  StubGameState,
  TexasPublicState,
} from "@/lib/game-types";
import {
  isBlackjackState,
  isDoudizhuState,
  isShangyouState,
  isTexasState,
} from "@/lib/game-types";
import {
  parseRuleProfile,
  type BlackjackRules,
  type DoudizhuRules,
  type TexasHoldemRules,
  type ShangyouRules,
} from "@poker/rules-schema";
import {
  phaseLabel,
  gameTypeLabel,
  tableFormatLabel,
  limitTypeLabel,
  anteTypeLabel,
  bidStyleLabel,
  firstLeadLabel,
  scoringModeLabel,
} from "@/lib/labels";
```

- [ ] **Step 2: Add rule rendering helpers**

Insert after `GameCardBadge` (after line 89), before `export function RoomExperience`:

```tsx
function RuleVal({ children }: { children: React.ReactNode }) {
  return <span className="text-[var(--accent)] font-medium">{children}</span>;
}

function RuleOff({ children }: { children: React.ReactNode }) {
  return <span className="text-red-400 font-medium">{children}</span>;
}

function renderBlackjackRules(rules: BlackjackRules) {
  return (
    <ul className="mt-2 space-y-1 text-sm text-[var(--muted)] list-inside list-disc">
      <li>使用 <RuleVal>{rules.decks}</RuleVal> 副牌</li>
      <li>
        庄家{" "}
        {rules.dealerHitsSoft17 ? (
          <RuleVal>软 17 要牌</RuleVal>
        ) : (
          <RuleOff>软 17 停牌</RuleOff>
        )}
        （{rules.dealerHitsSoft17 ? "H17" : "S17"}）
      </li>
      <li>Blackjack 赔付 <RuleVal>{rules.blackjackPayout}</RuleVal> 倍</li>
      <li>
        最多分牌 <RuleVal>{rules.maxSplits}</RuleVal> 次
        {" · "}
        {rules.doubleAfterSplit ? (
          <RuleVal>允许</RuleVal>
        ) : (
          <RuleOff>不允许</RuleOff>
        )}{" "}
        分牌后加倍
      </li>
      <li className="text-xs mt-2">目标尽量接近 21 点不爆牌 · 同 rank 可按规定分牌</li>
    </ul>
  );
}

function renderDoudizhuRules(rules: DoudizhuRules) {
  return (
    <ul className="mt-2 space-y-1 text-sm text-[var(--muted)] list-inside list-disc">
      <li>
        <RuleVal>{rules.playerCount}</RuleVal> 人 ·{" "}
        <RuleVal>{rules.deckCount}</RuleVal> 副牌 ·{" "}
        <RuleVal>{bidStyleLabel(rules.bidStyle)}</RuleVal>
      </li>
      <li>
        底分 <RuleVal>{rules.baseScore}</RuleVal> · 顺子最少{" "}
        <RuleVal>{rules.straightMinLength}</RuleVal> 张
      </li>
      <li>
        {rules.allowRocket ? <RuleVal>允许</RuleVal> : <RuleOff>关闭</RuleOff>} 王炸
        {" · "}
        {rules.bombDoublesScore ? <RuleVal>允许</RuleVal> : <RuleOff>关闭</RuleOff>} 炸弹翻倍
        {" · "}
        {rules.springBonus ? <RuleVal>允许</RuleVal> : <RuleOff>关闭</RuleOff>} 春天加成
      </li>
      <li>
        {rules.allowFourWithTwoSingles ? <RuleVal>允许</RuleVal> : <RuleOff>关闭</RuleOff>} 四带两单
        {" · "}
        {rules.allowFourWithTwoPairs ? <RuleVal>允许</RuleVal> : <RuleOff>关闭</RuleOff>} 四带两对
      </li>
      <li>
        反春{" "}
        {rules.antiSpring ? <RuleVal>启用</RuleVal> : <RuleOff>关闭</RuleOff>}
        {" · "}亮底牌{" "}
        {rules.showBottomCardsAfterLandlord ? <RuleVal>开启</RuleVal> : <RuleOff>关闭</RuleOff>}
        {" · "}飞机少带{" "}
        {rules.allowLoosePlaneAttachments ? <RuleVal>允许</RuleVal> : <RuleOff>关闭</RuleOff>}
      </li>
      <li className="text-xs mt-2">地主多 3 张底牌 · 农民合作对抗地主</li>
    </ul>
  );
}

function renderTexasRules(rules: TexasHoldemRules) {
  return (
    <ul className="mt-2 space-y-1 text-sm text-[var(--muted)] list-inside list-disc">
      <li>
        盲注 <RuleVal>{rules.smallBlind}</RuleVal> /{" "}
        <RuleVal>{rules.bigBlind}</RuleVal> ·{" "}
        <RuleVal>{limitTypeLabel(rules.limitType)}</RuleVal>
      </li>
      <li>
        <RuleVal>{tableFormatLabel(rules.tableFormat)}</RuleVal> · 最多{" "}
        <RuleVal>{rules.maxPlayers}</RuleVal> 人
      </li>
      <li>
        前注{" "}
        {rules.anteType === "none" ? (
          <RuleOff>无</RuleOff>
        ) : (
          <RuleVal>{anteTypeLabel(rules.anteType)}</RuleVal>
        )}
        {rules.anteType !== "none" && (
          <> · 倍数 <RuleVal>{rules.anteMultiplierOfBb}</RuleVal></>
        )}
        {" · "}带入 <RuleVal>{rules.minBuyInBb}–{rules.maxBuyInBb}</RuleVal> BB
      </li>
      {rules.limitType === "fixed_limit" && (
        <li>固定限注倍率 <RuleVal>{rules.fixedBetMultiplierOfBb}</RuleVal>× BB</li>
      )}
      <li>
        Straddle{" "}
        {rules.straddleAllowed ? <RuleVal>允许</RuleVal> : <RuleOff>关闭</RuleOff>}
        {" · "}发两次{" "}
        {rules.allowRunItTwice ? <RuleVal>允许</RuleVal> : <RuleOff>关闭</RuleOff>}
        {" · "}摊牌亮牌{" "}
        {rules.exposeCardsAtShowdown ? <RuleVal>开启</RuleVal> : <RuleOff>关闭</RuleOff>}
      </li>
      <li className="text-xs mt-2">翻前 2 张底牌 · 翻牌/转牌/河牌共 5 张公共牌 · 组最大 5 张牌型</li>
    </ul>
  );
}

function renderShangyouRules(rules: ShangyouRules) {
  return (
    <ul className="mt-2 space-y-1 text-sm text-[var(--muted)] list-inside list-disc">
      <li>
        <RuleVal>{rules.playerCount}</RuleVal> 人 ·{" "}
        <RuleVal>{rules.deckCount}</RuleVal> 副牌 · 首出{" "}
        <RuleVal>{firstLeadLabel(rules.firstLeadRule)}</RuleVal>
      </li>
      <li>
        组队{" "}
        {rules.teamMode ? <RuleVal>2v2</RuleVal> : <RuleOff>关闭</RuleOff>}
        {" · "}计分{" "}
        <RuleVal>{scoringModeLabel(rules.scoringMode)}</RuleVal>
        {rules.scoringMode === "rank_points" && (
          <>
            {" · "}头游 <RuleVal>{rules.headScore}</RuleVal> 分 · 末位 ×
            <RuleVal>{rules.lastPlaceMultiplier}</RuleVal>
          </>
        )}
      </li>
      <li>
        跟牌型{" "}
        {rules.mustFollowPattern ? <RuleVal>必须跟大</RuleVal> : <RuleOff>可垫小</RuleOff>}
        {" · "}炸弹{" "}
        {rules.allowBomb ? <RuleVal>允许</RuleVal> : <RuleOff>关闭</RuleOff>}
        {" · "}王炸{" "}
        {rules.allowJokerBomb ? <RuleVal>允许</RuleVal> : <RuleOff>关闭</RuleOff>}
      </li>
      <li>
        报张数{" "}
        {rules.mustAnnounceLastCount ? <RuleVal>开启</RuleVal> : <RuleOff>关闭</RuleOff>}
      </li>
      <li className="text-xs mt-2">出完所有手牌即获胜 · 按出完顺序排名次</li>
    </ul>
  );
}

function renderRuleSummary(ruleSnapshot: unknown, gameType: string) {
  try {
    const profile = parseRuleProfile(ruleSnapshot);
    switch (profile.gameType) {
      case "blackjack":
        return renderBlackjackRules(profile);
      case "doudizhu":
        return renderDoudizhuRules(profile);
      case "texas":
        return renderTexasRules(profile);
      case "shangyou":
        return renderShangyouRules(profile);
      default:
        return null;
    }
  } catch {
    return (
      <p className="mt-2 text-xs text-[var(--muted)]">
        {gameTypeLabel(gameType)} 规则（当前房间）
      </p>
    );
  }
}
```

- [ ] **Step 3: Replace BJ static rules block**

In the BJ section, replace the `<details>` block (lines 256-261):

```tsx
{room.ruleSnapshot && renderRuleSummary(room.ruleSnapshot, room.gameType)}
```

And localize the phase line (line 263-268):

```tsx
<p className="mt-3 text-sm text-[var(--muted)]">
  阶段：{phaseLabel(gs.phase)}
  {gs.currentUserId
    ? ` · 当前行动：${gs.currentUserId === session.user.id ? "你" : "其他玩家"}`
    : ""}
</p>
```

- [ ] **Step 4: Add dynamic rules to Shangyou/Doudizhu/Texas + localize phase text**

In the Shangyou section, after `<h2 className="font-medium">上游</h2>`:
```tsx
{room.ruleSnapshot && renderRuleSummary(room.ruleSnapshot, room.gameType)}
```

Replace phase line (line 388-392):
```tsx
<p className="mt-2 text-sm text-[var(--muted)]">
  阶段 {phaseLabel(s.phase)}
  {s.rulesEcho.teamMode ? " · 组队" : ""}
  {s.rulesEcho.mustFollowPattern ? " · 须跟大" : " · 可垫小"}
</p>
```

In the Doudizhu section, after `<h2 className="font-medium">斗地主</h2>`:
```tsx
{room.ruleSnapshot && renderRuleSummary(room.ruleSnapshot, room.gameType)}
```

Replace phase line (line 491-494):
```tsx
<p className="mt-2 text-sm text-[var(--muted)]">
  {phaseLabel(d.phase)} · {bidStyleLabel(d.bidStyle)}
  {d.landlordUserId ? " · 地主已确定" : ""}
</p>
```

In the Texas section, after `<h2 className="font-medium">德州扑克</h2>`:
```tsx
{room.ruleSnapshot && renderRuleSummary(room.ruleSnapshot, room.gameType)}
```

Replace meta line (line 643-646):
```tsx
<p className="mt-2 text-sm text-[var(--muted)]">
  {phaseLabel(t.phase)} · 底池 {t.pot} · {limitTypeLabel(t.limitType)}
</p>
```

- [ ] **Step 5: Localize stub/waiting text**

Replace the waiting notice (lines 757-760):
```tsx
{!isBj && !isSy && !isDz && !isTh && gs && "phase" in gs && gs.phase !== "stub" && (
  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
    等待连接游戏服务器，请确认已启动 game-server 且 NEXT_PUBLIC_SOCKET_URL 配置正确。
  </div>
)}
```

- [ ] **Step 6: Type-check**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/rooms/[roomId]/RoomExperience.tsx
git commit -m "feat: dynamic rule summaries and full Chinese localization on game page"
```

---

### Task 5: Final verification

- [ ] **Step 1: Full type-check**

Run: `cd apps/web && npx tsc --noEmit 2>&1`
Expected: No errors

- [ ] **Step 2: Commit final checkpoint**

```bash
git add -A
git commit -m "chore: final verification — all features pass type-check"
```
