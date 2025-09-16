import * as vscode from 'vscode';
import { KnowledgeGraph } from '../graph';
import { IntelligentWikiGenerator } from '../generator/intelligentWikiGenerator';
import { parseTsFile, parseVueFile } from '../parser';
import { glob } from 'glob';
import * as path from 'path';

/**
 * 生成智能Wiki命令
 * 
 * 使用语义搜索分析项目功能，生成详细的wiki文档
 */
export async function generateIntelligentWikiCommand(): Promise<void> {
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
            const knowledgeGraph = new KnowledgeGraph();
            let processedFiles = 0;

            for (const file of files) {
                try {
                    let result;
                    if (file.endsWith('.vue')) {
                        result = parseVueFile(file);
                    } else {
                        result = parseTsFile(file);
                    }
                    
                    knowledgeGraph.addNodes(result.nodes);
                    knowledgeGraph.addEdges(result.edges);
                    
                    processedFiles++;
                    const progressPercent = 20 + (processedFiles / files.length) * 40;
                    progress.report({ 
                        increment: 0, 
                        message: `解析文件 ${processedFiles}/${files.length}: ${path.basename(file)}` 
                    });
                    
                } catch (error) {
                    console.warn(`解析文件失败: ${file}`, error);
                }
            }

            progress.report({ increment: 60, message: '生成智能Wiki文档...' });

            // 4. 生成智能Wiki
            const wikiGenerator = new IntelligentWikiGenerator(knowledgeGraph);
            
            // 选择输出目录
            const outputOptions: vscode.OpenDialogOptions = {
                canSelectMany: false,
                canSelectFiles: false,
                canSelectFolders: true,
                openLabel: '选择Wiki输出目录',
                defaultUri: vscode.Uri.file(path.join(rootPath, 'docs'))
            };

            let outputDir: string;
            const selectedFolder = await vscode.window.showOpenDialog(outputOptions);
            
            if (selectedFolder && selectedFolder[0]) {
                outputDir = selectedFolder[0].fsPath;
            } else {
                // 使用默认目录
                outputDir = path.join(rootPath, 'intelligent-wiki');
            }

            progress.report({ increment: 80, message: '写入Wiki文件...' });

            // 5. 生成完整Wiki
            const wikiPath = await wikiGenerator.generateCompleteWiki(outputDir);

            progress.report({ increment: 100, message: '完成!' });

            // 6. 显示结果并询问是否打开
            const stats = knowledgeGraph.getStats();
            const result = await vscode.window.showInformationMessage(
                `🎉 智能Wiki生成成功！\n\n` +
                `📊 分析了 ${stats.nodeCount} 个代码实体\n` +
                `📁 输出到: ${wikiPath}\n\n` +
                `是否现在打开Wiki目录？`,
                '打开目录', '查看README', '关闭'
            );

            if (result === '打开目录') {
                // 在文件资源管理器中打开目录
                await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(wikiPath));
            } else if (result === '查看README') {
                // 打开README文件
                const readmePath = path.join(wikiPath, 'README.md');
                const doc = await vscode.workspace.openTextDocument(readmePath);
                await vscode.window.showTextDocument(doc);
            }

            // 7. 显示使用提示
            vscode.window.showInformationMessage(
                `💡 提示：Wiki文档包含以下内容：\n` +
                `• README.md - 项目概览\n` +
                `• FEATURES.md - 功能模块概览\n` +
                `• API_REFERENCE.md - API参考\n` +
                `• features/ - 详细的功能分析文档`,
                '了解'
            );
        });

    } catch (error: any) {
        console.error('生成智能Wiki失败:', error);
        vscode.window.showErrorMessage(`生成智能Wiki失败: ${error.message}`);
    }
}

/**
 * 分析特定功能的命令
 */
export async function analyzeFeatureCommand(): Promise<void> {
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
            const wikiGenerator = new IntelligentWikiGenerator(knowledgeGraph);
            
            // 手动调用功能分析方法
            const feature = await (wikiGenerator as any).analyzeFeature(featureQuery);
            
            if (!feature || feature.relatedNodes.length === 0) {
                vscode.window.showWarningMessage(`未找到与"${featureQuery}"相关的代码。请尝试其他关键词。`);
                return;
            }

            progress.report({ increment: 80, message: '生成功能文档...' });

            // 4. 生成功能文档
            const featureDoc = await (wikiGenerator as any).generateFeatureDetailDoc(feature);
            
            progress.report({ increment: 100, message: '完成!' });

            // 5. 显示结果
            const doc = await vscode.workspace.openTextDocument({
                content: featureDoc,
                language: 'markdown'
            });
            
            await vscode.window.showTextDocument(doc);

            // 6. 显示分析结果摘要
            vscode.window.showInformationMessage(
                `✅ 功能分析完成！\n\n` +
                `📋 "${feature.name}"\n` +
                `📊 找到 ${feature.relatedNodes.length} 个相关代码实体\n` +
                `📁 涉及 ${feature.codeFiles.size} 个文件\n` +
                `🔗 ${feature.dependencies.length} 个外部依赖`,
                '了解'
            );
        });

    } catch (error: any) {
        console.error('功能分析失败:', error);
        vscode.window.showErrorMessage(`功能分析失败: ${error.message}`);
    }
}

/**
 * 扫描项目文件
 */
async function scanProjectFiles(rootPath: string): Promise<string[]> {
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

    const files: string[] = [];
    
    for (const pattern of patterns) {
        const globPattern = path.join(rootPath, pattern);
        const matchedFiles = await glob(globPattern, {
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
        } catch {
            return false;
        }
    });
}

/**
 * 构建当前项目的知识图谱
 */
async function buildCurrentProjectGraph(): Promise<KnowledgeGraph> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('没有打开的工作区');
    }

    const rootPath = workspaceFolder.uri.fsPath;
    const files = await scanProjectFiles(rootPath);
    const knowledgeGraph = new KnowledgeGraph();

    for (const file of files) {
        try {
            let result;
            if (file.endsWith('.vue')) {
                result = parseVueFile(file);
            } else {
                result = parseTsFile(file);
            }
            
            knowledgeGraph.addNodes(result.nodes);
            knowledgeGraph.addEdges(result.edges);
            
        } catch (error) {
            console.warn(`解析文件失败: ${file}`, error);
        }
    }

    return knowledgeGraph;
}