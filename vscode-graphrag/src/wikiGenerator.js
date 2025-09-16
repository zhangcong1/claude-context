const { parseTsFile, parseVueFile } = require('../dist/parser-optimized');
const { KnowledgeGraph } = require('../dist/graph');
const fs = require('fs');
const path = require('path');

class WikiGenerator {
    constructor() {
        this.knowledgeGraph = new KnowledgeGraph();
        this.projectAnalysis = {
            modules: [],
            components: [],
            interfaces: [],
            functions: [],
            classes: [],
            dependencies: [],
            architecture: {
                frontend: [],
                backend: [],
                config: [],
                docs: []
            }
        };
    }

    // 解析整个项目
    async analyzeProject(projectFiles) {
        console.log('🔍 开始分析项目结构...');
        
        for (const file of projectFiles) {
            try {
                const result = parseTsFile(file);
                this.knowledgeGraph.addNodes(result.nodes);
                this.knowledgeGraph.addEdges(result.edges);
                console.log(`✅ 已分析: ${file}`);
            } catch (error) {
                console.log(`❌ 分析失败: ${file} - ${error.message}`);
            }
        }

        // 分析项目结构
        this.analyzeArchitecture();
        console.log('📊 项目分析完成');
    }

    // 分析项目架构
    analyzeArchitecture() {
        const allNodes = this.knowledgeGraph.getAllNodes();
        const allEdges = this.knowledgeGraph.getAllEdges();

        // 按文件类型和功能分类
        allNodes.forEach(node => {
            const file = node.file;
            const fileName = path.basename(file);

            // 分类到不同架构层
            if (file.endsWith('.vue') || file.includes('component')) {
                this.projectAnalysis.architecture.frontend.push(node);
            } else if (file.includes('service') || file.includes('api')) {
                this.projectAnalysis.architecture.backend.push(node);
            } else if (file.endsWith('.json') || file.includes('config')) {
                this.projectAnalysis.architecture.config.push(node);
            } else if (file.endsWith('.md') || file.includes('doc')) {
                this.projectAnalysis.architecture.docs.push(node);
            }

            // 按节点类型分类
            switch (node.type) {
                case 'Module':
                    this.projectAnalysis.modules.push(node);
                    break;
                case 'Interface':
                    this.projectAnalysis.interfaces.push(node);
                    break;
                case 'Function':
                    this.projectAnalysis.functions.push(node);
                    break;
                case 'Class':
                    this.projectAnalysis.classes.push(node);
                    break;
            }
        });

        // 分析依赖关系
        const importEdges = allEdges.filter(edge => edge.relation === 'imports');
        const dependencies = new Map();
        
        importEdges.forEach(edge => {
            const sourceNode = this.knowledgeGraph.findNode(edge.source);
            if (sourceNode) {
                const deps = dependencies.get(sourceNode.file) || [];
                deps.push(edge.target);
                dependencies.set(sourceNode.file, deps);
            }
        });

        this.projectAnalysis.dependencies = Array.from(dependencies.entries()).map(([file, deps]) => ({
            file,
            dependencies: [...new Set(deps)]
        }));
    }

    // 生成项目概览
    generateOverview() {
        const stats = this.knowledgeGraph.getStats();
        const allEdges = this.knowledgeGraph.getAllEdges();
        
        return `# 项目概览

## 📊 项目统计

- **总文件数**: ${this.projectAnalysis.modules.length} 个模块
- **总节点数**: ${stats.nodeCount} 个代码实体
- **总关系数**: ${stats.edgeCount} 个依赖关系
- **代码语言**: TypeScript, Vue.js, JSON, Markdown

## 🏗️ 架构组成

| 层级 | 组件数量 | 说明 |
|------|----------|------|
| 前端组件 | ${this.projectAnalysis.architecture.frontend.length} | Vue组件和前端逻辑 |
| 后端服务 | ${this.projectAnalysis.architecture.backend.length} | 服务层和API接口 |
| 配置文件 | ${this.projectAnalysis.architecture.config.length} | 项目配置和设置 |
| 文档资料 | ${this.projectAnalysis.architecture.docs.length} | 项目文档和说明 |

## 📋 代码实体分布

| 类型 | 数量 | 占比 |
|------|------|------|
${Object.entries(stats.nodeTypes).map(([type, count]) => 
    `| ${type} | ${count} | ${(count/stats.nodeCount*100).toFixed(1)}% |`
).join('\n')}

## 🔗 关系类型分析

| 关系类型 | 数量 | 说明 |
|----------|------|------|
${Object.entries(stats.relationTypes).map(([relation, count]) => {
    const description = {
        'imports': '模块导入关系',
        'calls': '函数调用关系', 
        'inherits': '类继承关系',
        'references': '引用关系'
    };
    return `| ${relation} | ${count} | ${description[relation] || '其他关系'} |`;
}).join('\n')}
`;
    }

    // 生成模块文档
    generateModulesDocs() {
        let moduleDocs = `# 📦 模块文档

## 模块列表

`;

        // 按文件分组生成模块文档
        const modulesByFile = new Map();
        this.knowledgeGraph.getAllNodes().forEach(node => {
            const file = node.file;
            if (!modulesByFile.has(file)) {
                modulesByFile.set(file, []);
            }
            modulesByFile.get(file).push(node);
        });

        Array.from(modulesByFile.entries()).forEach(([file, nodes]) => {
            const fileName = path.basename(file);
            const fileExt = path.extname(file);
            
            moduleDocs += `## ${fileName}\n\n`;
            
            // 文件描述
            if (fileExt === '.vue') {
                moduleDocs += `> Vue 组件文件\n\n`;
            } else if (fileExt === '.ts') {
                moduleDocs += `> TypeScript 模块文件\n\n`;
            } else if (fileExt === '.json') {
                moduleDocs += `> JSON 配置文件\n\n`;
            } else if (fileExt === '.md') {
                moduleDocs += `> Markdown 文档文件\n\n`;
            }

            // 文件中的节点
            const nodesByType = {};
            nodes.forEach(node => {
                if (!nodesByType[node.type]) {
                    nodesByType[node.type] = [];
                }
                nodesByType[node.type].push(node);
            });

            Object.entries(nodesByType).forEach(([type, typeNodes]) => {
                if (typeNodes.length > 0) {
                    moduleDocs += `### ${type}s\n\n`;
                    typeNodes.forEach(node => {
                        const pos = node.position ? ` (第${node.position.line + 1}行)` : '';
                        const extra = node.extra ? this.formatExtra(node.extra) : '';
                        moduleDocs += `- **${node.name}**${pos}${extra}\n`;
                    });
                    moduleDocs += '\n';
                }
            });

            // 文件的依赖关系
            const fileDeps = this.projectAnalysis.dependencies.find(d => d.file === file);
            if (fileDeps && fileDeps.dependencies.length > 0) {
                moduleDocs += `### 依赖关系\n\n`;
                fileDeps.dependencies.forEach(dep => {
                    moduleDocs += `- \`${dep}\`\n`;
                });
                moduleDocs += '\n';
            }

            moduleDocs += '---\n\n';
        });

        return moduleDocs;
    }

    // 生成API文档
    generateApiDocs() {
        const functions = this.projectAnalysis.functions;
        const classes = this.projectAnalysis.classes;
        const interfaces = this.projectAnalysis.interfaces;

        let apiDocs = `# 🔧 API 文档

## 接口定义

`;

        // 接口文档
        if (interfaces.length > 0) {
            interfaces.forEach(interfaceNode => {
                const pos = interfaceNode.position ? ` (第${interfaceNode.position.line + 1}行)` : '';
                apiDocs += `### ${interfaceNode.name}${pos}\n\n`;
                apiDocs += `**文件**: ${path.basename(interfaceNode.file)}\n\n`;
                if (interfaceNode.extra) {
                    apiDocs += `**特性**: ${this.formatExtra(interfaceNode.extra)}\n\n`;
                }
                apiDocs += '---\n\n';
            });
        }

        // 类文档
        apiDocs += `## 类定义\n\n`;
        if (classes.length > 0) {
            classes.forEach(cls => {
                const pos = cls.position ? ` (第${cls.position.line + 1}行)` : '';
                apiDocs += `### ${cls.name}${pos}\n\n`;
                apiDocs += `**文件**: ${path.basename(cls.file)}\n\n`;
                
                // 查找类的方法和继承关系
                const classEdges = this.knowledgeGraph.getAllEdges().filter(edge => 
                    edge.source === cls.id || edge.target === cls.id
                );
                
                if (classEdges.length > 0) {
                    apiDocs += `**关系**:\n`;
                    classEdges.forEach(edge => {
                        if (edge.relation === 'inherits' && edge.source === cls.id) {
                            apiDocs += `- 继承自: \`${edge.target}\`\n`;
                        }
                    });
                    apiDocs += '\n';
                }
                
                apiDocs += '---\n\n';
            });
        }

        // 函数文档
        apiDocs += `## 函数定义\n\n`;
        if (functions.length > 0) {
            functions.forEach(func => {
                const pos = func.position ? ` (第${func.position.line + 1}行)` : '';
                apiDocs += `### ${func.name}${pos}\n\n`;
                apiDocs += `**文件**: ${path.basename(func.file)}\n\n`;
                
                // 查找函数的调用关系
                const funcCalls = this.knowledgeGraph.getAllEdges().filter(edge => 
                    edge.source === func.id && edge.relation === 'calls'
                );
                
                if (funcCalls.length > 0) {
                    apiDocs += `**调用的函数**:\n`;
                    funcCalls.forEach(edge => {
                        apiDocs += `- \`${edge.target}\`\n`;
                    });
                    apiDocs += '\n';
                }
                
                if (func.extra) {
                    apiDocs += `**特性**: ${this.formatExtra(func.extra)}\n\n`;
                }
                
                apiDocs += '---\n\n';
            });
        }

        return apiDocs;
    }

    // 生成架构文档
    generateArchitectureDocs() {
        let archDocs = `# 🏗️ 架构文档

## 项目架构图

\`\`\`mermaid
graph TB
    subgraph "前端层"
        ${this.projectAnalysis.architecture.frontend.map(node => 
            `${this.sanitizeId(node.id)}["${node.name}"]`
        ).join('\n        ')}
    end
    
    subgraph "服务层"
        ${this.projectAnalysis.architecture.backend.map(node => 
            `${this.sanitizeId(node.id)}["${node.name}"]`
        ).join('\n        ')}
    end
    
    subgraph "配置层"
        ${this.projectAnalysis.architecture.config.map(node => 
            `${this.sanitizeId(node.id)}["${node.name}"]`
        ).join('\n        ')}
    end
\`\`\`

## 依赖关系图

\`\`\`mermaid
graph LR
${this.generateDependencyMermaid()}
\`\`\`

## 架构层级说明

### 前端组件层
${this.projectAnalysis.architecture.frontend.length > 0 ? 
    this.projectAnalysis.architecture.frontend.map(node => 
        `- **${node.name}**: ${node.type} (${path.basename(node.file)})`
    ).join('\n') : 
    '- 暂无前端组件'
}

### 服务逻辑层
${this.projectAnalysis.architecture.backend.length > 0 ? 
    this.projectAnalysis.architecture.backend.map(node => 
        `- **${node.name}**: ${node.type} (${path.basename(node.file)})`
    ).join('\n') : 
    '- 暂无服务组件'
}

### 配置管理层
${this.projectAnalysis.architecture.config.length > 0 ? 
    this.projectAnalysis.architecture.config.map(node => 
        `- **${node.name}**: ${node.type} (${path.basename(node.file)})`
    ).join('\n') : 
    '- 暂无配置文件'
}
`;

        return archDocs;
    }

    // 生成依赖关系的Mermaid图
    generateDependencyMermaid() {
        const allEdges = this.knowledgeGraph.getAllEdges();
        const importEdges = allEdges.filter(edge => edge.relation === 'imports');
        
        return importEdges.map(edge => {
            const sourceNode = this.knowledgeGraph.findNode(edge.source);
            const sourceName = sourceNode ? sourceNode.name : edge.source;
            return `    ${this.sanitizeId(sourceName)} --> ${this.sanitizeId(edge.target)}`;
        }).slice(0, 20).join('\n'); // 限制显示前20个依赖关系
    }

    // 清理ID用于Mermaid图
    sanitizeId(id) {
        return id.replace(/[^a-zA-Z0-9]/g, '_').replace(/^[^a-zA-Z]/, 'n');
    }

    // 格式化额外信息
    formatExtra(extra) {
        if (!extra || Object.keys(extra).length === 0) return '';
        
        const features = [];
        if (extra.isVueScript) features.push('Vue脚本');
        if (extra.isImported) features.push('导入项');
        if (extra.isMethod) features.push('方法');
        if (extra.isReactive) features.push('响应式');
        if (extra.isComputed) features.push('计算属性');
        if (extra.isVueComponent) features.push('Vue组件');
        
        return features.length > 0 ? ` - ${features.join(', ')}` : '';
    }

    // 生成完整的Wiki文档
    async generateWiki(outputDir = './wiki') {
        console.log('📖 开始生成Wiki文档...');
        
        // 创建输出目录
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 生成各个文档文件
        const docs = {
            'README.md': this.generateOverview(),
            'modules.md': this.generateModulesDocs(),
            'api.md': this.generateApiDocs(),
            'architecture.md': this.generateArchitectureDocs()
        };

        // 写入文件
        for (const [filename, content] of Object.entries(docs)) {
            const filePath = path.join(outputDir, filename);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ 已生成: ${filePath}`);
        }

        // 生成导航文件
        const navigation = `# 📚 项目Wiki导航

## 文档目录

- [📊 项目概览](./README.md) - 项目整体统计和架构概述
- [📦 模块文档](./modules.md) - 详细的模块和文件说明
- [🔧 API文档](./api.md) - 接口、类和函数的详细文档
- [🏗️ 架构文档](./architecture.md) - 项目架构设计和依赖关系

## 快速导航

### 🔍 按类型查找
- **Vue组件**: ${this.projectAnalysis.architecture.frontend.length} 个
- **TypeScript模块**: ${this.projectAnalysis.modules.filter(m => m.file.endsWith('.ts')).length} 个
- **接口定义**: ${this.projectAnalysis.interfaces.length} 个
- **类定义**: ${this.projectAnalysis.classes.length} 个
- **函数定义**: ${this.projectAnalysis.functions.length} 个

### 📋 重要文件
${this.projectAnalysis.modules.slice(0, 5).map(module => 
    `- [${module.name}](./modules.md#${module.name.toLowerCase()}) - ${module.type}`
).join('\n')}

---
*此文档由GraphRAG知识图谱自动生成*
`;

        fs.writeFileSync(path.join(outputDir, 'navigation.md'), navigation, 'utf8');
        console.log(`✅ 已生成导航文件`);

        console.log(`\n📖 Wiki文档生成完成！`);
        console.log(`📁 文档位置: ${path.resolve(outputDir)}`);
        console.log(`📋 包含文件: ${Object.keys(docs).length + 1} 个`);
        
        return outputDir;
    }
}

module.exports = WikiGenerator;