"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WikiGenerator = require('./wikiGenerator');
const fs = require('fs');
const path = require('path');
class AIWikiGenerator extends WikiGenerator {
    constructor(options = {}) {
        super();
        this.aiProvider = options.aiProvider || 'mock'; // 可以扩展为OpenAI、Claude等
        this.generateDetailedDocs = options.generateDetailedDocs || true;
    }
    // 模拟AI分析代码功能（可替换为真实的AI API调用）
    async analyzeCodeWithAI(codeSnippet, nodeInfo) {
        // 这里可以集成真实的AI API，比如OpenAI GPT、Claude等
        // 目前使用规则引擎模拟AI分析
        const analysis = {
            purpose: this.inferPurpose(nodeInfo),
            complexity: this.assessComplexity(nodeInfo),
            recommendations: this.generateRecommendations(nodeInfo),
            usage: this.generateUsageExample(nodeInfo)
        };
        return analysis;
    }
    // 推断代码目的
    inferPurpose(nodeInfo) {
        const name = nodeInfo.name.toLowerCase();
        const type = nodeInfo.type;
        if (type === 'Interface') {
            return `定义了 ${nodeInfo.name} 的数据结构和接口契约`;
        }
        else if (type === 'Class') {
            if (name.includes('service')) {
                return `${nodeInfo.name} 服务类，负责业务逻辑处理`;
            }
            else if (name.includes('component')) {
                return `${nodeInfo.name} 组件类，用于UI渲染和交互`;
            }
            else {
                return `${nodeInfo.name} 类，封装相关的数据和方法`;
            }
        }
        else if (type === 'Function') {
            if (name.includes('get')) {
                return `获取数据的方法，返回特定信息`;
            }
            else if (name.includes('set') || name.includes('update')) {
                return `更新数据的方法，修改系统状态`;
            }
            else if (name.includes('handle')) {
                return `事件处理方法，响应用户操作或系统事件`;
            }
            else if (name.includes('create')) {
                return `创建新实例或数据的方法`;
            }
            else if (name.includes('validate')) {
                return `数据验证方法，确保输入的正确性`;
            }
            else {
                return `执行特定业务逻辑的功能方法`;
            }
        }
        else if (type === 'Variable') {
            if (nodeInfo.extra?.isImported) {
                return `从 ${nodeInfo.extra.from} 模块导入的功能`;
            }
            else if (nodeInfo.extra?.isReactive) {
                return `Vue 响应式数据，用于组件状态管理`;
            }
            else if (nodeInfo.extra?.isComputed) {
                return `Vue 计算属性，基于其他数据动态计算得出`;
            }
            else {
                return `存储数据的变量`;
            }
        }
        else if (type === 'Module') {
            if (nodeInfo.file.endsWith('.vue')) {
                return `Vue 单文件组件，包含模板、脚本和样式`;
            }
            else {
                return `模块文件，提供可复用的功能`;
            }
        }
        return `${type} 类型的代码实体`;
    }
    // 评估复杂度
    assessComplexity(nodeInfo) {
        // 基于节点的连接数和特性评估复杂度
        const edges = this.knowledgeGraph.getAllEdges();
        const relatedEdges = edges.filter((edge) => edge.source === nodeInfo.id || edge.target === nodeInfo.id);
        const connectionCount = relatedEdges.length;
        if (connectionCount >= 5) {
            return { level: '高', description: '与多个组件有较强依赖关系，修改时需谨慎' };
        }
        else if (connectionCount >= 2) {
            return { level: '中', description: '具有适度的依赖关系，相对独立' };
        }
        else {
            return { level: '低', description: '依赖关系简单，易于理解和维护' };
        }
    }
    // 生成建议
    generateRecommendations(nodeInfo) {
        const recommendations = [];
        const type = nodeInfo.type;
        const name = nodeInfo.name;
        if (type === 'Function') {
            recommendations.push('建议添加详细的JSDoc注释说明参数和返回值');
            recommendations.push('考虑添加单元测试确保功能正确性');
            if (name.includes('async') || nodeInfo.extra?.isAsync) {
                recommendations.push('异步函数需要适当的错误处理机制');
            }
        }
        else if (type === 'Interface') {
            recommendations.push('建议为接口属性添加详细的类型注释');
            recommendations.push('考虑使用泛型提高接口的复用性');
        }
        else if (type === 'Class') {
            recommendations.push('遵循单一职责原则，确保类的功能聚焦');
            recommendations.push('为公共方法提供清晰的文档说明');
        }
        else if (type === 'Variable' && nodeInfo.extra?.isReactive) {
            recommendations.push('Vue响应式数据变更时会触发重新渲染');
            recommendations.push('避免在响应式数据中存储复杂对象的深层引用');
        }
        return recommendations;
    }
    // 生成使用示例
    generateUsageExample(nodeInfo) {
        const type = nodeInfo.type;
        const name = nodeInfo.name;
        if (type === 'Function') {
            if (name.includes('get')) {
                return `const result = await ${name}(id);`;
            }
            else if (name.includes('handle')) {
                return `<button @click="${name}">点击</button>`;
            }
            else {
                return `${name}();`;
            }
        }
        else if (type === 'Interface') {
            return `const data: ${name} = {\n  // 实现接口属性\n};`;
        }
        else if (type === 'Class') {
            return `const instance = new ${name}();`;
        }
        else if (type === 'Variable' && nodeInfo.extra?.isReactive) {
            return `const ${name} = ref(initialValue);`;
        }
        return '// 具体使用方式请参考代码实现';
    }
    // 生成增强的API文档
    async generateEnhancedApiDocs() {
        const functions = this.projectAnalysis.functions;
        const classes = this.projectAnalysis.classes;
        const interfaces = this.projectAnalysis.interfaces;
        let apiDocs = `# 🔧 增强API文档

*本文档基于GraphRAG知识图谱自动生成，包含AI分析的详细说明*

`;
        // 接口文档
        if (interfaces.length > 0) {
            apiDocs += `## 📋 接口定义\n\n`;
            for (const interfaceNode of interfaces) {
                const analysis = await this.analyzeCodeWithAI('', interfaceNode);
                const pos = interfaceNode.position ? ` (第${interfaceNode.position.line + 1}行)` : '';
                apiDocs += `### \`${interfaceNode.name}\`${pos}\n\n`;
                apiDocs += `**文件**: \`${path.basename(interfaceNode.file)}\`\n\n`;
                apiDocs += `**用途**: ${analysis.purpose}\n\n`;
                apiDocs += `**复杂度**: ${analysis.complexity.level} - ${analysis.complexity.description}\n\n`;
                if (analysis.usage) {
                    apiDocs += `**使用示例**:
\`\`\`typescript
${analysis.usage}
\`\`\`

`;
                }
                if (analysis.recommendations.length > 0) {
                    apiDocs += `**建议**:\n`;
                    analysis.recommendations.forEach(rec => {
                        apiDocs += `- ${rec}\n`;
                    });
                    apiDocs += '\n';
                }
                apiDocs += '---\n\n';
            }
        }
        // 类文档
        if (classes.length > 0) {
            apiDocs += `## 🏗️ 类定义\n\n`;
            for (const cls of classes) {
                const analysis = await this.analyzeCodeWithAI('', cls);
                const pos = cls.position ? ` (第${cls.position.line + 1}行)` : '';
                apiDocs += `### \`${cls.name}\`${pos}\n\n`;
                apiDocs += `**文件**: \`${path.basename(cls.file)}\`\n\n`;
                apiDocs += `**用途**: ${analysis.purpose}\n\n`;
                apiDocs += `**复杂度**: ${analysis.complexity.level} - ${analysis.complexity.description}\n\n`;
                // 查找类的方法和继承关系
                const classEdges = this.knowledgeGraph.getAllEdges().filter((edge) => edge.source === cls.id || edge.target === cls.id);
                if (classEdges.length > 0) {
                    apiDocs += `**关系分析**:\n`;
                    const inheritEdges = classEdges.filter((e) => e.relation === 'inherits');
                    const callEdges = classEdges.filter((e) => e.relation === 'calls');
                    if (inheritEdges.length > 0) {
                        inheritEdges.forEach((edge) => {
                            if (edge.source === cls.id) {
                                apiDocs += `- 继承自: \`${edge.target}\`\n`;
                            }
                        });
                    }
                    if (callEdges.length > 0) {
                        apiDocs += `- 调用关系: ${callEdges.length} 个方法调用\n`;
                    }
                    apiDocs += '\n';
                }
                if (analysis.usage) {
                    apiDocs += `**使用示例**:
\`\`\`typescript
${analysis.usage}
\`\`\`

`;
                }
                if (analysis.recommendations.length > 0) {
                    apiDocs += `**优化建议**:\n`;
                    analysis.recommendations.forEach(rec => {
                        apiDocs += `- ${rec}\n`;
                    });
                    apiDocs += '\n';
                }
                apiDocs += '---\n\n';
            }
        }
        // 函数文档
        if (functions.length > 0) {
            apiDocs += `## ⚙️ 函数定义\n\n`;
            for (const func of functions) {
                const analysis = await this.analyzeCodeWithAI('', func);
                const pos = func.position ? ` (第${func.position.line + 1}行)` : '';
                apiDocs += `### \`${func.name}\`${pos}\n\n`;
                apiDocs += `**文件**: \`${path.basename(func.file)}\`\n\n`;
                apiDocs += `**功能**: ${analysis.purpose}\n\n`;
                apiDocs += `**复杂度**: ${analysis.complexity.level} - ${analysis.complexity.description}\n\n`;
                // 查找函数的调用关系
                const funcCalls = this.knowledgeGraph.getAllEdges().filter((edge) => edge.source === func.id && edge.relation === 'calls');
                if (funcCalls.length > 0) {
                    apiDocs += `**调用的函数**:\n`;
                    funcCalls.slice(0, 5).forEach((edge) => {
                        apiDocs += `- \`${edge.target}\`\n`;
                    });
                    if (funcCalls.length > 5) {
                        apiDocs += `- ... 及其他 ${funcCalls.length - 5} 个函数\n`;
                    }
                    apiDocs += '\n';
                }
                if (analysis.usage) {
                    apiDocs += `**使用示例**:
\`\`\`typescript
${analysis.usage}
\`\`\`

`;
                }
                if (analysis.recommendations.length > 0) {
                    apiDocs += `**开发建议**:\n`;
                    analysis.recommendations.forEach(rec => {
                        apiDocs += `- ${rec}\n`;
                    });
                    apiDocs += '\n';
                }
                apiDocs += '---\n\n';
            }
        }
        return apiDocs;
    }
    // 生成AI增强的项目总结
    async generateProjectSummary() {
        const stats = this.knowledgeGraph.getStats();
        const allEdges = this.knowledgeGraph.getAllEdges();
        // 分析项目特征
        const hasVueComponents = this.projectAnalysis.architecture.frontend.length > 0;
        const hasTypeScript = this.projectAnalysis.modules.some((m) => m.file.endsWith('.ts'));
        const hasServices = this.projectAnalysis.architecture.backend.length > 0;
        const complexityScore = allEdges.length / stats.nodeCount;
        let summary = `# 📋 AI项目分析报告

## 🎯 项目特征分析

`;
        // 技术栈分析
        summary += `### 技术栈识别\n`;
        if (hasVueComponents) {
            summary += `- ✅ **Vue.js**: 检测到 ${this.projectAnalysis.architecture.frontend.length} 个Vue组件\n`;
        }
        if (hasTypeScript) {
            summary += `- ✅ **TypeScript**: 使用类型安全的JavaScript超集\n`;
        }
        summary += `- 📊 **代码规模**: ${stats.nodeCount} 个代码实体，${allEdges.length} 个依赖关系\n\n`;
        // 架构模式分析
        summary += `### 架构模式分析\n`;
        if (hasVueComponents && !hasServices) {
            summary += `- 🏗️ **前端主导架构**: 主要由Vue组件构成的前端应用\n`;
        }
        else if (hasServices) {
            summary += `- 🏗️ **分层架构**: 包含前端展示层和后端服务层\n`;
        }
        else {
            summary += `- 🏗️ **简单架构**: 基础的模块化代码结构\n`;
        }
        // 复杂度评估
        summary += `### 复杂度评估\n`;
        if (complexityScore > 1.0) {
            summary += `- 🔴 **高复杂度**: 平均每个节点有 ${complexityScore.toFixed(1)} 个连接，建议拆分大型模块\n`;
        }
        else if (complexityScore > 0.5) {
            summary += `- 🟡 **中等复杂度**: 平均每个节点有 ${complexityScore.toFixed(1)} 个连接，架构相对合理\n`;
        }
        else {
            summary += `- 🟢 **低复杂度**: 平均每个节点有 ${complexityScore.toFixed(1)} 个连接，结构清晰\n`;
        }
        // 关键节点分析
        const nodeConnections = new Map();
        allEdges.forEach((edge) => {
            nodeConnections.set(edge.source, (nodeConnections.get(edge.source) || 0) + 1);
            nodeConnections.set(edge.target, (nodeConnections.get(edge.target) || 0) + 1);
        });
        const topNodes = Array.from(nodeConnections.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        summary += `\n### 核心组件识别\n`;
        topNodes.forEach(([nodeId, connections], index) => {
            const node = this.knowledgeGraph.findNode(nodeId);
            if (node) {
                summary += `${index + 1}. **${node.name}** (${node.type}): ${connections} 个连接 - 项目核心组件\n`;
            }
        });
        // 改进建议
        summary += `\n## 💡 AI改进建议\n\n`;
        if (complexityScore > 1.0) {
            summary += `### 🔧 重构建议\n`;
            summary += `- 考虑将高连接度的模块拆分为更小的组件\n`;
            summary += `- 引入依赖注入模式减少模块间的直接依赖\n`;
            summary += `- 建立清晰的分层架构\n\n`;
        }
        if (hasVueComponents) {
            summary += `### 🎨 Vue.js 最佳实践\n`;
            summary += `- 使用Composition API提高代码复用性\n`;
            summary += `- 实现组件的懒加载优化性能\n`;
            summary += `- 添加Vue DevTools支持便于调试\n\n`;
        }
        if (hasTypeScript) {
            summary += `### 📝 TypeScript 优化\n`;
            summary += `- 充分利用类型系统减少运行时错误\n`;
            summary += `- 为所有公共API提供完整的类型定义\n`;
            summary += `- 配置严格的TypeScript编译选项\n\n`;
        }
        summary += `### 📚 文档和测试\n`;
        summary += `- 为核心函数和类添加JSDoc注释\n`;
        summary += `- 建立单元测试覆盖主要业务逻辑\n`;
        summary += `- 创建组件使用示例和API文档\n`;
        summary += `- 设置CI/CD流程自动化代码质量检查\n\n`;
        summary += `---\n*本分析报告基于GraphRAG知识图谱和AI智能分析生成*\n`;
        return summary;
    }
    // 生成增强版Wiki
    async generateEnhancedWiki(outputDir = './ai-wiki') {
        console.log('🤖 开始生成AI增强的Wiki文档...');
        // 创建输出目录
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        // 生成基础文档
        const basicDocs = {
            'overview.md': this.generateOverview(),
            'modules.md': this.generateModulesDocs(),
            'architecture.md': this.generateArchitectureDocs()
        };
        // 生成AI增强文档
        const enhancedDocs = {
            'ai-summary.md': await this.generateProjectSummary(),
            'enhanced-api.md': await this.generateEnhancedApiDocs()
        };
        // 合并所有文档
        const allDocs = { ...basicDocs, ...enhancedDocs };
        // 写入文件
        for (const [filename, content] of Object.entries(allDocs)) {
            const filePath = path.join(outputDir, filename);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ 已生成: ${filePath}`);
        }
        // 生成增强版导航
        const enhancedNavigation = `# 🤖 AI增强项目Wiki

## 📖 文档导航

### 🔍 基础分析
- [📊 项目概览](./overview.md) - 整体统计和架构概述
- [📦 模块文档](./modules.md) - 详细的模块和文件说明
- [🏗️ 架构文档](./architecture.md) - 项目架构设计和依赖关系

### 🤖 AI智能分析
- [📋 AI项目分析](./ai-summary.md) - 技术栈识别、复杂度评估、改进建议
- [🔧 增强API文档](./enhanced-api.md) - 包含AI分析的详细接口文档

## 🌟 特色功能

- ✅ **自动代码分析**: 基于GraphRAG知识图谱深度分析项目结构
- ✅ **智能文档生成**: AI理解代码用途并生成详细说明
- ✅ **复杂度评估**: 自动评估代码复杂度并提供优化建议
- ✅ **架构可视化**: Mermaid图表展示项目架构和依赖关系
- ✅ **最佳实践**: 基于技术栈提供个性化的改进建议

## 📈 数据概览

- **分析文件**: ${this.projectAnalysis.modules.length} 个
- **代码实体**: ${this.knowledgeGraph.getStats().nodeCount} 个
- **依赖关系**: ${this.knowledgeGraph.getStats().edgeCount} 条
- **Vue组件**: ${this.projectAnalysis.architecture.frontend.length} 个
- **类定义**: ${this.projectAnalysis.classes.length} 个
- **函数定义**: ${this.projectAnalysis.functions.length} 个

---
*本Wiki由GraphRAG知识图谱 + AI智能分析自动生成*
`;
        fs.writeFileSync(path.join(outputDir, 'README.md'), enhancedNavigation, 'utf8');
        console.log(`✅ 已生成增强版导航文件`);
        console.log(`\n🤖 AI增强Wiki文档生成完成！`);
        console.log(`📁 文档位置: ${path.resolve(outputDir)}`);
        console.log(`📋 包含文件: ${Object.keys(allDocs).length + 1} 个`);
        return outputDir;
    }
}
module.exports = AIWikiGenerator;
//# sourceMappingURL=aiWikiGenerator.js.map