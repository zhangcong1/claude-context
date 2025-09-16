# GraphRAG 语义搜索功能说明

## 概述
GraphRAG VSCode插件现已支持智能语义搜索，能够理解代码的语义含义，不仅仅是文本匹配。

## 功能特性

### 🧠 智能语义搜索
- **自然语言理解**：支持用自然语言描述搜索意图
- **同义词识别**：理解"用户认证"和"登录验证"的语义关联
- **上下文理解**：基于代码上下文进行智能匹配
- **相关性排序**：结果按相关度智能排序

### 🔄 多模式搜索
1. **智能语义搜索**：基于AI理解，准确度高
2. **混合搜索**：结合关键词和语义，平衡速度和智能性
3. **传统关键词搜索**：精确匹配，速度快

## 使用方法

### 搜索流程
1. 打开命令面板 (Ctrl+Shift+P)
2. 输入 "GraphRAG: 语义搜索"
3. 选择搜索模式
4. 输入搜索查询
5. 查看智能排序的结果

### 搜索查询示例

#### 语义搜索
```
"处理用户登录的函数"
"数据库配置相关代码"
"Vue组件渲染逻辑"
"错误处理机制"
```

#### 精确搜索
```
"getUserById"
"UserService"
"loginComponent"
```

## 配置说明

在VSCode设置中配置嵌入服务：

```json
{
  "vscode-graphrag.embeddingProvider.provider": "OpenAI",
  "vscode-graphrag.embeddingProvider.model": "text-embedding-3-large",
  "vscode-graphrag.embeddingProvider.apiKey": "your-api-key"
}
```

## 技术实现

### 核心组件
1. **EmbeddingService**: 负责文本向量化
2. **SemanticSearchService**: 语义搜索核心逻辑
3. **SearchCommand**: 用户界面和搜索流程

### 搜索算法
- 向量相似度计算
- 多维度评分机制
- 智能结果排序
- 降级搜索策略