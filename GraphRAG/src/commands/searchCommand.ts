import * as vscode from 'vscode';
import { ConfigManager } from '../config/configManager';
import { KnowledgeGraph } from '../graph';

export class SearchCommand {
    private configManager: ConfigManager;
    private knowledgeGraph: KnowledgeGraph;

    constructor(knowledgeGraph: KnowledgeGraph) {
        this.configManager = ConfigManager.getInstance();
        this.knowledgeGraph = knowledgeGraph;
    }

    public async execute(): Promise<void> {
        const query = await vscode.window.showInputBox({
            prompt: '请输入搜索查询',
            placeHolder: '例如：函数定义、类方法、变量声明等'
        });

        if (!query) {
            return;
        }

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '语义搜索',
                cancellable: true
            }, async (progress) => {
                progress.report({ message: '搜索中...' });

                // 简单的文本搜索实现
                const results = this.knowledgeGraph.searchNodes(query);

                if (results.length === 0) {
                    vscode.window.showInformationMessage('未找到匹配的节点');
                    return;
                }

                // 显示搜索结果
                const items = results.map(node => ({
                    label: node.name,
                    description: `${node.type} - ${node.file}`,
                    detail: node.position ? `行 ${node.position.line + 1}, 列 ${node.position.column + 1}` : '',
                    node: node
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: '选择要查看的节点',
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selected) {
                    // 打开文件并定位到节点位置
                    const document = await vscode.workspace.openTextDocument(selected.node.file);
                    const editor = await vscode.window.showTextDocument(document);

                    if (selected.node.position) {
                        const position = new vscode.Position(
                            selected.node.position.line,
                            selected.node.position.column
                        );
                        editor.selection = new vscode.Selection(position, position);
                        editor.revealRange(new vscode.Range(position, position));
                    }
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`搜索失败: ${error}`);
        }
    }
}
