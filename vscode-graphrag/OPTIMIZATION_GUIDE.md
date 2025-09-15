# GraphRAG 优化指南

## 问题分析

Vue CLI 项目生成几十万行知识图谱的问题主要源于：

1. **过多的依赖文件**：`node_modules` 目录包含大量第三方库
2. **构建产物**：`dist`、`build` 等目录包含编译后的文件
3. **测试文件**：测试文件通常不需要包含在知识图谱中
4. **配置文件**：各种配置文件增加了图谱复杂度
5. **文档文件**：README、CHANGELOG 等文档文件

## 优化方案

### 1. 增强的文件忽略规则

#### 默认忽略目录
- `node_modules/` - Node.js 依赖
- `dist/`, `build/`, `out/` - 构建输出
- `coverage/` - 测试覆盖率报告
- `public/`, `static/`, `assets/` - 静态资源
- `tests/`, `__tests__/`, `test/`, `spec/` - 测试文件
- `docs/`, `documentation/` - 文档目录
- `.vscode/`, `.git/` - IDE 和版本控制

#### 默认忽略文件模式
- `*.test.*`, `*.spec.*`, `*.e2e.*` - 测试文件
- `*.min.js`, `*.min.css` - 压缩文件
- `*.config.js`, `*.config.ts` - 配置文件
- `.env*`, `*.local` - 环境配置文件
- `*.log`, `*.lock` - 日志和锁文件

### 2. 文件大小限制

- **最大文件大小**：50KB
- **最大代码长度**：100KB 字符
- 超过限制的文件会被跳过

### 3. 节点数量限制

- **TypeScript/JavaScript 文件**：最多 100 个节点
- **Vue 文件**：最多 50 个节点
- 超过限制后停止解析

### 4. 智能过滤

- **只解析导出的内容**：优先处理 `export` 的变量、函数、类
- **跳过私有方法**：不解析 `private` 修饰的方法
- **限制相对导入**：减少内部模块的导入关系
- **简化 JSON 解析**：只创建根节点，不深入解析结构

### 5. 自定义忽略配置

创建 `.graphragignore` 文件来自定义忽略规则：

```gitignore
# 自定义忽略规则
custom-dir/
*.custom
special-file.js
```

### 6. Vue 模板解析开关（默认关闭）

- 新增 `includeTemplate` 选项控制是否解析 `<template>`：默认 `false`
- 解析器调用示例：

```ts
parseVueFile(filePath, {
  maxNodesPerFile: 50,
  maxFileSize: 50 * 1024,
  skipMinifiedFiles: true,
  skipTestFiles: true,
  includeTemplate: true // 开启模板解析（可选）
});
```

- 开启后仍有上限保护（如模板节点最多 50 个），避免图谱爆炸。

## 使用方法

### 1. 基本使用

插件会自动应用优化规则，无需额外配置。

### 2. 自定义配置

在项目根目录创建 `.graphragignore` 文件：

```gitignore
# 忽略特定目录
my-custom-dir/
generated/

# 忽略特定文件
*.generated.js
temp-*.ts

# 忽略特定模式
**/vendor/**
**/third-party/**
```

### 3. 调整解析选项

如果需要调整解析参数，可以修改 `src/extension.ts` 中的配置：

```typescript
// 调整节点数量限制
maxNodesPerFile: 50,  // 减少到 50 个节点

// 调整文件大小限制
maxFileSize: 25 * 1024,  // 减少到 25KB

// 启用/禁用特定功能
skipMinifiedFiles: true,
skipTestFiles: true,
includeTemplate: false
```

## 效果对比

### 优化前
- Vue CLI 项目：~500,000 个节点
- 包含大量依赖和测试文件
- 图谱过于复杂，难以理解

### 优化后
- Vue CLI 项目：~1,000-5,000 个节点
- 只包含核心业务代码
- 图谱清晰，易于分析

## 建议

1. **定期清理**：定期运行"清空图谱"命令重新构建
2. **自定义忽略**：根据项目特点调整 `.graphragignore`
3. **监控大小**：关注图谱节点数量，避免过大
4. **选择性解析**：只解析重要的源代码文件

## 故障排除

如果图谱仍然过大：

1. 检查 `.graphragignore` 文件是否正确配置
2. 确认项目中没有过大的文件
3. 考虑进一步减少 `maxNodesPerFile` 参数
4. 检查是否有循环依赖导致重复解析
