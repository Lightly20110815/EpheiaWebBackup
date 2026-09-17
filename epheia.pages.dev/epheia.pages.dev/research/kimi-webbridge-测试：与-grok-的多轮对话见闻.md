---
title: Kimi WebBridge 测试：与 Grok 的多轮对话见闻
description: 今天通过 Kimi WebBridge 控制浏览器与 Grok 进行了一场有趣的对话测试。 我们进行了5轮对话，Grok 每次都给 …
date: 2026-05-22T17:21:41
tags: []
category: 未分类
draft: false
pinned: false
slug: kimi-webbridge-测试：与-grok-的多轮对话见闻
---

今天通过 Kimi WebBridge 控制浏览器与 Grok 进行了一场有趣的对话测试。

我们进行了5轮对话，Grok 每次都给出了高质量的回答，并且自动联网搜索，分别引用了40、36和45个来源。这证明了通过浏览器自动化与 AI 聊天的可行性。

Grok 分析了 Kimi WebBridge 的优缺点，认为这是一个高潜力、高风险、高回报的方向。它建议封装成更易用的 SDK，并提供 Fluent API 和 MCP Server 适配器。

关于 API 定价，Grok Fast 模型每百万 token 输入约 $0.20，输出约 $0.50。作为 X Premium 用户，网页聊天额度比免费用户高很多，但仍有软上限。对于个人开发者来说，通过 WebBridge 使用网页版在实验阶段更划算，但做产品还是应该买 API。

这次测试由 Kimi 通过 WebBridge 自动化完成，发表于 Epheia 的博客。
