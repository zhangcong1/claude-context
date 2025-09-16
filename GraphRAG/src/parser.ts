// 知识图谱结构
export interface KnowledgeGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

export interface ParseResult {
    graph: KnowledgeGraph;
    nodes: GraphNode[];
    edges: GraphEdge[];
    stats: ParseStats;
}
export interface GraphEdge {
    source: string;
    target: string;
    relation: 'calls' | 'references' | 'inherits' | 'imports' | 'exports' | 'component-uses' | 'event-binds' | 'directive-uses' | 'slot-dispatches' | 'style-imports' | 'config-uses' | 'other'
    | 'vue-renders' | 'vue-emits' | 'vue-listens' | 'vue-watches' | 'vue-computes' | 'vue-props-pass' | 'vue-slot-provides' | 'vue-mixin-uses' | 'vue-composable-uses' | 'vue-store-accesses' | 'vue-route-navigates';
    // 增强的边元数据用于GraphRAG
    metadata?: {
        weight?: number;  // 关系权重
        frequency?: number;  // 调用频率
        context?: string;  // 关系上下文
        confidence?: number;  // 关系置信度
        semantic?: string;  // 语义描述
        direction?: 'bidirectional' | 'unidirectional';  // 关系方向
    };
    extra?: Record<string, any>;
}
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { parse as parseSFC } from '@vue/compiler-sfc';

export type NodeType =
    | 'Function' | 'Class' | 'Variable' | 'Module' | 'Interface' | 'Type' | 'Enum'
    | 'Json' | 'Markdown' | 'Yaml' | 'Style' | 'Other'
    | 'VueComponent' | 'VueMethod' | 'VueComputedProperty' | 'VueWatcher' | 'VueLifecycleHook'
    | 'VueTemplate' | 'VueDirective' | 'VueSlot' | 'VueEvent' | 'VueProp' | 'VueEmit'
    | 'VueStore' | 'VueRoute' | 'VueMixin' | 'VueComposable';

export interface GraphNode {
    id: string;
    type: NodeType;
    name: string;
    file: string;
    position?: { line: number; column: number };
    // range: byte offsets and start/end lines in the source file (useful to fetch full code later)
    range?: { start: number; end: number; startLine: number; endLine: number };
    // small code snippet (capped) to give quick context without reading file
    snippet?: string;
    // optional natural language semantic description or short summary
    semantic?: string;
    // 增强的元数据信息用于GraphRAG
    metadata?: {
        complexity?: number;  // 代码复杂度
        dependencies?: string[];  // 依赖项
        exports?: string[];  // 导出项
        documentation?: string;  // 文档注释
        tags?: string[];  // 语义标签
        functionSignature?: string;  // 函数签名
        accessModifier?: 'public' | 'private' | 'protected';  // 访问修饰符
        isAsync?: boolean;  // 是否异步
        parameters?: Array<{name: string, type?: string, optional?: boolean}>;  // 参数信息
        returnType?: string;  // 返回类型
    };
    extra?: Record<string, any>;
}

// 解析统计信息
export interface ParseStats {
    filePath: string;
    fileSize: number;
    parseTime: number;
    nodeCount: number;
    edgeCount: number;
    nodeTypes: Record<string, number>;
    relationTypes: Record<string, number>;
}

// 配置选项
interface ParseOptions {
    maxNodesPerFile?: number;
    maxFileSize?: number;
    skipMinifiedFiles?: boolean;
    skipTestFiles?: boolean;
    includeTemplate?: boolean;
    parseVueTemplate?: boolean;
    parseVueStyle?: boolean;
}

// 默认配置
const DEFAULT_OPTIONS: ParseOptions = {
    maxNodesPerFile: 100, // 每个文件最多100个节点
    maxFileSize: 50 * 1024, // 50KB 文件大小限制
    skipMinifiedFiles: true,
    skipTestFiles: true,
    includeTemplate: false
};

// 辅助函数：生成唯一的节点ID
function generateNodeId(filePath: string, name: string, type: string): string {
    const baseId = `${filePath}:${name}`;
    return baseId;
}

// 辅助函数：安全地添加节点（避免重复）
function addNodeSafely(nodes: GraphNode[], node: GraphNode): void {
    if (!nodes.find(n => n.id === node.id)) {
        nodes.push(node);
    }
}

// 检查是否应该跳过文件
function shouldSkipFile(filePath: string, options: ParseOptions): boolean {
    const fileName = path.basename(filePath);

    // 跳过测试文件
    if (options.skipTestFiles && (
        fileName.includes('.test.') ||
        fileName.includes('.spec.') ||
        fileName.includes('.e2e.') ||
        filePath.includes('/test/') ||
        filePath.includes('/tests/') ||
        filePath.includes('/__tests__/')
    )) {
        return true;
    }

    // 跳过压缩文件
    if (options.skipMinifiedFiles && (
        fileName.includes('.min.') ||
        fileName.includes('.bundle.') ||
        fileName.includes('.chunk.')
    )) {
        return true;
    }

    return false;
}

// 解析 .ts/.js 文件（优化版本）
export function parseTsFile(filePath: string, options: ParseOptions = DEFAULT_OPTIONS, checker?: ts.TypeChecker): ParseResult {
    const startTime = Date.now();
    const ext = path.extname(filePath).toLowerCase();
    let code: string;
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

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
        if (code.length > options.maxFileSize!) {
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
    } catch (error) {
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
                const sfc = parseSFC(code);
                const scriptContent = sfc.descriptor.script?.content || '';
                const scriptSetupContent = sfc.descriptor.scriptSetup?.content || '';
                const allScript = scriptContent + '\n' + scriptSetupContent;
                
                if (allScript.trim()) {
                    code = allScript; // 用脚本内容替换原始代码
                } else {
                    // 如果没有脚本内容，只创建Vue组件节点
                    nodes.push({
                        id: `${filePath}:component`,
                        type: 'Module',
                        name: path.basename(filePath, '.vue'),
                        file: filePath,
                        extra: { isVueComponent: true, hasScript: false }
                    });
                }
            } catch (error) {
                console.warn(`Failed to parse Vue SFC ${filePath}:`, error);
                // 降级为普通文件处理
            }
        }
        const sourceFile = ts.createSourceFile(
            filePath,
            code,
            ts.ScriptTarget.Latest,
            true
        );

        // 限制节点数量，避免生成过多节点
        let nodeCount = 0;
        const maxNodes = options.maxNodesPerFile!;

        function visit(node: ts.Node) {
            // 如果节点数量过多，跳过后续解析
            if (nodeCount >= maxNodes) { return; }

            if (ts.isFunctionDeclaration(node) && node.name) {
                const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                const start = node.getStart();
                const end = node.getEnd();
                const endPos = sourceFile.getLineAndCharacterOfPosition(end);
                nodes.push({
                    id: `${filePath}:${node.name.text}`,
                    type: 'Function',
                    name: node.name.text,
                    file: filePath,
                    position: { line: pos.line, column: pos.character },
                    range: { start, end, startLine: pos.line, endLine: endPos.line },
                    snippet: code.slice(start, Math.min(end, start + 240)),
                    semantic: `Function ${node.name.text}`
                });
                nodeCount++;
            } else if (ts.isClassDeclaration(node) && node.name) {
                const className = node.name.text;
                const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                const start = node.getStart();
                const end = node.getEnd();
                const endPos = sourceFile.getLineAndCharacterOfPosition(end);
                nodes.push({
                    id: `${filePath}:${className}`,
                    type: 'Class',
                    name: className,
                    file: filePath,
                    position: { line: pos.line, column: pos.character },
                    range: { start, end, startLine: pos.line, endLine: endPos.line },
                    snippet: code.slice(start, Math.min(end, start + 240)),
                    semantic: `Class ${className}`
                });
                nodeCount++;
                    
                // 解析类中的方法
                node.members.forEach(member => {
                    if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
                        const methodName = member.name.text;
                        const pos = sourceFile.getLineAndCharacterOfPosition(member.getStart());
                        const start = member.getStart();
                        const end = member.getEnd();
                        const endPos = sourceFile.getLineAndCharacterOfPosition(end);
                        nodes.push({
                            id: `${filePath}:${className}.${methodName}`,
                            type: 'Function',
                            name: methodName,
                            file: filePath,
                            position: { line: pos.line, column: pos.character },
                            range: { start, end, startLine: pos.line, endLine: endPos.line },
                            snippet: code.slice(start, Math.min(end, start + 240)),
                            semantic: `Method ${methodName} in class ${className}`
                        });
                        nodeCount++;
                    }
                });
            } else if (ts.isVariableStatement(node)) {
                // 只处理导出的变量
                const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
                if (isExported || nodeCount < maxNodes / 2) { // 限制变量节点数量
                    node.declarationList.declarations.forEach((decl: ts.VariableDeclaration) => {
                        if (ts.isIdentifier(decl.name) && nodeCount < maxNodes) {
                            const pos = sourceFile.getLineAndCharacterOfPosition(decl.getStart());
                            const start = decl.getStart();
                            const end = decl.getEnd();
                            const endPos = sourceFile.getLineAndCharacterOfPosition(end);
                            nodes.push({
                                id: `${filePath}:${decl.name.text}`,
                                type: 'Variable',
                                name: decl.name.text,
                                file: filePath,
                                position: { line: pos.line, column: pos.character },
                                range: { start, end, startLine: pos.line, endLine: endPos.line },
                                snippet: code.slice(start, Math.min(end, start + 240)),
                                semantic: `Variable ${decl.name.getText()}`
                            });
                            nodeCount++;
                        }
                    });
                }
            } else if (ts.isImportDeclaration(node)) {
                // 模块导入关系
                const importPath = node.moduleSpecifier.getText().replace(/['"]/g, '');
                const fileNodeId = `${filePath}:module`;

                // 确保文件模块节点存在
                if (!nodes.find(n => n.id === fileNodeId)) {
                    const start = node.getStart();
                    const end = node.getEnd();
                    const pos = sourceFile.getLineAndCharacterOfPosition(start);
                    const endPos = sourceFile.getLineAndCharacterOfPosition(end);
                    nodes.push({
                        id: fileNodeId,
                        type: 'Module',
                        name: path.basename(filePath),
                        file: filePath,
                        position: { line: pos.line, column: pos.character },
                        range: { start, end, startLine: pos.line, endLine: endPos.line },
                        snippet: code.slice(start, Math.min(end, start + 240)),
                        semantic: `Module ${path.basename(filePath)}`
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
            } else if (ts.isCallExpression(node)) {
                // 函数调用关系 - 更精确的调用者识别
                const calleeName = node.expression.getText();

                // 寻找调用者所在的函数/方法
                let currentParent = node.parent;
                let callerNode: GraphNode | undefined;

                while (currentParent && !callerNode) {
                    if (ts.isFunctionDeclaration(currentParent) && currentParent.name) {
                        callerNode = nodes.find(n => n.id === `${filePath}:${(currentParent as ts.FunctionDeclaration).name?.text}`);
                        break;
                    } else if (ts.isMethodDeclaration(currentParent)) {
                        const methodName = (currentParent.name as ts.Identifier)?.text;
                        if (methodName) {
                            callerNode = nodes.find(n => n.id === `${filePath}:${methodName}`);
                            break;
                        }
                    } else if (ts.isConstructorDeclaration(currentParent)) {
                        // 在构造函数中的调用
                        let classNode = currentParent.parent;
                        if (ts.isClassDeclaration(classNode) && classNode.name) {
                            callerNode = nodes.find(n => n.id === `${filePath}:${classNode.name?.text}`);
                            break;
                        }
                    } else if (ts.isArrowFunction(currentParent)) {
                        // 箭头函数中的调用
                        let varDecl = currentParent.parent;
                        if (ts.isVariableDeclaration(varDecl) && ts.isIdentifier(varDecl.name)) {
                            callerNode = nodes.find(n => n.id === `${filePath}:${(varDecl.name as ts.Identifier).text}`);
                            break;
                        }
                    }
                    currentParent = currentParent.parent;
                }

                if (callerNode) {
                    // try to resolve callee to a symbol using TypeChecker if available
                    let resolvedTarget = calleeName;
                    try {
                        if (checker) {
                            const symbol = checker.getSymbolAtLocation(node.expression as any);
                            if (symbol) {
                                const decl = symbol.getDeclarations()?.[0];
                                if (decl && decl.getSourceFile) {
                                    const declFile = decl.getSourceFile().fileName;
                                    const declName = symbol.getName ? symbol.getName() : calleeName;
                                    resolvedTarget = `${declFile}:${declName}`;
                                }
                            }
                        }
                    } catch (e) {
                        // ignore type checker failures and fallback to text
                    }

                    edges.push({
                        source: callerNode.id,
                        target: resolvedTarget,
                        relation: 'calls',
                        extra: { 
                            args: node.arguments.length,
                            argTypes: node.arguments.map(arg => arg.kind),
                            calleeText: calleeName
                        }
                    });
                }
                // 方法声明 - 只处理公共方法
            } else if (ts.isMethodDeclaration(node)) {
                // 方法声明 - 只处理公共方法
                const methodName = (node.name as ts.Identifier)?.text;
                if (methodName && nodeCount < maxNodes) {
                    const isPublic = !node.modifiers?.some((mod: any) => mod.kind === ts.SyntaxKind.PrivateKeyword);
                    if (isPublic) {
                        const start = node.getStart();
                        const end = node.getEnd();
                        const pos = sourceFile.getLineAndCharacterOfPosition(start);
                        const endPos = sourceFile.getLineAndCharacterOfPosition(end);
                        nodes.push({
                            id: `${filePath}:${methodName}`,
                            type: 'Function',
                            name: methodName,
                            file: filePath,
                            position: { line: pos.line, column: pos.character },
                            range: { start, end, startLine: pos.line, endLine: endPos.line },
                            snippet: code.slice(start, Math.min(end, start + 240)),
                            semantic: `Method ${methodName}`,
                            extra: { isMethod: true }
                        });
                        nodeCount++;
                    }
                }
            } else if (ts.isInterfaceDeclaration(node) && node.name) {
                // 接口声明
                if (nodeCount < maxNodes) {
                    const start = node.getStart();
                    const end = node.getEnd();
                    const pos = sourceFile.getLineAndCharacterOfPosition(start);
                    const endPos = sourceFile.getLineAndCharacterOfPosition(end);
                    nodes.push({
                        id: `${filePath}:${node.name.text}`,
                        type: 'Interface',
                        name: node.name.text,
                        file: filePath,
                        position: { line: pos.line, column: pos.character },
                        range: { start, end, startLine: pos.line, endLine: endPos.line },
                        snippet: code.slice(start, Math.min(end, start + 240)),
                        semantic: `Interface ${node.name.text}`
                    });
                    nodeCount++;
                }
            } else if (ts.isTypeAliasDeclaration(node) && node.name) {
                // 类型别名声明 - 只处理导出的
                const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
                if (isExported && nodeCount < maxNodes) {
                    const start = node.getStart();
                    const end = node.getEnd();
                    const pos = sourceFile.getLineAndCharacterOfPosition(start);
                    const endPos = sourceFile.getLineAndCharacterOfPosition(end);
                    nodes.push({
                        id: `${filePath}:${node.name.text}`,
                        type: 'Type',
                        name: node.name.text,
                        file: filePath,
                        position: { line: pos.line, column: pos.character },
                        range: { start, end, startLine: pos.line, endLine: endPos.line },
                        snippet: code.slice(start, Math.min(end, start + 240)),
                        semantic: `TypeAlias ${node.name.text}`
                    });
                    nodeCount++;
                }
            } else if (ts.isEnumDeclaration(node) && node.name) {
                // 枚举声明
                if (nodeCount < maxNodes) {
                    const start = node.getStart();
                    const end = node.getEnd();
                    const pos = sourceFile.getLineAndCharacterOfPosition(start);
                    const endPos = sourceFile.getLineAndCharacterOfPosition(end);
                    nodes.push({
                        id: `${filePath}:${node.name.text}`,
                        type: 'Enum',
                        name: node.name.text,
                        file: filePath,
                        position: { line: pos.line, column: pos.character },
                        range: { start, end, startLine: pos.line, endLine: endPos.line },
                        snippet: code.slice(start, Math.min(end, start + 240)),
                        semantic: `Enum ${node.name.text}`
                    });
                    nodeCount++;
                }
            }

            // 继续遍历子节点
            ts.forEachChild(node, visit);
        }
        visit(sourceFile);
    } else if (ext === '.json') {
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
        } catch (error) {
            console.warn(`Failed to parse JSON file ${filePath}:`, error);
        }
    } else if (ext === '.md') {
        // Markdown 文件 - 只解析主要标题
        const lines = code.split('\n');
        const headings: { level: number; text: string; line: number }[] = [];

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
    } else if (ext === '.yaml' || ext === '.yml') {
        nodes.push({
            id: `${filePath}:yaml`,
            type: 'Yaml',
            name: path.basename(filePath),
            file: filePath
        });
    } else if (ext === '.css' || ext === '.scss' || ext === '.less') {
        nodes.push({
            id: `${filePath}:style`,
            type: 'Style',
            name: path.basename(filePath),
            file: filePath
        });
    } else if (ext !== '.vue') {
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

    const nodeTypes: Record<string, number> = {};
    nodes.forEach(node => {
        nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    });

    const relationTypes: Record<string, number> = {};
    edges.forEach(edge => {
        relationTypes[edge.relation] = (relationTypes[edge.relation] || 0) + 1;
    });

    const stats: ParseStats = {
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

// 解析 .vue 文件（增强版本，支持详细的AST分析和GraphRAG格式）
export function parseVueFile(filePath: string, options: ParseOptions = DEFAULT_OPTIONS, checker?: ts.TypeChecker): { nodes: GraphNode[]; edges: GraphEdge[] } {
    if (shouldSkipFile(filePath, options)) {
        return { nodes: [], edges: [] };
    }

    // 添加选项来控制是否解析 template 和 style
    const parseTemplate = options.parseVueTemplate !== undefined ? options.parseVueTemplate : true; // 默认开启
    const parseStyle = options.parseVueStyle !== undefined ? options.parseVueStyle : true; // 默认开启

    try {
        const code = fs.readFileSync(filePath, 'utf8');
        const sfc = parseSFC(code);
        const nodes: GraphNode[] = [];
        const edges: GraphEdge[] = [];

        // 创建Vue组件根节点
        const componentName = path.basename(filePath, '.vue');
        const componentNodeId = `${filePath}:component`;
        nodes.push({
            id: componentNodeId,
            type: 'VueComponent',
            name: componentName,
            file: filePath,
            position: { line: 0, column: 0 },
            semantic: `Vue组件 ${componentName}`,
            metadata: {
                tags: ['vue', 'component'],
                documentation: `Vue单文件组件: ${componentName}`,
                exports: [componentName]
            },
            extra: { 
                isVueComponent: true,
                hasScript: !!sfc.descriptor.script || !!sfc.descriptor.scriptSetup,
                hasTemplate: !!sfc.descriptor.template,
                hasStyle: !!(sfc.descriptor.styles && sfc.descriptor.styles.length > 0)
            }
        });

        // 解析 <script> 和 <script setup>
        const scriptContent = sfc.descriptor.script?.content || '';
        const scriptSetupContent = sfc.descriptor.scriptSetup?.content || '';
        const allScript = scriptContent + '\n' + scriptSetupContent;

        if (allScript.trim()) {
            // 计算script标签在原文件中的行号偏移量
            const scriptOffset = calculateScriptOffset(code, sfc.descriptor.script, sfc.descriptor.scriptSetup);
            parseVueScript(filePath, allScript, nodes, edges, componentNodeId, options, scriptOffset);
        }

        // 解析 <template>
        if (parseTemplate && sfc.descriptor.template && sfc.descriptor.template.content) {
            parseVueTemplate(filePath, sfc.descriptor.template.content, nodes, edges, componentNodeId, options);
        }

        // 解析 <style>
        if (parseStyle && sfc.descriptor.styles && sfc.descriptor.styles.length > 0) {
            parseVueStyles(filePath, sfc.descriptor.styles, nodes, edges, componentNodeId, options);
        }

        return { nodes, edges };
    } catch (error) {
        console.warn(`Failed to parse Vue file ${filePath}:`, error);
        return { nodes: [], edges: [] };
    }
}

// 辅助函数：计算script标签在Vue文件中的行号偏移量
function calculateScriptOffset(vueFileContent: string, scriptBlock: any, scriptSetupBlock: any): number {
    const lines = vueFileContent.split('\n');
    let offset = 0;
    
    // 查找<script>或<script setup>标签的位置
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // 查找包含<script的行（不用trim，保持原始行号）
        if (line.includes('<script')) {
            // 查找>的位置，确定标签结束行
            let tagEndLine = i;
            if (line.includes('>')) {
                // 标签在同一行关闭
                tagEndLine = i;
            } else {
                // 标签在多行
                for (let j = i + 1; j < lines.length; j++) {
                    if (lines[j].includes('>')) {
                        tagEndLine = j;
                        break;
                    }
                }
            }
            // 返回标签结束后的下一行作为偏移量（减1是因为TS从0开始计数）
            offset = tagEndLine;
            break;
        }
    }
    
    return offset;
}

// 解析Vue Script部分（增加行号偏移量支持）
function parseVueScript(filePath: string, scriptContent: string, nodes: GraphNode[], edges: GraphEdge[], componentNodeId: string, options: ParseOptions, lineOffset: number = 0) {
    const sourceFile = ts.createSourceFile(
        filePath,
        scriptContent,
        ts.ScriptTarget.Latest,
        true
    );

    let nodeCount = 0;
    const maxNodes = options.maxNodesPerFile! || 100;
    const vueApiPatterns = {
        lifecycle: new Set(['onMounted', 'onUnmounted', 'onBeforeMount', 'onBeforeUnmount', 'onUpdated', 'onBeforeUpdate', 'created', 'mounted', 'updated', 'destroyed']),
        reactivity: new Set(['ref', 'reactive', 'computed', 'watch', 'watchEffect']),
        composables: new Set(['useRouter', 'useRoute', 'useStore', 'useState', 'useFetch'])
    };

    function visit(node: ts.Node) {
        if (nodeCount >= maxNodes) return;

        // 解析函数声明
        if (ts.isFunctionDeclaration(node) && node.name) {
            const functionInfo = extractFunctionInfo(node, sourceFile, scriptContent, lineOffset);
            const functionNode = createVueFunctionNode(filePath, functionInfo, 'VueMethod');
            nodes.push(functionNode);
            nodeCount++;

            // 创建组件与方法的关系
            edges.push({
                source: componentNodeId,
                target: functionNode.id,
                relation: 'component-uses',
                metadata: {
                    semantic: `组件 ${path.basename(filePath, '.vue')} 包含方法 ${functionInfo.name}`,
                    context: 'vue-method-definition'
                }
            });
        }
        // 解析变量声明（包括Vue响应式变量）
        else if (ts.isVariableStatement(node)) {
            node.declarationList.declarations.forEach((decl: ts.VariableDeclaration) => {
                if (ts.isIdentifier(decl.name) && nodeCount < maxNodes) {
                    const varInfo = extractVariableInfo(decl, sourceFile, scriptContent, lineOffset);
                    const varType = detectVueVariableType(varInfo, vueApiPatterns);
                    const varNode = createVueVariableNode(filePath, varInfo, varType);
                    nodes.push(varNode);
                    nodeCount++;

                    // 创建组件与变量的关系
                    edges.push({
                        source: componentNodeId,
                        target: varNode.id,
                        relation: 'component-uses',
                        metadata: {
                            semantic: `组件使用${varType} ${varInfo.name}`,
                            context: 'vue-variable-definition'
                        }
                    });

                    // 如果是对象字面量，解析其中的方法
                    if (decl.initializer && ts.isObjectLiteralExpression(decl.initializer)) {
                        parseObjectMethods(decl.initializer, filePath, varInfo.name, nodes, edges, componentNodeId, sourceFile, scriptContent, lineOffset);
                    }
                }
            });
        }
        // 解析导出声明（特别处理Vue2的export default）
        else if (ts.isExportAssignment(node)) {
            // 处理 export default { ... } 形式的Vue2组件
            if (ts.isObjectLiteralExpression(node.expression)) {
                parseVue2OptionsAPI(node.expression, filePath, nodes, edges, componentNodeId, sourceFile, scriptContent, lineOffset);
            }
        }
        // 解析类声明
        else if (ts.isClassDeclaration(node) && node.name) {
            const classInfo = extractClassInfo(node, sourceFile, scriptContent, lineOffset);
            const classNode = createVueClassNode(filePath, classInfo);
            nodes.push(classNode);
            nodeCount++;

            // 解析类中的方法
            node.members.forEach(member => {
                if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
                    const methodInfo = extractMethodInfo(member, sourceFile, scriptContent, classInfo.name, lineOffset);
                    const methodNode = createVueFunctionNode(filePath, methodInfo, 'VueMethod');
                    nodes.push(methodNode);
                    nodeCount++;

                    // 创建类与方法的关系
                    edges.push({
                        source: classNode.id,
                        target: methodNode.id,
                        relation: 'component-uses',
                        metadata: {
                            semantic: `类 ${classInfo.name} 包含方法 ${methodInfo.name}`,
                            context: 'class-method-definition'
                        }
                    });
                }
            });
        }
        // 解析导入声明
        else if (ts.isImportDeclaration(node)) {
            parseVueImports(node, filePath, nodes, edges, componentNodeId, sourceFile, scriptContent, lineOffset);
        }
        // 解析函数调用
        else if (ts.isCallExpression(node)) {
            parseVueFunctionCalls(node, filePath, nodes, edges, componentNodeId, sourceFile);
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
}

// 解析Vue Template部分
function parseVueTemplate(filePath: string, templateContent: string, nodes: GraphNode[], edges: GraphEdge[], componentNodeId: string, options: ParseOptions) {
    try {
        const { parse: parseTemplate } = require('@vue/compiler-dom');
        const templateAst = parseTemplate(templateContent);

        let templateNodeCount = 0;
        const MAX_TEMPLATE_NODES = 30;

        function walkTemplate(node: any) {
            if (templateNodeCount >= MAX_TEMPLATE_NODES) return;
            if (node.type === 1) { // ELEMENT
                const htmlTags = new Set([
                    'div','span','p','a','ul','li','ol','table','thead','tbody','tr','td','th','form','input','button','label','select','option','textarea','img','svg','canvas','section','article','header','footer','nav','main','aside','h1','h2','h3','h4','h5','h6','br','hr','strong','em','i','b','u','small','mark','del','ins','sub','sup','code','pre','blockquote','dl','dt','dd','fieldset','legend','optgroup'
                ]);
                if (node.tag && (!htmlTags.has(node.tag) || node.tag[0] === node.tag[0].toUpperCase() || node.tag.includes('-'))) {
                    const tStartLine = node.loc.start.line - 1;
                    const tEndLine = node.loc.end.line - 1;
                    const templateNodeId = `${filePath}:template:${node.tag}:${node.loc.start.line}`;
                    nodes.push({
                        id: templateNodeId,
                        type: 'VueTemplate',
                        name: node.tag,
                        file: filePath,
                        position: { line: tStartLine, column: node.loc.start.column - 1 },
                        range: { start: 0, end: 0, startLine: tStartLine, endLine: tEndLine },
                        snippet: templateContent.split('\n').slice(tStartLine, tEndLine + 1).join('\n').slice(0, 240) || '',
                        semantic: `模板组件 ${node.tag}`,
                        metadata: {
                            tags: ['vue', 'template', 'element'],
                            documentation: `Vue模板中的${node.tag}元素`
                        },
                        extra: { 
                            isTemplateElement: true,
                            directives: node.props?.map((p: any) => p.name).filter(Boolean) || []
                        }
                    });
                    templateNodeCount++;

                    // 创建组件与模板元素的关系
                    edges.push({
                        source: componentNodeId,
                        target: templateNodeId,
                        relation: 'vue-renders',
                        metadata: {
                            semantic: `组件渲染${node.tag}元素`,
                            context: 'template-element'
                        }
                    });

                    // 解析事件绑定
                    if (node.props) {
                        node.props.forEach((p: any) => {
                            try {
                                if (p.type === 7 && p.name === 'on') {
                                    const exp = p.exp && p.exp.content ? p.exp.content.trim() : '';
                                    const m = exp.match(/^([a-zA-Z0-9_$]+)\b/);
                                    if (m) {
                                        const handler = m[1];
                                        edges.push({
                                            source: templateNodeId,
                                            target: `${filePath}:${handler}`,
                                            relation: 'vue-listens',
                                            metadata: {
                                                semantic: `模板元素监听${handler}方法`,
                                                context: 'event-binding'
                                            },
                                            extra: { element: node.tag, handler, resolved: false }
                                        });
                                    }
                                }
                            } catch (e) {
                                // ignore individual prop parse errors
                            }
                        });
                    }
                }
            }
            if (node.children) {
                node.children.forEach(walkTemplate);
            }
        }
        walkTemplate(templateAst);
    } catch (e) {
        console.warn(`Vue template parsing failed for ${filePath}:`, e);
        // 回退到正则解析
        const componentRegex = /<([A-Z][a-zA-Z0-9]*|[a-z]+-[a-z0-9-]+)/g;
        let m: RegExpExecArray | null;
        while ((m = componentRegex.exec(templateContent)) !== null) {
            const componentName = m[1];
            nodes.push({
                id: `${filePath}:template:${componentName}:fallback`,
                type: 'VueTemplate',
                name: componentName,
                file: filePath,
                semantic: `模板组件 ${componentName}`,
                metadata: {
                    tags: ['vue', 'template', 'fallback']
                },
                extra: { isTemplateElement: true, isFallbackParsed: true }
            });
        }
    }
}

// 解析Vue Styles部分
function parseVueStyles(filePath: string, styles: any[], nodes: GraphNode[], edges: GraphEdge[], componentNodeId: string, options: ParseOptions) {
    styles.forEach((styleBlock, index) => {
        if (styleBlock.content) {
            const styleNodeId = `${filePath}:style:${index}`;
            const lines = styleBlock.content.split('\n');
            nodes.push({
                id: styleNodeId,
                type: 'Style',
                name: `style-${index}`,
                file: filePath,
                semantic: `Vue组件样式`,
                snippet: lines.slice(0, Math.min(lines.length, 10)).join('\n'),
                metadata: {
                    tags: ['vue', 'style', styleBlock.lang || 'css'],
                    documentation: `Vue组件的${styleBlock.lang || 'css'}样式`
                },
                extra: { 
                    isVueStyle: true,
                    lang: styleBlock.lang || 'css',
                    scoped: styleBlock.scoped || false
                }
            });
            
            // 创建组件与样式的关系
            edges.push({
                source: componentNodeId,
                target: styleNodeId,
                relation: 'style-imports',
                metadata: {
                    semantic: '组件引用样式',
                    context: 'style-definition'
                },
                extra: { scoped: styleBlock.scoped ?? false }
            });
        }
    });
}

// 辅助函数：提取函数信息（增加行号偏移支持）
function extractFunctionInfo(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile, code: string, lineOffset: number = 0): any {
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const start = node.getStart();
    const end = node.getEnd();
    const endPos = sourceFile.getLineAndCharacterOfPosition(end);
    
    const parameters = node.parameters.map(param => ({
        name: (param.name as ts.Identifier).text,
        type: param.type ? param.type.getText() : undefined,
        optional: !!param.questionToken
    }));

    const returnType = node.type ? node.type.getText() : undefined;
    const isAsync = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) || false;
    const documentation = extractJSDocComment(node, sourceFile);

    return {
        name: node.name!.text,
        position: { line: pos.line + lineOffset, column: pos.character }, // 加上行号偏移量
        range: { start, end, startLine: pos.line + lineOffset, endLine: endPos.line + lineOffset }, // 加上行号偏移量
        snippet: code.slice(start, Math.min(end, start + 300)),
        parameters,
        returnType,
        isAsync,
        documentation,
        functionSignature: `${node.name!.text}(${parameters.map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type || 'any'}`).join(', ')})${returnType ? `: ${returnType}` : ''}`
    };
}

// 辅助函数：提取变量信息（增加行号偏移支持）
function extractVariableInfo(node: ts.VariableDeclaration, sourceFile: ts.SourceFile, code: string, lineOffset: number = 0): any {
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const start = node.getStart();
    const end = node.getEnd();
    const endPos = sourceFile.getLineAndCharacterOfPosition(end);
    
    const varName = (node.name as ts.Identifier).text;
    const initializer = node.initializer ? node.initializer.getText() : undefined;
    
    return {
        name: varName,
        position: { line: pos.line + lineOffset, column: pos.character }, // 加上行号偏移量
        range: { start, end, startLine: pos.line + lineOffset, endLine: endPos.line + lineOffset }, // 加上行号偏移量
        snippet: code.slice(start, Math.min(end, start + 200)),
        initializer
    };
}

// 辅助函数：检测Vue变量类型
function detectVueVariableType(varInfo: any, vueApiPatterns: any): NodeType {
    const { initializer } = varInfo;
    if (!initializer) return 'Variable';
    
    if (initializer.includes('computed(')) return 'VueComputedProperty';
    if (initializer.includes('watch(') || initializer.includes('watchEffect(')) return 'VueWatcher';
    if (vueApiPatterns.lifecycle.has(varInfo.name)) return 'VueLifecycleHook';
    if (initializer.includes('ref(') || initializer.includes('reactive(')) return 'Variable';
    
    return 'Variable';
}

// 辅助函数：创建Vue函数节点
function createVueFunctionNode(filePath: string, functionInfo: any, type: NodeType): GraphNode {
    return {
        id: `${filePath}:${functionInfo.name}`,
        type,
        name: functionInfo.name,
        file: filePath,
        position: functionInfo.position,
        range: functionInfo.range,
        snippet: functionInfo.snippet,
        semantic: `Vue方法 ${functionInfo.name}`,
        metadata: {
            tags: ['vue', 'method', 'function'],
            documentation: functionInfo.documentation,
            functionSignature: functionInfo.functionSignature,
            isAsync: functionInfo.isAsync,
            parameters: functionInfo.parameters,
            returnType: functionInfo.returnType
        },
        extra: { isVueScript: true }
    };
}

// 辅助函数：创建Vue变量节点
function createVueVariableNode(filePath: string, varInfo: any, type: NodeType): GraphNode {
    return {
        id: `${filePath}:${varInfo.name}`,
        type,
        name: varInfo.name,
        file: filePath,
        position: varInfo.position,
        range: varInfo.range,
        snippet: varInfo.snippet,
        semantic: `Vue变量 ${varInfo.name}`,
        metadata: {
            tags: ['vue', 'variable', type.toLowerCase()],
            documentation: `Vue响应式变量: ${varInfo.name}`
        },
        extra: { isVueScript: true, initializer: varInfo.initializer }
    };
}

// 辅助函数：解析对象方法（增加行号偏移支持）
function parseObjectMethods(objectLiteral: ts.ObjectLiteralExpression, filePath: string, parentName: string, nodes: GraphNode[], edges: GraphEdge[], componentNodeId: string, sourceFile: ts.SourceFile, code: string, lineOffset: number = 0) {
    objectLiteral.properties.forEach(prop => {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            const propName = prop.name.text;
            if (ts.isFunctionExpression(prop.initializer) || ts.isArrowFunction(prop.initializer)) {
                const pos = sourceFile.getLineAndCharacterOfPosition(prop.getStart());
                const methodInfo = {
                    name: propName,
                    position: { line: pos.line + lineOffset, column: pos.character }, // 加上行号偏移量
                    range: {
                        start: prop.getStart(),
                        end: prop.getEnd(),
                        startLine: pos.line + lineOffset, // 加上行号偏移量
                        endLine: sourceFile.getLineAndCharacterOfPosition(prop.getEnd()).line + lineOffset // 加上行号偏移量
                    },
                    snippet: code.slice(prop.getStart(), Math.min(prop.getEnd(), prop.getStart() + 300)),
                    parentObject: parentName
                };
                
                const methodNode = {
                    id: `${filePath}:${parentName}.${propName}`,
                    type: 'VueMethod' as NodeType,
                    name: propName,
                    file: filePath,
                    position: methodInfo.position,
                    range: methodInfo.range,
                    snippet: methodInfo.snippet,
                    semantic: `Vue对象方法 ${propName} 在 ${parentName} 中`,
                    metadata: {
                        tags: ['vue', 'method', 'object-method'],
                        documentation: `${parentName}对象中的方法`
                    },
                    extra: { isVueScript: true, isObjectMethod: true, parentObject: parentName }
                };
                
                nodes.push(methodNode);
                
                edges.push({
                    source: `${filePath}:${parentName}`,
                    target: methodNode.id,
                    relation: 'component-uses',
                    metadata: {
                        semantic: `对象 ${parentName} 包含方法 ${propName}`,
                        context: 'object-method-definition'
                    }
                });
            }
        }
    });
}

// 辅助函数：提取类信息
function extractClassInfo(node: ts.ClassDeclaration, sourceFile: ts.SourceFile, code: string, lineOffset: number = 0): any {
    const className = node.name!.text;
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const start = node.getStart();
    const end = node.getEnd();
    const endPos = sourceFile.getLineAndCharacterOfPosition(end);
    
    return {
        name: className,
        position: { line: pos.line + lineOffset, column: pos.character }, // 加上行号偏移量
        range: { start, end, startLine: pos.line + lineOffset, endLine: endPos.line + lineOffset }, // 加上行号偏移量
        snippet: code.slice(start, Math.min(end, start + 300))
    };
}

// 辅助函数：创建Vue类节点
function createVueClassNode(filePath: string, classInfo: any): GraphNode {
    return {
        id: `${filePath}:${classInfo.name}`,
        type: 'Class',
        name: classInfo.name,
        file: filePath,
        position: classInfo.position,
        range: classInfo.range,
        snippet: classInfo.snippet,
        semantic: `Vue类 ${classInfo.name}`,
        metadata: {
            tags: ['vue', 'class'],
            documentation: `Vue组件类: ${classInfo.name}`
        },
        extra: { isVueScript: true }
    };
}

// 辅助函数：提取方法信息
function extractMethodInfo(node: ts.MethodDeclaration, sourceFile: ts.SourceFile, code: string, className: string, lineOffset: number = 0): any {
    const methodName = (node.name as ts.Identifier).text;
    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const start = node.getStart();
    const end = node.getEnd();
    const endPos = sourceFile.getLineAndCharacterOfPosition(end);
    
    const parameters = node.parameters.map(param => ({
        name: (param.name as ts.Identifier).text,
        type: param.type ? param.type.getText() : undefined,
        optional: !!param.questionToken
    }));

    const accessModifier = node.modifiers?.find(mod => 
        mod.kind === ts.SyntaxKind.PublicKeyword || 
        mod.kind === ts.SyntaxKind.PrivateKeyword || 
        mod.kind === ts.SyntaxKind.ProtectedKeyword
    );
    
    const access = accessModifier ? 
        (accessModifier.kind === ts.SyntaxKind.PrivateKeyword ? 'private' :
         accessModifier.kind === ts.SyntaxKind.ProtectedKeyword ? 'protected' : 'public') : 'public';
    
    return {
        name: methodName,
        className,
        position: { line: pos.line + lineOffset, column: pos.character }, // 加上行号偏移量
        range: { start, end, startLine: pos.line + lineOffset, endLine: endPos.line + lineOffset }, // 加上行号偏移量
        snippet: code.slice(start, Math.min(end, start + 300)),
        parameters,
        accessModifier: access,
        functionSignature: `${methodName}(${parameters.map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type || 'any'}`).join(', ')})`
    };
}

// 辅助函数：解析Vue导入
function parseVueImports(node: ts.ImportDeclaration, filePath: string, nodes: GraphNode[], edges: GraphEdge[], componentNodeId: string, sourceFile: ts.SourceFile, scriptContent: string, lineOffset: number = 0) {
    const importPath = node.moduleSpecifier.getText().replace(/['"]/g, '');
    
    if (node.importClause) {
        const importClause = node.importClause;
        if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
            importClause.namedBindings.elements.forEach(element => {
                const importedName = element.name.text;
                const pos = sourceFile.getLineAndCharacterOfPosition(element.getStart());
                const importNode = {
                    id: `${filePath}:imported:${importedName}`,
                    type: 'Variable' as NodeType,
                    name: importedName,
                    file: filePath,
                    position: { line: pos.line + lineOffset, column: pos.character }, // 加上行号偏移量
                    semantic: `导入的${importedName}`,
                    metadata: {
                        tags: ['vue', 'import'],
                        documentation: `从${importPath}导入的${importedName}`
                    },
                    extra: { isImported: true, from: importPath, isVueScript: true }
                };
                nodes.push(importNode);
                
                edges.push({
                    source: componentNodeId,
                    target: importNode.id,
                    relation: 'imports',
                    metadata: {
                        semantic: `组件导入${importedName}`,
                        context: 'import-declaration'
                    }
                });
            });
        }
    }
}

// 辅助函数：解析Vue函数调用
function parseVueFunctionCalls(node: ts.CallExpression, filePath: string, nodes: GraphNode[], edges: GraphEdge[], componentNodeId: string, sourceFile: ts.SourceFile) {
    const calleeName = node.expression.getText();
    
    // 寻找调用者
    let currentParent = node.parent;
    let callerNode: GraphNode | undefined;

    while (currentParent && !callerNode) {
        if (ts.isFunctionDeclaration(currentParent) && currentParent.name) {
            callerNode = nodes.find(n => n.id === `${filePath}:${(currentParent as ts.FunctionDeclaration).name?.text}`);
            break;
        } else if (ts.isMethodDeclaration(currentParent)) {
            const methodName = (currentParent.name as ts.Identifier)?.text;
            if (methodName) {
                callerNode = nodes.find(n => n.id === `${filePath}:${methodName}`);
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
            metadata: {
                semantic: `方法${callerNode.name}调用${calleeName}`,
                context: 'function-call'
            },
            extra: { 
                args: node.arguments.length,
                calleeText: calleeName
            }
        });
    }
}

// 辅助函数：提取JSDoc注释
function extractJSDocComment(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
    const fullText = sourceFile.getFullText();
    const ranges = ts.getLeadingCommentRanges(fullText, node.getFullStart());
    if (ranges && ranges.length > 0) {
        const lastComment = ranges[ranges.length - 1];
        const commentText = fullText.slice(lastComment.pos, lastComment.end);
        if (commentText.startsWith('/**')) {
            return commentText.replace(/\/\*\*|\*\//g, '').replace(/\n\s*\*/g, '\n').trim();
        }
    }
    return undefined;
}

// 辅助函数：解析Vue2 Options API（增加行号偏移支持）
function parseVue2OptionsAPI(objectLiteral: ts.ObjectLiteralExpression, filePath: string, nodes: GraphNode[], edges: GraphEdge[], componentNodeId: string, sourceFile: ts.SourceFile, code: string, lineOffset: number = 0) {
    objectLiteral.properties.forEach(prop => {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            const propName = prop.name.text;
            
            // 处理methods属性
            if (propName === 'methods' && ts.isObjectLiteralExpression(prop.initializer)) {
                parseVue2Methods(prop.initializer, filePath, nodes, edges, componentNodeId, sourceFile, code, lineOffset);
            }
            // 处理computed属性
            else if (propName === 'computed' && ts.isObjectLiteralExpression(prop.initializer)) {
                parseVue2Computed(prop.initializer, filePath, nodes, edges, componentNodeId, sourceFile, code, lineOffset);
            }
            // 处理watch属性
            else if (propName === 'watch' && ts.isObjectLiteralExpression(prop.initializer)) {
                parseVue2Watch(prop.initializer, filePath, nodes, edges, componentNodeId, sourceFile, code, lineOffset);
            }
            // 处理data函数
            else if (propName === 'data' && (ts.isFunctionExpression(prop.initializer) || ts.isArrowFunction(prop.initializer))) {
                const pos = sourceFile.getLineAndCharacterOfPosition(prop.getStart());
                const dataNode = {
                    id: `${filePath}:data`,
                    type: 'VueMethod' as NodeType,
                    name: 'data',
                    file: filePath,
                    position: { 
                        line: pos.line + lineOffset, // 加上行号偏移量
                        column: pos.character 
                    },
                    range: {
                        start: prop.getStart(),
                        end: prop.getEnd(),
                        startLine: pos.line + lineOffset, // 加上行号偏移量
                        endLine: sourceFile.getLineAndCharacterOfPosition(prop.getEnd()).line + lineOffset // 加上行号偏移量
                    },
                    snippet: code.slice(prop.getStart(), Math.min(prop.getEnd(), prop.getStart() + 300)),
                    semantic: 'Vue2组件数据函数',
                    metadata: {
                        tags: ['vue2', 'data', 'method'],
                        documentation: 'Vue2组件的data函数，返回组件的响应式数据'
                    },
                    extra: { isVue2: true, isDataFunction: true }
                };
                nodes.push(dataNode);
                
                edges.push({
                    source: componentNodeId,
                    target: dataNode.id,
                    relation: 'component-uses',
                    metadata: {
                        semantic: '组件包含data函数',
                        context: 'vue2-data-function'
                    }
                });
            }
            // 处理生命周期钩子
            else if (isVue2LifecycleHook(propName) && (ts.isFunctionExpression(prop.initializer) || ts.isArrowFunction(prop.initializer))) {
                const pos = sourceFile.getLineAndCharacterOfPosition(prop.getStart());
                const lifecycleNode = {
                    id: `${filePath}:${propName}`,
                    type: 'VueLifecycleHook' as NodeType,
                    name: propName,
                    file: filePath,
                    position: { 
                        line: pos.line + lineOffset, // 加上行号偏移量
                        column: pos.character 
                    },
                    range: {
                        start: prop.getStart(),
                        end: prop.getEnd(),
                        startLine: pos.line + lineOffset, // 加上行号偏移量
                        endLine: sourceFile.getLineAndCharacterOfPosition(prop.getEnd()).line + lineOffset // 加上行号偏移量
                    },
                    snippet: code.slice(prop.getStart(), Math.min(prop.getEnd(), prop.getStart() + 300)),
                    semantic: `Vue2生命周期钩子: ${propName}`,
                    metadata: {
                        tags: ['vue2', 'lifecycle', propName],
                        documentation: `Vue2组件的${propName}生命周期钩子`
                    },
                    extra: { isVue2: true, isLifecycleHook: true, hookName: propName }
                };
                nodes.push(lifecycleNode);
                
                edges.push({
                    source: componentNodeId,
                    target: lifecycleNode.id,
                    relation: 'component-uses',
                    metadata: {
                        semantic: `组件包含${propName}生命周期钩子`,
                        context: 'vue2-lifecycle-hook'
                    }
                });
            }
        }
    });
}

// 辅助函数：解析Vue2 methods属性（增加行号偏移支持）
function parseVue2Methods(methodsObj: ts.ObjectLiteralExpression, filePath: string, nodes: GraphNode[], edges: GraphEdge[], componentNodeId: string, sourceFile: ts.SourceFile, code: string, lineOffset: number = 0) {
    methodsObj.properties.forEach(prop => {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            const methodName = prop.name.text;
            if (ts.isFunctionExpression(prop.initializer) || ts.isArrowFunction(prop.initializer)) {
                const pos = sourceFile.getLineAndCharacterOfPosition(prop.getStart());
                const methodNode = {
                    id: `${filePath}:${methodName}`,
                    type: 'VueMethod' as NodeType,
                    name: methodName,
                    file: filePath,
                    position: { 
                        line: pos.line + lineOffset, // 加上行号偏移量
                        column: pos.character 
                    },
                    range: {
                        start: prop.getStart(),
                        end: prop.getEnd(),
                        startLine: pos.line + lineOffset, // 加上行号偏移量
                        endLine: sourceFile.getLineAndCharacterOfPosition(prop.getEnd()).line + lineOffset // 加上行号偏移量
                    },
                    snippet: code.slice(prop.getStart(), Math.min(prop.getEnd(), prop.getStart() + 300)),
                    semantic: `Vue2组件方法: ${methodName}`,
                    metadata: {
                        tags: ['vue2', 'method', 'methods'],
                        documentation: `Vue2组件中的${methodName}方法`
                    },
                    extra: { isVue2: true, isMethod: true, inMethodsOption: true }
                };
                nodes.push(methodNode);
                
                edges.push({
                    source: componentNodeId,
                    target: methodNode.id,
                    relation: 'component-uses',
                    metadata: {
                        semantic: `组件包含方法${methodName}`,
                        context: 'vue2-methods-option'
                    }
                });
            }
        } else if (ts.isMethodDeclaration(prop) && ts.isIdentifier(prop.name)) {
            // 处理简写方法语法 methodName() {}
            const methodName = prop.name.text;
            const pos = sourceFile.getLineAndCharacterOfPosition(prop.getStart());
            const methodNode = {
                id: `${filePath}:${methodName}`,
                type: 'VueMethod' as NodeType,
                name: methodName,
                file: filePath,
                position: { 
                    line: pos.line + lineOffset, // 加上行号偏移量
                    column: pos.character 
                },
                range: {
                    start: prop.getStart(),
                    end: prop.getEnd(),
                    startLine: pos.line + lineOffset, // 加上行号偏移量
                    endLine: sourceFile.getLineAndCharacterOfPosition(prop.getEnd()).line + lineOffset // 加上行号偏移量
                },
                snippet: code.slice(prop.getStart(), Math.min(prop.getEnd(), prop.getStart() + 300)),
                semantic: `Vue2组件方法: ${methodName}`,
                metadata: {
                    tags: ['vue2', 'method', 'methods'],
                    documentation: `Vue2组件中的${methodName}方法`
                },
                extra: { isVue2: true, isMethod: true, inMethodsOption: true }
            };
            nodes.push(methodNode);
            
            edges.push({
                source: componentNodeId,
                target: methodNode.id,
                relation: 'component-uses',
                metadata: {
                    semantic: `组件包含方法${methodName}`,
                    context: 'vue2-methods-option'
                }
            });
        }
    });
}

// 辅助函数：解析Vue2 computed属性（增加行号偏移支持）
function parseVue2Computed(computedObj: ts.ObjectLiteralExpression, filePath: string, nodes: GraphNode[], edges: GraphEdge[], componentNodeId: string, sourceFile: ts.SourceFile, code: string, lineOffset: number = 0) {
    computedObj.properties.forEach(prop => {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            const computedName = prop.name.text;
            const pos = sourceFile.getLineAndCharacterOfPosition(prop.getStart());
            const computedNode = {
                id: `${filePath}:${computedName}`,
                type: 'VueComputedProperty' as NodeType,
                name: computedName,
                file: filePath,
                position: { 
                    line: pos.line + lineOffset, // 加上行号偏移量
                    column: pos.character 
                },
                range: {
                    start: prop.getStart(),
                    end: prop.getEnd(),
                    startLine: pos.line + lineOffset, // 加上行号偏移量
                    endLine: sourceFile.getLineAndCharacterOfPosition(prop.getEnd()).line + lineOffset // 加上行号偏移量
                },
                snippet: code.slice(prop.getStart(), Math.min(prop.getEnd(), prop.getStart() + 300)),
                semantic: `Vue2计算属性: ${computedName}`,
                metadata: {
                    tags: ['vue2', 'computed', 'property'],
                    documentation: `Vue2组件中的${computedName}计算属性`
                },
                extra: { isVue2: true, isComputed: true }
            };
            nodes.push(computedNode);
            
            edges.push({
                source: componentNodeId,
                target: computedNode.id,
                relation: 'vue-computes',
                metadata: {
                    semantic: `组件包含计算属性${computedName}`,
                    context: 'vue2-computed-option'
                }
            });
        }
    });
}

// 辅助函数：解析Vue2 watch属性（增加行号偏移支持）
function parseVue2Watch(watchObj: ts.ObjectLiteralExpression, filePath: string, nodes: GraphNode[], edges: GraphEdge[], componentNodeId: string, sourceFile: ts.SourceFile, code: string, lineOffset: number = 0) {
    watchObj.properties.forEach(prop => {
        if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
            const watchName = prop.name.text;
            const pos = sourceFile.getLineAndCharacterOfPosition(prop.getStart());
            const watchNode = {
                id: `${filePath}:watch:${watchName}`,
                type: 'VueWatcher' as NodeType,
                name: `watch:${watchName}`,
                file: filePath,
                position: { 
                    line: pos.line + lineOffset, // 加上行号偏移量
                    column: pos.character 
                },
                range: {
                    start: prop.getStart(),
                    end: prop.getEnd(),
                    startLine: pos.line + lineOffset, // 加上行号偏移量
                    endLine: sourceFile.getLineAndCharacterOfPosition(prop.getEnd()).line + lineOffset // 加上行号偏移量
                },
                snippet: code.slice(prop.getStart(), Math.min(prop.getEnd(), prop.getStart() + 300)),
                semantic: `Vue2监听器: ${watchName}`,
                metadata: {
                    tags: ['vue2', 'watch', 'watcher'],
                    documentation: `Vue2组件中监听${watchName}的变化`
                },
                extra: { isVue2: true, isWatcher: true, watchTarget: watchName }
            };
            nodes.push(watchNode);
            
            edges.push({
                source: componentNodeId,
                target: watchNode.id,
                relation: 'vue-watches',
                metadata: {
                    semantic: `组件监听${watchName}的变化`,
                    context: 'vue2-watch-option'
                }
            });
        }
    });
}

// 辅助函数：判断是否为Vue2生命周期钩子
function isVue2LifecycleHook(name: string): boolean {
    const vue2Hooks = new Set([
        'beforeCreate', 'created', 'beforeMount', 'mounted',
        'beforeUpdate', 'updated', 'beforeDestroy', 'destroyed',
        'activated', 'deactivated', 'errorCaptured'
    ]);
    return vue2Hooks.has(name);
}
