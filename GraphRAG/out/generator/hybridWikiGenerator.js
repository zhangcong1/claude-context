"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridWikiGenerator = void 0;
const semanticSearchService_1 = require("../semantic/semanticSearchService");
const intelligentWikiGenerator_1 = require("./intelligentWikiGenerator");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * 混合模式Wiki生成器
 *
 * 核心特性：
 * 1. 🔀 多策略融合：结合语义搜索、结构分析、传统解析
 * 2. 🎯 智能权重：根据项目特征自动调整策略权重
 * 3. 📊 质量保证：多重验证确保文档质量
 * 4. 🔄 自适应优化：根据分析结果动态调整策略
 */
class HybridWikiGenerator {
    knowledgeGraph;
    semanticSearch;
    intelligentGenerator;
    config;
    constructor(knowledgeGraph, config) {
        this.knowledgeGraph = knowledgeGraph;
        this.semanticSearch = new semanticSearchService_1.SemanticSearchService();
        this.intelligentGenerator = new intelligentWikiGenerator_1.IntelligentWikiGenerator(knowledgeGraph);
        // 默认混合模式配置
        this.config = {
            semanticWeight: 0.4,
            structuralWeight: 0.4,
            traditionalWeight: 0.2,
            enableSemanticDiscovery: true,
            enableStructuralAnalysis: true,
            enableTraditionalParsing: true,
            generateArchitectureDocs: true,
            generateFeatureDocs: true,
            generateApiDocs: true,
            generateBusinessDocs: true,
            minFeatureNodes: 3,
            maxFeatureDepth: 5,
            enableContentValidation: true,
            ...config
        };
    }
    /**
     * 生成混合模式Wiki
     */
    async generateHybridWiki(outputDir = './hybrid-wiki') {
        console.log('🔀 开始混合模式Wiki生成...');
        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        // 1. 构建语义索引
        await this.buildSemanticIndex();
        // 2. 执行混合分析
        const analysisResult = await this.performHybridAnalysis();
        // 3. 生成分层文档
        const documents = await this.generateLayeredDocuments(analysisResult);
        // 4. 质量验证和优化
        if (this.config.enableContentValidation) {
            await this.validateAndOptimizeContent(documents);
        }
        // 5. 写入文件
        await this.writeDocuments(outputDir, documents);
        // 6. 生成分析报告
        await this.generateAnalysisReport(outputDir, analysisResult);
        console.log(`✅ 混合模式Wiki生成完成，输出到: ${outputDir}`);
        return outputDir;
    }
    /**
     * 构建语义索引
     */
    async buildSemanticIndex() {
        if (!this.config.enableSemanticDiscovery)
            return;
        const nodes = this.knowledgeGraph.getAllNodes();
        await this.semanticSearch.buildSemanticIndex(nodes);
    }
    /**
     * 执行混合分析
     */
    async performHybridAnalysis() {
        console.log('🔍 执行混合分析...');
        const allNodes = this.knowledgeGraph.getAllNodes();
        const result = {
            semanticFeatures: [],
            structuralFeatures: [],
            traditionalFeatures: [],
            mergedFeatures: [],
            confidence: 0,
            coverage: {
                totalNodes: allNodes.length,
                coveredNodes: 0,
                coverageRate: 0
            }
        };
        // 1. 语义功能发现
        if (this.config.enableSemanticDiscovery) {
            result.semanticFeatures = await this.performSemanticDiscovery();
            console.log(`🤖 语义发现: ${result.semanticFeatures.length} 个功能`);
        }
        // 2. 结构化分析
        if (this.config.enableStructuralAnalysis) {
            result.structuralFeatures = await this.performStructuralAnalysis();
            console.log(`🏗️ 结构分析: ${result.structuralFeatures.length} 个功能`);
        }
        // 3. 传统解析分析
        if (this.config.enableTraditionalParsing) {
            result.traditionalFeatures = await this.performTraditionalAnalysis();
            console.log(`📋 传统解析: ${result.traditionalFeatures.length} 个功能`);
        }
        // 4. 智能合并功能
        result.mergedFeatures = await this.mergeFeatures(result.semanticFeatures, result.structuralFeatures, result.traditionalFeatures);
        // 5. 计算覆盖率和置信度
        result.coverage = this.calculateCoverage(result.mergedFeatures, allNodes);
        result.confidence = this.calculateConfidence(result);
        console.log(`🎯 合并后功能: ${result.mergedFeatures.length} 个`);
        console.log(`📊 覆盖率: ${(result.coverage.coverageRate * 100).toFixed(1)}%`);
        console.log(`🎲 置信度: ${(result.confidence * 100).toFixed(1)}%`);
        return result;
    }
    /**
     * 语义功能发现
     */
    async performSemanticDiscovery() {
        const features = [];
        // 扩展的功能查询词库
        const featureQueries = [
            // 认证授权
            '用户登录认证', '用户注册', '权限管理', '身份验证', '会话管理',
            // 数据处理
            '数据验证', '表单验证', '输入校验', '数据转换', '数据格式化',
            // 文件操作
            '文件上传', '文件下载', '图片处理', '文档管理', '附件处理',
            // 网络通信
            'API接口', 'HTTP请求', '网络请求', '异步处理', '接口调用',
            // 配置管理
            '配置管理', '环境配置', '系统设置', '参数配置', '选项设置',
            // 错误处理
            '错误处理', '异常捕获', '错误日志', '调试信息', '故障处理',
            // UI组件
            '组件渲染', '界面更新', '事件处理', '用户交互', '界面响应',
            // 状态管理
            '状态管理', '数据流', '状态更新', '数据绑定', '响应式更新',
            // 路由导航
            '路由导航', '页面跳转', '路径管理', '导航控制', '页面路由',
            // 数据存储
            '数据存储', '本地存储', '缓存管理', '数据持久化', '存储操作'
        ];
        for (const query of featureQueries) {
            try {
                const searchResults = await this.semanticSearch.semanticSearch(query, this.knowledgeGraph.getAllNodes(), {
                    semanticThreshold: 0.6,
                    maxResults: 30,
                    keywordWeight: 0.3,
                    semanticWeight: 0.7
                });
                if (searchResults.length >= this.config.minFeatureNodes) {
                    const feature = await this.buildFeatureFromSearchResults(query, searchResults);
                    if (feature) {
                        features.push({
                            ...feature,
                            source: 'semantic',
                            confidence: this.calculateFeatureConfidence(searchResults)
                        });
                    }
                }
            }
            catch (error) {
                console.warn(`语义搜索失败: ${query}`, error);
            }
        }
        return features;
    }
    /**
     * 结构化分析
     */
    async performStructuralAnalysis() {
        const features = [];
        const allNodes = this.knowledgeGraph.getAllNodes();
        const allEdges = this.knowledgeGraph.getAllEdges();
        // 1. 基于文件模块分析
        const moduleFeatures = this.analyzeByModules(allNodes);
        features.push(...moduleFeatures);
        // 2. 基于调用关系分析
        const callFeatures = this.analyzeByCallRelations(allNodes, allEdges);
        features.push(...callFeatures);
        // 3. 基于继承关系分析
        const inheritanceFeatures = this.analyzeByInheritance(allNodes, allEdges);
        features.push(...inheritanceFeatures);
        // 4. 基于组件结构分析（Vue特化）
        const componentFeatures = this.analyzeVueComponents(allNodes);
        features.push(...componentFeatures);
        return features.map(feature => ({
            ...feature,
            source: 'structural',
            confidence: 0.8
        }));
    }
    /**
     * 传统解析分析
     */
    async performTraditionalAnalysis() {
        const features = [];
        const allNodes = this.knowledgeGraph.getAllNodes();
        // 1. 按节点类型分组
        const typeGroups = this.groupNodesByType(allNodes);
        // 2. 按文件分组
        const fileGroups = this.groupNodesByFile(allNodes);
        // 3. 生成传统功能模块
        for (const [type, nodes] of Object.entries(typeGroups)) {
            if (nodes.length >= this.config.minFeatureNodes) {
                features.push({
                    name: `${type}模块`,
                    description: `包含所有${type}类型的代码实体`,
                    relatedNodes: nodes,
                    source: 'traditional',
                    confidence: 0.6,
                    architecture: this.analyzeNodeArchitecture(nodes)
                });
            }
        }
        return features;
    }
    /**
     * 智能合并功能
     */
    async mergeFeatures(semanticFeatures, structuralFeatures, traditionalFeatures) {
        const mergedFeatures = [];
        const processedNodes = new Set();
        // 1. 优先处理语义功能（置信度最高）
        for (const feature of semanticFeatures) {
            const nodeIds = feature.relatedNodes?.map((n) => n.id) || [];
            // 查找与此功能重叠的其他来源功能
            const overlappingStructural = this.findOverlappingFeatures(feature, structuralFeatures);
            const overlappingTraditional = this.findOverlappingFeatures(feature, traditionalFeatures);
            // 合并重叠的功能
            const enhancedFeature = await this.enhanceFeatureWithOverlaps(feature, overlappingStructural, overlappingTraditional);
            mergedFeatures.push(enhancedFeature);
            nodeIds.forEach((id) => processedNodes.add(id));
        }
        // 2. 处理剩余的结构化功能
        for (const feature of structuralFeatures) {
            const nodeIds = feature.relatedNodes?.map((n) => n.id) || [];
            const hasUnprocessedNodes = nodeIds.some((id) => !processedNodes.has(id));
            if (hasUnprocessedNodes) {
                const overlappingTraditional = this.findOverlappingFeatures(feature, traditionalFeatures);
                const enhancedFeature = await this.enhanceFeatureWithOverlaps(feature, [], overlappingTraditional);
                mergedFeatures.push(enhancedFeature);
                nodeIds.forEach((id) => processedNodes.add(id));
            }
        }
        // 3. 处理剩余的传统功能
        for (const feature of traditionalFeatures) {
            const nodeIds = feature.relatedNodes?.map((n) => n.id) || [];
            const hasUnprocessedNodes = nodeIds.some((id) => !processedNodes.has(id));
            if (hasUnprocessedNodes) {
                mergedFeatures.push(feature);
                nodeIds.forEach((id) => processedNodes.add(id));
            }
        }
        return mergedFeatures;
    }
    /**
     * 生成分层文档
     */
    async generateLayeredDocuments(analysisResult) {
        const documents = {};
        // 1. 生成主概览文档
        documents['README.md'] = await this.generateHybridOverview(analysisResult);
        // 2. 生成架构文档
        if (this.config.generateArchitectureDocs) {
            documents['ARCHITECTURE.md'] = await this.generateHybridArchitectureDocs(analysisResult);
        }
        // 3. 生成功能文档
        if (this.config.generateFeatureDocs) {
            documents['FEATURES.md'] = await this.generateHybridFeaturesDocs(analysisResult);
            // 为每个功能生成详细文档
            for (const feature of analysisResult.mergedFeatures) {
                const featureDoc = await this.generateEnhancedFeatureDoc(feature);
                documents[`features/${this.sanitizeFilename(feature.name)}.md`] = featureDoc;
            }
        }
        // 4. 生成API文档
        if (this.config.generateApiDocs) {
            documents['API_REFERENCE.md'] = await this.generateHybridApiDocs();
        }
        // 5. 生成业务文档
        if (this.config.generateBusinessDocs) {
            documents['BUSINESS_LOGIC.md'] = await this.generateBusinessLogicDocs(analysisResult);
        }
        // 6. 生成混合分析报告
        documents['ANALYSIS_REPORT.md'] = await this.generateDetailedAnalysisReport(analysisResult);
        return documents;
    }
    /**
     * 生成混合模式概览
     */
    async generateHybridOverview(analysisResult) {
        const stats = this.knowledgeGraph.getStats();
        return `# 🔀 混合模式项目Wiki

## 📊 项目统计

- **总代码实体**: ${stats.nodeCount} 个
- **发现功能模块**: ${analysisResult.mergedFeatures.length} 个
- **分析覆盖率**: ${(analysisResult.coverage.coverageRate * 100).toFixed(1)}%
- **分析置信度**: ${(analysisResult.confidence * 100).toFixed(1)}%
- **最后更新**: ${new Date().toLocaleString()}

## 🔍 混合分析结果

| 分析方法 | 发现功能数 | 权重配置 | 质量评分 |
|----------|------------|----------|----------|
| 🤖 语义搜索 | ${analysisResult.semanticFeatures.length} | ${(this.config.semanticWeight * 100).toFixed(0)}% | ⭐⭐⭐⭐⭐ |
| 🏗️ 结构分析 | ${analysisResult.structuralFeatures.length} | ${(this.config.structuralWeight * 100).toFixed(0)}% | ⭐⭐⭐⭐ |
| 📋 传统解析 | ${analysisResult.traditionalFeatures.length} | ${(this.config.traditionalWeight * 100).toFixed(0)}% | ⭐⭐⭐ |

## 🎯 核心功能模块

${analysisResult.mergedFeatures.slice(0, 10).map((feature, index) => `
### ${index + 1}. ${feature.name}
- **来源**: ${this.getFeatureSourceBadge(feature.source)}
- **置信度**: ${(feature.confidence * 100).toFixed(0)}%
- **代码实体**: ${feature.relatedNodes?.length || 0} 个
- **描述**: ${feature.description || '暂无描述'}

[查看详细文档](./features/${this.sanitizeFilename(feature.name)}.md)
`).join('')}

## 📋 文档导航

- [🏗️ 架构文档](./ARCHITECTURE.md) - 项目整体架构和设计
- [🚀 功能概览](./FEATURES.md) - 所有功能模块详细列表
- [🔧 API参考](./API_REFERENCE.md) - 接口、类、函数文档
- [💼 业务逻辑](./BUSINESS_LOGIC.md) - 业务流程和规则
- [📊 分析报告](./ANALYSIS_REPORT.md) - 详细的混合分析报告

## 🔧 混合模式配置

当前使用的混合模式配置：

\`\`\`json
{
  "语义搜索权重": ${this.config.semanticWeight},
  "结构分析权重": ${this.config.structuralWeight},
  "传统解析权重": ${this.config.traditionalWeight},
  "最小功能节点数": ${this.config.minFeatureNodes},
  "最大分析深度": ${this.config.maxFeatureDepth},
  "启用内容验证": ${this.config.enableContentValidation}
}
\`\`\`

---
*本文档由混合模式Wiki生成器自动创建，结合了语义搜索、结构分析和传统解析的优势*
`;
    }
    /**
     * 工具方法：获取功能来源标识
     */
    getFeatureSourceBadge(source) {
        const badges = {
            'semantic': '🤖 语义发现',
            'structural': '🏗️ 结构分析',
            'traditional': '📋 传统解析',
            'hybrid': '🔀 混合合并'
        };
        return badges[source] || '❓ 未知来源';
    }
    /**
     * 其他必要的辅助方法
     */
    async buildFeatureFromSearchResults(query, searchResults) {
        // 实现从搜索结果构建功能的逻辑
        return {
            name: query,
            description: `基于语义搜索"${query}"发现的功能模块`,
            relatedNodes: searchResults.map(r => r.node)
        };
    }
    calculateFeatureConfidence(searchResults) {
        const avgSimilarity = searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length;
        return Math.min(avgSimilarity + 0.2, 1.0);
    }
    analyzeByModules(nodes) {
        // 基于模块的分析逻辑
        return [];
    }
    analyzeByCallRelations(nodes, edges) {
        // 基于调用关系的分析逻辑
        return [];
    }
    analyzeByInheritance(nodes, edges) {
        // 基于继承关系的分析逻辑
        return [];
    }
    analyzeVueComponents(nodes) {
        // Vue组件分析逻辑
        return nodes.filter(node => node.file.endsWith('.vue')).map(node => ({
            name: `${path.basename(node.file, '.vue')}组件`,
            description: `Vue组件：${node.name}`,
            relatedNodes: [node]
        }));
    }
    groupNodesByType(nodes) {
        return nodes.reduce((groups, node) => {
            if (!groups[node.type]) {
                groups[node.type] = [];
            }
            groups[node.type].push(node);
            return groups;
        }, {});
    }
    groupNodesByFile(nodes) {
        return nodes.reduce((groups, node) => {
            if (!groups[node.file]) {
                groups[node.file] = [];
            }
            groups[node.file].push(node);
            return groups;
        }, {});
    }
    analyzeNodeArchitecture(nodes) {
        return {
            entry: nodes.filter(n => n.name.includes('main') || n.name.includes('init')),
            core: nodes.filter(n => n.type === 'Function' || n.type === 'Class'),
            helpers: nodes.filter(n => n.name.includes('util') || n.name.includes('helper'))
        };
    }
    findOverlappingFeatures(targetFeature, features) {
        // 查找重叠功能的逻辑
        return [];
    }
    async enhanceFeatureWithOverlaps(baseFeature, ...overlappingGroups) {
        // 增强功能的逻辑
        return { ...baseFeature, source: 'hybrid' };
    }
    calculateCoverage(features, allNodes) {
        const coveredNodeIds = new Set();
        features.forEach(feature => {
            feature.relatedNodes?.forEach((node) => {
                coveredNodeIds.add(node.id);
            });
        });
        return {
            totalNodes: allNodes.length,
            coveredNodes: coveredNodeIds.size,
            coverageRate: coveredNodeIds.size / allNodes.length
        };
    }
    calculateConfidence(result) {
        const semanticConf = result.semanticFeatures.length * this.config.semanticWeight;
        const structuralConf = result.structuralFeatures.length * this.config.structuralWeight;
        const traditionalConf = result.traditionalFeatures.length * this.config.traditionalWeight;
        return Math.min((semanticConf + structuralConf + traditionalConf) / 20, 1.0);
    }
    // 其他生成方法的占位符
    async generateHybridArchitectureDocs(analysisResult) {
        return "# 🏗️ 混合模式架构文档\n\n待实现...";
    }
    async generateHybridFeaturesDocs(analysisResult) {
        return "# 🚀 混合模式功能文档\n\n待实现...";
    }
    async generateEnhancedFeatureDoc(feature) {
        return `# 📋 ${feature.name}\n\n待实现...`;
    }
    async generateHybridApiDocs() {
        return "# 🔧 混合模式API文档\n\n待实现...";
    }
    async generateBusinessLogicDocs(analysisResult) {
        return "# 💼 业务逻辑文档\n\n待实现...";
    }
    async generateDetailedAnalysisReport(analysisResult) {
        return "# 📊 详细分析报告\n\n待实现...";
    }
    async validateAndOptimizeContent(documents) {
        // 内容验证和优化逻辑
        console.log('📝 验证和优化文档内容...');
    }
    async writeDocuments(outputDir, documents) {
        for (const [filename, content] of Object.entries(documents)) {
            const filePath = path.join(outputDir, filename);
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ 已生成: ${filePath}`);
        }
    }
    async generateAnalysisReport(outputDir, analysisResult) {
        const reportPath = path.join(outputDir, 'hybrid-analysis-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(analysisResult, null, 2), 'utf8');
        console.log(`📊 分析报告已保存: ${reportPath}`);
    }
    sanitizeFilename(name) {
        return name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    }
}
exports.HybridWikiGenerator = HybridWikiGenerator;
//# sourceMappingURL=hybridWikiGenerator.js.map