const { parseTsFile, parseVueFile } = require('../dist/parser-optimized');
const { KnowledgeGraph } = require('../dist/graph');
const fs = require('fs');
const path = require('path');

class BusinessWikiGenerator {
    constructor() {
        this.knowledgeGraph = new KnowledgeGraph();
        this.businessAnalysis = {
            features: [],
            dataModels: [],
            apis: [],
            components: [],
            services: [],
            workflows: []
        };
        this.codeComments = new Map();
        this.fileContents = new Map();
    }

    // 分析项目的业务逻辑
    async analyzeBusinessLogic(projectFiles) {
        console.log('🔍 开始分析业务逻辑...');
        
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

        this.analyzeBusinessStructure();
        console.log('📊 业务分析完成');
    }

    // 提取代码注释
    extractComments(filePath, content) {
        const comments = [];
        
        // 提取注释
        const commentMatches = [
            ...content.matchAll(/\/\/\s*(.+)/g),
            ...content.matchAll(/\/\*\*([\s\S]*?)\*\//g)
        ];
        
        commentMatches.forEach(match => {
            const cleanComment = match[1].replace(/\*/g, '').trim();
            if (cleanComment && !cleanComment.startsWith('TODO')) {
                comments.push({
                    content: cleanComment,
                    line: this.getLineNumber(content, match[0])
                });
            }
        });

        this.codeComments.set(filePath, comments);
    }

    getLineNumber(content, comment) {
        const index = content.indexOf(comment);
        return content.substring(0, index).split('\n').length;
    }

    // 分析业务结构
    analyzeBusinessStructure() {
        const allNodes = this.knowledgeGraph.getAllNodes();
        const allEdges = this.knowledgeGraph.getAllEdges();

        allNodes.forEach(node => {
            const fileContent = this.fileContents.get(node.file) || '';
            const comments = this.codeComments.get(node.file) || [];

            // 识别业务功能
            if (this.isBusinessFeature(node)) {
                this.businessAnalysis.features.push({
                    ...node,
                    description: this.extractBusinessDescription(node, comments),
                    businessPurpose: this.inferBusinessPurpose(node, fileContent)
                });
            }

            // 识别数据模型
            if (node.type === 'Interface' || node.type === 'Type') {
                this.businessAnalysis.dataModels.push({
                    ...node,
                    properties: this.extractInterfaceProperties(node, fileContent),
                    businessRole: this.inferDataModelRole(node.name)
                });
            }

            // 识别API
            if (this.isApiFunction(node, fileContent)) {
                this.businessAnalysis.apis.push({
                    ...node,
                    method: this.extractHttpMethod(node, fileContent),
                    description: this.extractApiDescription(node, comments),
                    businessPurpose: this.inferApiPurpose(node.name)
                });
            }

            // 识别Vue组件
            if (node.file.endsWith('.vue') && node.type === 'Module') {
                this.businessAnalysis.components.push({
                    ...node,
                    businessRole: this.inferComponentRole(node.name),
                    features: this.extractComponentFeatures(node.file)
                });
            }

            // 识别业务服务
            if (this.isBusinessService(node)) {
                this.businessAnalysis.services.push({
                    ...node,
                    responsibilities: this.extractServiceResponsibilities(node, comments),
                    methods: this.extractServiceMethods(node, allNodes)
                });
            }
        });

        this.analyzeBusinessWorkflows(allEdges);
    }

    // 判断是否为业务功能
    isBusinessFeature(node) {
        const businessKeywords = ['login', 'register', 'user', 'order', 'payment', 'search', 'create', 'update', 'delete'];
        return businessKeywords.some(keyword => node.name.toLowerCase().includes(keyword));
    }

    // 推断业务用途
    inferBusinessPurpose(node, content) {
        const name = node.name.toLowerCase();
        const businessMappings = {
            'user': '用户管理相关功能',
            'login': '用户登录功能',
            'register': '用户注册功能',
            'order': '订单处理功能',
            'payment': '支付处理功能',
            'search': '搜索功能',
            'upload': '文件上传功能',
            'export': '数据导出功能',
            'validate': '数据验证功能'
        };

        for (const [key, value] of Object.entries(businessMappings)) {
            if (name.includes(key)) return value;
        }
        
        return '业务逻辑功能';
    }

    // 提取业务描述
    extractBusinessDescription(node, comments) {
        const relevantComment = comments.find(c => 
            Math.abs(c.line - (node.position?.line || 0)) <= 3
        );
        return relevantComment ? relevantComment.content : this.inferBusinessPurpose(node, '');
    }

    // 推断数据模型作用
    inferDataModelRole(name) {
        const modelMappings = {
            'user': '用户信息数据模型',
            'order': '订单信息数据模型',
            'product': '产品信息数据模型',
            'payment': '支付信息数据模型',
            'config': '配置信息数据模型'
        };

        for (const [key, value] of Object.entries(modelMappings)) {
            if (name.toLowerCase().includes(key)) return value;
        }
        
        return '业务数据模型';
    }

    // 提取接口属性
    extractInterfaceProperties(node, content) {
        const interfaceRegex = new RegExp(`interface\\s+${node.name}\\s*{([^}]*)}`, 's');
        const match = content.match(interfaceRegex);
        
        if (match) {
            const properties = [];
            const propsContent = match[1];
            const propLines = propsContent.split('\n').filter(line => line.trim());
            
            propLines.forEach(line => {
                const propMatch = line.match(/(\w+)(\?)?\s*:\s*([^;,]+)/);
                if (propMatch) {
                    properties.push({
                        name: propMatch[1],
                        optional: !!propMatch[2],
                        type: propMatch[3].trim(),
                        description: this.extractPropertyDescription(line)
                    });
                }
            });
            
            return properties;
        }
        
        return [];
    }

    extractPropertyDescription(line) {
        const commentMatch = line.match(/\/\/\s*(.+)/);
        return commentMatch ? commentMatch[1].trim() : '';
    }

    // 判断是否为API函数
    isApiFunction(node, content) {
        return (node.type === 'Function' && 
                (content.includes('fetch') || content.includes('api') || content.includes('request'))) ||
               ['get', 'post', 'put', 'delete'].some(method => node.name.toLowerCase().includes(method));
    }

    extractHttpMethod(node, content) {
        const name = node.name.toLowerCase();
        if (name.includes('get') || content.includes("'GET'")) return 'GET';
        if (name.includes('post') || content.includes("'POST'")) return 'POST';
        if (name.includes('put') || content.includes("'PUT'")) return 'PUT';
        if (name.includes('delete') || content.includes("'DELETE'")) return 'DELETE';
        return 'GET';
    }

    extractApiDescription(node, comments) {
        const relevantComment = comments.find(c => 
            Math.abs(c.line - (node.position?.line || 0)) <= 2
        );
        return relevantComment ? relevantComment.content : this.inferApiPurpose(node.name);
    }

    inferApiPurpose(name) {
        const apiMappings = {
            'getuser': '获取用户信息',
            'createuser': '创建新用户',
            'updateuser': '更新用户信息',
            'deleteuser': '删除用户',
            'getorder': '获取订单信息',
            'createorder': '创建新订单',
            'login': '用户登录接口',
            'logout': '用户登出接口'
        };

        const lowerName = name.toLowerCase().replace(/\s+/g, '');
        for (const [key, value] of Object.entries(apiMappings)) {
            if (lowerName.includes(key)) return value;
        }
        
        return 'API接口功能';
    }

    // 推断组件作用
    inferComponentRole(name) {
        const componentMappings = {
            'login': '用户登录界面组件',
            'register': '用户注册界面组件',
            'dashboard': '仪表板组件',
            'profile': '用户资料组件',
            'list': '列表展示组件',
            'form': '表单输入组件',
            'modal': '弹窗组件',
            'table': '数据表格组件',
            'card': '信息卡片组件'
        };

        for (const [key, value] of Object.entries(componentMappings)) {
            if (name.toLowerCase().includes(key)) return value;
        }
        
        return 'UI业务组件';
    }

    extractComponentFeatures(filePath) {
        const content = this.fileContents.get(filePath) || '';
        const features = [];
        
        // 提取主要功能特性
        if (content.includes('@click')) features.push('点击交互');
        if (content.includes('v-model')) features.push('数据绑定');
        if (content.includes('$emit')) features.push('事件通信');
        if (content.includes('props')) features.push('属性接收');
        if (content.includes('computed')) features.push('计算属性');
        
        return features;
    }

    isBusinessService(node) {
        return node.type === 'Class' && 
               (node.name.toLowerCase().includes('service') || 
                node.name.toLowerCase().includes('manager'));
    }

    extractServiceResponsibilities(node, comments) {
        const responsibilities = [];
        
        comments.forEach(comment => {
            if (comment.content.includes('负责') || comment.content.includes('处理') || comment.content.includes('管理')) {
                responsibilities.push(comment.content);
            }
        });
        
        if (responsibilities.length === 0) {
            responsibilities.push(this.inferBusinessPurpose(node, ''));
        }
        
        return responsibilities;
    }

    extractServiceMethods(node, allNodes) {
        return allNodes
            .filter(n => n.file === node.file && n.type === 'Function')
            .slice(0, 5) // 限制方法数量
            .map(n => ({
                name: n.name,
                purpose: this.inferBusinessPurpose(n, this.fileContents.get(n.file) || '')
            }));
    }

    analyzeBusinessWorkflows(edges) {
        const workflows = new Map();
        
        edges.filter(edge => edge.relation === 'calls').forEach(edge => {
            const sourceNode = this.knowledgeGraph.findNode(edge.source);
            if (sourceNode) {
                const workflow = sourceNode.name;
                if (!workflows.has(workflow)) {
                    workflows.set(workflow, []);
                }
                workflows.get(workflow).push(edge.target);
            }
        });
        
        workflows.forEach((steps, name) => {
            if (steps.length >= 2) {
                this.businessAnalysis.workflows.push({
                    name,
                    steps: steps.slice(0, 4),
                    description: this.generateWorkflowDescription(name)
                });
            }
        });
    }

    generateWorkflowDescription(name) {
        const workflowMappings = {
            'login': '用户登录业务流程',
            'register': '用户注册业务流程',
            'order': '订单处理业务流程',
            'payment': '支付处理业务流程',
            'search': '搜索功能业务流程'
        };

        for (const [key, value] of Object.entries(workflowMappings)) {
            if (name.toLowerCase().includes(key)) return value;
        }
        
        return `${name}相关业务流程`;
    }

    // 生成业务概览文档
    generateBusinessOverview() {
        return `# 📋 业务文档概览

## 🎯 项目业务分析

本文档基于代码分析自动生成，展示项目的业务逻辑和功能模块。

### 📊 业务模块统计

| 业务类型 | 数量 | 说明 |
|----------|------|------|
| 核心功能 | ${this.businessAnalysis.features.length} | 主要业务功能 |
| 数据模型 | ${this.businessAnalysis.dataModels.length} | 业务数据结构 |
| API接口 | ${this.businessAnalysis.apis.length} | 业务接口服务 |
| UI组件 | ${this.businessAnalysis.components.length} | 前端业务组件 |
| 业务服务 | ${this.businessAnalysis.services.length} | 后端业务逻辑 |
| 业务流程 | ${this.businessAnalysis.workflows.length} | 业务工作流 |

### 🏗️ 业务架构特点

- **前端架构**: ${this.businessAnalysis.components.length > 0 ? 'Vue.js组件化开发' : '无前端组件'}
- **后端服务**: ${this.businessAnalysis.services.length > 0 ? '服务化架构' : '简单架构'}
- **数据模型**: ${this.businessAnalysis.dataModels.length > 0 ? 'TypeScript类型化' : '无明确数据模型'}
- **API设计**: ${this.businessAnalysis.apis.length > 0 ? 'RESTful风格' : '无API接口'}

---
*此文档由GraphRAG业务分析自动生成*
`;
    }

    // 生成业务功能文档
    generateBusinessFeaturesDocs() {
        let docs = `# 📋 业务功能文档

## 🎯 核心业务功能

`;

        if (this.businessAnalysis.features.length > 0) {
            this.businessAnalysis.features.forEach(feature => {
                docs += `### ${feature.name}\n\n`;
                docs += `**功能描述**: ${feature.description}\n\n`;
                docs += `**业务价值**: ${feature.businessPurpose}\n\n`;
                docs += `**实现位置**: \`${path.basename(feature.file)}\`\n\n`;
                docs += '---\n\n';
            });
        } else {
            docs += '暂未识别到明确的业务功能模块。建议在代码中添加更多描述性注释。\n\n';
        }

        return docs;
    }

    // 生成数据模型文档
    generateDataModelDocs() {
        let docs = `# 📊 数据模型文档

## 💾 业务数据结构

`;

        if (this.businessAnalysis.dataModels.length > 0) {
            this.businessAnalysis.dataModels.forEach(model => {
                docs += `### ${model.name}\n\n`;
                docs += `**业务作用**: ${model.businessRole}\n\n`;
                
                if (model.properties && model.properties.length > 0) {
                    docs += `**数据字段**:\n\n`;
                    docs += `| 字段名 | 类型 | 必填 | 说明 |\n`;
                    docs += `|--------|------|------|------|\n`;
                    
                    model.properties.forEach(prop => {
                        const required = prop.optional ? '否' : '是';
                        const description = prop.description || '暂无说明';
                        docs += `| ${prop.name} | \`${prop.type}\` | ${required} | ${description} |\n`;
                    });
                    docs += '\n';
                }
                
                docs += '---\n\n';
            });
        } else {
            docs += '暂未发现业务数据模型定义。\n\n';
        }

        return docs;
    }

    // 生成完整的业务Wiki
    async generateBusinessWiki(outputDir = './business-wiki') {
        console.log('📖 开始生成业务Wiki文档...');
        
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const docs = {
            'README.md': this.generateBusinessOverview(),
            'features.md': this.generateBusinessFeaturesDocs(),
            'data-models.md': this.generateDataModelDocs(),
            'apis.md': this.generateBusinessApiDocs(),
            'components.md': this.generateComponentDocs(),
            'services.md': this.generateServiceDocs()
        };

        for (const [filename, content] of Object.entries(docs)) {
            const filePath = path.join(outputDir, filename);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ 已生成: ${filePath}`);
        }

        console.log(`\n📖 业务Wiki文档生成完成！`);
        console.log(`📁 文档位置: ${path.resolve(outputDir)}`);
        
        return outputDir;
    }

    // 其他方法的简化实现
    generateBusinessApiDocs() {
        return `# 🔌 API接口文档\n\n业务接口功能说明...\n`;
    }

    generateComponentDocs() {
        return `# 🎨 组件文档\n\n前端业务组件说明...\n`;
    }

    generateServiceDocs() {
        return `# ⚙️ 服务文档\n\n后端业务服务说明...\n`;
    }
}

module.exports = BusinessWikiGenerator;