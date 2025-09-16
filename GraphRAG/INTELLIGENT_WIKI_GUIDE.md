# 🧠 智能Wiki生成器使用指南

## 概述

智能Wiki生成器是GraphRAG插件的全新功能，它能够：

1. **🔍 智能功能发现**：基于语义搜索自动发现项目中的关键功能
2. **📝 完整代码收集**：为每个功能收集相关的完整代码文件
3. **🏗️ 架构层次分析**：分析功能的入口、核心逻辑、辅助函数
4. **📋 详细文档生成**：为每个功能生成包含代码、流程、依赖的详细wiki

## 🚀 快速开始

### 1. 生成完整项目Wiki

使用命令面板 (`Ctrl+Shift+P`) 执行：
```
GraphRAG: 智能Wiki生成器
```

这将：
- 🔍 扫描整个项目构建知识图谱
- 🤖 使用AI语义搜索发现关键功能
- 📚 生成完整的项目wiki文档

### 2. 分析特定功能

使用命令面板执行：
```
GraphRAG: 功能分析器
```

然后输入要分析的功能，例如：
- "用户登录"
- "数据验证" 
- "文件上传"
- "权限管理"

## 📋 生成的文档结构

### 主要文档

- **README.md** - 项目概览和统计信息
- **FEATURES.md** - 发现的功能模块概览
- **API_REFERENCE.md** - 类、函数、接口参考

### 功能详细文档 (features/ 目录)

每个发现的功能都会生成详细文档，包含：

#### 📊 功能统计
- 相关代码实体数量
- 涉及文件数量
- 外部依赖数量

#### 🏗️ 架构组成
- **入口节点**：主要的对外接口函数
- **核心逻辑**：实现功能的主要代码
- **辅助函数**：支持功能的工具方法

#### 🔄 执行流程
- 详细的代码执行步骤
- 每个步骤的位置和代码片段
- 函数调用关系追踪

#### 📁 完整代码文件
- 功能相关的所有文件完整代码
- 确保AI能理解完整的功能实现

#### 🔗 外部依赖
- 功能依赖的外部模块和库

## 🔍 工作原理

### 1. 语义搜索功能发现

系统使用预定义的功能查询词进行语义搜索：

```typescript
const featureQueries = [
    '用户登录认证',
    '用户注册', 
    '数据验证',
    '文件上传',
    '权限管理',
    '配置管理',
    // ... 更多功能
];
```

### 2. 智能代码收集

对于每个发现的功能：
1. 📝 收集语义相关的代码节点
2. 📂 按文件分组相关节点
3. 📖 读取完整文件代码
4. 🔗 分析节点间的调用关系

### 3. 功能架构分析

自动将代码节点分类为：
- **入口节点**：包含 main, init, handle, process 的函数
- **核心逻辑**：主要业务代码
- **辅助函数**：包含 util, helper, tool 的工具函数

### 4. 执行流程追踪

通过知识图谱中的调用关系：
1. 🎯 从入口节点开始
2. 🔄 递归追踪函数调用
3. 📝 记录执行步骤和代码
4. 🛑 避免无限递归（深度限制5层）

## 💡 使用技巧

### 1. 功能分析最佳实践

使用**具体**和**功能导向**的查询词：

✅ **好的查询**：
- "用户登录认证"
- "文件上传处理"
- "数据验证逻辑"
- "权限检查"

❌ **避免的查询**：
- "代码"
- "函数" 
- "文件"
- 过于宽泛的词汇

### 2. 提升分析效果

1. **确保代码规范**：
   - 使用有意义的函数名
   - 添加适当的注释
   - 保持模块化结构

2. **构建语义索引**：
   - 先运行"构建知识图谱"
   - 确保所有文件都被解析

3. **配置嵌入服务**：
   - 在设置中配置OpenAI或其他嵌入服务
   - 语义搜索需要嵌入模型支持

## 🔧 配置说明

### 嵌入服务配置

在VS Code设置中配置：

```json
{
  "vscode-graphrag.embeddingProvider.provider": "OpenAI",
  "vscode-graphrag.embeddingProvider.model": "text-embedding-ada-002", 
  "vscode-graphrag.embeddingProvider.apiKey": "your-api-key"
}
```

支持的嵌入服务：
- **OpenAI**: text-embedding-ada-002
- **VoyageAI**: voyage-large-2
- **Ollama**: 本地嵌入模型
- **Gemini**: Google嵌入服务

### 解析配置

```json
{
  "vscode-graphrag.maxNodesPerFile": 100,
  "vscode-graphrag.maxFileSizeKB": 50,
  "vscode-graphrag.includeTemplate": false
}
```

## 📚 示例用法

### 分析登录功能

1. 运行 "GraphRAG: 功能分析器"
2. 输入 "用户登录"
3. 系统将生成类似这样的文档：

```markdown
# 📋 用户登录模块

## 功能概述
实现了与"用户登录"相关的功能，包含 15 个代码实体，涉及 3 个文件。
主要组成：8个Function、2个Class、3个Interface、2个Variable。

## 🏗️ 架构组成

### 入口节点 (2个)
- **handleLogin** (Function): auth.ts:25
- **loginProcess** (Function): loginService.ts:15

### 核心逻辑 (8个)  
- **validateCredentials** (Function): validator.ts:10
- **authenticateUser** (Function): auth.ts:45
- **generateToken** (Function): tokenService.ts:20
- ...

## 🔄 执行流程

### handleLogin 执行流程
1. **执行 Function handleLogin**
   - 位置: auth.ts:25
   ```typescript
   async function handleLogin(credentials: LoginCredentials) {
     const isValid = await validateCredentials(credentials);
     // ...
   }
   ```

2. **执行 Function validateCredentials**  
   - 位置: validator.ts:10
   ```typescript
   function validateCredentials(credentials: LoginCredentials) {
     // 验证逻辑...
   }
   ```

## 📁 完整代码文件

### auth.ts
```typescript
// 完整的认证文件代码...
```

### validator.ts  
```typescript
// 完整的验证文件代码...
```
```

## 🎯 适用场景

### 1. 新团队成员入职
- 快速了解项目整体架构
- 深入理解特定功能实现
- 学习代码组织和调用关系

### 2. 代码重构
- 分析功能的完整实现
- 识别重构范围和影响
- 确保重构的完整性

### 3. 功能文档编写
- 自动生成详细的功能文档
- 包含完整代码和执行流程
- 减少手动文档编写工作

### 4. 代码审查
- 理解复杂功能的完整逻辑
- 分析代码的架构合理性
- 检查功能的完整性

## ⚠️ 注意事项

1. **文件大小限制**：默认跳过超过50KB的文件
2. **节点数量限制**：每个文件最多解析100个节点
3. **网络要求**：语义搜索需要网络连接到嵌入服务
4. **API配额**：注意嵌入服务的API使用量

## 🐛 故障排除

### 问题1：没有发现任何功能
**解决方案**：
- 检查是否配置了嵌入服务
- 尝试更具体的查询词
- 确保项目有足够的代码文件

### 问题2：代码不完整
**解决方案**：
- 增加 `maxFileSizeKB` 设置
- 检查文件是否被忽略规则排除
- 确保文件编码正确

### 问题3：语义搜索不准确
**解决方案**：
- 使用更精确的功能描述
- 检查代码中是否有相关注释
- 考虑添加语义描述到代码中

---

通过智能Wiki生成器，您可以快速理解和文档化任何复杂项目的功能实现！🚀