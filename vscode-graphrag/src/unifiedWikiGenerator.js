const { parseTsFile } = require('../dist/parser-optimized');
const { KnowledgeGraph } = require('../dist/graph');
const fs = require('fs');
const path = require('path');

class UnifiedWikiGenerator {
    constructor() {
        this.knowledgeGraph = new KnowledgeGraph();
        this.analysis = {
            technical: { modules: [], dependencies: [], architecture: { frontend: [], backend: [], config: [] } },
            business: { features: [], dataModels: [], apis: [], components: [], workflows: [] },
            ai: { complexity: {}, recommendations: [], techStack: [], architecturePattern: '' }
        };
        this.codeComments = new Map();
        this.fileContents = new Map();
    }

    // 统一分析项目
    async analyzeProject(projectFiles) {
        console.log('🔍 开始统一分析项目...');
        
        for (const file of projectFiles) {
            try {
                const content = fs.readFileSync(file, 'utf8');
                this.fileContents.set(file, content);
                this.extractComments(file, content);
                
                const result = parseTsFile(file);
                this.knowledgeGraph.addNodes(result.nodes);
                this.knowledgeGraph.addEdges(result.edges);
                
                console.log(`✅ 已分析: ${file}`);
            } catch (error) {
                console.log(`❌ 分析失败: ${file}`);
            }
        }

        this.analyzeTechnical();
        this.analyzeBusiness();
        this.analyzeWithAI();
        console.log('📊 统一分析完成');
    }

    extractComments(filePath, content) {
        const comments = [];
        const commentMatches = [...content.matchAll(/\/\/\s*(.+)/g), ...content.matchAll(/\/\*\*([\s\S]*?)\*\//g)];
        
        commentMatches.forEach(match => {
            const cleanComment = match[1].replace(/\*/g, '').trim();
            if (cleanComment && !cleanComment.startsWith('TODO')) {
                comments.push({
                    content: cleanComment,
                    line: content.substring(0, content.indexOf(match[0])).split('\n').length
                });
            }
        });
        this.codeComments.set(filePath, comments);
    }

    analyzeTechnical() {
        const allNodes = this.knowledgeGraph.getAllNodes();
        const allEdges = this.knowledgeGraph.getAllEdges();

        // 模块分析
        const modulesByFile = new Map();
        allNodes.forEach(node => {
            const file = node.file;
            if (!modulesByFile.has(file)) modulesByFile.set(file, []);
            modulesByFile.get(file).push(node);
        });

        this.analysis.technical.modules = Array.from(modulesByFile.entries()).map(([file, nodes]) => ({
            file, nodes, nodeCount: nodes.length
        }));

        // 架构分析
        allNodes.forEach(node => {
            if (node.file.endsWith('.vue')) this.analysis.technical.architecture.frontend.push(node);
            else if (node.file.includes('service')) this.analysis.technical.architecture.backend.push(node);
            else if (node.file.endsWith('.json')) this.analysis.technical.architecture.config.push(node);
        });

        // 依赖分析
        const importEdges = allEdges.filter(edge => edge.relation === 'imports');
        this.analysis.technical.dependencies = importEdges.map(edge => ({
            source: edge.source, target: edge.target
        }));
    }

    analyzeBusiness() {
        const allNodes = this.knowledgeGraph.getAllNodes();
        const allEdges = this.knowledgeGraph.getAllEdges();

        allNodes.forEach(node => {
            const comments = this.codeComments.get(node.file) || [];

            // 业务功能识别
            if (this.isBusinessFeature(node)) {
                this.analysis.business.features.push({
                    ...node,
                    description: this.extractBusinessDescription(node, comments),
                    businessPurpose: this.inferBusinessPurpose(node.name)
                });
            }

            // 数据模型识别
            if (node.type === 'Interface') {
                this.analysis.business.dataModels.push({
                    ...node,
                    properties: this.extractInterfaceProperties(node),
                    businessRole: this.inferDataModelRole(node.name)
                });
            }

            // API识别
            if (this.isApiFunction(node)) {
                this.analysis.business.apis.push({
                    ...node,
                    method: this.extractHttpMethod(node),
                    businessPurpose: this.inferApiPurpose(node.name)
                });
            }

            // Vue组件识别
            if (node.file.endsWith('.vue') && node.type === 'Module') {
                this.analysis.business.components.push({
                    ...node,
                    businessRole: this.inferComponentRole(node.name)
                });
            }
        });

        // 业务工作流分析
        this.analyzeBusinessWorkflows(allEdges);
    }

    analyzeWithAI() {
        const stats = this.knowledgeGraph.getStats();
        const allEdges = this.knowledgeGraph.getAllEdges();
        
        // 复杂度分析
        const complexityScore = allEdges.length / stats.nodeCount;
        this.analysis.ai.complexity = {
            score: complexityScore,
            level: complexityScore > 1.0 ? '高' : complexityScore > 0.5 ? '中' : '低',
            description: complexityScore > 1.0 ? '代码复杂度较高，建议重构' : '代码复杂度适中'
        };

        // 技术栈识别
        this.analysis.ai.techStack = [];
        if (this.analysis.technical.architecture.frontend.length > 0) this.analysis.ai.techStack.push('Vue.js');
        if (this.analysis.technical.modules.some(m => m.file.endsWith('.ts'))) this.analysis.ai.techStack.push('TypeScript');

        // 架构模式识别
        const hasVue = this.analysis.technical.architecture.frontend.length > 0;
        const hasServices = this.analysis.technical.architecture.backend.length > 0;
        this.analysis.ai.architecturePattern = hasVue && hasServices ? '前后端分离架构' : hasVue ? '前端组件化架构' : '简单模块化架构';

        // AI建议
        this.analysis.ai.recommendations = [];
        if (this.analysis.ai.complexity.level === '高') this.analysis.ai.recommendations.push('代码复杂度较高，建议拆分大型模块');
        if (this.analysis.ai.techStack.includes('Vue.js')) this.analysis.ai.recommendations.push('使用Composition API提高代码复用性');
        this.analysis.ai.recommendations.push('为核心功能添加单元测试');
    }

    // 辅助方法
    isBusinessFeature(node) {
        const keywords = ['login', 'register', 'user', 'order', 'payment', 'search'];
        return keywords.some(keyword => node.name.toLowerCase().includes(keyword));
    }

    inferBusinessPurpose(name) {
        const mappings = {
            'user': '用户管理功能', 'login': '用户登录功能', 'order': '订单处理功能',
            'payment': '支付处理功能', 'search': '搜索功能'
        };
        for (const [key, value] of Object.entries(mappings)) {
            if (name.toLowerCase().includes(key)) return value;
        }
        return '业务逻辑功能';
    }

    extractBusinessDescription(node, comments) {
        const relevantComment = comments.find(c => Math.abs(c.line - (node.position?.line || 0)) <= 3);
        return relevantComment ? relevantComment.content : this.inferBusinessPurpose(node.name);
    }

    extractInterfaceProperties(node) {
        const content = this.fileContents.get(node.file) || '';
        const interfaceRegex = new RegExp(`interface\\s+${node.name}\\s*{([^}]*)}`, 's');
        const match = content.match(interfaceRegex);
        
        if (match) {
            const properties = [];
            const propLines = match[1].split('\n').filter(line => line.trim());
            propLines.forEach(line => {
                const propMatch = line.match(/(\w+)(\?)?\s*:\s*([^;,]+)/);
                if (propMatch) {
                    properties.push({
                        name: propMatch[1],
                        optional: !!propMatch[2],
                        type: propMatch[3].trim()
                    });
                }
            });
            return properties;
        }
        return [];
    }

    inferDataModelRole(name) {
        const mappings = {
            'user': '用户信息数据模型', 'order': '订单信息数据模型',
            'product': '产品信息数据模型', 'payment': '支付信息数据模型'
        };
        for (const [key, value] of Object.entries(mappings)) {
            if (name.toLowerCase().includes(key)) return value;
        }
        return '业务数据模型';
    }

    isApiFunction(node) {
        const content = this.fileContents.get(node.file) || '';
        return (node.type === 'Function' && content.includes('fetch')) ||
               ['get', 'post', 'put', 'delete'].some(method => node.name.toLowerCase().includes(method));
    }

    extractHttpMethod(node) {
        const name = node.name.toLowerCase();
        if (name.includes('get')) return 'GET';
        if (name.includes('post')) return 'POST';
        if (name.includes('put')) return 'PUT';
        if (name.includes('delete')) return 'DELETE';
        return 'GET';
    }

    inferApiPurpose(name) {
        const mappings = {
            'getuser': '获取用户信息', 'createuser': '创建新用户',
            'updateuser': '更新用户信息', 'login': '用户登录接口'
        };
        const lowerName = name.toLowerCase().replace(/\s+/g, '');
        for (const [key, value] of Object.entries(mappings)) {
            if (lowerName.includes(key)) return value;
        }
        return 'API接口功能';
    }

    inferComponentRole(name) {
        const mappings = {
            'login': '用户登录界面组件', 'dashboard': '仪表板组件',
            'list': '列表展示组件', 'form': '表单输入组件'
        };
        for (const [key, value] of Object.entries(mappings)) {
            if (name.toLowerCase().includes(key)) return value;
        }
        return 'UI业务组件';
    }

    analyzeBusinessWorkflows(edges) {
        const workflows = new Map();
        edges.filter(edge => edge.relation === 'calls').forEach(edge => {
            const sourceNode = this.knowledgeGraph.findNode(edge.source);
            if (sourceNode) {
                const workflow = sourceNode.name;
                if (!workflows.has(workflow)) workflows.set(workflow, []);
                workflows.get(workflow).push(edge.target);
            }
        });
        
        workflows.forEach((steps, name) => {
            if (steps.length >= 2) {
                this.analysis.business.workflows.push({
                    name, steps: steps.slice(0, 4),
                    description: `${name}相关业务流程`
                });
            }
        });
    }

    // 生成统一知识图谱文档
    generateUnifiedOverview() {
        const stats = this.knowledgeGraph.getStats();
        
        return `# 📊 GraphRAG 统一知识图谱

## 🎯 项目全景分析

本文档整合了**技术架构**、**业务逻辑**和**AI智能分析**三个维度的完整项目文档。

### 📈 项目统计概览

| 维度 | 指标 | 数量 | 说明 |
|------|------|------|------|
| **🔧 技术架构** | 代码文件 | ${this.analysis.technical.modules.length} | 项目模块文件 |
| | 代码实体 | ${stats.nodeCount} | 函数、类、接口等 |
| | 依赖关系 | ${stats.edgeCount} | 模块间调用关系 |
| **📋 业务功能** | 核心功能 | ${this.analysis.business.features.length} | 主要业务功能 |
| | 数据模型 | ${this.analysis.business.dataModels.length} | 业务数据结构 |
| | API接口 | ${this.analysis.business.apis.length} | 业务接口服务 |
| | UI组件 | ${this.analysis.business.components.length} | 前端业务组件 |
| **🤖 AI分析** | 复杂度 | ${this.analysis.ai.complexity.level} | ${this.analysis.ai.complexity.description} |
| | 技术栈 | ${this.analysis.ai.techStack.length} | ${this.analysis.ai.techStack.join(', ')} |
| | 架构模式 | 1 | ${this.analysis.ai.architecturePattern} |

### 🏗️ 三维架构视图

#### 🔧 技术架构层
- **前端组件**: ${this.analysis.technical.architecture.frontend.length} 个
- **后端服务**: ${this.analysis.technical.architecture.backend.length} 个  
- **配置文件**: ${this.analysis.technical.architecture.config.length} 个

#### 📋 业务逻辑层  
- **核心功能**: ${this.analysis.business.features.length} 个业务功能模块
- **数据模型**: ${this.analysis.business.dataModels.length} 个业务数据结构
- **业务流程**: ${this.analysis.business.workflows.length} 个工作流程

#### 🤖 AI智能层
- **复杂度评估**: ${this.analysis.ai.complexity.level}复杂度 (${this.analysis.ai.complexity.score.toFixed(2)})
- **技术栈识别**: ${this.analysis.ai.techStack.join('、')}
- **架构模式**: ${this.analysis.ai.architecturePattern}
- **优化建议**: ${this.analysis.ai.recommendations.length} 项改进建议

### 📋 文档导航

- [🔧 技术架构](./technical.md) - 代码结构、模块依赖、架构设计
- [📋 业务功能](./business.md) - 功能模块、数据模型、业务流程
- [🤖 AI智能分析](./ai-analysis.md) - 复杂度分析、优化建议
- [📊 数据模型](./data-models.md) - 接口定义、字段说明
- [🔌 API接口](./apis.md) - 接口列表、业务用途
- [🎨 组件设计](./components.md) - 组件功能、业务价值

---
*本文档由GraphRAG知识图谱自动生成，整合技术+业务+AI三维分析*
`;
    }

    // 生成技术架构文档
    generateTechnicalDocs() {
        let docs = `# 🔧 技术架构文档

## 📦 模块结构

`;
        this.analysis.technical.modules.forEach(module => {
            docs += `### ${path.basename(module.file)}\n`;
            docs += `- **节点数量**: ${module.nodeCount}\n`;
            docs += `- **主要类型**: ${module.nodes.map(n => n.type).join(', ')}\n\n`;
        });

        docs += `## 🏗️ 架构分层

### 前端层 (${this.analysis.technical.architecture.frontend.length} 个组件)
${this.analysis.technical.architecture.frontend.map(node => 
    `- **${node.name}**: ${node.type}`
).join('\n') || '暂无前端组件'}

### 服务层 (${this.analysis.technical.architecture.backend.length} 个服务)  
${this.analysis.technical.architecture.backend.map(node => 
    `- **${node.name}**: ${node.type}`
).join('\n') || '暂无后端服务'}

### 配置层 (${this.analysis.technical.architecture.config.length} 个配置)
${this.analysis.technical.architecture.config.map(node => 
    `- **${node.name}**: ${node.type}`
).join('\n') || '暂无配置文件'}

## 🔗 依赖关系

${this.analysis.technical.dependencies.slice(0, 10).map(dep => 
    `- ${dep.source} → ${dep.target}`
).join('\n') || '暂无依赖关系'}
`;
        return docs;
    }

    // 生成业务功能文档
    generateBusinessDocs() {
        let docs = `# 📋 业务功能文档

## 🎯 核心业务功能

`;
        this.analysis.business.features.forEach(feature => {
            docs += `### ${feature.name}\n`;
            docs += `- **功能描述**: ${feature.description}\n`;
            docs += `- **业务价值**: ${feature.businessPurpose}\n`;
            docs += `- **实现位置**: \`${path.basename(feature.file)}\`\n\n`;
        });

        docs += `## 📊 数据模型

`;
        this.analysis.business.dataModels.forEach(model => {
            docs += `### ${model.name}\n`;
            docs += `- **业务作用**: ${model.businessRole}\n`;
            
            if (model.properties && model.properties.length > 0) {
                docs += `- **数据字段**:\n`;
                model.properties.forEach(prop => {
                    docs += `  - ${prop.name}: \`${prop.type}\`${prop.optional ? ' (可选)' : ''}\n`;
                });
            }
            docs += '\n';
        });

        docs += `## 🔌 API接口

`;
        this.analysis.business.apis.forEach(api => {
            docs += `### ${api.name}\n`;
            docs += `- **HTTP方法**: ${api.method}\n`;
            docs += `- **业务用途**: ${api.businessPurpose}\n`;
            docs += `- **实现位置**: \`${path.basename(api.file)}\`\n\n`;
        });

        docs += `## 🎨 UI组件

`;
        this.analysis.business.components.forEach(component => {
            docs += `### ${component.name}\n`;
            docs += `- **业务作用**: ${component.businessRole}\n`;
            docs += `- **实现位置**: \`${path.basename(component.file)}\`\n\n`;
        });

        return docs;
    }

    // 生成AI分析文档
    generateAIAnalysisDocs() {
        return `# 🤖 AI智能分析报告

## 🎯 项目特征识别

### 📊 复杂度分析
- **复杂度等级**: ${this.analysis.ai.complexity.level}
- **复杂度评分**: ${this.analysis.ai.complexity.score.toFixed(2)}
- **分析说明**: ${this.analysis.ai.complexity.description}

### 🛠️ 技术栈识别
${this.analysis.ai.techStack.map(tech => `- ✅ **${tech}**: 已识别使用`).join('\n') || '- 暂未识别到特定技术栈'}

### 🏗️ 架构模式
- **架构类型**: ${this.analysis.ai.architecturePattern}
- **架构特点**: 基于代码结构自动识别的架构模式

## 💡 AI优化建议

${this.analysis.ai.recommendations.map((rec, index) => 
    `${index + 1}. ${rec}`
).join('\n') || '暂无特定优化建议'}

## 📈 项目健康度

- **代码复杂度**: ${this.analysis.ai.complexity.level === '低' ? '✅ 良好' : this.analysis.ai.complexity.level === '中' ? '⚠️ 适中' : '❌ 需要关注'}
- **技术栈现代化**: ${this.analysis.ai.techStack.includes('TypeScript') ? '✅ 现代化' : '⚠️ 可以升级'}
- **架构合理性**: ${this.analysis.ai.architecturePattern.includes('分离') ? '✅ 架构清晰' : '⚠️ 可以优化'}

---
*本分析基于GraphRAG知识图谱和AI智能算法生成*
`;
    }

    // 生成完整的统一Wiki
    async generateUnifiedWiki(outputDir = './unified-wiki') {
        console.log('📖 开始生成统一知识图谱Wiki...');
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const docs = {
            'README.md': this.generateUnifiedOverview(),
            'technical.md': this.generateTechnicalDocs(),
            'business.md': this.generateBusinessDocs(),
            'ai-analysis.md': this.generateAIAnalysisDocs()
        };

        for (const [filename, content] of Object.entries(docs)) {
            const filePath = path.join(outputDir, filename);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ 已生成: ${filePath}`);
        }

        console.log(`\n📖 统一知识图谱Wiki生成完成！`);
        console.log(`📁 文档位置: ${path.resolve(outputDir)}`);
        
        return outputDir;
    }
}

module.exports = UnifiedWikiGenerator;