import * as vscode from 'vscode';
import { KnowledgeGraph } from '../graph';
import { HybridWikiGenerator } from '../generator/hybridWikiGenerator';
import { parseTsFile, parseVueFile } from '../parser';
import { glob } from 'glob';
import * as path from 'path';

/**
 * 混合模式Wiki生成命令
 * 
 * 结合语义搜索、结构分析、传统解析的混合策略
 */
export async function generateHybridWikiCommand(): Promise<void> {
    try {
        // 显示配置选项
        const config = await showHybridModeConfig();
        if (!config) return;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '🔀 正在生成混合模式Wiki...',
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

            progress.report({ increment: 60, message: '执行混合分析...' });

            // 4. 创建混合模式生成器
            const hybridGenerator = new HybridWikiGenerator(knowledgeGraph, config);
            
            // 选择输出目录
            const outputOptions: vscode.OpenDialogOptions = {
                canSelectMany: false,
                canSelectFiles: false,
                canSelectFolders: true,
                openLabel: '选择混合模式Wiki输出目录',
                defaultUri: vscode.Uri.file(path.join(rootPath, 'docs'))
            };

            let outputDir: string;
            const selectedFolder = await vscode.window.showOpenDialog(outputOptions);
            
            if (selectedFolder && selectedFolder[0]) {
                outputDir = selectedFolder[0].fsPath;
            } else {
                // 使用默认目录
                outputDir = path.join(rootPath, 'hybrid-wiki');
            }

            progress.report({ increment: 80, message: '生成混合模式Wiki...' });

            // 5. 生成混合模式Wiki
            const wikiPath = await hybridGenerator.generateHybridWiki(outputDir);

            progress.report({ increment: 100, message: '完成!' });

            // 6. 显示结果
            const stats = knowledgeGraph.getStats();
            const result = await vscode.window.showInformationMessage(
                `🎉 混合模式Wiki生成成功！\n\n` +
                `📊 分析了 ${stats.nodeCount} 个代码实体\n` +
                `🔀 使用混合分析策略\n` +
                `📁 输出到: ${wikiPath}\n\n` +
                `是否现在打开Wiki目录？`,
                '打开目录', '查看概览', '查看分析报告', '关闭'
            );

            if (result === '打开目录') {
                await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(wikiPath));
            } else if (result === '查看概览') {
                const readmePath = path.join(wikiPath, 'README.md');
                const doc = await vscode.workspace.openTextDocument(readmePath);
                await vscode.window.showTextDocument(doc);
            } else if (result === '查看分析报告') {
                const reportPath = path.join(wikiPath, 'ANALYSIS_REPORT.md');
                if (require('fs').existsSync(reportPath)) {
                    const doc = await vscode.workspace.openTextDocument(reportPath);
                    await vscode.window.showTextDocument(doc);
                }
            }

            // 7. 显示混合模式说明
            vscode.window.showInformationMessage(
                `🔀 混合模式特色：\n` +
                `• 🤖 语义搜索：AI智能功能发现\n` +
                `• 🏗️ 结构分析：代码架构深度分析\n` +
                `• 📋 传统解析：完整覆盖所有代码\n` +
                `• 🎯 智能合并：多策略结果融合`,
                '了解'
            );
        });

    } catch (error: any) {
        console.error('混合模式Wiki生成失败:', error);
        vscode.window.showErrorMessage(`混合模式Wiki生成失败: ${error.message}`);
    }
}

/**
 * 自定义混合模式配置命令
 */
export async function customizeHybridModeCommand(): Promise<void> {
    try {
        const config = await showAdvancedHybridConfig();
        if (!config) return;

        // 保存配置到工作区设置
        const workspaceConfig = vscode.workspace.getConfiguration('vscode-graphrag');
        await workspaceConfig.update('hybridMode', config, vscode.ConfigurationTarget.Workspace);

        vscode.window.showInformationMessage(
            `✅ 混合模式配置已保存！\n\n` +
            `语义权重: ${(config.semanticWeight * 100).toFixed(0)}%\n` +
            `结构权重: ${(config.structuralWeight * 100).toFixed(0)}%\n` +
            `传统权重: ${(config.traditionalWeight * 100).toFixed(0)}%`,
            '开始生成Wiki'
        ).then(selection => {
            if (selection === '开始生成Wiki') {
                generateHybridWikiCommand();
            }
        });

    } catch (error: any) {
        console.error('配置混合模式失败:', error);
        vscode.window.showErrorMessage(`配置失败: ${error.message}`);
    }
}

/**
 * 显示混合模式配置选项
 */
async function showHybridModeConfig(): Promise<any> {
    const modeOptions = [
        {
            label: '🎯 平衡模式',
            description: '语义40% + 结构40% + 传统20%',
            detail: '适合大多数项目，平衡各种分析方法',
            config: { semanticWeight: 0.4, structuralWeight: 0.4, traditionalWeight: 0.2 }
        },
        {
            label: '🤖 AI优先模式',
            description: '语义60% + 结构30% + 传统10%',
            detail: '强调智能功能发现，适合复杂业务项目',
            config: { semanticWeight: 0.6, structuralWeight: 0.3, traditionalWeight: 0.1 }
        },
        {
            label: '🏗️ 架构分析模式',
            description: '结构60% + 语义30% + 传统10%',
            detail: '重点分析代码结构，适合架构文档生成',
            config: { structuralWeight: 0.6, semanticWeight: 0.3, traditionalWeight: 0.1 }
        },
        {
            label: '📋 完整覆盖模式',
            description: '传统50% + 结构30% + 语义20%',
            detail: '确保代码完整覆盖，适合API文档生成',
            config: { traditionalWeight: 0.5, structuralWeight: 0.3, semanticWeight: 0.2 }
        },
        {
            label: '⚙️ 自定义配置',
            description: '手动配置权重比例',
            detail: '完全自定义各种分析策略的权重',
            config: null
        }
    ];

    const selected = await vscode.window.showQuickPick(modeOptions, {
        placeHolder: '选择混合模式配置策略',
        ignoreFocusOut: true
    });

    if (!selected) return null;

    if (selected.config) {
        return {
            ...selected.config,
            enableSemanticDiscovery: true,
            enableStructuralAnalysis: true,
            enableTraditionalParsing: true,
            generateArchitectureDocs: true,
            generateFeatureDocs: true,
            generateApiDocs: true,
            generateBusinessDocs: true,
            minFeatureNodes: 3,
            maxFeatureDepth: 5,
            enableContentValidation: true
        };
    } else {
        // 自定义配置
        return await showAdvancedHybridConfig();
    }
}

/**
 * 显示高级混合模式配置
 */
async function showAdvancedHybridConfig(): Promise<any> {
    // 语义搜索权重
    const semanticWeight = await vscode.window.showInputBox({
        prompt: '设置语义搜索权重 (0-1)',
        placeHolder: '0.4',
        value: '0.4',
        validateInput: (value) => {
            const num = parseFloat(value);
            if (isNaN(num) || num < 0 || num > 1) {
                return '请输入0-1之间的数值';
            }
            return null;
        }
    });
    if (!semanticWeight) return null;

    // 结构分析权重
    const structuralWeight = await vscode.window.showInputBox({
        prompt: '设置结构分析权重 (0-1)',
        placeHolder: '0.4',
        value: '0.4',
        validateInput: (value) => {
            const num = parseFloat(value);
            if (isNaN(num) || num < 0 || num > 1) {
                return '请输入0-1之间的数值';
            }
            return null;
        }
    });
    if (!structuralWeight) return null;

    // 传统解析权重
    const traditionalWeight = await vscode.window.showInputBox({
        prompt: '设置传统解析权重 (0-1)',
        placeHolder: '0.2',
        value: '0.2',
        validateInput: (value) => {
            const num = parseFloat(value);
            const total = parseFloat(semanticWeight) + parseFloat(structuralWeight) + parseFloat(value);
            if (isNaN(num) || num < 0 || num > 1) {
                return '请输入0-1之间的数值';
            }
            if (Math.abs(total - 1.0) > 0.01) {
                return `三个权重之和应为1.0，当前为${total.toFixed(2)}`;
            }
            return null;
        }
    });
    if (!traditionalWeight) return null;

    // 文档生成选项
    const docOptions = await vscode.window.showQuickPick([
        { label: '生成所有文档', picked: true, value: 'all' },
        { label: '仅生成功能文档', picked: false, value: 'features' },
        { label: '仅生成架构文档', picked: false, value: 'architecture' },
        { label: '仅生成API文档', picked: false, value: 'api' }
    ], {
        placeHolder: '选择要生成的文档类型',
        canPickMany: false
    });

    return {
        semanticWeight: parseFloat(semanticWeight),
        structuralWeight: parseFloat(structuralWeight),
        traditionalWeight: parseFloat(traditionalWeight),
        
        enableSemanticDiscovery: true,
        enableStructuralAnalysis: true,
        enableTraditionalParsing: true,
        
        generateArchitectureDocs: !docOptions || docOptions.value === 'all' || docOptions.value === 'architecture',
        generateFeatureDocs: !docOptions || docOptions.value === 'all' || docOptions.value === 'features',
        generateApiDocs: !docOptions || docOptions.value === 'all' || docOptions.value === 'api',
        generateBusinessDocs: !docOptions || docOptions.value === 'all',
        
        minFeatureNodes: 3,
        maxFeatureDepth: 5,
        enableContentValidation: true
    };
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