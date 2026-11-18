# 全站设计一致性与 UI 深度审查整改报告 · 2026-11

本文档记录对「潜游书阁（Oyogu）」全站视觉风格、布局结构、交互模式、对比度规范与响应式表现的系统性审查与落地修复结果。

---

## 一、 核心设计定稿决策

1. **页脚色彩策略**：按页面上下文自适应——首页结语区（`.statement`）与关于页保持 `#030817` 深海暗色无缝衔接；书籍详情页与 404 页接入 `--paper-deep` / `--ink` / `--line` 随日夜间主题平滑切换。
2. **关于页顶栏控件**：关于页强制锁定深海暗色背景，隐藏顶栏主题切换按钮（`hideThemeToggle`），消除无效点击与静默修改其他页主题的心智陷阱。
3. **详情页全书打印**：按需拉取 `/api/books/[slug]/export.json` 构建含扉页、目录与全书章节的临时打印视图（`.full-book-print`），真正实现「打印 / 存为 PDF」导出全书。
4. **响应式断点统一**：全站（含 `global.css`、`about.astro`、`LyricsStage.astro`）统一收敛至桌面端 `> 1024px`、平板端 `768px ~ 1024px`、移动端 `≤ 768px`。

---

## 二、 已完成修复清单

### P0 · 视觉崩坏与可读性阻断修复
- **模态框居中与顶层隔离**：补充 `.search-dialog` 与 `.reader-dialog` 的 `margin: auto`（修复 Tailwind v4 Preflight `* { margin: 0 }` 导致的左上角 `(0, 0)` 吸附）；将 `.reader-dialog` 的 `display: flex` 限定至 `.reader-dialog[open]`；为 `dialog:modal` 与 `dialog::backdrop` 添加 `overscroll-behavior: contain` 阻断背景滚动穿透。
- **404 页面空心描边恢复**：将 `.page-header p` 收窄为 `.page-header p:not(.eyebrow, .not-found-page__code)`，修复特异性覆盖导致的巨型 `"404"` 变实心遮挡主标题问题，并清理浅色页脚残留的暗色描边规则。
- **搜索结果双主题对比度达标**：重构 `.search-match`（`color-mix(in oklab, var(--accent) 22%, transparent)` + `var(--accent-strong)`）与夜间模式 `.search-result-book`（`oklab` 混白提亮），将对比度从 `1.72:1 ~ 2.32:1` 提升至 `> 6.4:1`。
- **阅读器专注模式（Zen Mode）零重排跳位**：移除 `body.zen-mode .reader-main` 错误的窄 `max-width` 限制，保持 `36 字/行` 版心恒定不变，并在切换前后锚定当前阅读段落纵向视口偏移。

### P1 · 交互闭环、键盘无障碍与触控热区补齐
- **阅读器侧栏返回按钮修复**：将 `.reader-toc a` 收窄为 `.reader-toc__list > li > a`，修复 `.reader-toc__back` 被覆盖为 `display: block` 引发的左箭头换行错位；同步收窄 `.reader-dialog-toc > a` 防止挤压移动端小节目录。
- **全站搜索交互与 ARIA 闭环**：补全 `#search-input` 关联 `<label>`、`role="combobox"`、`aria-activedescendant`、`aria-selected` 与 `aria-live="polite"` 状态播报；引入 `isComposing` + `compositionend` 时间窗守卫杜绝中文输入法回车误跳转；开启移动端可见关闭按钮（`44×44px`）。
- **键盘焦点盲区与热区修复**：将「导入备份记录」`<input type="file">` 由 `hidden` 改为 `.sr-only` 恢复键盘 `Tab` 可达性；重构阅读设置 `input[type="range"]` 自定义轨道与热区（桌面 `32px` / 触屏 `44px`）；补齐 `.book-detail__back`、`.reader-settings-popover__close`、`.site-footer__github`、`.theme-choice button` 等控件的触控热区，并新增 `--danger` 日夜语义色。

### P2 · 版心比例、导读展示与渲染性能打磨
- **首屏高度自适应**：将首页 `.hero` 高度由硬编码 `760px / 780px` 调整为 `clamp(540px, 78svh, 680px)`，使 `1440×900` 与 `1366×768` 视口首屏自然露出下方馆藏引导。
- **详情页导读补全与滚动追踪优化**：在书籍详情页渲染 `index.md` 版本整理说明；将阅读器小节目录高亮升级为基于缓存几何偏移的双向实时追踪（带 `aria-current="location"`）。
- **合成层与暗色防闪优化**：将 `body` 的 `background-attachment: fixed` 迁移至独立 `body::before` 固定合成层避免滚动重绘；补充 `<meta name="color-scheme">` 与 `:root:not([data-theme])` 的系统暗色 CSS 兜底。
