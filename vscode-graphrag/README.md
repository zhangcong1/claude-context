# GraphRAG VS Code 插件

本插件用于将整个项目代码自动构建为知识图谱，并在 VS Code 中可视化展示。

## 功能规划

- 一键构建知识图谱（支持多语言代码解析）
- 节点/关系可视化，支持搜索与跳转
- 实时监听文件变更，自动增量更新图谱
- 支持语义检索与上下文导航

## 快速开始

1. 安装依赖：`npm install` 或 `pnpm install`
2. 编译插件：`npm run compile`
3. 在 VS Code 中调试/运行插件

## 目录结构

- src/extension.ts 插件主入口
- package.json 插件配置
- tsconfig.json TypeScript 配置

## 后续开发建议

- 集成 AST 解析与实体关系抽取
- Webview 集成 D3.js/Cytoscape.js 实现图谱可视化
- 结合 claude-context 项目实现语义检索能力
