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
exports.SearchCommand = void 0;
const vscode = __importStar(require("vscode"));
const configManager_1 = require("../config/configManager");
class SearchCommand {
    configManager;
    knowledgeGraph;
    constructor(knowledgeGraph) {
        this.configManager = configManager_1.ConfigManager.getInstance();
        this.knowledgeGraph = knowledgeGraph;
    }
    async execute() {
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
                        const position = new vscode.Position(selected.node.position.line, selected.node.position.column);
                        editor.selection = new vscode.Selection(position, position);
                        editor.revealRange(new vscode.Range(position, position));
                    }
                }
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`搜索失败: ${error}`);
        }
    }
}
exports.SearchCommand = SearchCommand;
//# sourceMappingURL=searchCommand.js.map