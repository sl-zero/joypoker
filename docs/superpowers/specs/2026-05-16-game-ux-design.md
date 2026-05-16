# 游戏体验优化 — 手牌排序 + 桌面牌显示

**Date:** 2026-05-16
**Status:** Approved

## 需求

1. 发牌后手牌自动排序（模拟现实理牌），斗地主 + 上游
2. 桌面打出牌显示实际牌面 + 中文牌型标签，斗地主 + 上游

## 排序规则

点数升序：3→4→5→6→7→8→9→10→J→Q→K→A→2→小王→大王
同点数花色：♠→♥→♦→♣

## 桌面牌显示格式

`[牌面...] 牌型名`，如 `[3♠] [4♥] [5♦] [6♠] [7♣] 顺子（5 张）`

## 实现

### 服务端
- `doudizhuRoom.ts` / `shangyouRoom.ts`: 发牌后 sort hand；tableCombo 输出增加 cards 字段

### 前端
- `game-types.ts`: tableCombo 类型增加 cards
- `RoomExperience.tsx`: tableCombo 区域渲染 CardBadge + 中文标签
- `labels.ts`: 新增 comboTypeLabel()
