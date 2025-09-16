"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticSearchService = void 0;
const embeddingService_1 = require("./embeddingService");
/**
 * 语义搜索服务：提供基于向量嵌入的智能代码搜索
 */
class SemanticSearchService {
    embeddingService;
    semanticIndex = new Map();
    isIndexing = false;
    constructor() {
        this.embeddingService = new embeddingService_1.EmbeddingService();
    }
    /**
     * 为所有节点建立语义索引
     */
    async buildSemanticIndex(nodes) {
        if (this.isIndexing) {
            throw new Error('索引构建正在进行中');
        }
        this.isIndexing = true;
        try {
            console.log(`开始为 ${nodes.length} 个节点构建语义索引...`);
            // 清理旧索引
            this.semanticIndex.clear();
            // 准备文本内容用于嵌入
            const contents = nodes.map(node => this.extractNodeContent(node));
            // 批量获取嵌入向量
            const embeddings = await this.embeddingService.getBatchEmbeddings(contents);
            // 构建索引
            for (let i = 0; i < nodes.length; i++) {
                const embedding = embeddings[i];
                if (embedding) {
                    this.semanticIndex.set(nodes[i].id, {
                        nodeId: nodes[i].id,
                        embedding,
                        content: contents[i],
                        timestamp: Date.now()
                    });
                }
            }
            console.log(`语义索引构建完成，索引了 ${this.semanticIndex.size} 个节点`);
        }
        finally {
            this.isIndexing = false;
        }
    }
    /**
     * 增量更新语义索引
     */
    async updateNodeIndex(node) {
        const content = this.extractNodeContent(node);
        const embedding = await this.embeddingService.getEmbedding(content);
        if (embedding.success) {
            this.semanticIndex.set(node.id, {
                nodeId: node.id,
                embedding: embedding.vector,
                content,
                timestamp: Date.now()
            });
        }
    }
    /**
     * 智能语义搜索
     *
     * 💡 Embedding如何实现语义化的原理：
     *
     * 1. 文本向量化：
     *    "用户登录" → [0.1, -0.3, 0.8, 0.2, ...] (1536维向量)
     *    "user login" → [0.09, -0.28, 0.82, 0.18, ...] (语义相近的向量)
     *    "认证模块" → [0.08, -0.31, 0.79, 0.21, ...] (也很相近)
     *
     * 2. 语义相似度计算：
     *    cosineSimilarity("用户登录", "user login") = 0.95 (非常相近)
     *    cosineSimilarity("用户登录", "猫咕") = 0.05 (完全不相关)
     *
     * 3. 上下文理解：
     *    AI模型在训练时学习了语言的语义关系，知道：
     *    - "authenticate"和"验证"是同一个概念
     *    - "database connection"和"数据库连接"表达相同意思
     *    - "处理用户登录的函数"会匹配userAuth(), handleLogin() 等
     */
    async semanticSearch(query, nodes, options = {}) {
        // 合并默认选项
        const searchOptions = {
            semanticThreshold: 0.6,
            keywordWeight: 0.3,
            semanticWeight: 0.7,
            maxResults: 20,
            includeFiles: true,
            fuzzyMatch: true,
            ...options
        };
        // 1. 获取查询的嵌入向量
        const queryEmbedding = await this.embeddingService.getEmbedding(query);
        if (!queryEmbedding.success) {
            // 如果嵌入失败，降级到传统搜索
            return this.fallbackSearch(query, nodes, searchOptions);
        }
        // 2. 多维度搜索
        const results = [];
        for (const node of nodes) {
            const semanticIndex = this.semanticIndex.get(node.id);
            // 计算各种匹配分数
            const keywordScore = this.calculateKeywordScore(query, node, searchOptions);
            const semanticScore = semanticIndex ?
                this.embeddingService.cosineSimilarity(queryEmbedding.vector, semanticIndex.embedding) : 0;
            const fuzzyScore = searchOptions.fuzzyMatch ? this.calculateFuzzyScore(query, node) : 0;
            // 综合评分
            const relevanceScore = keywordScore * searchOptions.keywordWeight +
                semanticScore * searchOptions.semanticWeight +
                fuzzyScore * 0.1;
            // 判断匹配类型
            const matchType = this.determineMatchType(keywordScore, semanticScore, fuzzyScore, searchOptions);
            // 过滤低相关性结果
            if (relevanceScore > 0.1 || semanticScore > searchOptions.semanticThreshold) {
                const snippets = this.extractMatchingSnippets(query, node);
                const explanation = this.generateExplanation(query, node, matchType, semanticScore, keywordScore);
                results.push({
                    nodeId: node.id,
                    similarity: semanticScore,
                    relevanceScore,
                    semanticMatch: semanticScore > searchOptions.semanticThreshold,
                    node,
                    matchType,
                    matchDetails: {
                        keywordMatch: keywordScore > 0.5,
                        semanticScore,
                        fuzzyScore,
                        contextMatch: this.hasContextMatch(query, node)
                    },
                    snippets,
                    explanation
                });
            }
        }
        // 3. 排序和限制结果
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);
        return results.slice(0, searchOptions.maxResults);
    }
    /**
     * 关键词扩展搜索（处理同义词和相关概念）
     * 这展示了为什么embedding能实现语义化：
     * 1. 预定义的语义映射关系
     * 2. AI模型自动学习的语义关联
     */
    expandQuery(query) {
        const expansions = [query];
        // 预定义的同义词映射 - 这是传统方法，有限且需要手动维护
        const synonyms = new Map([
            ['用户', ['user', 'account', '账户', '登录', 'login']],
            ['认证', ['auth', 'authentication', '验证', 'verify', '登录']],
            ['配置', ['config', 'configuration', 'setting', '设置', 'option']],
            ['数据库', ['database', 'db', 'sql', 'mysql', 'postgres']],
            ['接口', ['api', 'interface', 'endpoint', '端点', 'service']],
            ['组件', ['component', 'widget', 'element', '元件', 'module']],
            ['路由', ['router', 'route', 'routing', '导航', 'navigation']],
            ['状态', ['state', 'status', 'condition', '状态管理', 'store']],
            ['样式', ['style', 'css', 'styling', '样式表', 'design']],
            ['工具', ['util', 'utility', 'helper', 'tool', '辅助']]
        ]);
        // 查找同义词
        const queryLower = query.toLowerCase();
        for (const [key, values] of synonyms) {
            if (queryLower.includes(key) || values.some(v => queryLower.includes(v))) {
                expansions.push(...values);
                expansions.push(key);
            }
        }
        // 移除重复项
        return [...new Set(expansions)];
        /*
         * 💡 为什么embedding更强大？
         *
         * 传统方法（上面的代码）：
         * - 需要手动定义所有同义词关系
         * - 无法处理上下文相关的语义
         * - 无法理解新词汇或组合
         *
         * Embedding方法：
         * - AI自动学习所有语义关系
         * - 理解上下文和语境
         * - 能处理从未见过的词汇组合
         * - 支持多语言和跨语言语义理解
         *
         * 例如：
         * 查询"处理用户登录的函数"
         *
         * 传统方法：只能匹配"用户"、"登录"、"函数"这些关键词
         * Embedding方法：理解整个语义 → 找到 authenticateUser(), verifyLogin(), handleAuth() 等
         */
    }
    /**
     * 提取节点的文本内容用于嵌入
     */
    extractNodeContent(node) {
        const parts = [];
        // 基本信息
        parts.push(node.name);
        parts.push(node.type);
        // 语义描述
        if (node.semantic) {
            parts.push(node.semantic);
        }
        // 代码片段
        if (node.snippet) {
            parts.push(node.snippet);
        }
        // 元数据
        if (node.metadata) {
            if (node.metadata.documentation) {
                parts.push(node.metadata.documentation);
            }
            if (node.metadata.tags) {
                parts.push(node.metadata.tags.join(' '));
            }
            if (node.metadata.functionSignature) {
                parts.push(node.metadata.functionSignature);
            }
        }
        // 文件路径（提取有意义的部分）
        const pathParts = node.file.split('/').slice(-2); // 取最后两级路径
        parts.push(pathParts.join('/'));
        return parts.join(' ').trim();
    }
    /**
     * 计算关键词匹配分数
     */
    calculateKeywordScore(query, node, options) {
        const queryTerms = this.expandQuery(query.toLowerCase());
        const searchableText = this.extractSearchableText(node).toLowerCase();
        let score = 0;
        let totalTerms = queryTerms.length;
        for (const term of queryTerms) {
            if (searchableText.includes(term)) {
                // 精确匹配权重更高
                if (node.name.toLowerCase() === term) {
                    score += 2;
                }
                else if (node.name.toLowerCase().includes(term)) {
                    score += 1.5;
                }
                else if (node.semantic?.toLowerCase().includes(term)) {
                    score += 1.2;
                }
                else {
                    score += 1;
                }
            }
        }
        // 标准化分数
        return Math.min(score / totalTerms, 1);
    }
    /**
     * 计算模糊匹配分数
     */
    calculateFuzzyScore(query, node) {
        // 简单的编辑距离算法
        const target = node.name.toLowerCase();
        const source = query.toLowerCase();
        if (source === target)
            return 1;
        if (source.length === 0)
            return 0;
        if (target.length === 0)
            return 0;
        const editDistance = this.levenshteinDistance(source, target);
        const maxLength = Math.max(source.length, target.length);
        return 1 - (editDistance / maxLength);
    }
    /**
     * 计算编辑距离
     */
    levenshteinDistance(a, b) {
        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
        for (let i = 0; i <= a.length; i++)
            matrix[0][i] = i;
        for (let j = 0; j <= b.length; j++)
            matrix[j][0] = j;
        for (let j = 1; j <= b.length; j++) {
            for (let i = 1; i <= a.length; i++) {
                const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + substitutionCost);
            }
        }
        return matrix[b.length][a.length];
    }
    /**
     * 确定匹配类型
     */
    determineMatchType(keywordScore, semanticScore, fuzzyScore, options) {
        if (keywordScore > 0.8)
            return 'exact';
        if (semanticScore > options.semanticThreshold && keywordScore > 0.3)
            return 'hybrid';
        if (semanticScore > options.semanticThreshold)
            return 'semantic';
        if (fuzzyScore > 0.7)
            return 'fuzzy';
        return 'hybrid';
    }
    /**
     * 提取匹配的代码片段
     */
    extractMatchingSnippets(query, node) {
        const snippets = [];
        if (node.snippet) {
            const lines = node.snippet.split('\n');
            const queryTerms = query.toLowerCase().split(' ');
            for (const line of lines) {
                if (queryTerms.some(term => line.toLowerCase().includes(term))) {
                    snippets.push(line.trim());
                }
            }
        }
        return snippets.slice(0, 3); // 最多3个片段
    }
    /**
     * 生成匹配解释
     */
    generateExplanation(query, node, matchType, semanticScore, keywordScore) {
        const explanations = [];
        if (matchType === 'exact') {
            explanations.push('精确匹配节点名称或关键信息');
        }
        else if (matchType === 'semantic') {
            explanations.push(`语义相似度: ${(semanticScore * 100).toFixed(1)}%`);
        }
        else if (matchType === 'fuzzy') {
            explanations.push('模糊匹配节点名称');
        }
        else {
            explanations.push(`混合匹配 (语义: ${(semanticScore * 100).toFixed(1)}%, 关键词: ${(keywordScore * 100).toFixed(1)}%)`);
        }
        if (node.type) {
            explanations.push(`类型: ${node.type}`);
        }
        return explanations.join(' | ');
    }
    /**
     * 检查上下文匹配
     */
    hasContextMatch(query, node) {
        const contextFields = [
            node.semantic,
            node.metadata?.documentation,
            node.metadata?.tags?.join(' ')
        ].filter(Boolean);
        const queryLower = query.toLowerCase();
        return contextFields.some(field => field && field.toLowerCase().includes(queryLower));
    }
    /**
     * 提取可搜索的文本
     */
    extractSearchableText(node) {
        const parts = [
            node.name,
            node.type,
            node.semantic || '',
            node.snippet || '',
            node.metadata?.documentation || '',
            node.metadata?.tags?.join(' ') || '',
            node.file
        ];
        return parts.join(' ');
    }
    /**
     * 降级搜索（当语义搜索失败时）
     */
    fallbackSearch(query, nodes, options) {
        const results = [];
        const queryLower = query.toLowerCase();
        for (const node of nodes) {
            const searchableText = this.extractSearchableText(node).toLowerCase();
            if (searchableText.includes(queryLower) ||
                this.calculateFuzzyScore(query, node) > 0.6) {
                const keywordScore = this.calculateKeywordScore(query, node, options);
                results.push({
                    nodeId: node.id,
                    similarity: 0,
                    relevanceScore: keywordScore,
                    semanticMatch: false,
                    node,
                    matchType: 'exact',
                    matchDetails: {
                        keywordMatch: true,
                        semanticScore: 0,
                        fuzzyScore: this.calculateFuzzyScore(query, node),
                        contextMatch: this.hasContextMatch(query, node)
                    },
                    snippets: this.extractMatchingSnippets(query, node),
                    explanation: '降级到关键词搜索'
                });
            }
        }
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, options.maxResults);
    }
    /**
     * 获取索引状态
     */
    getIndexStatus() {
        return {
            size: this.semanticIndex.size,
            isIndexing: this.isIndexing
        };
    }
    /**
     * 清理索引
     */
    clearIndex() {
        this.semanticIndex.clear();
        this.embeddingService.clearCache();
    }
}
exports.SemanticSearchService = SemanticSearchService;
//# sourceMappingURL=semanticSearchService.js.map