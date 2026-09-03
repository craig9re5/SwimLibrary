# 代码质量审查报告与重构台账 · 2026-09

本文档记录 2026-09 对「潜游书阁（Oyogu / Swim Library）」全站代码逻辑与工程结构的系统性代码审查（Code Quality Audit）结果、识别出的低质量代码模式（技术债台账），以及分阶段治理重构计划。

---

## 一、 审查背景与现状总览

* **技术栈**：Astro 7.x + TypeScript + Tailwind CSS 4.x + pnpm
* **模式**：纯静态站点生成（SSG），Markdown 驱动，零后端依赖，依靠浏览器 LocalStorage 维护用户偏好与进度。
* **总体评价**：
  * **优势**：视觉层次与版式排版极为精细（字体栈、行距、墨色自适应），Astro 内容集合（Content Collections）路由逻辑清晰，构建速度极快。
  * **主要短板**：客户端脚本缺乏工程化打包意识，过度使用 `is:inline` 绕开 Vite 造成模块加载失败与死代码；详情页存在严重的构建期数据内联膨胀；基础工具函数存在大量复制粘贴；部分异常处理与交互逻辑不够健壮。

---

## 二、 识别的问题台账（按严重级别）

### 2.1 高严重度（High）

| 编号 | 问题描述 | 所在文件与位置 | 影响与根因 |
| :--- | :--- | :--- | :--- |
| **H-1** | 生产构建中 EPUB 导出功能报废，387 行纯 TS 模块沦为死代码 | [`src/pages/books/[slug].astro`](../src/pages/books/[slug].astro) (L246-L284)<br>[`src/lib/epub.ts`](../src/lib/epub.ts) | 在 `<script is:inline>` 中使用 `import('/src/lib/epub.ts')`。生产构建部署后不存在 `.ts` 源文件，请求 100% 触发 404，降级触发 Markdown 下载。 |
| **H-2** | 详情页 HTML 严重膨胀（711KB），全书正文硬编码内联进页面 | [`src/pages/books/[slug].astro`](../src/pages/books/[slug].astro) (L48-L52, L178) | 构建期将全书所有章节完整原文序列化塞入 `define:vars`，导致仅目录详情页就高达 711KB，消耗巨量带宽与客户端内存。 |
| **H-3** | Service Worker 离线未命中缓存时返回 `undefined` 导致浏览器崩溃 | [`public/sw.js`](../public/sw.js) (L68-L82, L26-L30) | 静态资源在离线且缓存未命中时返回 `undefined`，`respondWith` 抛出 `TypeError: The parameter is not a valid Response object`；`activate` 清理缓存产生稀疏数组。 |

### 2.2 中严重度（Medium）

| 编号 | 问题描述 | 所在文件与位置 | 影响与根因 |
| :--- | :--- | :--- | :--- |
| **M-1** | 核心工具函数复制粘贴，逻辑分散并产生分歧 | [`src/content.config.ts`](../src/content.config.ts)<br>[`src/components/BookCover.astro`](../src/components/BookCover.astro)<br>[`src/lib/library.ts`](../src/lib/library.ts)<br>[`src/lib/wordCount.ts`](../src/lib/wordCount.ts) | 相对明度计算算法完全一致却复制两处；`calculateBookStats` 未复用 `wordCount.ts`，遗漏 Markdown 清洗导致总字数与单章统计标准不一。 |
| **M-2** | `readJson` 滥用异常进行正常控制流 | [`src/pages/index.astro`](../src/pages/index.astro)<br>[`src/pages/books/[slug].astro`](../src/pages/books/[slug].astro)<br>[`src/pages/read/[book]/[chapter].astro`](../src/pages/read/[book]/[chapter].astro) | `JSON.parse(localStorage.getItem(key) || "")`，无缓存时解析空字符串必抛 `SyntaxError`，初次访问触发多次捕获异常。 |
| **M-3** | 全文搜索高亮破坏 HTML 实体，全量搜索缺乏防抖 | [`src/components/SearchModal.astro`](../src/components/SearchModal.astro) (L84-L89, L183) | 在已转义的 HTML 上进行原正则替换，搜索 `amp` 会破坏 `&amp;` 实体；1MB 索引在每字符输入时同步执行全量扫描。 |
| **M-4** | 全局搜索与首页筛选冲突，同一 Hash 双重触发 | [`src/components/Header.astro`](../src/components/Header.astro)<br>[`src/components/SearchModal.astro`](../src/components/SearchModal.astro)<br>[`src/pages/index.astro`](../src/pages/index.astro) | 页头放大镜带有 `#library-search`，同时触发全局 `<dialog>` 打开与首页底层输入框聚焦。 |
| **M-5** | 阅读器备份导入缺乏 Schema 校验 | [`src/pages/read/[book]/[chapter].astro`](../src/pages/read/[book]/[chapter].astro) (L549-L566) | 未校验 JSON 结构直接覆写 LocalStorage，损坏文件可导致全站页面白屏。 |
| **M-6** | 主题切换三态契约在代码中未落实 | [`src/components/Header.astro`](../src/components/Header.astro)<br>[`src/layouts/BaseLayout.astro`](../src/layouts/BaseLayout.astro)<br>[`src/styles/global.css`](../src/styles/global.css) | 文档记录为「跟随系统 → 日间 → 夜间」三态循环且有 `monitor` 图标，实际代码仅为二态且无图标，用户点击后永久锁定。 |

### 2.3 低严重度（Low）

| 编号 | 问题描述 | 所在文件与位置 | 影响与根因 |
| :--- | :--- | :--- | :--- |
| **L-1** | 全局 CSS 巨型单文件，结构失衡 | [`src/styles/global.css`](../src/styles/global.css) (2,973 行)<br>[`src/pages/about.astro`](../src/pages/about.astro) (1,011 行) | 近 3000 行样式堆叠在单文件；About 页面内联近 700 行 CSS 和 150 行歌词滚动 JS。 |
| **L-2** | 品牌与项目命名四套混杂 | [`package.json`](../package.json)<br>[`src/site.config.ts`](../src/site.config.ts)<br>[`public/sw.js`](../public/sw.js) | `shiyue-library`、`拾页书馆`、`Swim Library` 与 `潜游书阁 (Oyogu)` 并存。 |
| **L-3** | 章节导航首章渲染空 `<span />` | [`src/pages/read/[book]/[chapter].astro`](../src/pages/read/[book]/[chapter].astro) (L295) | 移动端单列布局下产生无效的间隙占位。 |
| **L-4** | 进度条普通容器缺失 ARIA 角色 | [`src/components/BookCard.astro`](../src/components/BookCard.astro) (L48) | `<div aria-label="阅读进度">` 缺少 `role="progressbar"` 与 `aria-valuenow`。 |
| **L-5** | 客户端 URL 拼接混乱 | 多处前端脚本 | 各自随手编写正则表达式拼接 `baseUrl`，容易产生多重斜杠或丢失斜杠。 |

---

## 三、 分阶段改善计划

### 阶段 1：止血与功能修复（P0 紧急）
1. 建立 `src/pages/api/books/[slug]/export.json.ts` 静态端点，将全书章节内容按需提供，移除 `books/[slug].astro` 中的 700KB 全文内联；
2. 将 `books/[slug].astro` 的客户端脚本改为 Astro 标准客户端打包脚本，打通 `src/lib/epub.ts` 的编译打包链路；
3. 修复 `public/sw.js` 离线缓存未命中的返回值与激活清理函数；
4. 修复全站三处 `readJson` 的语法抛错控制流。

### 阶段 2：逻辑去重与契约对齐（P1）
1. 抽取 [`src/lib/color.ts`](../src/lib/color.ts)，统一明度算法与对比度校验；
2. 抽取 [`src/lib/storage.ts`](../src/lib/storage.ts)，统一 LocalStorage 常量、安全读写与导入校验；
3. 重构 [`src/lib/library.ts`](../src/lib/library.ts) 的 `calculateBookStats`，全面复用 [`src/lib/wordCount.ts`](../src/lib/wordCount.ts)；
4. 补齐 `Header.astro` 与 `[chapter].astro` 的 `monitor` 图标，实现三态主题循环；
5. 修复 `SearchModal.astro` 输入防抖与实体高亮风险，解耦全局搜索与首页过滤。

### 阶段 3：架构瘦身与工程规范（P2）
1. 模块化拆分 `global.css` 为 `tokens.css`、`base.css`、`components.css`、`reader.css`、`print.css`；
2. 将 `about.astro` 中的歌词舞台抽离为独立的 `components/LyricsStage.astro`；
3. 修复可访问性属性与移动端空占位间隙；
4. 清理冗余配置并收敛命名。
