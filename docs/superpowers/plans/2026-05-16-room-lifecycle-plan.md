# 房间生命周期实现计划

> **For agentic workers:** Use superpowers:subagent-driven-development.

**Goal:** Player leave/return, back navigation, Texas showdown, spectator mode.

**Architecture:** Foundation (schema+labels) → API → Server logic → Frontend. 6 tasks.

---

### Task 1: Schema + labels

**Files:** `apps/web/prisma/schema.prisma`, `apps/web/lib/labels.ts`

RoomMember 增加:
- `status String @default("active")` (active/left/spectating)
- `source String @default("editor")` (editor/join)

labels.ts 新增:
```typescript
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
```

运行 `npx prisma db push`

---

### Task 2: API — join 恢复 + source

**Files:** `apps/web/app/api/rooms/route.ts`, `apps/web/app/api/rooms/[roomId]/route.ts`

Room create 接受 `source` 参数。Room join: 已有 member → set status="active"，不新增。

---

### Task 3: Server — leave/spectate/disconnect + skip left players

**Files:** `apps/game-server/src/index.ts`

- disconnect: 更新 member status="left"，不踢出
- "leave" 事件: 同上 + disconnect socket
- "spectate" 事件: toggle status active↔spectating
- startGame: 只取 status="active" 玩家传递给 room.start()

---

### Task 4: Server — 各玩法 room 适配

**Files:** `apps/game-server/src/doudizhuRoom.ts`, `shangyouRoom.ts`, `texasHoldemRoom.ts`

- publicState: 若观战者，返回所有玩家 hand；否则仅自己
- texasHoldemRoom: payout 阶段 publicState 增加 showdown（未弃牌玩家底牌+牌型）

---

### Task 5: Frontend — 导航按钮

**Files:** `apps/web/app/editor/page.tsx`, `apps/web/app/join/page.tsx`

顶部加 `<Link href="/">← 返回</Link>`

RoomExperience 顶部加离开按钮，根据 `?from=` 跳转。

---

### Task 6: Frontend — 房间 UI

**Files:** `apps/web/app/rooms/[roomId]/RoomExperience.tsx`, `apps/web/lib/game-types.ts`

- 离开按钮（带来源跳转）
- 观战按钮（计分板旁，仅非 owner 且游戏未开始可见）
- 计分板 status: "（已离开）" / "（观战中）"
- Texas showdown 渲染
