# 上游完整规则 + 牌型参考栏

**Date:** 2026-05-16 | **Status:** Approved

## 改动

1. **rules-schema**: shangyou + `allowTripleSingle` (default true)
2. **combos.ts**: 实现 straight_pairs、plane、triple_single 判定
3. **shangyouRoom.ts**: rulesEcho 传递新配置
4. **editor/page.tsx**: 三带一 checkbox
5. **RoomExperience.tsx**: 左侧 180px 牌型参考栏 + 布局改为 左固定 + flex-1 + w-56
6. **labels.ts**: comboTypeLabel 补充 triple_single 条目
