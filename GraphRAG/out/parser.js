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
exports.parseTsFile = parseTsFile;
exports.parseVueFile = parseVueFile;
const ts = __importStar(require("typescript"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const compiler_sfc_1 = require("@vue/compiler-sfc");
// 默认配置
const DEFAULT_OPTIONS = {
    maxNodesPerFile: 100, // 每个文件最多100个节点
    maxFileSize: 50 * 1024, // 50KB 文件大小限制
    skipMinifiedFiles: true,
    skipTestFiles: true,
    includeTemplate: false
};
// 辅助函数：生成唯一的节点ID
function generateNodeId(filePath, name, type) {
    const baseId = `${filePath}:${name}`;
    return baseId;
}
// 辅助函数：安全地添加节点（避免重复）
function addNodeSafely(nodes, node) {
    if (!nodes.find(n => n.id === node.id)) {
        nodes.push(node);
    }
}
// 检查是否应该跳过文件
function shouldSkipFile(filePath, options) {
    const fileName = path.basename(filePath);
    // 跳过测试文件
    if (options.skipTestFiles && (fileName.includes('.test.') ||
        fileName.includes('.spec.') ||
        fileName.includes('.e2e.') ||
        filePath.includes('/test/') ||
        filePath.includes('/tests/') ||
        filePath.includes('/__tests__/'))) {
        return true;
    }
    // 跳过压缩文件
    if (options.skipMinifiedFiles && (fileName.includes('.min.') ||
        fileName.includes('.bundle.') ||
        fileName.includes('.chunk.'))) {
        return true;
    }
    return false;
}
// 解析 .ts/.js 文件（优化版本）
function parseTsFile(filePath, options = DEFAULT_OPTIONS) {
    const startTime = Date.now();
    const ext = path.extname(filePath).toLowerCase();
    let code;
    const nodes = [];
    const edges = [];
    // 检查是否应该跳过文件
    if (shouldSkipFile(filePath, options)) {
        return {
            graph: { nodes, edges },
            nodes,
            edges,
            stats: {
                filePath,
                fileSize: 0,
                parseTime: Date.now() - startTime,
                nodeCount: 0,
                edgeCount: 0,
                nodeTypes: {},
                relationTypes: {}
            }
        };
    }
    try {
        code = fs.readFileSync(filePath, 'utf8');
        // 检查文件大小
        if (code.length > options.maxFileSize) {
            console.warn(`跳过过大文件: ${filePath} (${code.length} 字符)`);
            return {
                graph: { nodes, edges },
                nodes,
                edges,
                stats: {
                    filePath,
                    fileSize: code.length,
                    parseTime: Date.now() - startTime,
                    nodeCount: 0,
                    edgeCount: 0,
                    nodeTypes: {},
                    relationTypes: {}
                }
            };
        }
    }
    catch (error) {
        console.warn(`Failed to read file ${filePath}:`, error);
        return {
            graph: { nodes, edges },
            nodes,
            edges,
            stats: {
                filePath,
                fileSize: 0,
                parseTime: Date.now() - startTime,
                nodeCount: 0,
                edgeCount: 0,
                nodeTypes: {},
                relationTypes: {}
            }
        };
    }
    if (ext === '.ts' || ext === '.js' || ext === '.vue') {
        // 对于Vue文件，首先尝试解析SFC结构
        if (ext === '.vue') {
            try {
                const sfc = (0, compiler_sfc_1.parse)(code);
                const scriptContent = sfc.descriptor.script?.content || '';
                const scriptSetupContent = sfc.descriptor.scriptSetup?.content || '';
                const allScript = scriptContent + '\n' + scriptSetupContent;
                if (allScript.trim()) {
                    code = allScript; // 用脚本内容替换原始代码
                }
                else {
                    // 如果没有脚本内容，只创建Vue组件节点
                    nodes.push({
                        id: `${filePath}:component`,
                        type: 'Module',
                        name: path.basename(filePath, '.vue'),
                        file: filePath,
                        extra: { isVueComponent: true, hasScript: false }
                    });
                }
            }
            catch (error) {
                console.warn(`Failed to parse Vue SFC ${filePath}:`, error);
                // 降级为普通文件处理
            }
        }
        const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
        // 限制节点数量，避免生成过多节点
        let nodeCount = 0;
        const maxNodes = options.maxNodesPerFile;
        function visit(node) {
            // 如果节点数量过多，跳过后续解析
            if (nodeCount >= maxNodes)
                return;
            if (ts.isFunctionDeclaration(node) && node.name) {
                const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                nodes.push({
                    id: `${filePath}:${node.name.text}`,
                    type: 'Function',
                    name: node.name.text,
                    file: filePath,
                    position: { line: pos.line, column: pos.character }
                });
                nodeCount++;
            }
            else if (ts.isClassDeclaration(node) && node.name) {
                const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                nodes.push({
                    id: `${filePath}:${node.name.text}`,
                    type: 'Class',
                    name: node.name.text,
                    file: filePath,
                    position: { line: pos.line, column: pos.character }
                });
                nodeCount++;
                // 继承关系
                if (node.heritageClauses) {
                    const className = node.name ? node.name.text : '(anonymous)';
                    node.heritageClauses.forEach(hc => {
                        hc.types.forEach(t => {
                            edges.push({
                                source: `${filePath}:${className}`,
                                target: t.expression.getText(),
                                relation: 'inherits'
                            });
                        });
                    });
                }
            }
            else if (ts.isVariableStatement(node)) {
                // 只处理导出的变量
                const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
                if (isExported || nodeCount < maxNodes / 2) { // 限制变量节点数量
                    node.declarationList.declarations.forEach((decl) => {
                        if (ts.isIdentifier(decl.name) && nodeCount < maxNodes) {
                            const pos = sourceFile.getLineAndCharacterOfPosition(decl.getStart());
                            nodes.push({
                                id: `${filePath}:${decl.name.text}`,
                                type: 'Variable',
                                name: decl.name.text,
                                file: filePath,
                                position: { line: pos.line, column: pos.character }
                            });
                            nodeCount++;
                        }
                    });
                }
            }
            else if (ts.isImportDeclaration(node)) {
                // 模块导入关系
                const importPath = node.moduleSpecifier.getText().replace(/['"]/g, '');
                const fileNodeId = `${filePath}:module`;
                // 确保文件模块节点存在
                if (!nodes.find(n => n.id === fileNodeId)) {
                    nodes.push({
                        id: fileNodeId,
                        type: 'Module',
                        name: path.basename(filePath),
                        file: filePath
                    });
                    nodeCount++;
                }
                edges.push({
                    source: fileNodeId,
                    target: importPath,
                    relation: 'imports'
                });
                // 处理具体的导入项（命名导入）
                if (node.importClause) {
                    const importClause = node.importClause;
                    if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
                        importClause.namedBindings.elements.forEach(element => {
                            const importedName = element.name.text;
                            // 为导入的具体项创建节点
                            const importedNodeId = `${filePath}:imported:${importedName}`;
                            nodes.push({
                                id: importedNodeId,
                                type: 'Variable',
                                name: importedName,
                                file: filePath,
                                extra: { isImported: true, from: importPath }
                            });
                            nodeCount++;
                            // 添加导入关系
                            edges.push({
                                source: importedNodeId,
                                target: `${importPath}:${importedName}`,
                                relation: 'imports'
                            });
                        });
                    }
                }
            }
            else if (ts.isCallExpression(node)) {
                // 函数调用关系 - 更精确的调用者识别
                const calleeName = node.expression.getText();
                // 寻找调用者所在的函数/方法
                let currentParent = node.parent;
                let callerNode;
                while (currentParent && !callerNode) {
                    if (ts.isFunctionDeclaration(currentParent) && currentParent.name) {
                        callerNode = nodes.find(n => n.id === `${filePath}:${currentParent.name?.text}`);
                        break;
                    }
                    else if (ts.isMethodDeclaration(currentParent)) {
                        const methodName = currentParent.name?.text;
                        if (methodName) {
                            callerNode = nodes.find(n => n.id === `${filePath}:${methodName}`);
                            break;
                        }
                    }
                    else if (ts.isConstructorDeclaration(currentParent)) {
                        // 在构造函数中的调用
                        let classNode = currentParent.parent;
                        if (ts.isClassDeclaration(classNode) && classNode.name) {
                            callerNode = nodes.find(n => n.id === `${filePath}:${classNode.name?.text}`);
                            break;
                        }
                    }
                    else if (ts.isArrowFunction(currentParent)) {
                        // 箭头函数中的调用
                        let varDecl = currentParent.parent;
                        if (ts.isVariableDeclaration(varDecl) && ts.isIdentifier(varDecl.name)) {
                            callerNode = nodes.find(n => n.id === `${filePath}:${varDecl.name.text}`);
                            break;
                        }
                    }
                    currentParent = currentParent.parent;
                }
                if (callerNode) {
                    edges.push({
                        source: callerNode.id,
                        target: calleeName,
                        relation: 'calls',
                        extra: {
                            args: node.arguments.length,
                            argTypes: node.arguments.map(arg => arg.kind)
                        }
                    });
                }
                // 方法声明 - 只处理公共方法
            }
            else if (ts.isMethodDeclaration(node)) {
                // 方法声明 - 只处理公共方法
                const methodName = node.name?.text;
                if (methodName && nodeCount < maxNodes) {
                    const isPublic = !node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.PrivateKeyword);
                    if (isPublic) {
                        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                        nodes.push({
                            id: `${filePath}:${methodName}`,
                            type: 'Function',
                            name: methodName,
                            file: filePath,
                            position: { line: pos.line, column: pos.character },
                            extra: { isMethod: true }
                        });
                        nodeCount++;
                    }
                }
            }
            else if (ts.isInterfaceDeclaration(node) && node.name) {
                // 接口声明
                if (nodeCount < maxNodes) {
                    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    nodes.push({
                        id: `${filePath}:${node.name.text}`,
                        type: 'Interface',
                        name: node.name.text,
                        file: filePath,
                        position: { line: pos.line, column: pos.character }
                    });
                    nodeCount++;
                }
            }
            else if (ts.isTypeAliasDeclaration(node) && node.name) {
                // 类型别名声明 - 只处理导出的
                const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
                if (isExported && nodeCount < maxNodes) {
                    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    nodes.push({
                        id: `${filePath}:${node.name.text}`,
                        type: 'Type',
                        name: node.name.text,
                        file: filePath,
                        position: { line: pos.line, column: pos.character }
                    });
                    nodeCount++;
                }
            }
            else if (ts.isEnumDeclaration(node) && node.name) {
                // 枚举声明
                if (nodeCount < maxNodes) {
                    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    nodes.push({
                        id: `${filePath}:${node.name.text}`,
                        type: 'Enum',
                        name: node.name.text,
                        file: filePath,
                        position: { line: pos.line, column: pos.character }
                    });
                    nodeCount++;
                }
            }
            // 继续遍历子节点
            ts.forEachChild(node, visit);
        }
        visit(sourceFile);
    }
    else if (ext === '.json') {
        // JSON 文件 - 简化解析
        try {
            const json = JSON.parse(code);
            // 只创建根节点，不深入解析
            nodes.push({
                id: `${filePath}:json-root`,
                type: 'Json',
                name: 'root',
                file: filePath,
                extra: { keys: Object.keys(json) }
            });
        }
        catch (error) {
            console.warn(`Failed to parse JSON file ${filePath}:`, error);
        }
    }
    else if (ext === '.md') {
        // Markdown 文件 - 只解析主要标题
        const lines = code.split('\n');
        const headings = [];
        lines.forEach((line, index) => {
            const match = line.match(/^(#{1,3})\s+(.+)/); // 只匹配1-3级标题
            if (match) {
                headings.push({
                    level: match[1].length,
                    text: match[2].trim(),
                    line: index
                });
            }
        });
        // 创建文档根节点
        nodes.push({
            id: `${filePath}:markdown`,
            type: 'Markdown',
            name: path.basename(filePath),
            file: filePath,
            extra: {
                headings: headings.length,
                wordCount: code.split(/\s+/).length
            }
        });
        // 只为主要标题创建节点（限制数量）
        headings.slice(0, 10).forEach((heading, index) => {
            nodes.push({
                id: `${filePath}:markdown:${heading.text}`,
                type: 'Markdown',
                name: heading.text,
                file: filePath,
                position: { line: heading.line, column: 0 },
                extra: {
                    level: heading.level,
                    isHeading: true
                }
            });
        });
    }
    else if (ext === '.yaml' || ext === '.yml') {
        nodes.push({
            id: `${filePath}:yaml`,
            type: 'Yaml',
            name: path.basename(filePath),
            file: filePath
        });
    }
    else if (ext === '.css' || ext === '.scss' || ext === '.less') {
        nodes.push({
            id: `${filePath}:style`,
            type: 'Style',
            name: path.basename(filePath),
            file: filePath
        });
    }
    else if (ext !== '.vue') {
        // 不包括Vue文件，因为Vue文件已经在上面处理了
        nodes.push({
            id: `${filePath}:other`,
            type: 'Other',
            name: path.basename(filePath),
            file: filePath
        });
    }
    // 生成统计信息
    const parseTime = Date.now() - startTime;
    const fileSize = code ? Buffer.byteLength(code, 'utf8') : 0;
    const nodeTypes = {};
    nodes.forEach(node => {
        nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    });
    const relationTypes = {};
    edges.forEach(edge => {
        relationTypes[edge.relation] = (relationTypes[edge.relation] || 0) + 1;
    });
    const stats = {
        filePath,
        fileSize,
        parseTime,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodeTypes,
        relationTypes
    };
    // 返回标准知识图谱结构
    return {
        graph: {
            nodes,
            edges
        },
        nodes,
        edges,
        stats
    };
}
// 解析 .vue 文件（优化版本）
function parseVueFile(filePath, options = DEFAULT_OPTIONS) {
    if (shouldSkipFile(filePath, options)) {
        return [];
    }
    try {
        const code = fs.readFileSync(filePath, 'utf8');
        const sfc = (0, compiler_sfc_1.parse)(code);
        const nodes = [];
        // 解析 <script> 和 <script setup>
        const scriptContent = sfc.descriptor.script?.content || '';
        const scriptSetupContent = sfc.descriptor.scriptSetup?.content || '';
        const allScript = scriptContent + '\n' + scriptSetupContent;
        if (allScript.trim()) {
            const sourceFile = ts.createSourceFile(filePath, allScript, ts.ScriptTarget.Latest, true);
            let nodeCount = 0;
            const maxNodes = Math.min(options.maxNodesPerFile / 2, 50); // Vue文件限制更严格
            function visit(node) {
                if (nodeCount >= maxNodes)
                    return;
                if (ts.isFunctionDeclaration(node) && node.name) {
                    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    nodes.push({
                        id: `${filePath}:${node.name.text}`,
                        type: 'Function',
                        name: node.name.text,
                        file: filePath,
                        position: { line: pos.line, column: pos.character },
                        extra: { isVueScript: true }
                    });
                    nodeCount++;
                }
                else if (ts.isClassDeclaration(node) && node.name) {
                    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    nodes.push({
                        id: `${filePath}:${node.name.text}`,
                        type: 'Class',
                        name: node.name.text,
                        file: filePath,
                        position: { line: pos.line, column: pos.character },
                        extra: { isVueScript: true }
                    });
                    nodeCount++;
                }
                else if (ts.isVariableStatement(node)) {
                    // 处理所有变量，包括Vue的响应式变量
                    node.declarationList.declarations.forEach((decl) => {
                        if (ts.isIdentifier(decl.name) && nodeCount < maxNodes) {
                            const pos = sourceFile.getLineAndCharacterOfPosition(decl.getStart());
                            const varName = decl.name.text;
                            // 检测Vue特殊变量
                            let varType = 'Variable';
                            let extra = { isVueScript: true };
                            if (varName.includes('ref') || varName.includes('reactive')) {
                                extra.isReactive = true;
                            }
                            if (varName.includes('computed')) {
                                extra.isComputed = true;
                            }
                            nodes.push({
                                id: `${filePath}:${varName}`,
                                type: varType,
                                name: varName,
                                file: filePath,
                                position: { line: pos.line, column: pos.character },
                                extra
                            });
                            nodeCount++;
                        }
                    });
                }
                else if (ts.isInterfaceDeclaration(node) && node.name) {
                    // Vue接口声明
                    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    nodes.push({
                        id: `${filePath}:${node.name.text}`,
                        type: 'Interface',
                        name: node.name.text,
                        file: filePath,
                        position: { line: pos.line, column: pos.character },
                        extra: { isVueScript: true }
                    });
                    nodeCount++;
                }
                else if (ts.isImportDeclaration(node)) {
                    // Vue导入声明
                    const importPath = node.moduleSpecifier.getText().replace(/['"]/g, '');
                    const fileNodeId = `${filePath}:module`;
                    // 确保文件模块节点存在
                    if (!nodes.find(n => n.id === fileNodeId)) {
                        nodes.push({
                            id: fileNodeId,
                            type: 'Module',
                            name: path.basename(filePath),
                            file: filePath,
                            extra: { isVueComponent: true }
                        });
                        nodeCount++;
                    }
                    // 处理具体的导入项（命名导入）
                    if (node.importClause) {
                        const importClause = node.importClause;
                        if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
                            importClause.namedBindings.elements.forEach(element => {
                                const importedName = element.name.text;
                                nodes.push({
                                    id: `${filePath}:imported:${importedName}`,
                                    type: 'Variable',
                                    name: importedName,
                                    file: filePath,
                                    extra: { isImported: true, from: importPath, isVueScript: true }
                                });
                                nodeCount++;
                            });
                        }
                        // 处理默认导入
                        if (importClause.name) {
                            const defaultImportName = importClause.name.text;
                            nodes.push({
                                id: `${filePath}:imported:${defaultImportName}`,
                                type: 'Variable',
                                name: defaultImportName,
                                file: filePath,
                                extra: { isImported: true, from: importPath, isDefault: true, isVueScript: true }
                            });
                            nodeCount++;
                        }
                    }
                }
                ts.forEachChild(node, visit);
            }
            visit(sourceFile);
        }
        // 按开关解析 <template>（默认关闭）
        if (options.includeTemplate && sfc.descriptor.template && sfc.descriptor.template.content) {
            try {
                const { parse: parseTemplate } = require('@vue/compiler-dom');
                const templateAst = parseTemplate(sfc.descriptor.template.content);
                let templateNodeCount = 0;
                const MAX_TEMPLATE_NODES = 20; // 模板解析限额降低
                function walkTemplate(node) {
                    if (templateNodeCount >= MAX_TEMPLATE_NODES)
                        return;
                    if (node.type === 1) { // ELEMENT
                        // 只记录重要的组件，跳过普通HTML标签
                        if (node.tag && (node.tag[0] === node.tag[0].toUpperCase() || node.tag.includes('-'))) {
                            nodes.push({
                                id: `${filePath}:template:${node.tag}:${node.loc.start.line}`,
                                type: 'Module',
                                name: node.tag,
                                file: filePath,
                                position: { line: node.loc.start.line - 1, column: node.loc.start.column - 1 },
                                extra: {
                                    isTemplateElement: true,
                                    directives: node.props?.map((p) => p.name).filter(Boolean) || []
                                }
                            });
                            templateNodeCount++;
                        }
                    }
                    if (node.children) {
                        node.children.forEach(walkTemplate);
                    }
                }
                walkTemplate(templateAst);
            }
            catch (e) {
                console.warn(`Vue template parsing failed for ${filePath}:`, e);
            }
        }
        return nodes;
    }
    catch (error) {
        console.warn(`Failed to parse Vue file ${filePath}:`, error);
        return [];
    }
}
//# sourceMappingURL=parser.js.map