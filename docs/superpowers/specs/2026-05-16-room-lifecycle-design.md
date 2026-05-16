# 房间生命周期与游戏体验优化

**Date:** 2026-05-16
**Status:** Approved

## 功能一：玩家离开/返回

- 离开方式：Socket 断连（关闭标签页）或手动"离开房间"按钮
- 离开后：计分板显示"（已离开）"，保留计分；游戏中轮到自动 skip
- 重返：检查已有 member，恢复 active，不新增；保留旧计分
- 新游戏：不包含 status != "active" 的玩家

### 数据模型
`RoomMember` 增加 `status: "active" | "left" | "spectating"`，`source: "editor" | "join"`

## 功能二：返回导航

| 页面 | 按钮 | 目标 |
|------|------|------|
| 编辑器 | "← 返回"（顶部） | `/` |
| 加入房间 | "← 返回"（顶部） | `/` |
| 房间 | "离开房间" | `/editor?from=editor` 或 `/join?from=join` |

## 功能三：德州扑克摊牌

- payout 阶段 publicState 增加 `showdown`: 未弃牌玩家底牌 + 最大牌型中文名
- 新增 `texasHandLabel()` 牌型中文映射

## 功能四：观战模式

- 计分板旁"观战"按钮（房主不可见，仅游戏开始前可用）
- 观战者显示"（观战中）"，不被发牌，可见所有玩家手牌
- 断连重连恢复观战状态

## 文件改动

数据库 schema、房间 API、游戏服务端（index + 三种玩法 room）、前端 RoomExperience/editor/join、类型定义、labels
