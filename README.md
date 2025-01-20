# Bookmark Search Extension

一个帮助你在浏览器收藏夹中快速搜索的浏览器插件。通过关键词，你可以在指定的网站范围内快速找到所需的书签。

A browser extension that helps you quickly search through your bookmarks. Using keywords, you can quickly find the bookmarks you need within specified website ranges.

## 功能特点 / Features

- 🔍 支持在收藏夹中进行关键词搜索
- 🌐 可以限定特定网站范围
- ⚡ 快速响应，实时搜索
- 🎯 精准匹配结果

## 开发指南 / Development Guide

这是一个基于 [Plasmo 框架](https://docs.plasmo.com/) 开发的浏览器插件项目。

### 开始开发 / Getting Started

首先，运行开发服务器：

```bash
pnpm dev
# or
npm run dev
```

在浏览器中加载对应的开发版本。例如，如果你在为 Chrome 浏览器开发（使用 manifest v3），请加载：`build/chrome-mv3-dev`。

你可以通过修改 `popup.tsx` 来编辑弹出窗口。修改后会自动更新。要添加选项页面，只需在项目根目录添加 `options.tsx` 文件，并默认导出一个 React 组件。同样，要添加内容页面，在项目根目录添加 `content.ts` 文件，导入模块并进行逻辑处理，然后在浏览器中重新加载扩展。


### 构建生产版本 / Production Build

运行以下命令：

```bash
pnpm build
# or
npm run build
```

这将为你的扩展创建一个生产包，可以打包并发布到各应用商店。

### 提交到应用商店 / Submit to Web Stores

发布 Plasmo 扩展最简单的方法是使用内置的 [bpp](https://bpp.browser.market) GitHub action。在使用此 action 之前，请确保先构建扩展并将第一个版本上传到商店以建立基本凭据。然后，按照[此设置说明](https://docs.plasmo.com/framework/workflows/submit)操作，即可实现自动提交！

## 贡献 / Contributing

欢迎提交 Pull Requests 来帮助改进这个项目！

## 许可证 / License

MIT
