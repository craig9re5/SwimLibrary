# 视觉与体验改造记录 · 2026-07

本文档记录 2026-07-26 一轮设计评审与改造的**全部改动**、**关键决策**，以及**已识别但尚未处理**的问题，供后续开发接手。

所有对比度均按 WCAG 2.x 相对亮度公式在浏览器中实测（方法见文末「如何复现测量」），文中的数字都是实测值而非估算。

---

## 0. 背景：一次品牌方向的收口

改造前，站点是**两套视觉身份缝在一起**的状态：

- commit `64c7765`（Extend the About aesthetic across Swim Library）把全站从**暖米纸 + 朱砂**（`--paper: #f5f0e5` / `--accent: #9d3b31`）整体改成**冷蓝灰**（`#eaf1f5` / `#1d5fca`），蓝色来自 About 页《SWIM (MyGO!!!!! ver)》的专辑封面。
- 但阅读器的暖色调色板被**冻结保留**成一组独立的 `--reader-*` token（`--reader-paper: #fbf8f0`）。
- 结果：用户动线「蓝灰书架 → 蓝灰详情页 → **米黄阅读器**」在开始阅读的瞬间翻转色温。阅读设置里那个叫**「暖纸」**的按钮就是这个断层留下的化石。
- 同时 `--reader-accent: #315fae` 与站点 `--accent: #1d5fca` 是两个**近似但不相同**的蓝（色相差 0.8°，ΔE76 ≈ 16.75）——处在"能察觉但说不出哪不一样"的区间，读起来是不一致而非有意。

**站点所有者的决定：采用 About 页的蓝作为唯一品牌方向**，阅读器一并转冷。本轮所有配色改动都基于这个决定。

> ⚠️ **不要把暖米/朱砂当成"原始设计"去恢复。** `site.config.ts` 里的 `accent: "cinnabar"` 死字段和 `global.css` 里六套 `[data-accent]` 命名色板都是暖色时代的遗留，已删除。

---

## 1. 已完成的改动

### 1.1 设计 token 与配色

| 项 | 改前 | 改后 | 位置 |
|---|---|---|---|
| `--muted`（浅色） | `#63758d`（**4.13:1**，未达 AA，且只用于 11–13px 小字） | `#55677f`（**5.06:1** on `--paper`，4.54:1 on `--paper-deep`） | `global.css` `:root` |
| 深色主题正文 | `--ink #f4f8ff` on `--paper #030817` = **18.76:1**，接近纯白打纯黑，长读产生光晕 | `#dbe4f2` on `#0b1220` = **14.61:1** | `:root[data-theme="dark"]` |
| 阅读器浅色 | `#24201b` on `#fffdf8`（暖米）= 15.92:1 | `#1c2942` on `#f9fcfd`（冷）= **14.10:1** | `:root` reader 块 |
| 阅读器深色 | `#edf4ff` on `#07101f` = **17.21:1** | `#d3dced` on `#111b2c` = **12.51:1** | `:root[data-theme="dark"]` reader 块 |
| 阅读器 accent | `#315fae`（与站点近似但不同） | **`#1d5fca` / `#7fa9f5`**，与站点逐字节一致 | 同上 |
| 新增控件描边 | 交互控件借用装饰性 `--line`（0.13 alpha，**1.30:1**） | 新增 `--line-control`（0.42 / 0.40 alpha），用于 `.filter-button`、`.button--ghost` | `:root` / dark |

**新增的表面层级 token**（原先卡片与页面背景只差 1.05:1，实际看不出是抬起的层）：

```css
:root {
  --surface: #ffffff;          /* 抬起：目录、继续阅读卡 */
  --surface-sunken: #f2f7fa;   /* 下沉：书籍简介面板 */
  --surface-line: rgba(8, 26, 52, 0.16);
}
:root[data-theme="dark"] {
  --surface: #151f33;
  --surface-sunken: #101827;
  --surface-line: rgba(222, 235, 255, 0.16);
}
```

实测三级关系（明暗对称）：

| 关系 | 浅色 | 深色 |
|---|---|---|
| 页面 → 下沉 | 1.058 | 1.054 |
| 下沉 → 抬起 | 1.079 | 1.079 |
| 页面 → 抬起 | 1.141 | 1.137 |

`--shadow` 也重写了：原 `0 28px 90px` / 16% alpha 在浅色背景上不产生可辨边缘、只产生一层灰雾，且 118px 的下探距离会盖到下一块面板上。现为两层：
```css
--shadow: 0 1px 2px rgba(5, 28, 61, 0.06), 0 18px 40px -16px rgba(5, 28, 61, 0.24);
```

### 1.2 层级与性能

- **`.book-detail__content` 与 `.chapter-list` 原先六项表面属性（背景/边框/圆角/投影/模糊/半径）逐字节相同**，两块无法区分的毛玻璃板上下堆叠，读者看不出哪块是「简介」哪块是「入口」。现在：目录 = `--surface` 纯白 + 真实投影 + `--surface-line`；简介 = `--surface-sunken` + `--line-strong`，无投影。
- **`backdrop-filter` 从 5 处收敛到 2 处**（`.site-header`、`.reader-header`——只有这两个是真有内容从下面滚过的固定层）。实测：详情页 **3 层 → 1 层**，首页 **2 层 → 0 层**。原先每层要付一次独立合成 + 背景快照，换来的只是 1.05:1 的亮度差。
- `.book-detail__facts` 原先是**第三层嵌套边框盒**（面板里的面板里的面板），已扁平化为只有 `border-top` 的区块。
- `.search-field` 从毛玻璃 + 52px 投影降级为实心 `--paper-raised` + 1px 描边——原先它比真正的内容（书卡）更抢眼，层级是倒置的。

### 1.3 排版

- **移除中文标题的负字距。** 汉字字面撑满 em 框，负 tracking 直接吃掉字间空隙。实测 `.hero__brand` 在 129.6px 下每字 **−9.07px**（字符步进 120.5px vs em 129.6px），「拾页书馆」四字接近相碰。已清零的 6 处：`.hero__brand`、`.section-heading__title`、`.statement__mark`、`.page-header h1`、`.book-detail h1`、`.reader-article > h1`。**`.not-found-page__code` 的 `-0.1em` 保留**——那是拉丁数字 "404"，负字距是正确的。
- **修正衬线字体栈顺序。** 原为 `… "Songti SC", SimSun, Georgia, serif`，而 SimSun 自带拉丁字形，所以在裸 Windows 上**中文和拉丁全部由宋体渲染**。已把 Georgia 提到 CJK 之前：
  ```
  --font-serif: "Iowan Old Style", Baskerville, Georgia,
                "Source Han Serif SC", "Noto Serif SC", "Songti SC", SimSun, serif;
  ```
  `--font-sans` 也补了 `"Segoe UI"`（Win10 无 Variable 版），并把 `"PingFang SC"` 前移到 `"Microsoft YaHei"` 之前（装了 Office 的 macOS 用户原本会拿到雅黑）。
  > 本机字体探测（Win11）：Iowan Old Style / Baskerville / Source Han Serif SC / Songti SC / Avenir Next / Noto Sans SC **全部缺失**。
- **阅读器版心改用「字/行」。** 原 `--reader-width: 70ch` 实测 = 741px = **39 汉字/行**，而设置面板标注「70 字符」——差约 1.8 倍；且 `ch`（数字 "0" 的宽度）随衬线回退结果在不同系统上漂移。现为 `--reader-measure: 36` + `calc(measure × font-size)`，实测 684px = **36.0 汉字/行**，标注「36 字/行」与事实一致。滑杆 26–42，**含旧 localStorage 设置的迁移钳位**（旧值 48–82 会被折半后钳入新区间）。
- 字号下限上调：字号 16 → **17**，行高 1.5 → **1.65**（对中文都偏紧，放进滑杆等于提供一个不该被选的选项）。
- 中文正文补 `text-autospace: normal`（中英/中数之间的西文间隙）与 `text-spacing-trim: trim-start`（全角标点挤压），均为渐进增强。
- `.reader-prose li` 原先不参与两端对齐（只处理了 `li p`），紧凑列表会左对齐、与周围两端对齐的正文形成边缘错位。已修。
- h2 上边距从 `3.2em`（≈94px，把 13 个 h2 的日记体章节切成碎片）降到 `2.2em`。
- **移动端恢复两端对齐。** 原先 ≤720px 把 `.reader-prose p` 改成 `text-align: left`——对中文这是过度纠正：汉字全角等宽，右边缘不齐会形成锯齿状断口，视觉噪音大于拉丁文的自然 rag。内边距同时从 20px 收到 16px（19px 下 16.8 → 17.3 字/行）。

### 1.4 书架与书卡

| 项 | 改前 | 改后 |
|---|---|---|
| 栅格 | `repeat(3, 1fr)` = 3×374.9px，但只有 2 本书，**整整一列 375px 空着** | 新增 `.book-grid:not(:has(> :nth-child(3)))` → 2×362px + `max-width: 780px` |
| 卡内封面 | 固定 180px 塞在 375px 列里，右侧**再空 195px（52%）** | `min(100%, 300px)` + 百分比内边距，留白降到 **62px** |
| 分类筛选 | 硬编码三类，实际只有两类有书 → 点「文学小说」**必然**落到空状态 | 从 `books` 派生并按 `zh-CN` 排序 |
| 空状态 | 无边框无背景居中灰字（全站唯一），文案承诺「查看全部馆藏」却**没有可点的东西** | 站内语汇的面板 + 可用的复位按钮（清搜索 / 复位筛选 / 聚焦搜索框） |
| 书卡链接 | **两个 `<a>` 指向同一 href**，名称还不一致（「查看《X》」和「X」） | 封面 `<a>` 加 `tabindex="-1" aria-hidden="true"`，标题为唯一可聚焦链接 |
| `.book-cover__label` | 10px 中文 + 无效的 `text-transform: uppercase` + opacity 0.68（实测 4.23:1） | 12px / 0.08em / opacity 0.82，去掉 uppercase |

**封面墨色现在按底色亮度自动选择**（`BookCover.astro` 构建期计算）：

```
relativeLuminance(accent) <= 0.1706 → 奶白墨 #fff8e9
否则                                → 深墨   #251e15
```

原先每本书都硬编码奶白墨，而 schema 只校验六位 hex、**不校验明度**。现有两本书恰好都是深色（`#7A332C` L=0.0669、`#405B56` L=0.0924）所以侥幸没出事，但填一个浅色就会白纸写白字：`#e0c9a0` 从 **1.52:1 → 10.22:1**。

同时 `content.config.ts` 加了亮度护栏，拒绝**两种墨色都达不到 4.5:1** 的死区（`0.1706 < L < 0.2369`），构建期即报中文错误。例：`#8a7f5e`（L=0.214）会被拦下。

### 1.5 详情页

- **容器宽度统一。** `.book-detail` 原为 `min(1380px, 100vw-64px)` = 1376px，而全站 `--shell` = 1240px，导致详情内容比页头品牌**左移 68px**。现统一为 `var(--shell)`，实测错位 **−68px → 0**。
- **目录行主次翻正。** 轨道原为 `44 / 418.75 / 697.92 / 20` px——13px 灰色摘要列比 19px 衬线标题列**宽 1.67 倍**。现为 `40 / 552.375 / 408.292 / 20`。
- **hover 不再触发重排。** 原先同时动画 `padding-inline`（布局属性，每帧重算 4 条网格轨道、可能重新断行）和 `transform`，左边缘 +7px 而右边缘 −2px。现改为 `box-shadow: inset 3px 0 0` + `translateX(6px)`，`transition` 里已移除 `padding`。
- `.book-detail__facts dt` 从 11px/0.12em 改为 12px/0.08em（11px 中文笔画会并；0.12em 施加在 2–4 字中文标签上像被拆开）。

### 1.6 阅读器

- **章内小节目录。** 实测《美国反对美国》第一章高 **21,220px**、含 8 个 `<h2>`；这些标题的 `id` 与 `scroll-margin-top: 92px` **早就存在，但没有任何地方链接它们**。现在侧栏当前章下与移动端弹窗各渲染一份小节列表（`render()` 返回的 `headings` 过滤 `depth === 2`）。
- **进度公式修正。** 原 `readable = offsetHeight - innerHeight * 0.72` 少减 `0.28 × innerHeight`，而文章之后只有约 268px 内容，所以视口高 ≥ ~1000px 时进度条**永远到不了 100%**，首页「继续阅读」里的"读完"状态也永远不会置位。改为几何定义：`(scrollY + innerHeight - articleTop) / articleHeight`，恢复时用同一公式反解，存取严格互逆。
- **滚动性能。** 原先每帧都读 `offsetTop/offsetHeight`（在 2 万像素文档上强制同步布局）并做一次完整的 `localStorage` 读+解析+序列化+写（同步阻塞的磁盘 API，60 次/秒）。现在布局量缓存在 `geom` 里（`resize` + `ResizeObserver` 时更新），落盘节流到停止滚动后 600ms，并在 `visibilitychange`(hidden) 与 `pagehide` 立即 flush。
- **顶栏自动隐藏改为累积位移 + 非对称滞回。** 原判据 `scrollY > lastScroll + 4` 而 `lastScroll` 每帧刷新，是**速度门限**（>240px/s）而非方向判断：慢速下滚永不隐藏；每次惯性滑动收尾都会减速到阈值以下导致顶栏**在你还在下滑时弹回**；隐藏与显示共用一个阈值可在 60Hz 下反复切换。现为下滚累积 72px 才隐藏、上滚 40px 就显示、换向清零，并加 `focusin` 强制展开 + `pointer-events: none`。
- 恢复位置：加 `history.scrollRestoration = "manual"`（避免与浏览器原生恢复抢位置），恢复条件加上限 `< 97`（否则读完一章再进来会被扔到章末）。
- 进度条去掉全站唯一的硬编码粉色 `#e980a6`（不随主题变化，浅色下仅 2.55:1）、常驻的 18px 辉光、以及那个永远跑不完的 `transition: width 80ms`（width 每帧被 JS 改写，只带来恒定 80ms 滞后）。
- 弹窗可点遮罩关闭（原先只有 Esc 和 44px 关闭按钮）。
- `.reader-header__actions` 加 `gap: 2px`（三个 44px 圆形按钮原先边缘相接，hover 圆会粘连成一条）。

### 1.7 About 页

- Swim 场景保留为满屏首屏，下方「关于」内容区仅保留左上角可见的 `<h1>`，全文档只有一个 `<h1>`、无悬空 `aria-labelledby`。
- **恢复页脚。** 这原是全站唯一 `hideFooter` 的页面，叠加"手机端隐藏导航文字链"后，手机访客落到 /about 就**没有任何出口**。
- 字体作用域修正：日文 sans 收缩到 Swim 场景内，新增的中文段落使用站内 `--font-sans` / `--font-serif`。
- **播放控件在触屏上的可发现性。** 展开露出文字的行为原本只在 `@media (hover: hover) and (pointer: fine)` 或 `:focus-visible` 下生效，手机上只剩一个圆圈，而里面的 `bilibili` 图标是小电视轮廓（**没有播放三角**）。现在触屏默认就是带文字的胶囊，文案从孤立英文 `Play` 改为**「B 站播放」**。
- 重复歌词标记：见 §2。

### 1.8 主题切换

页头保持清晰的**明暗二态切换**，阅读器设置仍提供「跟随系统」（契约见下，供后续开发对齐）：

| 项 | 值 |
|---|---|
| `localStorage["shiyue-theme"]` | 仅 `"light"` \| `"dark"`；**key 不存在 = 跟随系统**（选 system 时执行 `removeItem`） |
| `html[data-theme]` | 已解析主题，恒为 `"light"` \| `"dark"`（所有 CSS 仍按此选择） |
| `html[data-theme-pref]` | `"system"` \| `"light"` \| `"dark"` |
| `[data-theme-choice="system\|light\|dark"]` | 显式设置器；`aria-pressed` 对比 **pref** 而非已解析主题 |
| `[data-theme-toggle]` | 根据已解析主题在 `light ↔ dark` 间切换，并保存显式选择 |
| `html.theme-ready` | 首帧后添加，供 `html.theme-ready …` 的过渡使用（有 300ms 定时器兜底，防后台标签页 rAF 不触发） |

- 首次访问仍跟随系统，且监听 `matchMedia` 的 `change`；阅读器设置可随时显式回到「跟随系统」。
- 页头不呈现偏好状态，只显示下一步动作：当前为浅色时显示月亮并标注「切换到夜间模式」，当前为深色时显示太阳并标注「切换到日间模式」。点击后保存明确的浅色或深色偏好，不再出现含义不直观的电脑图标。
- 主题过渡只作用于 `background-color` / `border-color` / `color`（多段渐变不可插值，加了也是硬切）。

### 1.9 交互状态与可访问性

- **三处 hover 与「已选中」共用同一条规则**（视觉上零差异），已全部拆开：
  - `.filter-button` → 四态（默认 / hover 未选中 / 选中 / 选中+hover）。原先鼠标移到未选中项上，屏幕上会同时出现两个实心蓝按钮。
  - `.reader-toc a` → hover 轻反馈 / `aria-current` 强标记（3px 左标 + `font-weight: 600`）。原先划过目录时每一项都像"当前章节"。
  - `.reader-toc__sections a:hover` 曾被 `.reader-toc a:hover:not(...)`（特异性 0,3,1 > 0,2,1）压过，已改为 `.reader-toc .reader-toc__sections a:hover` 并置于源序更后。
- **主导航补 `aria-current`**（关于 → `page`，馆藏 → `location`，后者指向首页内锚点而非独立文档），配套的当前页文字高亮样式。用 `withBase()` 比较，兼容 GitHub Pages 子路径。
- 移动端 `.filter-button` 38px → **44px**（原先低于触摸下限，而旁边的搜索框是 54px）。
- **移动端导航不再消失。** 原先 ≤720px 把 `.site-nav__link` 整个 `display: none` 且**全站没有汉堡菜单**。现改为图标化收窄（`padding-inline: 10px` / 13px），实测 390px 视口下页头内还余 **53px**，320px 最小宽度也能容纳。
- 「继续阅读」卡片内四行原先挤成一坨——`.continue-reading p`（特异性 0,1,1）静默覆盖 `.eyebrow`（0,1,0），把 25px 下边距清零、12px 改成 13px。实测间距 **0 / 4 / 0 px → 10 / 6 / 14 px**。
- **图标描边随尺寸补偿。** `viewBox` 恒为 24 而 `size` 在 15–22 之间变化，所以实际渲染粗细是 `strokeWidth × size / 24`——15px 图标画出 1.125px、22px 画出 1.65px，同一行里**光学粗细相差 47%**。现在 `Math.min(2.6, strokeWidth * 24 / size)`，实测全站恒为 **1.8px**（仅 15px 处因 clamp 为 1.625px）。**未改动任何调用点**。
- 404 巨型数字：`opacity: .22` × 描边 46% alpha = 有效 0.101 → **1.18:1，比它背后的装饰网格（1.30:1）还弱**；且 620px 字号配 1px 描边等于没有笔画。现为 `opacity: 1` + `clamp(2px, 0.42vw, 5px)` 描边 34% → **1.65:1**。

### 1.10 清理

净减 30 行死代码：

| 项 | 为什么是死的 |
|---|---|
| 六套 `.book-cover[data-accent="cinnabar\|moss\|indigo\|ochre\|plum\|slate"]`（35 行） | `BookCover.astro` 从不输出 `data-accent`，且 schema 把 `accent` 限制为 hex，值永远不可能是这些名字 |
| `.book-cover--small` ×2 | 全部 5 个 `<BookCover>` 调用点都传 `size="large"` 或省略；`Props["size"]` 也已收窄 |
| `.section-heading` 的 `display:flex` / `space-between` / `gap` / `align-items` | 只有一个子元素，为之准备的第二个子元素已不存在 |
| `.library-results { margin: -24px … }` | 负边距 hack，只为抵消上方 `.library-tools` 过大的 42px；已改为治因（42 → 24） |
| `site.config.ts` 的 `accent: "cinnabar"` | 全仓零引用，且是暖色时代的名字——既不准确又不被读取 |
| `@media` 里的 `.statement__mark { position: static }` | 基础规则的 `sticky` 已删，此覆盖失效 |

`.statement__mark` 的 `position: sticky; top: 120px` 也已删除——实测它在滚动位置 0 就把巨型「读」字**下推 120px**（改 `static` 后差值归零），而该区块只有约 640px 高，sticky 根本没有作用范围。

---

## 2. 关键决策

1. **品牌方向 = Swim 蓝。** 见 §0。暖米/朱砂不是"原始设计"。
2. **深色装饰带 ≠ 深色主题阅读面。** `hero` / `site-footer` / `statement` 区块 / About 页 / `html.fixed-dark-page` 的 `#030817` 是**有意保留**的近黑装饰带（在浅色主题下也存在），与深色主题的阅读面 `--paper: #0b1220` 是两回事，**不要统一**。前者承载的是短促的展示性文字，后者要承载长文阅读。
3. **About 页第 1、3 行完全相同的日文歌词是原曲反复，不是复制粘贴 bug。** 该行保留 `repeat: true` 和 `aria-label="反复 · …"` 供辅助技术区分，不再显示额外的视觉标记。**不要"修复"。**
4. **书卡采用「封面保留链接但移出 tab 顺序与无障碍树」，而不是拉伸伪元素。** 拉伸链接（`.book-card__title a::after { inset: 0 }`）会让书名/作者/摘要**无法用鼠标选中**——对读书站点，复制书名是很自然的操作。当前方案同样把 tab stop 减半、无障碍树里每本书只出现一次，且文字可选中。实测每卡 2 个 `<a>`、**1 个可聚焦**、1 个 `aria-hidden`。
5. **`aria-hidden="true"` 配 `tabindex="-1"`** 用在封面链接上是有意的冗余链接消除模式，不是错误。

---

## 3. 已识别但尚未处理

按建议优先级排列。每项都在浏览器中确认过仍然存在。

### P1 · 首屏比例：书架完全在折线之下

实测 1440×900：`.hero` 高 **760px**（`min-height` 固定值），其中 `.hero__copy` 只占 499px——**261px 是空的**；`#library` 从 y=760 开始，「全部馆藏」标题在 y=**934**，即折线**之下 34px**。1366×768 的笔记本上更差。首屏没有任何滚动提示，而书架正是站点的全部意义所在。

建议把 `min-height: 760px`（`global.css:350` 与 `:390`）改为 `clamp(560px, 80svh, 720px)`，让馆藏标题露出一角；或加滚动指示。同时 `.hero__copy { padding-block: 90px 74px }` 的非对称内边距与网格自身的 `align-items: center` 在互相抵抗。

### P1 · 间距 / 字号 / 圆角尚未 token 化

这是让设计"像被设计过"最高杠杆的一项，但它是一次全文件替换级的重构，本轮未做。现状：

- **间距**：`:root` 里只有 `--shell` 和 `--header-height` 两个布局变量，**没有任何 `--space-*`**。全文 padding/margin/gap 用了约 55 个不同的 px 值，半数不落在 4px 网格上（3 / 5 / 7 / 9 / 13 / 15 / 21 / 23 / 25 / 46 / 67 / 74 …）。建议 `4/8/12/16/24/32/48/64/96`。
- **字号**：固定 px 有 13 级挤在 10–25px 的窄区间，产生大量不可分辨的近邻（11 vs 12、12 vs 13、18 vs 19、24 vs 25）。建议压到 6 级。另有三条 `clamp()` 标题几乎重合（`clamp(44px,7vw,88px)` / `clamp(46px,7vw,82px)` / `clamp(48px,6.4vw,82px)`），可合并为一个 `--fs-h1`。
- **圆角**：「书脊」非对称圆角是个好母题，但衍生出 **9 个互不相同的变体**（`2px 7px` / `2px 8px` / `2px 11px` / `2px 16px` / `2px 18px` / `2px 20px` / `3px 10px` / `3px 16px` / `3px 20px` / `3px 22px` / `3px 30px`），书脊侧在 2px 和 3px 之间随机摇摆（屏幕上不可分辨，纯噪音）。同时 `.button` 是 `border-radius: 999px` 药丸，与书脊母题冲突——首页 hero 的「浏览馆藏」是药丸、紧邻的筛选按钮是书脊，像两套 UI kit。建议收敛为 4 档 `--r-xs/sm/md/lg`，并让 `.button` 也用书脊（`.icon-button` 是 44×44 正方形，`999px` 得正圆，可以保留）。

### P2 · 中文衬线在裸 Windows 上仍是宋体

本轮把 Georgia 提到 CJK 之前，修好了**拉丁**部分，但**中文大标题在没装思源宋体/Noto Serif SC 的 Windows 上仍会落到 SimSun**——一个为 96dpi 位图时代设计的字体，在 130px 的品牌字上笔画粗细失衡。整个视觉识别压在 `--font-serif` 上，这是唯一值得上 webfont 的地方：思源宋体 SC 子集（品牌四字 + 拉丁，woff2 约 8KB）绑到一个独立的 `--font-display`，配 `font-display: swap`。

### P2 · `body { font-size: 16px }` 覆盖用户浏览器字号设置

把默认字号调大的用户（低视力、老年、或只是觉得默认太小）设置完全无效。**改这一行并不能解决问题**——全站字号几乎都是硬编码 px，根字号变了它们也不跟。阅读器正文因为有滑杆而豁免，受害的是"找书"环节（书架、检索、详情），恰恰是最需要看清的部分。需要把正文级 px 换算成 rem 才算真正修好。

### P2 · `background-attachment: fixed` 的滚动重绘

`global.css:108` 的 `body { background-attachment: fixed }` 使背景无法随内容一起合成，Chromium 在每个滚动帧重绘整个视口背景区；叠加 `backdrop-filter`（需要对身后已绘制内容拍快照）是**相乘**关系。评审时提过的解法是把固定背景移到一个独立合成层：

```css
body { background: var(--paper); }
body::before {
  position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background: /* 原来那三层 */;
  will-change: transform;
  content: "";
}
```
顺带可以删掉 `.about-page / .reader-body { background-attachment: scroll }` 这两条绕开问题的覆盖。**本轮 backdrop-filter 已从 5 处降到 2 处，问题已大幅缓解，但根因仍在。**

### P2 · 装饰层强度处在可见阈值边缘

`.hero::before` 的竖网格线是 `rgba(199, 220, 255, 0.027)`，实测约 **1.04:1** ≈ 5/255 灰阶——在多数 IPS 笔记本屏上要么消失、要么以色带（banding）形式出现。同类还有 `.hero::after` 的 `0.025 / 0.015` 扩散环。它们付了渲染成本却没交付视觉信息。要么提到可辨阈值（网格线约 0.075 alpha），要么删掉。

`.progress-track` 的空态底色是 `--line`（0.13 alpha，**1.30:1**），意味着**空进度条几乎看不见**，用户看到的是一段孤零零的蓝线。建议 `color-mix(in srgb, var(--ink) 14%, transparent)`。

### P3 · 零散项

- **`.reader-dialog__body` 没有 `max-height` / `overflow`**（`global.css:1841`）。移动端目录弹窗 13 项 ≈ 788px，360×640 的手机上会溢出，靠 UA 默认的 `dialog{overflow:auto}` 兜底，但滚动时含关闭按钮的头部会一起滚走。需要 `display:flex` + 头部 `flex:0 0 auto` + body `overflow-y:auto`。
- **`.book-card__progress` 是普通 `<div>` 却带 `aria-label="阅读进度"`**（`BookCard.astro:48`）。无 role 的通用容器上 `aria-label` 在多数屏幕阅读器中不会被朗读。应改 `role="progressbar"` + `aria-valuenow`，或让百分比文本本身可读。
- **`.reader-navigation` 在无上一章时渲染空 `<span />`**（`[chapter].astro:168`）。桌面 `1fr 1fr` 下无害，移动端单列 + `gap: 20px` 会多出一个空行。改为条件不渲染，或 `.reader-navigation > span:empty { display: none }`。
- **`.brand__subtitle` 是 10px 衬线拉丁**（`global.css:235`）。「Swim Library」在 10px 下用 Georgia 的小字号渲染偏frail；且 `letter-spacing: 0.13em` + `opacity: 0.64` 叠加后更弱。建议 11px / opacity 0.72。
- **页脚没有品牌收尾**。页头有一整套品牌系统（书脊「拾」字标 + 双行名称），页脚只有一行 12px 文字——页面从"有身份"滑到"无身份"结束。可以复用 `.brand__mark` 做首尾闭合。
- **`text-autospace` / `text-spacing-trim` 的浏览器支持有限**，是渐进增强。若要保证所有引擎一致，需要在构建期用 remark 插件在中英之间插入间隙元素。
- **品牌命名仍是两个无关的名字**。「拾页书馆」（拾起书页）与「Swim Library」（游泳）没有翻译或语义关系，页头把它们上下堆叠，且英文名以 10px / opacity 0.64 呈现——说明设计者自己也不确定它该有多重要。既然品牌方向已定为 Swim 蓝，可以让 Swim 只活在 /about 作为一首歌的名字（删掉 `.brand__subtitle`），或给英文名换一个与中文名对应的写法。

---

## 4. 如何复现测量

本文所有对比度与几何数字都是在真实渲染中取的，方法如下（Chrome DevTools Console 即可）。

**两个坑，务必注意：**

1. **主题过渡会污染读数。** 本轮给 `.reader-main`、`.chapter-link` 等加了 `transition: background-color / color`。切换 `data-theme` 后立刻 `getComputedStyle` 拿到的是**过渡起始值**（旧主题的颜色）。测量前先 `document.documentElement.classList.remove('theme-ready')`，或直接读自定义属性（`getPropertyValue('--ink')`，自定义属性不参与过渡）。
2. **`getComputedStyle` 可能返回 `color(srgb …)` 格式**，其中 rgb 是 **0–1 浮点**而非 0–255。用 `match(/[\d.]+/g)` 硬解会得出完全错误的结果。

```js
const parse = (s) => {
  s = s.trim();
  const n = s.match(/[-\d.]+(?:e[-+]?\d+)?/gi).map(Number);
  if (/^color\(/i.test(s))
    return { r: n[0] * 255, g: n[1] * 255, b: n[2] * 255, a: n[3] ?? 1 };
  return { r: n[0], g: n[1], b: n[2], a: n[3] ?? 1 };
};
const lum = (c) => {
  const f = (v) => ((v /= 255), v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
};
// 半透明前景/背景必须先与其背后的颜色合成，否则算出的比值没有意义
const comp = (fg, bg) => ({
  r: fg.a * fg.r + (1 - fg.a) * bg.r,
  g: fg.a * fg.g + (1 - fg.a) * bg.g,
  b: fg.a * fg.b + (1 - fg.a) * bg.b,
  a: 1,
});
const ratio = (a, b) => {
  const [la, lb] = [lum(a), lum(b)];
  return +((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(2);
};
```

**测每行汉字数**（不要用 `ch`，它是数字 "0" 的宽度）：

```js
const p = document.querySelector('.reader-prose p');
const probe = document.createElement('span');
probe.style.whiteSpace = 'nowrap';
probe.textContent = '国'.repeat(20);
p.appendChild(probe);
const one = probe.getBoundingClientRect().width / 20;
p.removeChild(probe);
console.log(p.getBoundingClientRect().width / one);
```

**本地运行**（本机没有 pnpm，用仓库内的 astro 二进制）：

```bash
node node_modules/astro/bin/astro.mjs dev
node node_modules/astro/bin/astro.mjs check
node node_modules/astro/bin/astro.mjs build
```

---

## 5. 验证状态

- `astro check`：18 个文件，**0 errors / 0 warnings / 0 hints**
- `astro build`：**30 页**全部构建通过（含新增的 accent 亮度护栏）
- 浏览器实测覆盖：首页 / 书籍详情 / 阅读器（两本书）/ About / 404，1440×900 与 390×844，浅色与深色主题

改动涉及的文件：

```
src/styles/global.css                     （主要）
src/layouts/BaseLayout.astro              （主题偏好与明暗切换）
src/components/{Header,Footer,BookCard,BookCover,Icon}.astro
src/pages/index.astro
src/pages/about.astro
src/pages/books/[slug].astro
src/pages/read/[book]/[chapter].astro
src/content.config.ts                     （accent 亮度护栏）
src/site.config.ts                        （删死字段）
```
