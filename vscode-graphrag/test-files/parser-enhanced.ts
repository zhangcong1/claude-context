import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { parse as parseSFC } from '@vue/compiler-sfc';
import { AstCodeSplitter, CodeChunk } from '@zilliz/claude-context-core';
import { GraphNode, GraphEdge, NodeType } from './parser-optimized';

export interface ParseOptions {
    maxNodesPerFile?: number;
    maxFileSize?: number;
    skipMinifiedFiles?: boolean;
    skipTestFiles?: boolean;
    includeTemplate?: boolean;
    useASTSplitter?: boolean; // 新增：是否使用 AST 分割器
}

const DEFAULT_OPTIONS: ParseOptions = {
    maxNodesPerFile: 100,
    maxFileSize: 50 * 1024,
    skipMinifiedFiles: true,
    skipTestFiles: true,
    includeTemplate: false,
    useASTSplitter: true
};

export class EnhancedParser {
    private astSplitter: AstCodeSplitter;

    constructor() {
        this.astSplitter = new AstCodeSplitter(1000, 200);
    }

    async parseFile(filePath: string, options: ParseOptions = DEFAULT_OPTIONS): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
        const ext = path.extname(filePath).toLowerCase();
        let code: string;

        try {
            code = fs.readFileSync(filePath, 'utf8');

            if (code.length > options.maxFileSize!) {
                console.warn(`跳过过大文件: ${filePath} (${code.length} 字符)`);
                return { nodes: [], edges: [] };
            }
        } catch (error) {
            console.warn(`Failed to read file ${filePath}:`, error);
            return { nodes: [], edges: [] };
        }

        if (options.useASTSplitter) {
            return await this.parseWithAST(filePath, code, ext, options);
        } else {
            return this.parseWithTypeScript(filePath, code, ext, options);
        }
    }

    private async parseWithAST(
        filePath: string,
        code: string,
        ext: string,
        options: ParseOptions
    ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
        const nodes: GraphNode[] = [];
        const edges: GraphEdge[] = [];

        try {
            // 使用 AST 分割器获取代码块
            const language = this.getLanguageFromExtension(ext);
            const chunks = await this.astSplitter.split(code, language, filePath);

            // 为每个代码块创建节点
            for (const chunk of chunks) {
                const node = this.createNodeFromChunk(filePath, chunk, options);
                if (node) {
                    nodes.push(node);
                }
            }

            // 基于代码块创建关系
            this.createRelationshipsFromChunks(nodes, edges, chunks);

        } catch (error) {
            console.warn(`AST parsing failed for ${filePath}, falling back to TypeScript:`, error);
            return this.parseWithTypeScript(filePath, code, ext, options);
        }

        return { nodes, edges };
    }

    private parseWithTypeScript(
        filePath: string,
        code: string,
        ext: string,
        options: ParseOptions
    ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
        // 使用原有的 TypeScript 解析逻辑
        // 这里可以调用原来的 parseTsFile 或 parseVueFile
        return Promise.resolve({ nodes: [], edges: [] });
    }

    private getLanguageFromExtension(ext: string): string {
        const langMap: Record<string, string> = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'cpp',
            '.go': 'go',
            '.rs': 'rust',
            '.cs': 'csharp',
            '.scala': 'scala'
        };
        return langMap[ext] || 'javascript';
    }

    private createNodeFromChunk(filePath: string, chunk: CodeChunk, options: ParseOptions): GraphNode | null {
        if (chunk.content.trim().length === 0) return null;

        // 分析代码块内容，确定节点类型
        const nodeType = this.determineNodeType(chunk.content);
        const nodeName = this.extractNodeName(chunk.content, nodeType);

        if (!nodeName) return null;

        return {
            id: `${filePath}:${nodeName}:${chunk.metadata.startLine}`,
            type: nodeType,
            name: nodeName,
            file: filePath,
            position: {
                line: chunk.metadata.startLine - 1,
                column: 0
            },
            extra: {
                endLine: chunk.metadata.endLine,
                language: chunk.metadata.language,
                content: chunk.content.substring(0, 200) // 保存前200个字符作为预览
            }
        };
    }

    private determineNodeType(content: string): NodeType {
        const trimmed = content.trim();

        if (trimmed.startsWith('function ') || trimmed.startsWith('async function ')) {
            return 'Function';
        }
        if (trimmed.startsWith('class ')) {
            return 'Class';
        }
        if (trimmed.startsWith('interface ')) {
            return 'Interface';
        }
        if (trimmed.startsWith('type ') && trimmed.includes('=')) {
            return 'Type';
        }
        if (trimmed.startsWith('enum ')) {
            return 'Enum';
        }
        if (trimmed.startsWith('const ') || trimmed.startsWith('let ') || trimmed.startsWith('var ')) {
            return 'Variable';
        }
        if (trimmed.startsWith('export ')) {
            return 'Module';
        }

        return 'Other';
    }

    private extractNodeName(content: string, nodeType: NodeType): string | null {
        const trimmed = content.trim();

        // 简单的名称提取逻辑
        const patterns = {
            'Function': /(?:function|async\s+function)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
            'Class': /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
            'Interface': /interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
            'Type': /type\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
            'Enum': /enum\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
            'Variable': /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/,
            'Module': /export\s+(?:default\s+)?(?:function|class|interface|type|enum|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/
        };

        const pattern = patterns[nodeType];
        if (pattern) {
            const match = trimmed.match(pattern);
            return match ? match[1] : null;
        }

        return 'anonymous';
    }

    private createRelationshipsFromChunks(
        nodes: GraphNode[],
        edges: GraphEdge[],
        chunks: CodeChunk[]
    ): void {
        // 基于代码块创建关系
        // 这里可以实现更复杂的关系提取逻辑
        for (let i = 0; i < nodes.length - 1; i++) {
            const current = nodes[i];
            const next = nodes[i + 1];

            if (current.file === next.file) {
                edges.push({
                    source: current.id,
                    target: next.id,
                    relation: 'follows',
                    extra: { type: 'sequential' }
                });
            }
        }
    }
}

// 导出便捷函数
export async function parseFileEnhanced(
    filePath: string,
    options: ParseOptions = DEFAULT_OPTIONS
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const parser = new EnhancedParser();
    return await parser.parseFile(filePath, options);
}
