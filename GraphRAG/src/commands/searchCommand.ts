import * as vscode from 'vscode';
import { ConfigManager } from '../config/configManager';
import { KnowledgeGraph } from '../graph';
import { SemanticSearchService, SearchOptions, EnhancedSearchResult } from '../semantic/semanticSearchService';
import * as path from 'path';

export class SearchCommand {
    private configManager: ConfigManager;
    private knowledgeGraph: KnowledgeGraph;
    private semanticSearchService: SemanticSearchService;
    private lastSearchQuery: string = '';
    private searchHistory: string[] = [];

    constructor(knowledgeGraph: KnowledgeGraph) {
        this.configManager = ConfigManager.getInstance();
        this.knowledgeGraph = knowledgeGraph;
        this.semanticSearchService = new SemanticSearchService();
    }

    public async execute(): Promise<void> {
        // 首先检查是否有可用的节点
        const allNodes = this.knowledgeGraph.getAllNodes();
        if (allNodes.length === 0) {
            vscode.window.showInformationMessage('知识图谱为空，请先构建知识图谱');
            return;
        }

        // 显示搜索选项
        const searchMode = await this.showSearchModeSelection();
        if (!searchMode) {
            return;
        }

        // 获取搜索查询
        const query = await this.getSearchQuery();
        if (!query) {
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '智能搜索',
                cancellable: true
            }, async (progress, token) => {
                // 根据搜索模式执行不同的搜索
                let results: EnhancedSearchResult[];
                
                if (searchMode === 'semantic') {
                    results = await this.performSemanticSearch(query, progress, token);
                } else if (searchMode === 'hybrid') {
                    results = await this.performHybridSearch(query, progress, token);
                } else {
                    results = await this.performTraditionalSearch(query, progress);
                }

                if (token.isCancellationRequested) {
                    return;
                }

                // 显示搜索结果
                await this.showSearchResults(query, results, searchMode);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`搜索失败: ${error}`);
        }
    }

    /**
     * 显示搜索模式选择
     */
    private async showSearchModeSelection(): Promise<string | undefined> {
        const modes = [
            {
                label: '🧠 智能语义搜索',
                description: '基于AI理解的语义搜索，能理解同义词和上下文',
                detail: '推荐：准确度高，理解语义含义',
                value: 'semantic'
            },
            {
                label: '🔄 混合搜索',
                description: '结合关键词和语义搜索，兼顾精确性和智能性',
                detail: '平衡：速度快，覆盖面广',
                value: 'hybrid'
            },
            {
                label: '📝 传统关键词搜索',
                description: '基于关键词的精确匹配搜索',
                detail: '快速：适合已知确切名称的搜索',
                value: 'traditional'
            }
        ];

        const selected = await vscode.window.showQuickPick(modes, {
            placeHolder: '选择搜索模式',
            title: '智能搜索 - 选择搜索模式'
        });

        return selected?.value;
    }

    /**
     * 获取搜索查询
     */
    private async getSearchQuery(): Promise<string | undefined> {
        // 提供搜索建议和历史记录
        const suggestions = [
            '用户认证',
            '数据库连接',
            '路由配置',
            '组件渲染',
            '错误处理',
            '接口定义'
        ];

        const query = await vscode.window.showInputBox({
            prompt: '请输入搜索查询（支持自然语言描述）',
            placeHolder: '例如：处理用户登录的函数、数据库配置相关代码、Vue组件等',
            value: this.lastSearchQuery,
            valueSelection: this.lastSearchQuery ? [0, this.lastSearchQuery.length] : undefined
        });

        if (query) {
            this.lastSearchQuery = query;
            // 添加到历史记录
            if (!this.searchHistory.includes(query)) {
                this.searchHistory.unshift(query);
                this.searchHistory = this.searchHistory.slice(0, 10); // 保留最近10次搜索
            }
        }

        return query;
    }

    /**
     * 执行语义搜索
     */
    private async performSemanticSearch(
        query: string, 
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ): Promise<EnhancedSearchResult[]> {
        progress.report({ message: '构建语义索引...', increment: 20 });
        
        // 检查是否需要构建索引
        const indexStatus = this.semanticSearchService.getIndexStatus();
        if (indexStatus.size === 0 && !indexStatus.isIndexing) {
            const allNodes = this.knowledgeGraph.getAllNodes();
            await this.semanticSearchService.buildSemanticIndex(allNodes);
        }
        
        if (token.isCancellationRequested) return [];
        
        progress.report({ message: '执行语义搜索...', increment: 50 });
        
        const searchOptions: Partial<SearchOptions> = {
            semanticThreshold: 0.6,
            semanticWeight: 0.8,
            keywordWeight: 0.2,
            maxResults: 20,
            includeFiles: true,
            fuzzyMatch: true
        };
        
        const results = await this.semanticSearchService.semanticSearch(
            query, 
            this.knowledgeGraph.getAllNodes(), 
            searchOptions
        );
        
        progress.report({ message: '搜索完成', increment: 30 });
        return results;
    }

    /**
     * 执行混合搜索
     */
    private async performHybridSearch(
        query: string, 
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ): Promise<EnhancedSearchResult[]> {
        progress.report({ message: '执行混合搜索...', increment: 30 });
        
        const searchOptions: Partial<SearchOptions> = {
            semanticThreshold: 0.5,
            semanticWeight: 0.5,
            keywordWeight: 0.5,
            maxResults: 25,
            includeFiles: true,
            fuzzyMatch: true
        };
        
        // 如果没有语义索引，先尝试构建
        const indexStatus = this.semanticSearchService.getIndexStatus();
        if (indexStatus.size === 0 && !indexStatus.isIndexing) {
            try {
                progress.report({ message: '构建语义索引...', increment: 20 });
                const allNodes = this.knowledgeGraph.getAllNodes();
                await this.semanticSearchService.buildSemanticIndex(allNodes);
            } catch (error) {
                console.warn('语义索引构建失败，降级到传统搜索:', error);
                return this.performTraditionalSearch(query, progress);
            }
        }
        
        if (token.isCancellationRequested) return [];
        
        const results = await this.semanticSearchService.semanticSearch(
            query, 
            this.knowledgeGraph.getAllNodes(), 
            searchOptions
        );
        
        progress.report({ message: '搜索完成', increment: 50 });
        return results;
    }

    /**
     * 执行传统搜索
     */
    private async performTraditionalSearch(
        query: string, 
        progress: vscode.Progress<{ message?: string; increment?: number }>
    ): Promise<EnhancedSearchResult[]> {
        progress.report({ message: '执行关键词搜索...', increment: 50 });
        
        const nodes = this.knowledgeGraph.searchNodes(query);
        
        // 转换为增强搜索结果格式
        const results: EnhancedSearchResult[] = nodes.map(node => ({
            nodeId: node.id,
            similarity: 0,
            relevanceScore: this.calculateTraditionalRelevance(query, node),
            semanticMatch: false,
            node,
            matchType: 'exact' as const,
            matchDetails: {
                keywordMatch: true,
                semanticScore: 0,
                fuzzyScore: 0,
                contextMatch: false
            },
            snippets: this.extractSimpleSnippets(query, node),
            explanation: '关键词匹配'
        }));
        
        progress.report({ message: '搜索完成', increment: 50 });
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    /**
     * 计算传统搜索的相关性
     */
    private calculateTraditionalRelevance(query: string, node: any): number {
        const queryLower = query.toLowerCase();
        let score = 0;
        
        // 名称完全匹配
        if (node.name.toLowerCase() === queryLower) {
            score += 1.0;
        } else if (node.name.toLowerCase().includes(queryLower)) {
            score += 0.8;
        }
        
        // 类型匹配
        if (node.type.toLowerCase().includes(queryLower)) {
            score += 0.3;
        }
        
        // 文件路径匹配
        if (node.file.toLowerCase().includes(queryLower)) {
            score += 0.2;
        }
        
        // 语义描述匹配
        if (node.semantic && node.semantic.toLowerCase().includes(queryLower)) {
            score += 0.5;
        }
        
        return Math.min(score, 1.0);
    }

    /**
     * 提取简单代码片段
     */
    private extractSimpleSnippets(query: string, node: any): string[] {
        const snippets: string[] = [];
        
        if (node.snippet) {
            const lines = node.snippet.split('\n');
            const queryLower = query.toLowerCase();
            
            for (const line of lines) {
                if (line.toLowerCase().includes(queryLower)) {
                    snippets.push(line.trim());
                }
            }
        }
        
        return snippets.slice(0, 2);
    }

    /**
     * 显示搜索结果
     */
    private async showSearchResults(
        query: string, 
        results: EnhancedSearchResult[], 
        searchMode: string
    ): Promise<void> {
        if (results.length === 0) {
            vscode.window.showInformationMessage(
                `未找到与 "${query}" 相关的节点。尝试使用不同的关键词或搜索模式。`
            );
            return;
        }

        // 创建快速选择项目
        const items = results.map((result, index) => {
            const node = result.node;
            const matchIcon = this.getMatchIcon(result.matchType);
            const scoreText = result.semanticMatch 
                ? `${(result.similarity * 100).toFixed(0)}%` 
                : `${(result.relevanceScore * 100).toFixed(0)}%`;
            
            return {
                label: `${matchIcon} ${node.name}`,
                description: `${node.type} | ${scoreText} | ${path.basename(node.file)}`,
                detail: `${result.explanation}${result.snippets.length > 0 ? ' | ' + result.snippets[0] : ''}`,
                result,
                picked: index === 0 // 默认选中第一个结果
            };
        });

        // 显示结果选择器
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `找到 ${results.length} 个相关结果 (搜索模式: ${this.getSearchModeLabel(searchMode)})`,
            title: `搜索结果 - "${query}"`,
            matchOnDescription: true,
            matchOnDetail: true,
            canPickMany: false
        });

        if (selected) {
            await this.navigateToNode(selected.result.node);
        }
    }

    /**
     * 获取匹配类型图标
     */
    private getMatchIcon(matchType: string): string {
        switch (matchType) {
            case 'exact': return '🎯';
            case 'semantic': return '🧠';
            case 'fuzzy': return '🔍';
            case 'hybrid': return '🔄';
            default: return '📄';
        }
    }

    /**
     * 获取搜索模式标签
     */
    private getSearchModeLabel(mode: string): string {
        switch (mode) {
            case 'semantic': return '智能语义';
            case 'hybrid': return '混合搜索';
            case 'traditional': return '关键词';
            default: return '未知';
        }
    }

    /**
     * 导航到节点
     */
    private async navigateToNode(node: any): Promise<void> {
        try {
            const document = await vscode.workspace.openTextDocument(node.file);
            const editor = await vscode.window.showTextDocument(document);

            if (node.position) {
                const position = new vscode.Position(
                    node.position.line,
                    node.position.column
                );
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`无法打开文件: ${error}`);
        }
    }
}
