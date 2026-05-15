# UI 美化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace dark blue-grey theme with casino green + gold accent, add radial gradient background, fix border colors across all pages.

**Architecture:** Two tasks: (1) globals.css variable + body overhaul, (2) sweep 5 files replacing `border-white/*` and `bg-white/*` and fixing accent button text color. Pure CSS/Tailwind class changes, zero logic touched.

**Tech Stack:** Tailwind CSS v4, CSS custom properties

---

### Task 1: Update globals.css

**Files:** Modify `apps/web/app/globals.css`

- [ ] **Step 1: Replace file content**

```css
@import "tailwindcss";

:root {
  --bg: #0a1a0f;
  --surface: #132a18;
  --surface2: #1e3d20;
  --accent: #c9a44b;
  --text: #f0eee6;
  --muted: #8a9a7b;
}

body {
  background: var(--bg);
  background-image: radial-gradient(ellipse at 50% 0%, #132a18 0%, transparent 70%);
  background-attachment: fixed;
  color: var(--text);
  font-family: system-ui, sans-serif;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/globals.css
git commit -m "feat: casino green theme with gold accent — new CSS variables and radial background"
```

---

### Task 2: Sweep page files — border/hover/accent text fix

**Files:** Modify all 5:
- `apps/web/app/editor/page.tsx`
- `apps/web/app/rooms/[roomId]/RoomExperience.tsx`
- `apps/web/app/login/page.tsx`
- `apps/web/app/logout-button.tsx`
- `apps/web/app/page.tsx`

- [ ] **Step 1: Replace `border-white/10` → `border-[var(--surface2)]`**

In each of the 5 files, find and replace ALL occurrences:

```
border-white/10  →  border-[var(--surface2)]
border-white/20  →  border-[var(--surface2)]
border-white/30  →  border-[var(--surface2)]
```

Use Edit tool with `replace_all: true` for each pattern in each file. Some files have multiple occurrences — get all of them.

- [ ] **Step 2: Replace hover/bg white opacity classes**

In each of the 5 files:

```
hover:bg-white/10  →  hover:bg-[var(--surface)]
hover:bg-white/5   →  hover:bg-[var(--surface)]
bg-white/5         →  bg-[var(--surface)]
```

- [ ] **Step 3: Fix accent button text color**

In `editor/page.tsx` — find the tab button with `bg-[var(--accent)] text-white`:
```tsx
className={`rounded px-3 py-1 text-sm ${tab === id ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--surface)]"}`}
```
Change `text-white` to `text-[var(--bg)]`.

In `editor/page.tsx` — find create room button:
```tsx
className="mt-8 w-full rounded-lg bg-[var(--accent)] py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
```
Change `text-white` to `text-[var(--bg)]`.

In `login/page.tsx` — find login button:
```tsx
className="rounded-lg bg-[var(--accent)] py-2 font-medium text-white hover:opacity-90"
```
Change `text-white` to `text-[var(--bg)]`.

- [ ] **Step 4: Type-check**

Run: `cd apps/web && npx tsc --noEmit 2>&1`
Expected: Only pre-existing `@poker/rules-schema` module errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/editor/page.tsx apps/web/app/rooms/[roomId]/RoomExperience.tsx apps/web/app/login/page.tsx apps/web/app/logout-button.tsx apps/web/app/page.tsx
git commit -m "feat: apply casino green theme to all pages — surface2 borders, gold accent text fix"
```
