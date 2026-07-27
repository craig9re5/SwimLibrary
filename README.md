# 拾页书馆

> “拾页书馆”是暂定站名，可在 [`src/site.config.ts`](src/site.config.ts) 中统一替换。

一个面向公众的轻量在线藏书馆。站点使用 Astro 在构建期将书籍与章节 Markdown 生成为静态页面，并通过 GitHub Pages 发布；浏览、阅读与基础偏好设置均可在浏览器中完成，不依赖后端服务。

> 接手界面开发前请先读 [`docs/design-refactor-2026-07.md`](docs/design-refactor-2026-07.md)：记录了 2026-07 一轮视觉改造的全部改动、**不要回退的设计决策**（品牌方向、深色装饰带与深色主题的区别、About 页那两行"重复"歌词），以及尚未处理的重要问题。

## 首期范围

- 响应式书架首页与馆藏筛选
- 书籍详情、章节目录与 Markdown 阅读器
- 明暗主题、字号、行高和阅读宽度设置
- 收藏、阅读进度与继续阅读（仅保存在当前浏览器）
- 桌面端与移动端适配

## 技术栈

- [Astro](https://astro.build/) + TypeScript：静态站点生成与 Markdown 内容路由
- [Tailwind CSS](https://tailwindcss.com/)：界面样式与响应式布局
- pnpm 11：依赖管理
- GitHub Actions + GitHub Pages：自动构建与发布 `dist/`

## 本地运行

请先安装 Node.js 22.12.0 或更高版本，并启用 pnpm 11：

```bash
corepack enable
corepack prepare pnpm@11 --activate
```

安装依赖并启动开发服务器：

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm check    # 类型与 Astro 内容检查
pnpm build    # 生成静态站点到 dist/
pnpm preview  # 本地预览构建结果
```

## 书籍内容约定

推荐一书一目录、每章一个 Markdown 文件。书籍 slug 和文件名应使用稳定的小写英文、数字与连字符，避免后续改名导致已有阅读链接失效。

```text
src/content/books/
└─ example-book/
   ├─ index.md
   └─ chapters/
      ├─ 01-introduction.md
      ├─ 02-first-chapter.md
      └─ 03-second-chapter.md
```

- `index.md`：保存书籍级元数据和详情页简介。
- `chapters/*.md`：保存逐章正文，以及章节所属书籍和阅读顺序。
- 章节文件建议用补零序号开头，例如 `01-`、`02-`，便于人工浏览；页面顺序仍以内容配置中的明确顺序为准。
- 原始纯文本可以先按章节拆分，表格、脚注、公式和图片等增强语法再按实际书籍逐步处理。

书籍 `index.md` 的 front matter：

```yaml
---
title: 示例书名
slug: example-book
author: 示例作者
summary: 一段用于书架和详情页的简介。
category: 文学小说
tags:
  - 示例标签
published: 2026-01-01
updated: 2026-07-17
featured: false
accent: "#9E4B3F"
coverLabel: 示例 · 书名
rights: 版权来源或公开传播许可说明
---
```

章节 front matter：

```yaml
---
title: 第一章 示例章节
book: example-book
order: 1
excerpt: 可选的章节摘要
---
```

书籍目录名、书籍 `slug` 和章节 `book` 必须一致。`slug` 仅使用小写英文、数字与连字符；`order` 使用从 1 开始的正整数；`accent` 必须是带引号的六位十六进制颜色。具体校验规则见 [`src/content.config.ts`](src/content.config.ts)。新增书籍后应运行 `pnpm check` 和 `pnpm build`，确认元数据、章节链接及静态生成均正常。

## 部署到 GitHub Pages

仓库包含 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)。推送到 `main` 后，工作流会使用 Node.js 22 和 pnpm 11 安装依赖、检查项目、构建 `dist/`，再通过 GitHub 官方 Pages Actions 发布。

首次部署前，在 GitHub 仓库中打开 **Settings → Pages**，将 **Source** 设为 **GitHub Actions**。之后也可以在 Actions 页面手动运行该工作流。

### 项目子路径注意事项

GitHub Pages 项目站点通常位于：

```text
https://<用户名>.github.io/<仓库名>/
```

此时 Astro 的 `base` 必须是 `/<仓库名>/`；用户站点或自定义域名通常使用根路径 `/`。部署工作流会通过 `actions/configure-pages` 自动取得实际的 `origin` 与 `base_path`，并以 `SITE_URL`、`BASE_PATH` 环境变量传给 Astro 配置，无需在仓库名变化时手工修改工作流。

普通本地开发默认使用根路径 `/`。如需在 Windows PowerShell 中提前复现项目站点的子路径构建，可运行：

```powershell
$env:SITE_URL = "https://example.github.io"
$env:BASE_PATH = "/example-repository"
pnpm build
pnpm preview
```

测试结束后可执行 `Remove-Item Env:SITE_URL, Env:BASE_PATH` 清除这两个临时环境变量。

编写页面和组件时仍需遵守以下规则：

- 不要把站内链接或资源地址硬编码为 `/books/...`、`/covers/...` 这类根路径。
- Astro/TypeScript 代码中应基于 `import.meta.env.BASE_URL` 生成站内 URL。
- Markdown 正文中的图片优先使用相对于当前内容文件的路径；迁移旧书稿时应检查图片链接。
- 部署后至少验证首页、书籍详情、章节直达、刷新章节页面及静态资源加载。

## 公开内容说明

GitHub Pages 没有访问控制。进入仓库或构建产物的书籍正文与图片都应视为公开、可访问和可下载；提交内容前请确认书籍、译文与封面均具有公开传播权限，并保留必要的来源和许可信息。
