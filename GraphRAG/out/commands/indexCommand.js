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
exports.IndexCommand = void 0;
const vscode = __importStar(require("vscode"));
const configManager_1 = require("../config/configManager");
const parser_1 = require("../parser");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class IndexCommand {
    configManager;
    knowledgeGraph;
    constructor(knowledgeGraph) {
        this.configManager = configManager_1.ConfigManager.getInstance();
        this.knowledgeGraph = knowledgeGraph;
    }
    async execute() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('未找到工作区文件夹');
            return;
        }
        const config = this.configManager.getConfig();
        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '索引代码库',
                cancellable: true
            }, async (progress) => {
                progress.report({ message: '扫描项目文件...' });
                // 清空现有图谱
                this.knowledgeGraph.clear();
                let totalFiles = 0;
                let processedFiles = 0;
                for (const folder of workspaceFolders) {
                    const files = this.getAllCodeFiles(folder.uri.fsPath);
                    totalFiles += files.length;
                    for (const file of files) {
                        try {
                            let result;
                            if (file.endsWith('.vue')) {
                                const rv = (0, parser_1.parseVueFile)(file, {
                                    maxNodesPerFile: config.maxNodesPerFile,
                                    maxFileSize: config.maxFileSizeKB * 1024,
                                    skipMinifiedFiles: true,
                                    skipTestFiles: true,
                                    includeTemplate: config.includeTemplate
                                });
                                result = { nodes: rv.nodes, edges: rv.edges };
                            }
                            else {
                                result = (0, parser_1.parseTsFile)(file, {
                                    maxNodesPerFile: config.maxNodesPerFile,
                                    maxFileSize: config.maxFileSizeKB * 1024,
                                    skipMinifiedFiles: true,
                                    skipTestFiles: true
                                });
                            }
                            this.knowledgeGraph.addNodes(result.nodes);
                            this.knowledgeGraph.addEdges(result.edges);
                            processedFiles++;
                            progress.report({
                                message: `处理文件 ${processedFiles}/${totalFiles}: ${path.basename(file)}`,
                                increment: (100 / totalFiles)
                            });
                        }
                        catch (error) {
                            console.warn(`Failed to parse ${file}:`, error);
                        }
                    }
                }
                progress.report({ message: '索引完成' });
                const stats = this.knowledgeGraph.getStats();
                vscode.window.showInformationMessage(`代码库索引完成！节点: ${stats.nodeCount}, 边: ${stats.edgeCount}`);
            });
        }
        catch (error) {
            vscode.window.showErrorMessage(`索引失败: ${error}`);
        }
    }
    getAllCodeFiles(dir) {
        const IGNORE_DIRS = [
            'node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.vscode', '.DS_Store',
            'public', 'static', 'assets', 'cache', '.cache', '.temp', '.tmp', 'temp', 'tmp',
            'tests', '__tests__', 'test', 'spec', 'e2e', 'cypress', 'docs', 'documentation',
            '.github', 'scripts', 'tools', '.pnpm-store', '.yarn', 'logs', 'log'
        ];
        const IGNORE_PATTERNS = [
            '*.log', '*.lock', '*.pid', '*.seed', '*.pid.lock', '.env*', '*.local',
            '*.config.js', '*.config.ts', 'webpack.config.*', 'vite.config.*', 'rollup.config.*',
            'babel.config.*', 'postcss.config.*', 'tailwind.config.*', '*.min.js', '*.min.css',
            '*.bundle.js', '*.chunk.js', '*.test.*', '*.spec.*', '*.e2e.*'
        ];
        const SUPPORTED_EXTENSIONS = ['.ts', '.js', '.vue', '.json', '.md', '.yaml', '.yml', '.css', '.scss', '.less'];
        const MAX_FILE_SIZE = 50 * 1024; // 50KB 文件大小限制
        let results = [];
        try {
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                if (IGNORE_DIRS.includes(file)) {
                    return;
                }
                if (IGNORE_PATTERNS.some(pattern => {
                    if (pattern.includes('*')) {
                        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
                        return regex.test(file);
                    }
                    return file === pattern;
                })) {
                    return;
                }
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    results = results.concat(this.getAllCodeFiles(filePath));
                }
                else if (SUPPORTED_EXTENSIONS.some(ext => file.endsWith(ext))) {
                    if (stat.size > MAX_FILE_SIZE) {
                        console.warn(`跳过过大文件: ${filePath} (${stat.size} bytes)`);
                        return;
                    }
                    results.push(filePath);
                }
            });
        }
        catch (error) {
            console.warn(`Failed to read directory ${dir}:`, error);
        }
        return results;
    }
}
exports.IndexCommand = IndexCommand;
//# sourceMappingURL=indexCommand.js.map