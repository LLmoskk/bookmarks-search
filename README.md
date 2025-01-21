# Bookmark Search Extension

一个帮助你在浏览器收藏夹中快速搜索的浏览器插件。通过关键词，你可以在指定的网站范围内快速找到所查询的关键词。

A browser plug-in that helps you quickly search in browser bookmarks. By keywords, you can quickly find the keywords you are looking for within the specified website range.

![20250121112423_rec_](https://github.com/user-attachments/assets/07ae4c46-e2eb-4d73-81b2-85698cff4d4b)

## 开发指南 / Development Guide

这是一个基于 [Plasmo 框架](https://docs.plasmo.com/) 开发的浏览器插件项目。

This is a browser plug-in project based on [Plasmo Framework](https://docs.plasmo.com/).

### 开始开发 / Getting Started

首先，运行开发服务器：

```bash
pnpm dev
# or
npm run dev
```

在浏览器中加载对应的开发版本。例如，如果你在为 Chrome 浏览器开发（使用 manifest v3），请加载：`build/chrome-mv3-dev`。

Load the corresponding development version in the browser. For example, if you are developing for Chrome browser (using manifest v3), load: 'build/chrome-mv3-dev'.

### 构建生产版本 / Production Build

运行以下命令：

```bash
pnpm build
# or
npm run build
```

这将为你的扩展创建一个生产包，可以打包并发布到各应用商店。

## 贡献 / Contributing

欢迎提交 Pull Requests 来帮助改进这个项目！

Welcome to submit pull requests to help improve this project!

## 许可证 / License

MIT
