# DSWebBackup — Epheia 前端站点离线备份

备份时间：2026-09-16 / 17（UTC+8）
备份方式：`wget` 整站镜像（HTML/CSS/JS/图片/字体，链接已转换为相对路径）；源站不可访问的域名从 **Internet Archive Wayback Machine** 快照镜像。

## 目录一览

| 目录 | 站点 | 大小 | 来源 | 说明 |
|---|---|---|---|---|
| `epheia.pages.dev/` | https://epheia.pages.dev | 6.3M | 直连抓取 | Astro 站点，含全部文章/文档页面、`rss.xml`、`llms.txt`、28 个 Markdown 源文件、**完整 Pagefind 搜索索引**（离线搜索可用） |
| `blog.epheia.moe/` | https://blog.epheia.moe | 115M | Wayback 快照（2026-06 为主，混合 2025-12~2026-02 各期快照） | 源站 526 不可达；见下方限制说明 |
| `eph.moe/` | https://eph.moe | 128K | 直连抓取 | 短链接站前台（首页/登录页/样式）。外链 `resource.epheia.moe` 的 CSS 与背景图已从 Wayback 补齐到本地 |
| `awa.desuwa.org/` | https://awa.desuwa.org | 8.5M | 直连抓取 | 主页 + `flag/`（骄傲旗生成器）+ `meme/`（表情包生成器）+ `renderer/`（对话渲染器）；Tailwind、FontAwesome、Remixicon、Roboto 字体、js-yaml、marked、Material Web 模块全部本地化 |
| `nya.epheia.moe/` | https://nya.epheia.moe | 544K | Wayback 快照（2026-06-04） | 首页 + 4 个 policy 子页，含 cdn.epheia.moe 的共用 CSS/JS |
| `desuwa.org/` | https://desuwa.org | 8K | 直连记录 | 该域名为 301 跳转到 `awa.desuwa.org`，无独立前端；已保存响应头与跳转说明页 |
| `nyaepheia.pages.dev/` | https://nyaepheia.pages.dev | 246M | 直连抓取（站内链接发现，额外备份） | Epheia 的 X(Twitter) 存档 SPA：tweets.json（8MB 推文数据）、799 个媒体文件（224MB 图片/视频）、语义搜索前端（embeddings 23MB 已内置） |

## 如何离线查看

所有镜像已做链接本地化，直接双击 `index.html` 可看大部分页面；**推荐用本地 HTTP 服务**（ES 模块、Pagefind 搜索等需要）：

```bash
# 每个站点的内容在其目录下的同名子目录，例如：
cd epheia.pages.dev/epheia.pages.dev
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000/
```

各站内容入口：
- epheia.pages.dev → `epheia.pages.dev/epheia.pages.dev/index.html`
- blog.epheia.moe → `blog.epheia.moe/web.archive.org/web/20260604214342/https:/blog.epheia.moe/index.html`（Wayback 目录结构）
- eph.moe → `eph.moe/eph.moe/index.html`
- awa.desuwa.org → `awa.desuwa.org/awa.desuwa.org/index.html`
- nya.epheia.moe → `nya.epheia.moe/web.archive.org/web/20260604214329/https:/nya.epheia.moe/index.html`
- nyaepheia.pages.dev → `nyaepheia.pages.dev/nyaepheia.pages.dev/index.html`

## blog.epheia.moe 已知限制（Wayback 收录不全）

以下内容 **Wayback Machine 从未抓取**，无法恢复（离线打开时相关链接会 404）：

- 未收录的文章：`/a/235`、`/a/262`、`/a/265`、`/a/268`、`/a/271`、`/a/280`、`/a/283`
- 未收录的说说：`pride2026`、`tdov2026`、`pride-month-begins-in-one-week`、`不错`、`210` 之外的若干
- 未收录的存档页：`/a/date/2026/03`、`/a/date/2026/05`、`/评论/`
- 主题资源缺失：Sakurairo 主题 CSS 仅收录了 `3.0.4` 版本（已用其替代页面上的失效链接）；Webpack 异步 chunk `9308.js`、`4493.js`、`theme-color-worker.js` 未被收录，主题 JS 的个别交互可能不生效

收录到的内容：文章 `/a/6`、`/a/119`、`/a/140`、说说 `210`、`刚搭好状态页就有用了`、作者页、2025/10 存档页，以及全部页面引用到的图片、字体、主题 JS/CSS（185+ 图片、500+ 字体文件）。

## 其他说明

- `*/wget.log`、`*/wget_pages.log`、`*/wget_sub.log` 为各站抓取日志（原始地址、时间戳可查）。
- 抓取期间对 Internet Archive 的批量请求触发了限流，不影响已完成内容。
- 动态后端功能（如 eph.moe 的短链跳转、博客的实时评论）属于服务端行为，前端备份不包含。
- `nyaepheia.pages.dev` 的语义搜索需要联网加载模型（设计如此）；其余浏览功能完全离线。
