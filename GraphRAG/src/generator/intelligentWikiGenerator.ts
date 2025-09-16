import { KnowledgeGraph } from '../graph';
import { GraphNode, GraphEdge } from '../parser';
import { SemanticSearchService, EnhancedSearchResult } from '../semantic/semanticSearchService';
import { ConfigManager } from '../config/configManager';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 功能分析结果接口
 */
interface FeatureAnalysis {
    name: string;
    description: string;
    relatedNodes: GraphNode[];
    codeFiles: Map<string, string>; // 文件路径 -> 完整代码
    dependencies: string[];
    architecture: {
        entry: GraphNode[];      // 入口节点
        core: GraphNode[];       // 核心逻辑
        helpers: GraphNode[];    // 辅助函数
    };
    flows: Array<{
        description: string;
        steps: Array<{
            node: GraphNode;
            description: string;
            code: string;
            businessLogic?: string[];
            complexity?: string;
            externalCalls?: string[];
        }>;
        mermaidDiagram?: string;
        businessSummary?: string;
    }>;
}

/**
 * 智能Wiki生成器
 * 
 * 核心特性：
 * 1. 基于语义搜索的功能发现
 * 2. 智能代码收集和关联分析
 * 3. 多层次架构分析
 * 4. AI增强的文档生成
 */
export class IntelligentWikiGenerator {
    private knowledgeGraph: KnowledgeGraph;
    private semanticSearch: SemanticSearchService;

    constructor(knowledgeGraph: KnowledgeGraph) {
        this.knowledgeGraph = knowledgeGraph;
        this.semanticSearch = new SemanticSearchService();
    }

    /**
     * 生成完整的项目Wiki
     */
    async generateCompleteWiki(outputDir: string = './intelligent-wiki'): Promise<string> {
        console.log('🧠 开始智能Wiki生成...');

        // 确保输出目录存在
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 1. 构建语义索引
        await this.buildSemanticIndex();

        // 2. 发现关键功能
        const features = await this.discoverKeyFeatures();

        // 3. 生成各类文档
        const documents: Record<string, string> = {
            'README.md': await this.generateProjectOverview(),
            'FEATURES.md': await this.generateFeaturesOverview(features),
            'API_REFERENCE.md': await this.generateApiReference()
        };

        // 4. 为每个功能生成详细文档
        for (const feature of features) {
            const featureDoc = await this.generateFeatureDetailDoc(feature);
            documents[`features/${this.sanitizeFilename(feature.name)}.md`] = featureDoc;
        }

        // 5. 写入文件
        await this.writeDocuments(outputDir, documents);

        console.log(`✅ 智能Wiki生成完成，输出到: ${outputDir}`);
        return outputDir;
    }

    /**
     * 构建语义索引
     */
    private async buildSemanticIndex(): Promise<void> {
        const nodes = this.knowledgeGraph.getAllNodes();
        await this.semanticSearch.buildSemanticIndex(nodes);
    }

    /**
     * 发现关键功能 - 这是核心功能，根据语义搜索找到相关代码
     */
    private async discoverKeyFeatures(): Promise<FeatureAnalysis[]> {
        console.log('🔍 发现关键功能...');

        const features: FeatureAnalysis[] = [];
        
        // 预定义的功能关键词，用于语义搜索
        const featureQueries = [
            '用户登录认证',
            '用户注册',
            '数据验证',
            '文件上传',
            '权限管理',
            '配置管理',
            '错误处理',
            '日志记录',
            '数据存储',
            'API接口',
            '路由导航',
            '状态管理',
            '组件渲染',
            '事件处理'
        ];

        for (const query of featureQueries) {
            const feature = await this.analyzeFeature(query);
            if (feature && feature.relatedNodes.length > 0) {
                features.push(feature);
            }
        }

        return features;
    }

    /**
     * 分析特定功能 - 核心方法：通过语义搜索收集完整功能代码
     */
    private async analyzeFeature(featureQuery: string): Promise<FeatureAnalysis | null> {
        // 🔥 关键步骤1: 语义搜索相关节点
        const searchResults = await this.semanticSearch.semanticSearch(
            featureQuery,
            this.knowledgeGraph.getAllNodes(),
            {
                semanticThreshold: 0.5,
                maxResults: 50,
                keywordWeight: 0.4,
                semanticWeight: 0.6
            }
        );

        if (searchResults.length === 0) {
            return null;
        }

        const relatedNodes = searchResults.map(r => r.node);
        
        // 🔥 关键步骤2: 收集完整代码文件
        const codeFiles = await this.collectCompleteCode(relatedNodes);
        
        // 🔥 关键步骤3: 分析架构结构
        const architecture = this.analyzeFeatureArchitecture(relatedNodes);
        
        // 🔥 关键步骤4: 分析执行流程
        const flows = await this.analyzeExecutionFlows(relatedNodes);
        
        // 🔥 关键步骤5: 分析依赖关系
        const dependencies = this.analyzeDependencies(relatedNodes);

        return {
            name: this.generateFeatureName(featureQuery, relatedNodes),
            description: await this.generateFeatureDescription(featureQuery, relatedNodes),
            relatedNodes,
            codeFiles,
            dependencies,
            architecture,
            flows
        };
    }

    /**
     * 收集完整代码 - 关键功能：确保AI能看到完整的功能实现
     */
    private async collectCompleteCode(nodes: GraphNode[]): Promise<Map<string, string>> {
        const codeFiles = new Map<string, string>();
        
        // 按文件分组节点
        const fileGroups = new Map<string, GraphNode[]>();
        for (const node of nodes) {
            if (!fileGroups.has(node.file)) {
                fileGroups.set(node.file, []);
            }
            fileGroups.get(node.file)!.push(node);
        }

        // 读取完整文件代码
        for (const [filePath, fileNodes] of fileGroups) {
            try {
                if (fs.existsSync(filePath)) {
                    const fullCode = fs.readFileSync(filePath, 'utf-8');
                    codeFiles.set(filePath, fullCode);
                    
                    // 增强节点信息：为每个节点添加更多上下文
                    for (const node of fileNodes) {
                        if (node.snippet) {
                            // 分析函数/方法的详细实现
                            const enhancedInfo = this.analyzeCodeSnippet(node.snippet, fullCode);
                            if (enhancedInfo) {
                                node.metadata = {
                                    ...node.metadata,
                                    ...enhancedInfo
                                };
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn(`无法读取文件: ${filePath}`);
            }
        }

        return codeFiles;
    }
    
    /**
     * 分析代码片段，提取详细信息
     */
    private analyzeCodeSnippet(snippet: string, fullCode: string): any {
        const analysis: any = {
            codeComplexity: 'simple',
            hasConditionals: false,
            hasLoops: false,
            hasAsyncOperations: false,
            externalCalls: [],
            businessLogic: []
        };
        
        // 检测条件语句
        if (/\b(if|else|switch|case)\b/.test(snippet)) {
            analysis.hasConditionals = true;
            analysis.codeComplexity = 'medium';
        }
        
        // 检测循环语句
        if (/\b(for|while|forEach|map|filter|reduce)\b/.test(snippet)) {
            analysis.hasLoops = true;
            analysis.codeComplexity = 'medium';
        }
        
        // 检测异步操作
        if (/\b(async|await|Promise|then|catch)\b/.test(snippet)) {
            analysis.hasAsyncOperations = true;
            analysis.codeComplexity = 'complex';
        }
        
        // 提取外部调用
        const callMatches = snippet.match(/\b(\w+)\s*\([^)]*\)/g);
        if (callMatches) {
            analysis.externalCalls = callMatches.slice(0, 5); // 最多5个
        }
        
        // 提取业务逻辑关键词
        const businessKeywords = [
            'login', 'logout', 'auth', 'validate', 'check', 'verify',
            'save', 'update', 'delete', 'create', 'fetch', 'get',
            'send', 'receive', 'process', 'handle', 'manage'
        ];
        
        for (const keyword of businessKeywords) {
            if (new RegExp(`\\b${keyword}\\b`, 'i').test(snippet)) {
                analysis.businessLogic.push(keyword);
            }
        }
        
        return analysis;
    }

    /**
     * 分析功能架构
     */
    private analyzeFeatureArchitecture(nodes: GraphNode[]): FeatureAnalysis['architecture'] {
        const architecture: FeatureAnalysis['architecture'] = {
            entry: [],
            core: [],
            helpers: []
        };

        for (const node of nodes) {
            const name = node.name.toLowerCase();
            
            // 入口节点：主要的对外接口
            if (node.type === 'Function' && (
                name.includes('main') || 
                name.includes('init') || 
                name.includes('handle') ||
                name.includes('process')
            )) {
                architecture.entry.push(node);
            }
            // 辅助节点：工具函数
            else if (node.type === 'Function' && (
                name.includes('util') || 
                name.includes('helper') || 
                name.includes('tool')
            )) {
                architecture.helpers.push(node);
            }
            // 核心节点：主要业务逻辑
            else {
                architecture.core.push(node);
            }
        }

        return architecture;
    }

    /**
     * 分析执行流程
     */
    private async analyzeExecutionFlows(nodes: GraphNode[]): Promise<FeatureAnalysis['flows']> {
        const flows: FeatureAnalysis['flows'] = [];
        
        // 找到入口节点
        const entryNodes = nodes.filter(node => 
            node.type === 'Function' || node.type === 'VueMethod' && (
                node.name.includes('handle') ||
                node.name.includes('process') ||
                node.name.includes('init') ||
                node.name.includes('submit') ||
                node.name.includes('login') ||
                node.name.includes('logout') ||
                node.name.includes('save') ||
                node.name.includes('update')
            )
        );

        for (const entryNode of entryNodes) {
            const flow = await this.traceDetailedExecutionFlow(entryNode, nodes);
            if (flow.steps.length > 0) {
                flows.push(flow);
            }
        }

        return flows;
    }

    /**
     * 追踪详细执行流程，包括业务逻辑分析
     */
    private async traceDetailedExecutionFlow(
        entryNode: GraphNode, 
        relatedNodes: GraphNode[]
    ): Promise<FeatureAnalysis['flows'][0]> {
        const visited = new Set<string>();
        const steps: FeatureAnalysis['flows'][0]['steps'] = [];
        
        const traceNode = (node: GraphNode, depth: number = 0) => {
            if (visited.has(node.id) || depth > 5) return;
            
            visited.add(node.id);
            
            // 分析节点的业务逻辑
            const businessLogic = this.extractBusinessLogic(node);
            const stepDescription = this.generateDetailedStepDescription(node, businessLogic);
            
            steps.push({
                node,
                description: stepDescription,
                code: this.extractRelevantCode(node),
                businessLogic,
                complexity: (node.metadata as any)?.codeComplexity || 'simple',
                externalCalls: (node.metadata as any)?.externalCalls || []
            });

            // 查找调用的下一个节点
            const callEdges = this.knowledgeGraph.getAllEdges().filter(edge => 
                edge.source === node.id && edge.relation === 'calls'
            );

            for (const edge of callEdges) {
                const targetNode = relatedNodes.find(n => n.id === edge.target);
                if (targetNode) {
                    traceNode(targetNode, depth + 1);
                }
            }
        };

        traceNode(entryNode);

        return {
            description: `${entryNode.name} 业务流程`,
            steps,
            mermaidDiagram: this.generateMermaidFlowChart(steps),
            businessSummary: this.generateBusinessSummary(steps)
        };
    }
    
    /**
     * 提取业务逻辑
     */
    private extractBusinessLogic(node: GraphNode): string[] {
        const businessLogic: string[] = [];
        const code = node.snippet || '';
        
        // 分析业务操作
        if (/localStorage\.setItem/.test(code)) {
            businessLogic.push('保存用户信息到本地存储');
        }
        if (/localStorage\.removeItem|localStorage\.clear/.test(code)) {
            businessLogic.push('清除本地存储信息');
        }
        if (/\$router\.push|\$router\.replace|router\.push/.test(code)) {
            businessLogic.push('页面路由跳转');
        }
        if (/(username.*password|login.*password|用户名.*密码|登录.*密码)/.test(code)) {
            businessLogic.push('用户身份验证');
        }
        if (/(errorMessage|error|错误信息|失败)/.test(code)) {
            businessLogic.push('错误处理');
        }
        if (/(if.*else|switch.*case|判断|条件)/.test(code)) {
            businessLogic.push('条件判断逻辑');
        }
        if (/(form.*submit|submit|提交表单)/.test(code)) {
            businessLogic.push('表单提交处理');
        }
        if (/(validate|check.*valid|验证|校验)/.test(code)) {
            businessLogic.push('数据验证');
        }
        if (/(isLoggedIn|login.*status|登录状态)/.test(code)) {
            businessLogic.push('登录状态管理');
        }
        if (/(logout|退出登录|登出)/.test(code)) {
            businessLogic.push('用户登出操作');
        }
        
        return businessLogic;
    }
    
    /**
     * 生成详细的步骤描述
     */
    private generateDetailedStepDescription(node: GraphNode, businessLogic: string[]): string {
        const baseDesc = `执行 ${node.type} ${node.name}`;
        
        if (businessLogic.length > 0) {
            return `${baseDesc} - ${businessLogic.join('、')}`;
        }
        
        return baseDesc;
    }
    
    /**
     * 提取相关代码片段
     */
    private extractRelevantCode(node: GraphNode): string {
        if (!node.snippet) return '';
        
        const lines = node.snippet.split('\n');
        
        // 如果代码较短，直接返回全部
        if (lines.length <= 15) {
            return node.snippet;
        }
        
        // 对于较长的代码，返回前30行或者关键行
        if (lines.length > 30) {
            // 提取关键行（包含业务逻辑的行）
            const keyLines: {line: string, index: number}[] = [];
            
            lines.forEach((line, index) => {
                const l = line.toLowerCase();
                if (l.includes('if') || l.includes('else') || 
                    l.includes('localstorage') || l.includes('router') ||
                    l.includes('error') || l.includes('return') ||
                    l.includes('username') || l.includes('password') ||
                    l.includes('login') || l.includes('logout') ||
                    l.includes('validate') || l.includes('submit') ||
                    l.includes('function') || l.includes('methods') ||
                    l.includes('用户') || l.includes('密码') ||
                    l.includes('登录') || l.includes('错误')) {
                    keyLines.push({line, index});
                }
            });
            
            if (keyLines.length > 0) {
                // 返回关键行和上下文
                const result: string[] = [];
                let lastIndex = -1;
                
                for (const {line, index} of keyLines.slice(0, 15)) {
                    if (index > lastIndex + 1) {
                        if (lastIndex >= 0) result.push('   // ...');
                        // 添加上下文
                        if (index > 0) result.push(lines[index - 1]);
                    }
                    result.push(line);
                    if (index < lines.length - 1) result.push(lines[index + 1]);
                    lastIndex = index + 1;
                }
                
                if (keyLines.length > 15) {
                    result.push('   // ... 略去其他代码');
                }
                
                return result.join('\n');
            }
            
            // 如果没有关键行，返回前30行
            return lines.slice(0, 30).join('\n') + '\n// ... 文件太长，已截断';
        }
        
        return node.snippet;
    }
    
    /**
     * 生成Mermaid流程图
     */
    private generateMermaidFlowChart(steps: any[]): string {
        if (steps.length === 0) return '';
        
        let mermaid = 'graph TD\n';
        
        // 添加开始节点
        mermaid += '    Start(["开始"])\n';
        
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const nodeId = `A${i + 1}`;
            const nextNodeId = i < steps.length - 1 ? `A${i + 2}` : null;
            
            // 节点定义 - 根据节点类型使用不同的形状
            const nodeLabel = step.node.name;
            let nodeShape = '';
            
            if (step.businessLogic.includes('条件判断逻辑')) {
                nodeShape = `{"${nodeLabel}"}`; // 菱形
            } else if (step.businessLogic.includes('页面路由跳转')) {
                nodeShape = `(["${nodeLabel}"])`; // 圆角矩形
            } else {
                nodeShape = `["${nodeLabel}"]`; // 矩形
            }
            
            mermaid += `    ${nodeId}${nodeShape}\n`;
            
            // 连接线
            if (i === 0) {
                mermaid += `    Start --> ${nodeId}\n`;
            }
            
            if (nextNodeId) {
                // 根据业务逻辑添加标签
                const edgeLabel = this.getEdgeLabel(step.businessLogic);
                if (edgeLabel) {
                    mermaid += `    ${nodeId} -->|"${edgeLabel}"| ${nextNodeId}\n`;
                } else {
                    mermaid += `    ${nodeId} --> ${nextNodeId}\n`;
                }
            } else {
                // 结束节点
                mermaid += `    ${nodeId} --> End(["结束"])\n`;
            }
        }
        
        // 添加条件分支（如果存在）
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            if (step.businessLogic.includes('条件判断逻辑') || step.businessLogic.includes('用户身份验证')) {
                const nodeId = `A${i + 1}`;
                // 添加失败分支
                mermaid += `    ${nodeId} -->|"验证失败"| Error["显示错误"]\n`;
                mermaid += `    Error --> End\n`;
            }
        }
        
        return mermaid;
    }
    
    /**
     * 获取边的标签
     */
    private getEdgeLabel(businessLogic: string[]): string {
        if (businessLogic.includes('用户身份验证')) {
            return '验证通过';
        }
        if (businessLogic.includes('保存用户信息到本地存储')) {
            return '保存登录信息';
        }
        if (businessLogic.includes('页面路由跳转')) {
            return '跳转页面';
        }
        if (businessLogic.includes('清除本地存储信息')) {
            return '清除登录信息';
        }
        if (businessLogic.includes('错误处理')) {
            return '处理错误';
        }
        if (businessLogic.includes('条件判断逻辑')) {
            return '执行判断';
        }
        return '';
    }
    
    /**
     * 生成业务总结
     */
    private generateBusinessSummary(steps: any[]): string {
        const allBusinessLogic = steps.flatMap(step => step.businessLogic);
        const uniqueLogic = [...new Set(allBusinessLogic)];
        
        if (uniqueLogic.length === 0) {
            return '该流程主要包含基本的代码执行逻辑。';
        }
        
        return `该业务流程包含以下关键操作：${uniqueLogic.join('、')}。`;
    }

    /**
     * 分析依赖关系
     */
    private analyzeDependencies(nodes: GraphNode[]): string[] {
        const dependencies = new Set<string>();
        
        const allEdges = this.knowledgeGraph.getAllEdges();
        const nodeIds = new Set(nodes.map(n => n.id));

        // 找到从功能节点指向外部的依赖
        for (const edge of allEdges) {
            if (nodeIds.has(edge.source) && !nodeIds.has(edge.target)) {
                dependencies.add(edge.target);
            }
        }

        return Array.from(dependencies);
    }

    /**
     * 生成功能详细文档 - 这是最终输出给用户的详细功能wiki
     */
    private async generateFeatureDetailDoc(feature: FeatureAnalysis): Promise<string> {
        return `# 📋 ${feature.name}

## 功能概述
${feature.description}

## 📊 功能统计
- **相关代码实体**: ${feature.relatedNodes.length} 个
- **涉及文件**: ${feature.codeFiles.size} 个
- **外部依赖**: ${feature.dependencies.length} 个

## 🏗️ 架构组成

### 入口节点 (${feature.architecture.entry.length}个)
${feature.architecture.entry.map(node => 
    `- **${node.name}** (${node.type}): ${path.basename(node.file)}:${(node.position?.line || 0) + 1}`
).join('\n')}

### 核心逻辑 (${feature.architecture.core.length}个)
${feature.architecture.core.map(node => 
    `- **${node.name}** (${node.type}): ${path.basename(node.file)}:${(node.position?.line || 0) + 1}`
).join('\n')}

### 辅助函数 (${feature.architecture.helpers.length}个)
${feature.architecture.helpers.map(node => 
    `- **${node.name}** (${node.type}): ${path.basename(node.file)}:${(node.position?.line || 0) + 1}`
).join('\n')}

## 🔄 执行流程

${feature.flows.map(flow => `
### ${flow.description}

**业务概述**: ${flow.businessSummary}

#### 🎯 流程图
\`\`\`mermaid
${flow.mermaidDiagram}
\`\`\`

#### 📝 详细步骤
${flow.steps.map((step, index) => `
${index + 1}. **${step.description}**
   - **位置**: ${path.basename(step.node.file)}:${(step.node.position?.line || 0) + 1}
   - **复杂度**: ${step.complexity}
   ${step.businessLogic && step.businessLogic.length > 0 ? `\n   - **业务逻辑**: ${step.businessLogic.join('、')}` : ''}
   ${step.externalCalls && step.externalCalls.length > 0 ? `\n   - **外部调用**: ${step.externalCalls.join(', ')}` : ''}
   
   \`\`\`typescript
   ${step.code || '// 无可用代码片段'}
   \`\`\`
`).join('')}
`).join('')}

## 📁 完整代码文件

${Array.from(feature.codeFiles.entries()).map(([filePath, code]) => `
### ${path.basename(filePath)}

\`\`\`typescript
${code.length > 2000 ? code.substring(0, 2000) + '\n// ... 文件太长，已截断' : code}
\`\`\`
`).join('')}

## 🔗 外部依赖
${feature.dependencies.length > 0 ? 
    feature.dependencies.map(dep => `- \`${dep}\``).join('\n') : 
    '- 无外部依赖'
}

---
*本文档由智能Wiki生成器基于知识图谱分析自动生成*
`;
    }

    /**
     * 生成项目概览
     */
    private async generateProjectOverview(): Promise<string> {
        const stats = this.knowledgeGraph.getStats();
        
        return `# 📊 项目概览

## 项目统计
- **总代码实体**: ${stats.nodeCount} 个
- **文件关联**: ${stats.edgeCount} 个关系
- **最后更新**: ${new Date().toLocaleString()}

## 代码实体分布
${Object.entries(stats.nodeTypes).map(([type, count]) => 
    `- **${type}**: ${count} 个`
).join('\n')}

## 关系类型统计
${Object.entries(stats.relationTypes).map(([relation, count]) => 
    `- **${relation}**: ${count} 个关系`
).join('\n')}

---
*本文档由智能Wiki生成器自动创建*
`;
    }

    /**
     * 生成功能概览
     */
    private async generateFeaturesOverview(features: FeatureAnalysis[]): Promise<string> {
        return `# 🚀 功能概览

发现了 ${features.length} 个主要功能模块：

${features.map(feature => `
## ${feature.name}
${feature.description}

- **代码实体**: ${feature.relatedNodes.length} 个
- **文件数量**: ${feature.codeFiles.size} 个
- **外部依赖**: ${feature.dependencies.length} 个

[查看详细文档](./features/${this.sanitizeFilename(feature.name)}.md)
`).join('')}

---
*基于语义搜索自动发现的功能模块*
`;
    }

    /**
     * 生成API参考
     */
    private async generateApiReference(): Promise<string> {
        const functions = this.knowledgeGraph.findNodesByType('Function');
        const classes = this.knowledgeGraph.findNodesByType('Class');
        const interfaces = this.knowledgeGraph.findNodesByType('Interface');

        return `# 🔧 API参考文档

## 类 (${classes.length}个)
${classes.map(cls => `
### ${cls.name}
- **文件**: ${path.basename(cls.file)}
- **位置**: 第${(cls.position?.line || 0) + 1}行
${cls.snippet ? `\n\`\`\`typescript\n${cls.snippet}\n\`\`\`` : ''}
`).join('')}

## 函数 (${functions.length}个)
${functions.slice(0, 20).map(func => `
### ${func.name}
- **文件**: ${path.basename(func.file)}
- **位置**: 第${(func.position?.line || 0) + 1}行
${func.snippet ? `\n\`\`\`typescript\n${func.snippet}\n\`\`\`` : ''}
`).join('')}

## 接口 (${interfaces.length}个)
${interfaces.map(intf => `
### ${intf.name}
- **文件**: ${path.basename(intf.file)}
- **位置**: 第${(intf.position?.line || 0) + 1}行
${intf.snippet ? `\n\`\`\`typescript\n${intf.snippet}\n\`\`\`` : ''}
`).join('')}
`;
    }

    /**
     * 写入文档文件
     */
    private async writeDocuments(outputDir: string, documents: Record<string, string>): Promise<void> {
        for (const [filename, content] of Object.entries(documents)) {
            const filePath = path.join(outputDir, filename);
            const dir = path.dirname(filePath);
            
            // 确保目录存在
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ 已生成: ${filePath}`);
        }
    }

    /**
     * 工具方法：生成功能名称
     */
    private generateFeatureName(query: string, nodes: GraphNode[]): string {
        const mainNode = nodes.find(n => n.type === 'Class') || 
                        nodes.find(n => n.type === 'Function') || 
                        nodes[0];

        if (mainNode && mainNode.name !== query) {
            return `${mainNode.name}模块`;
        }

        return query;
    }

    /**
     * 工具方法：生成功能描述
     */
    private async generateFeatureDescription(query: string, nodes: GraphNode[]): Promise<string> {
        const nodeTypes = nodes.reduce((acc, node) => {
            acc[node.type] = (acc[node.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const files = new Set(nodes.map(n => path.basename(n.file)));
        
        return `实现了与"${query}"相关的功能，包含 ${nodes.length} 个代码实体，涉及 ${files.size} 个文件。` +
               `主要组成：${Object.entries(nodeTypes).map(([type, count]) => `${count}个${type}`).join('、')}。`;
    }

    /**
     * 工具方法：文件名清理
     */
    private sanitizeFilename(name: string): string {
        return name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    }
}