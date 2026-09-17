---
title: 一个静态粉丝站域名被误报为恶意C&C，导致注册商暂停的全过程分析
description: 内容声明：Made with AI 2026年2月底，我注册不久的域名 sakurabaema.com 突然在 Porkbun 仪 …
date: 2026-03-08T19:41:02
tags:
  - 网站
  - 运维
category: 网站运行
draft: false
pinned: false
slug: 一个静态粉丝站域名被误报为恶意cc，导致注册商
---

> 内容声明：Made with AI

2026年2月底，我注册不久的域名 sakurabaema.com 突然在 Porkbun 仪表盘显示 “Domain Suspended”，状态为 client hold，同时 Cloudflare 仪表盘出现 phishing 拦截页面。

网站本身只是一个托管在 Cloudflare Pages 上的纯静态粉丝页面（指向 sakurabaema.pages.dev），内容为文字介绍游戏角色，无任何表单、下载、脚本交互或外部 API 调用。

整个事件从触发到恢复历时约10天，以下是完整的技术时间线与原因分析。

## 1\. 触发源头：威胁情报平台的“contacted domain”误报

2026年2月26-27日，域名被 ThreatFox（abuse.ch）标记为 win.asyncrat 的 botnet\_cc（C&C服务器），并关联到一个名为 WinLauncher.exe 的恶意文件（VirusTotal 显示该文件 50/70 检测恶意）。

VirusTotal 的 Relations 标签页显示，该恶意样本在沙箱运行时“contacted”了 sakurabaema.com（出现在 Contacted Domains 列表中，检测数 8/93）。

**为什么一个刚注册（2025-11-23）的静态粉丝域名会被恶意样本联系？**

最可能的原因是恶意软件作者将该域名硬编码为测试地址或占位符，也可能是样本传播过程中，某个感染环境或测试者访问了我的域名链接，导致沙箱记录了这次 HTTP 请求。AsyncRAT 通常使用固定 C2 配置而非 DGA（域名生成算法），因此更可能是前者。

另一种可能是样本传播过程中，某个感染环境或测试者访问了我的域名链接，导致沙箱记录了这次 HTTP 请求。

这属于典型的被动污染（collateral damage）：域名本身未托管任何恶意内容，只是被外部样本“碰瓷”记录。

## 2\. 情报传播与自动化响应链

ThreatFox 的 IOC（Indicators of Compromise）自动共享到 VirusTotal、Netcraft 等平台。

CleanDNS（Porkbun 外包的滥用处理系统）于2月28日收到报告，自动访问域名并生成截图证据。

截图很可能显示 Cloudflare 的拦截页面（403 Forbidden 或 phishing warning），被系统误判为“域名正在从事 malware abuse”。

Porkbun 根据 CleanDNS 报告，直接对域名设置 client hold，导致域名整体暂停（即使 NS 记录仍指向 Cloudflare）。

Cloudflare 同步收到情报，启用网络钓鱼拦截页面，并最终暂停（suspend）域名 zone，并最终触发“stopped using our name servers”通知邮件。

## 3\. 申诉与恢复过程

关键一步：回复 CleanDNS 的原始通知邮件，而非发送到 abuse@porkbun.com（后者已被 Porkbun 废弃，转由 CleanDNS 处理）。

申诉内容重点：

\- 域名注册时间晚于游戏发售，内容为纯静态文本页面（附 Pages.dev 截图）。

\- 无任何可执行文件、C&C 通信、下载行为。

\- VirusTotal 关联为“contacted domains”误报，而非主动托管恶意。

\- CleanDNS 审核后认定为 false positive，通知 Porkbun 移除 suspension。

\- 2026年3月7日左右，Porkbun 正式回复：已移除 suspension，并警告若后续再有报告可能再次暂停。

\- 同日，Cloudflare 邮件通知域名重新激活（Free 计划下），网络保护与速度提升已恢复。

## 4\. 技术教训与防护建议

\- 小型、低流量域名的声誉极易被情报系统被动污染，一旦进入传播链，注册商/CDN 会快速零容忍响应。

\- VirusTotal 的“contacted domains”机制虽有助于检测真实 C&C，但也容易产生 false positive，尤其是 DGA 或随机字符串生成的域名。

\- 申诉成功的关键：回复正确的渠道（CleanDNS 原始邮件），并提供强证据（注册时间、当前内容截图、VirusTotal 关联解释）。

这次事件本质上是威胁情报自动化传播与注册商零容忍策略的副产品，对小型独立站点影响尤其大。希望这个分析能帮到同样遇到域名误报的朋友。

（完）
