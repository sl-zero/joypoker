# UX Polish — 退出登录 / 术语提示 / 动态规则摘要 / 全中文化

**Date:** 2026-05-15
**Status:** Draft

## Overview

四个独立但互补的 UX 改进，全部在 `apps/web` 前端完成，不涉及 game-server 或 packages。

---

## Feature 1: 首页退出登录

### 需求

- 首页已登录状态下，邮箱右侧增加退出按钮
- 点击后弹出确认弹窗
- 确认后调用 next-auth `signOut()`，留在首页

### 实现

**文件改动:** `apps/web/app/page.tsx`

**方案:**
- 引入 `signOut` from `next-auth/react`
- 新增 `useState` 控制自定义确认弹窗显隐
- 弹窗样式匹配现有深色主题（使用 CSS 变量）

**交互流程:**
1. 已登录 → 显示 "已登录：{email}" + "退出登录" 按钮
2. 点击退出 → 弹出居中确认弹窗："确定退出登录？" + 取消/确定按钮
3. 确认 → `signOut({ redirect: false })` → 页面自动刷新

**不做:** 不跳转页面、不引入动画库、不做全局 toast

---

## Feature 2: 规则编辑器术语问号提示

### 需求

- 新手不易理解的规则术语旁放 "?" 图标，hover 时显示说明
- 自解释的选项不加问号
- 说明文字自行撰写，参考严谨卡牌资料

### 需要加说明的术语

**二十一点:**
| 术语 | 说明 |
|------|------|
| 软 17 要牌（H17） | Soft 17 = A+6，牌面 17 但 A 可计 1。H17 时庄家继续要牌；S17 则庄家停在 17 |
| 分牌 | 首两张同 rank 可分成两手独立下注，每手可继续要牌/停牌/加倍 |
| 分牌后允许加倍 | 分牌后的每手可额外下注一倍筹码再抽一张牌 |

**斗地主:**
| 术语 | 说明 |
|------|------|
| 顺子最少张数 | 连续单牌的最低长度，常见 5 张，部分地方规则放宽 |
| 王炸 | 大王+小王组合，最大炸弹牌型，可压任意牌 |
| 炸弹翻倍计分 | 每出现一个炸弹，当局总分翻倍 |
| 春天加成 | 一方一张牌未出即结束，对手得分翻倍 |
| 反春 | 地主仅出一手牌即被农民出完，惩罚性计分翻倍 |
| 四带二（单牌/两对） | 四张同点牌可带两张单牌或两个对子一起出 |
| 飞机可少带 | 连续三张的飞机牌型，允许所带牌数不足，常见于地方桌 |
| 亮底牌 | 确定地主后公开三张底牌给所有人看 |

**德州扑克:**
| 术语 | 说明 |
|------|------|
| Straddle | UTG 位在发牌前主动投入 2× 大盲，获得翻前最后行动权 |
| Run it twice | 双方 All-in 后发两次公共牌（转牌+河牌），各赢半池，降低波动 |
| 前注类型 | 翻牌前所有/部分玩家强制投入的额外筹码（Ante），与盲注独立 |
| 摊牌亮牌 | 河牌圈结束后剩余玩家必须亮出底牌比较牌型 |
| 无限注 NL / PL / FL | NL 可随时全下任意筹码；PL 最多下注底池大小；FL 每轮下注额固定 |

**上游:**
| 术语 | 说明 |
|------|------|
| 必须跟牌型且更大 | 跟牌须出相同类型且点数更大；关闭则可垫小牌 |
| 最后一手报张数 | 剩余 1-2 张牌时必须声明张数，防止偷跑 |
| 名次分 | 按出完顺序排名计分，头游得满分，末游扣分 |
| 头游基础分 | 每局最先出完牌的玩家获得的基础分 |

### 实现

**文件改动:** `apps/web/app/editor/page.tsx`

**方案:**
- 新建 `Tip` 内联组件（同一文件，不导出）
- 纯 CSS hover：`group` + `group-hover:opacity-100`
- 问号样式：16px 圆形，`border: 1px solid var(--muted)`
- 浮层：`absolute` 在问号上方，`bg-[var(--surface)]`，`rounded-lg`，`p-2`，`text-xs`，`w-56`
- 术语说明以 const 定义在组件顶部

**Tip 组件骨架:**
```tsx
function Tip({ text }: { text: string }) {
  return (
    <span className="relative inline-flex group ml-1">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full
        border border-[var(--muted)] text-[var(--muted)] text-[10px] font-bold cursor-help">
        ?
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56
        bg-[var(--surface)] border border-white/10 rounded-lg px-3 py-2
        text-xs text-[var(--text)] opacity-0 group-hover:opacity-100
        transition-opacity pointer-events-none z-10 leading-relaxed">
        {text}
      </span>
    </span>
  );
}
```

---

## Feature 3: 游戏页面动态规则摘要

### 需求

- 替换硬编码 `<details>` 规则说明
- 从 `room.ruleSnapshot` 动态生成四种玩法的规则摘要
- 可变配置值用 `var(--accent)` 标示
- 关闭/不启用的设置用 `text-red-400` 标示
- 每种玩法底部保留一句话玩法简述

### 实现

**文件改动:** `apps/web/app/rooms/[roomId]/RoomExperience.tsx`

**方案:**
- 用 `@poker/rules-schema` 的 `parseRuleProfile` 验证 `room.ruleSnapshot` 并获取类型
- 为每种玩法写 `renderRules()` 函数，返回 `<ul>` 摘要列表
- 替换四个游戏区域的硬编码 `<details>` 块

**条件显示:**
- 德州 `fixedBetMultiplierOfBb` → 仅 `limitType === "fixed_limit"` 时显示
- 德州 `anteMultiplierOfBb` → 仅 `anteType !== "none"` 时显示
- 上游 `headScore` / `lastPlaceMultiplier` → 仅 `scoringMode === "rank_points"` 时显示

**颜色规则:**
- 数值/枚举（变量）→ `text-[var(--accent)] font-medium`
- boolean false（关闭项）→ `text-red-400 font-medium`
- boolean true（开启项）→ 正常样式
- 固定描述文字 → `text-[var(--muted)]`

---

## Feature 4: 界面全中文化

### 需求

- 所有用户可见文本翻译为中文
- 参考真实卡牌游戏用语
- 不影响 API 通信和数据库字段

### 实现

**文件改动:**
- `apps/web/lib/labels.ts` — **新建** 集中管理所有映射
- `apps/web/app/rooms/[roomId]/RoomExperience.tsx` — 阶段名、按钮、占位文本
- `apps/web/app/editor/page.tsx` — select 选项标签

**方案:**
- 导出纯函数：`phaseLabel(p)`、`gameTypeLabel(gt)`、`tableFormatLabel(tf)` 等
- 组件中直接调用函数替换英文字符串
- 不引入 i18n 库

### 完整映射表

**游戏阶段:**
| 原文 | 译文 |
|------|------|
| lobby | 等待中 |
| playerTurn | 玩家回合 |
| dealerTurn | 庄家回合 |
| payout | 结算 |
| play | 出牌中 |
| bid | 叫牌中 |
| stub | 暂未开放 |

**德州扑克:**
| 原文 | 译文 |
|------|------|
| no_limit | 无限注 |
| pot_limit | 底池限注 |
| fixed_limit | 固定限注 |
| full_ring | 满员桌 |
| heads_up | 单挑 |
| short_6max | 六人桌 |
| none (ante) | 无前注 |
| big_blind (ante) | 大盲前注 |
| button (ante) | 庄位前注 |
| all_players (ante) | 全员前注 |
| Pot | 底池 |
| Fold | 弃牌 |
| Check | 过牌 |
| Call | 跟注 |
| Raise to | 加注到 |
| Stack | 筹码 |
| Hole | 底牌 |
| Board | 公共牌 |
| Button | 庄位 |
| mucked | 已盖牌 |

**斗地主:**
| 原文 | 译文 |
|------|------|
| grab_landlord | 抢地主 |
| call_points | 叫分制 |

**上游:**
| 原文 | 译文 |
|------|------|
| hearts3 | 红桃 3 先出 |
| spades3 | 黑桃 3 先出 |
| clubs3 | 梅花 3 先出 |
| diamonds3 | 方片 3 先出 |
| winner_of_last | 上局头游先出 |
| rank_points | 名次分 |
| none (scoring) | 不计分 |
| freeTable | 自由出牌 |

**通用 UI:**
| 原文 | 译文 |
|------|------|
| Loading... | 加载中… |
| Please login | 请先登录 |
| Start Game | 开始游戏 |
| New Round | 再来一局 |
| Next Hand | 下一手 |
| Waiting for game server... | 等待连接游戏服务器… |
| Current action | 当前行动 |
| You | 你 |
| Score | 计分 |
| Chat | 聊天 |
| Send | 发送 |
| Online | 在线 |
| Finished | 已结束 |
| Folded | 已弃牌 |
| All-in | 全下 |
| Call amount | 跟注额 |

---

## 文件改动清单

| 文件 | 改动 |
|------|------|
| `apps/web/app/page.tsx` | Feature 1: 退出按钮 + 确认弹窗 |
| `apps/web/app/editor/page.tsx` | Feature 2: Tip 组件 + 术语说明 + Feature 4: 选项中文 |
| `apps/web/app/rooms/[roomId]/RoomExperience.tsx` | Feature 3: 动态规则摘要 + Feature 4: 全中文化 |
| `apps/web/lib/labels.ts` | **新建** Feature 4: 中文映射表 |

---

## 不做

- 不引入新 npm 依赖
- 不修改 game-server、packages
- 不修改数据库 schema
- 不做响应式/移动端适配
- 不做动画/过渡效果
- 不做多语言，仅中文化
