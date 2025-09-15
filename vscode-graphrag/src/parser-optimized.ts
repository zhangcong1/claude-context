export interface GraphEdge {
    source: string;
    target: string;
    relation: 'calls' | 'references' | 'inherits' | 'imports' | 'exports' | 'component-uses' | 'event-binds' | 'directive-uses' | 'slot-dispatches' | 'style-imports' | 'config-uses' | 'other';
    extra?: Record<string, any>;
}
import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { parse as parseSFC } from '@vue/compiler-sfc';

export type NodeType =
    | 'Function' | 'Class' | 'Variable' | 'Module' | 'Interface' | 'Type' | 'Enum'
    | 'Json' | 'Markdown' | 'Yaml' | 'Style' | 'Other';

export interface GraphNode {
    id: string;
    type: NodeType;
    name: string;
    file: string;
    position?: { line: number; column: number };
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
export function parseTsFile(filePath: string, options: ParseOptions = DEFAULT_OPTIONS): { nodes: GraphNode[]; edges: GraphEdge[]; stats: ParseStats } {
    const startTime = Date.now();
    const ext = path.extname(filePath).toLowerCase();
    let code: string;
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // 检查是否应该跳过文件
    if (shouldSkipFile(filePath, options)) {
        return {
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

    if (ext === '.ts' || ext === '.js') {
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
            if (nodeCount >= maxNodes) return;

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
            } else if (ts.isClassDeclaration(node) && node.name) {
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
            } else if (ts.isVariableStatement(node)) {
                // 只处理导出的变量
                const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
                if (isExported || nodeCount < maxNodes / 2) { // 限制变量节点数量
                    node.declarationList.declarations.forEach((decl: ts.VariableDeclaration) => {
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
            } else if (ts.isImportDeclaration(node)) {
                // 模块导入关系 - 只记录重要的导入
                const importPath = node.moduleSpecifier.getText().replace(/['"]/g, '');
                if (!importPath.startsWith('.') || nodeCount < maxNodes) { // 限制相对导入
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
                }
            } else if (ts.isMethodDeclaration(node)) {
                // 方法声明 - 只处理公共方法
                const methodName = (node.name as ts.Identifier)?.text;
                if (methodName && nodeCount < maxNodes) {
                    const isPublic = !node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.PrivateKeyword);
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
            } else if (ts.isInterfaceDeclaration(node) && node.name) {
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
            } else if (ts.isTypeAliasDeclaration(node) && node.name) {
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
            } else if (ts.isEnumDeclaration(node) && node.name) {
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
    } else {
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

    return { nodes, edges, stats };
}

// 解析 .vue 文件（优化版本）
export function parseVueFile(filePath: string, options: ParseOptions = DEFAULT_OPTIONS): GraphNode[] {
    if (shouldSkipFile(filePath, options)) {
        return [];
    }

    const code = fs.readFileSync(filePath, 'utf8');
    const sfc = parseSFC(code);
    const nodes: GraphNode[] = [];

    // 解析 <script> 和 <script setup>
    const scriptContent = sfc.descriptor.script?.content || '';
    const scriptSetupContent = sfc.descriptor.scriptSetup?.content || '';
    const allScript = scriptContent + '\n' + scriptSetupContent;

    if (allScript.trim()) {
        const sourceFile = ts.createSourceFile(
            filePath,
            allScript,
            ts.ScriptTarget.Latest,
            true
        );

        let nodeCount = 0;
        const maxNodes = Math.min(options.maxNodesPerFile! / 2, 50); // Vue文件限制更严格

        function visit(node: ts.Node) {
            if (nodeCount >= maxNodes) return;

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
            } else if (ts.isClassDeclaration(node) && node.name) {
                const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                nodes.push({
                    id: `${filePath}:${node.name.text}`,
                    type: 'Class',
                    name: node.name.text,
                    file: filePath,
                    position: { line: pos.line, column: pos.character }
                });
                nodeCount++;
            } else if (ts.isVariableStatement(node)) {
                // 只处理导出的变量
                const isExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
                if (isExported && nodeCount < maxNodes) {
                    node.declarationList.declarations.forEach((decl: ts.VariableDeclaration) => {
                        if (ts.isIdentifier(decl.name)) {
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
            const MAX_TEMPLATE_NODES = 50; // 模板解析限额

            function walkTemplate(node: any) {
                if (templateNodeCount >= MAX_TEMPLATE_NODES) return;
                if (node.type === 1) { // ELEMENT
                    nodes.push({
                        id: `${filePath}:template:${node.tag}:${node.loc.start.line}`,
                        type: 'Module',
                        name: node.tag,
                        file: filePath,
                        position: { line: node.loc.start.line - 1, column: node.loc.start.column - 1 },
                        extra: { directives: node.props?.map((p: any) => p.name).filter(Boolean) }
                    });
                    templateNodeCount++;
                }
                if (node.children) {
                    node.children.forEach(walkTemplate);
                }
            }
            walkTemplate(templateAst);
        } catch (e) {
            // 解析失败忽略
        }
    }

    return nodes;
}
