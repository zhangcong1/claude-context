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
exports.generateIntelligentWikiCommand = generateIntelligentWikiCommand;
exports.analyzeFeatureCommand = analyzeFeatureCommand;
const vscode = __importStar(require("vscode"));
const graph_1 = require("../graph");
const intelligentWikiGenerator_1 = require("../generator/intelligentWikiGenerator");
const parser_1 = require("../parser");
const glob_1 = require("glob");
const path = __importStar(require("path"));
/**
 * 生成智能Wiki命令
 *
 * 使用语义搜索分析项目功能，生成详细的wiki文档
 */
async function generateIntelligentWikiCommand() {
    try {
        // 显示进度提示
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '🧠 正在生成智能Wiki...',
            cancellable: false
        }, async (progress, token) => {
            progress.report({ increment: 0, message: '准备分析项目...' });
            // 1. 获取工作区路径
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('没有打开的工作区');
            }
            const rootPath = workspaceFolder.uri.fsPath;
            progress.report({ increment: 10, message: '扫描项目文件...' });
            // 2. 扫描项目文件
            const files = await scanProjectFiles(rootPath);
            console.log(`📁 发现 ${files.length} 个文件`);
            progress.report({ increment: 20, message: '构建知识图谱...' });
            // 3. 构建知识图谱
            const knowledgeGraph = new graph_1.KnowledgeGraph();
            let processedFiles = 0;
            for (const file of files) {
                try {
                    let result;
                    if (file.endsWith('.vue')) {
                        result = (0, parser_1.parseVueFile)(file);
                    }
                    else {
                        result = (0, parser_1.parseTsFile)(file);
                    }
                    knowledgeGraph.addNodes(result.nodes);
                    knowledgeGraph.addEdges(result.edges);
                    processedFiles++;
                    const progressPercent = 20 + (processedFiles / files.length) * 40;
                    progress.report({
                        increment: 0,
                        message: `解析文件 ${processedFiles}/${files.length}: ${path.basename(file)}`
                    });
                }
                catch (error) {
                    console.warn(`解析文件失败: ${file}`, error);
                }
            }
            progress.report({ increment: 60, message: '生成智能Wiki文档...' });
            // 4. 生成智能Wiki
            const wikiGenerator = new intelligentWikiGenerator_1.IntelligentWikiGenerator(knowledgeGraph);
            // 选择输出目录
            const outputOptions = {
                canSelectMany: false,
                canSelectFiles: false,
                canSelectFolders: true,
                openLabel: '选择Wiki输出目录',
                defaultUri: vscode.Uri.file(path.join(rootPath, 'docs'))
            };
            let outputDir;
            const selectedFolder = await vscode.window.showOpenDialog(outputOptions);
            if (selectedFolder && selectedFolder[0]) {
                outputDir = selectedFolder[0].fsPath;
            }
            else {
                // 使用默认目录
                outputDir = path.join(rootPath, 'intelligent-wiki');
            }
            progress.report({ increment: 80, message: '写入Wiki文件...' });
            // 5. 生成完整Wiki
            const wikiPath = await wikiGenerator.generateCompleteWiki(outputDir);
            progress.report({ increment: 100, message: '完成!' });
            // 6. 显示结果并询问是否打开
            const stats = knowledgeGraph.getStats();
            const result = await vscode.window.showInformationMessage(`🎉 智能Wiki生成成功！\n\n` +
                `📊 分析了 ${stats.nodeCount} 个代码实体\n` +
                `📁 输出到: ${wikiPath}\n\n` +
                `是否现在打开Wiki目录？`, '打开目录', '查看README', '关闭');
            if (result === '打开目录') {
                // 在文件资源管理器中打开目录
                await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(wikiPath));
            }
            else if (result === '查看README') {
                // 打开README文件
                const readmePath = path.join(wikiPath, 'README.md');
                const doc = await vscode.workspace.openTextDocument(readmePath);
                await vscode.window.showTextDocument(doc);
            }
            // 7. 显示使用提示
            vscode.window.showInformationMessage(`💡 提示：Wiki文档包含以下内容：\n` +
                `• README.md - 项目概览\n` +
                `• FEATURES.md - 功能模块概览\n` +
                `• API_REFERENCE.md - API参考\n` +
                `• features/ - 详细的功能分析文档`, '了解');
        });
    }
    catch (error) {
        console.error('生成智能Wiki失败:', error);
        vscode.window.showErrorMessage(`生成智能Wiki失败: ${error.message}`);
    }
}
/**
 * 分析特定功能的命令
 */
async function analyzeFeatureCommand() {
    try {
        // 1. 获取用户输入的功能查询
        const featureQuery = await vscode.window.showInputBox({
            prompt: '请输入要分析的功能名称或描述',
            placeHolder: '例如: 用户登录, 数据验证, 文件上传等',
            value: ''
        });
        if (!featureQuery) {
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `🔍 正在分析"${featureQuery}"功能...`,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: '构建知识图谱...' });
            // 2. 构建知识图谱
            const knowledgeGraph = await buildCurrentProjectGraph();
            progress.report({ increment: 50, message: '语义搜索相关代码...' });
            // 3. 分析功能
            const wikiGenerator = new intelligentWikiGenerator_1.IntelligentWikiGenerator(knowledgeGraph);
            // 手动调用功能分析方法
            const feature = await wikiGenerator.analyzeFeature(featureQuery);
            if (!feature || feature.relatedNodes.length === 0) {
                vscode.window.showWarningMessage(`未找到与"${featureQuery}"相关的代码。请尝试其他关键词。`);
                return;
            }
            progress.report({ increment: 80, message: '生成功能文档...' });
            // 4. 生成功能文档
            const featureDoc = await wikiGenerator.generateFeatureDetailDoc(feature);
            progress.report({ increment: 100, message: '完成!' });
            // 5. 显示结果
            const doc = await vscode.workspace.openTextDocument({
                content: featureDoc,
                language: 'markdown'
            });
            await vscode.window.showTextDocument(doc);
            // 6. 显示分析结果摘要
            vscode.window.showInformationMessage(`✅ 功能分析完成！\n\n` +
                `📋 "${feature.name}"\n` +
                `📊 找到 ${feature.relatedNodes.length} 个相关代码实体\n` +
                `📁 涉及 ${feature.codeFiles.size} 个文件\n` +
                `🔗 ${feature.dependencies.length} 个外部依赖`, '了解');
        });
    }
    catch (error) {
        console.error('功能分析失败:', error);
        vscode.window.showErrorMessage(`功能分析失败: ${error.message}`);
    }
}
/**
 * 扫描项目文件
 */
async function scanProjectFiles(rootPath) {
    const patterns = [
        '**/*.ts',
        '**/*.tsx',
        '**/*.vue',
        '**/*.js',
        '**/*.jsx'
    ];
    const excludePatterns = [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/coverage/**',
        '**/*.test.*',
        '**/*.spec.*'
    ];
    const files = [];
    for (const pattern of patterns) {
        const globPattern = path.join(rootPath, pattern);
        const matchedFiles = await (0, glob_1.glob)(globPattern, {
            ignore: excludePatterns.map(ex => path.join(rootPath, ex))
        });
        files.push(...matchedFiles);
    }
    // 去重并过滤
    return [...new Set(files)].filter(file => {
        // 过滤掉太大的文件 (>500KB)
        try {
            const fs = require('fs');
            const stats = fs.statSync(file);
            return stats.size < 500 * 1024;
        }
        catch {
            return false;
        }
    });
}
/**
 * 构建当前项目的知识图谱
 */
async function buildCurrentProjectGraph() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('没有打开的工作区');
    }
    const rootPath = workspaceFolder.uri.fsPath;
    const files = await scanProjectFiles(rootPath);
    const knowledgeGraph = new graph_1.KnowledgeGraph();
    for (const file of files) {
        try {
            let result;
            if (file.endsWith('.vue')) {
                result = (0, parser_1.parseVueFile)(file);
            }
            else {
                result = (0, parser_1.parseTsFile)(file);
            }
            knowledgeGraph.addNodes(result.nodes);
            knowledgeGraph.addEdges(result.edges);
        }
        catch (error) {
            console.warn(`解析文件失败: ${file}`, error);
        }
    }
    return knowledgeGraph;
}
//# sourceMappingURL=intelligentWikiCommand.js.map