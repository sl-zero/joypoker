# JoyPoker UI 美化设计

**Date:** 2026-05-15
**Status:** Approved

## 设计目标

- 消除大面积空白，合理化空间利用
- 替换当前沉闷单色背景，建立多层次视觉体系
- 配色参考企业级产品 + 牌桌氛围感
- 不改动任何功能逻辑，纯 CSS 层面改造

## 配色方案

**基调:** 墨绿赌桌底 + 暖金点缀（方案 B）
**布局:** 居中窄栏 + 背景纹理装饰（方案 C）

| CSS 变量 | 色值 | 用途 |
|----------|------|------|
| `--bg` | `#0a1a0f` | 页面底色 |
| `--surface` | `#132a18` | 卡片、面板背景 |
| `--surface2` | `#1e3d20` | 边框、分隔线 |
| `--accent` | `#c9a44b` | 主强调色（按钮、链接、选中态） |
| `--text` | `#f0eee6` | 主文字 |
| `--muted` | `#8a9a7b` | 次级文字、说明 |

对比度: `--text` on `--bg` = 12.5:1 (AAA), `--accent` on `--bg` = 6.2:1 (AA)

## 全局背景

```css
body {
  background: var(--bg);
  background-image:
    radial-gradient(ellipse at 50% 0%, #132a18 0%, transparent 70%);
  background-attachment: fixed;
}
```

顶部径向渐变模拟桌面灯光打在绿毡上的效果——中心亮、边缘暗，自然填充宽屏两侧空白。可选叠加极低透明度菱形暗纹（`opacity: 0.015`）模拟扑克牌背面花纹。

## 组件层级规则

**关键规则:** accent 色上的文字用深色（`var(--bg)`），不用白色——金色按钮上白色不可读。

| 元素 | 现写法 | 改为 |
|------|--------|------|
| 卡片/面板 | `border-white/10` | `border-[var(--surface2)]` |
| 输入框 | `border-white/20` | `border-[var(--surface2)]` |
| 主按钮文字 | `text-white` | `text-[var(--bg)]` |
| 次按钮悬停 | `hover:bg-white/10` | `hover:bg-[var(--surface)]` |
| Tab 选中 | `text-white` | `text-[var(--bg)]` |
| 分隔线 | `border-b border-white/10` | `border-b border-[var(--surface2)]` |
| 预设按钮 | `border-white/20 hover:bg-white/10` | `border-[var(--surface2)] hover:bg-[var(--surface)]` |
| 选中卡片边框 | `ring-2 ring-[var(--accent)]` | 保持，金色 ring 在绿底上效果很好 |

## 各页改动

### `globals.css` — 全局样式

替换 `:root` 中全部 5 个 CSS 变量为新色值。`body` 添加径向渐变背景。

### 所有页面 — border 色批量替换

以下文件中所有 `border-white/10`、`border-white/20`、`border-white/30` 替换为 `border-[var(--surface2)]`，所有 `bg-white/5`、`bg-white/10` 替换为 `bg-[var(--surface)]`：

| 文件 | 主要元素 |
|------|----------|
| `apps/web/app/page.tsx` | 新手提示卡片 |
| `apps/web/app/editor/page.tsx` | 规则编辑表单、tab 栏、按钮 |
| `apps/web/app/rooms/[roomId]/RoomExperience.tsx` | 游戏区卡片、计分栏、聊天栏 |
| `apps/web/app/login/page.tsx` | 登录表单 |
| `apps/web/app/logout-button.tsx` | 确认弹窗 |

### 登录/注册页额外改动

提交按钮从 `bg-[var(--accent)] text-white` → `bg-[var(--accent)] text-[var(--bg)]`

### 编辑器页额外改动

编辑器中 accent 色按钮（tab 选中、创建房间按钮）从 `text-white` → `text-[var(--bg)]`

## 不做

- 不改动 layout 结构
- 不改动功能代码
- 不引入新依赖
- 不做动画/过渡
- 不做响应式适配

## 文件改动清单

| 文件 | 改动 |
|------|------|
| `apps/web/app/globals.css` | 替换 CSS 变量 + body 背景 |
| `apps/web/app/editor/page.tsx` | border/hover 色替换 + 按钮文字色 |
| `apps/web/app/rooms/[roomId]/RoomExperience.tsx` | border/hover 色替换 |
| `apps/web/app/login/page.tsx` | border 色替换 + 按钮文字色 |
| `apps/web/app/logout-button.tsx` | border 色替换 |
| `apps/web/app/page.tsx` | border 色替换 |
