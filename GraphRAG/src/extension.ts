import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { parseTsFile, parseVueFile, GraphNode, GraphEdge } from './parser';
import { KnowledgeGraph } from './graph';
import { GraphViewer } from './webview/graphViewer';
import { ConfigManager } from './config/configManager';
import { SearchCommand } from './commands/searchCommand';
import { IndexCommand } from './commands/indexCommand';
const WikiGenerator = require('./generator/wikiGenerator');
const AIWikiGenerator = require('./generator/aiWikiGenerator');
const BusinessWikiGenerator = require('./generator/businessWikiGenerator');
const UnifiedWikiGenerator = require('./generator/unifiedWikiGenerator');

let knowledgeGraph: KnowledgeGraph;
let graphViewer: GraphViewer;
let fileWatcher: vscode.FileSystemWatcher | undefined;
let searchCommand: SearchCommand;
let indexCommand: IndexCommand;
let configManager: ConfigManager;

export function activate(context: vscode.ExtensionContext) {
  console.log('GraphRAG Knowledge Graph extension is now active!');

  // 初始化知识图谱
  knowledgeGraph = new KnowledgeGraph();
  graphViewer = new GraphViewer(knowledgeGraph);
  configManager = ConfigManager.getInstance();
  searchCommand = new SearchCommand(knowledgeGraph);
  indexCommand = new IndexCommand(knowledgeGraph);

  // 注册"构建知识图谱"命令
  const buildGraphCmd = vscode.commands.registerCommand('vscode-graphrag.buildGraph', async () => {
    await buildKnowledgeGraph();
  });

  // 注册"查看知识图谱"命令
  const showGraphCmd = vscode.commands.registerCommand('vscode-graphrag.showGraph', async () => {
    if (knowledgeGraph.getStats().nodeCount === 0) {
      const result = await vscode.window.showWarningMessage(
        '知识图谱为空，是否先构建图谱？',
        '构建图谱',
        '查看空图谱'
      );
      if (result === '构建图谱') {
        await buildKnowledgeGraph();
      }
    }
    graphViewer.show();
  });

  // 注册"导出图谱"命令
  const exportGraphCmd = vscode.commands.registerCommand('vscode-graphrag.exportGraph', async () => {
    if (knowledgeGraph.getStats().nodeCount === 0) {
      vscode.window.showWarningMessage('知识图谱为空，请先构建图谱');
      return;
    }

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('knowledge-graph.json'),
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (uri) {
      try {
        fs.writeFileSync(uri.fsPath, knowledgeGraph.exportToJson(), 'utf8');
        vscode.window.showInformationMessage(`知识图谱已导出到: ${uri.fsPath}`);
      } catch (error) {
        vscode.window.showErrorMessage(`导出失败: ${error}`);
      }
    }
  });

  // 注册"导入图谱"命令
  const importGraphCmd = vscode.commands.registerCommand('vscode-graphrag.importGraph', async () => {
    const uri = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        'JSON Files': ['json'],
        'All Files': ['*']
      }
    });

    if (uri && uri[0]) {
      try {
        const jsonContent = fs.readFileSync(uri[0].fsPath, 'utf8');
        if (knowledgeGraph.importFromJson(jsonContent)) {
          graphViewer.updateGraph(knowledgeGraph);
          vscode.window.showInformationMessage('知识图谱导入成功');
        } else {
          vscode.window.showErrorMessage('导入失败：JSON格式不正确');
        }
      } catch (error) {
        vscode.window.showErrorMessage(`导入失败: ${error}`);
      }
    }
  });

  // 注册"清空图谱"命令
  const clearGraphCmd = vscode.commands.registerCommand('vscode-graphrag.clearGraph', async () => {
    const result = await vscode.window.showWarningMessage(
      '确定要清空知识图谱吗？此操作不可撤销。',
      '确定',
      '取消'
    );

    if (result === '确定') {
      knowledgeGraph.clear();
      graphViewer.updateGraph(knowledgeGraph);
      vscode.window.showInformationMessage('知识图谱已清空');
    }
  });

  // 注册"语义搜索"命令
  const semanticSearchCmd = vscode.commands.registerCommand('vscode-graphrag.semanticSearch', async () => {
    await searchCommand.execute();
  });

  // 注册"生成项目Wiki"命令
  const generateWikiCmd = vscode.commands.registerCommand('vscode-graphrag.generateWiki', async () => {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: '生成项目Wiki文档',
      cancellable: false
    }, async (progress) => {
      try {
        progress.report({ message: '分析项目结构...' });
        
        const wikiGenerator = new WikiGenerator();
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
          vscode.window.showErrorMessage('未找到工作区文件夹');
          return;
        }

        const files = getAllCodeFiles(workspaceFolders[0].uri.fsPath, workspaceFolders[0].uri.fsPath);
        await wikiGenerator.analyzeProject(files);
        
        progress.report({ message: '生成Wiki文档...' });
        const wikiDir = await wikiGenerator.generateWiki('./project-wiki');
        
        vscode.window.showInformationMessage(
          `Wiki文档生成成功！位置: ${wikiDir}`,
          '打开文件夹'
        ).then(selection => {
          if (selection === '打开文件夹') {
            vscode.env.openExternal(vscode.Uri.file(wikiDir));
          }
        });
      } catch (error) {
        vscode.window.showErrorMessage(`Wiki生成失败: ${error}`);
      }
    });
  });

  // 注册"生成AI增强Wiki"命令
  const generateAIWikiCmd = vscode.commands.registerCommand('vscode-graphrag.generateAIWiki', async () => {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: '生成AI增强Wiki文档',
      cancellable: false
    }, async (progress) => {
      try {
        progress.report({ message: 'AI分析项目结构...' });
        
        const aiWikiGenerator = new AIWikiGenerator();
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
          vscode.window.showErrorMessage('未找到工作区文件夹');
          return;
        }

        const files = getAllCodeFiles(workspaceFolders[0].uri.fsPath, workspaceFolders[0].uri.fsPath);
        await aiWikiGenerator.analyzeProject(files);
        
        progress.report({ message: '生成AI增强文档...' });
        const wikiDir = await aiWikiGenerator.generateEnhancedWiki('./ai-enhanced-wiki');
        
        vscode.window.showInformationMessage(
          `AI增强Wiki文档生成成功！位置: ${wikiDir}`,
          '打开文件夹',
          '查看AI分析报告'
        ).then(selection => {
          if (selection === '打开文件夹') {
            vscode.env.openExternal(vscode.Uri.file(wikiDir));
          } else if (selection === '查看AI分析报告') {
            vscode.workspace.openTextDocument(path.join(wikiDir, 'ai-summary.md')).then(doc => {
              vscode.window.showTextDocument(doc);
            });
          }
        });
      } catch (error) {
        vscode.window.showErrorMessage(`AI Wiki生成失败: ${error}`);
      }
    });
  });

  // 注册"生成统一Wiki"命令
  const generateUnifiedWikiCmd = vscode.commands.registerCommand('vscode-graphrag.generateUnifiedWiki', async () => {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: '生成统一知识图谱Wiki',
      cancellable: false
    }, async (progress) => {
      try {
        progress.report({ message: '分析项目结构...' });
        
        const unifiedWikiGenerator = new UnifiedWikiGenerator();
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
          vscode.window.showErrorMessage('未找到工作区文件夹');
          return;
        }

        await unifiedWikiGenerator.analyzeProject(workspaceFolders[0].uri.fsPath);
        
        progress.report({ message: '生成统一Wiki文档...' });
        const wikiContent = await unifiedWikiGenerator.generateUnifiedWiki();
        
        // 保存到文件
        const outputPath = path.join(workspaceFolders[0].uri.fsPath, 'unified-wiki.md');
        fs.writeFileSync(outputPath, wikiContent, 'utf8');
        
        vscode.window.showInformationMessage(
          `统一知识图谱Wiki生成成功！位置: ${outputPath}`,
          '打开文件',
          '查看概览'
        ).then(selection => {
          if (selection === '打开文件') {
            vscode.workspace.openTextDocument(outputPath).then(doc => {
              vscode.window.showTextDocument(doc);
            });
          } else if (selection === '查看概览') {
            // 打开统一概览部分
            vscode.workspace.openTextDocument(outputPath).then(doc => {
              vscode.window.showTextDocument(doc).then(editor => {
                const text = doc.getText();
                const overviewIndex = text.indexOf('## 统一项目概览');
                if (overviewIndex !== -1) {
                  const position = doc.positionAt(overviewIndex);
                  editor.selection = new vscode.Selection(position, position);
                  editor.revealRange(new vscode.Range(position, position));
                }
              });
            });
          }
        });
      } catch (error) {
        vscode.window.showErrorMessage(`统一Wiki生成失败: ${error}`);
      }
    });
  });

  // 注册"生成业务Wiki"命令
  const generateBusinessWikiCmd = vscode.commands.registerCommand('vscode-graphrag.generateBusinessWiki', async () => {
    await vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: '生成业务Wiki文档',
      cancellable: false
    }, async (progress) => {
      try {
        progress.report({ message: '分析业务逻辑...' });
        
        const businessWikiGenerator = new BusinessWikiGenerator();
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
          vscode.window.showErrorMessage('未找到工作区文件夹');
          return;
        }

        const files = getAllCodeFiles(workspaceFolders[0].uri.fsPath, workspaceFolders[0].uri.fsPath);
        await businessWikiGenerator.analyzeBusinessLogic(files);
        
        progress.report({ message: '生成业务文档...' });
        const wikiDir = await businessWikiGenerator.generateBusinessWiki('./business-wiki');
        
        vscode.window.showInformationMessage(
          `业务Wiki文档生成成功！位置: ${wikiDir}`,
          '打开文件夹',
          '查看业务功能'
        ).then(selection => {
          if (selection === '打开文件夹') {
            vscode.env.openExternal(vscode.Uri.file(wikiDir));
          } else if (selection === '查看业务功能') {
            vscode.workspace.openTextDocument(path.join(wikiDir, 'features.md')).then(doc => {
              vscode.window.showTextDocument(doc);
            });
          }
        });
      } catch (error) {
        vscode.window.showErrorMessage(`业务Wiki生成失败: ${error}`);
      }
    });
  });

  // 注册"索引代码库"命令
  const indexCodebaseCmd = vscode.commands.registerCommand('vscode-graphrag.indexCodebase', async () => {
    await indexCommand.execute();
  });

  // 设置文件监听器
  setupFileWatcher(context);

  // 注册状态栏
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(graph) GraphRAG';
  statusBarItem.tooltip = '点击查看知识图谱';
  statusBarItem.command = 'vscode-graphrag.showGraph';
  statusBarItem.show();

  context.subscriptions.push(
    buildGraphCmd,
    showGraphCmd,
    exportGraphCmd,
    importGraphCmd,
    clearGraphCmd,
    semanticSearchCmd,
    indexCodebaseCmd,
    generateWikiCmd,
    generateAIWikiCmd,
    generateBusinessWikiCmd,
    generateUnifiedWikiCmd,
    statusBarItem
  );

  // 自动构建初始图谱
  buildKnowledgeGraph().catch(error => {
    console.error('Initial graph build failed:', error);
  });
}

async function buildKnowledgeGraph(): Promise<void> {
  const config = configManager.getConfig();

  // 显示进度
  await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: '构建知识图谱',
    cancellable: true
  }, async (progress, token) => {
    progress.report({ message: '扫描项目文件...' });

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      vscode.window.showErrorMessage('未找到工作区文件夹');
      return;
    }

    // 清空现有图谱
    knowledgeGraph.clear();

    let totalFiles = 0;
    let processedFiles = 0;

    for (const folder of workspaceFolders) {
      const files = getAllCodeFiles(folder.uri.fsPath, folder.uri.fsPath);
      totalFiles += files.length;

      for (const file of files) {
        if (token.isCancellationRequested) {return;}

        try {
          let result: { nodes: GraphNode[]; edges: GraphEdge[] };

          if (file.endsWith('.vue')) {
            const nodes = parseVueFile(file, {
              maxNodesPerFile: config.maxNodesPerFile,
              maxFileSize: config.maxFileSizeKB * 1024,
              skipMinifiedFiles: true,
              skipTestFiles: true,
              includeTemplate: config.includeTemplate
            });
            result = { nodes, edges: [] };
          } else {
            result = parseTsFile(file, {
              maxNodesPerFile: config.maxNodesPerFile,
              maxFileSize: config.maxFileSizeKB * 1024,
              skipMinifiedFiles: true,
              skipTestFiles: true
            });
          }

          knowledgeGraph.addNodes(result.nodes);
          knowledgeGraph.addEdges(result.edges);

          processedFiles++;
          progress.report({
            message: `解析 ${file.split(path.sep).pop()}...`,
            increment: (100 / totalFiles)
          });

        } catch (error) {
          console.warn(`Failed to parse ${file}:`, error);
        }
      }
    }

    if (token.isCancellationRequested) {return;}

    progress.report({ message: '完成构建', increment: 0 });

    // 更新可视化界面
    graphViewer.updateGraph(knowledgeGraph);

    const stats = knowledgeGraph.getStats();
    vscode.window.showInformationMessage(
      `知识图谱构建完成！节点: ${stats.nodeCount}, 边: ${stats.edgeCount}`
    );
  });
}

// 读取 .graphragignore 文件
function loadIgnorePatterns(rootPath: string): { dirs: string[], patterns: string[] } {
  const ignoreFile = path.join(rootPath, '.graphragignore');
  const dirs: string[] = [];
  const patterns: string[] = [];

  try {
    if (fs.existsSync(ignoreFile)) {
      const content = fs.readFileSync(ignoreFile, 'utf8');
      const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));

      lines.forEach(line => {
        if (line.endsWith('/')) {
          dirs.push(line.slice(0, -1)); // 移除末尾的 /
        } else {
          patterns.push(line);
        }
      });
    }
  } catch (error) {
    console.warn('Failed to read .graphragignore file:', error);
  }

  // 默认忽略规则
  const defaultDirs = [
    'node_modules', '.git', 'dist', 'build', 'out', 'coverage', '.vscode', '.DS_Store',
    'public', 'static', 'assets', 'cache', '.cache', '.temp', '.tmp', 'temp', 'tmp',
    'tests', '__tests__', 'test', 'spec', 'e2e', 'cypress', 'docs', 'documentation',
    '.github', 'scripts', 'tools', '.pnpm-store', '.yarn', 'logs', 'log'
  ];

  const defaultPatterns = [
    '*.log', '*.lock', '*.pid', '*.seed', '*.pid.lock', '.env*', '*.local',
    '*.config.js', '*.config.ts', 'webpack.config.*', 'vite.config.*', 'rollup.config.*',
    'babel.config.*', 'postcss.config.*', 'tailwind.config.*', '*.min.js', '*.min.css',
    '*.bundle.js', '*.chunk.js', '*.test.*', '*.spec.*', '*.e2e.*'
  ];

  return {
    dirs: [...new Set([...defaultDirs, ...dirs])],
    patterns: [...new Set([...defaultPatterns, ...patterns])]
  };
}

function getAllCodeFiles(dir: string, rootPath: string): string[] {
  const { dirs: IGNORE_DIRS, patterns: IGNORE_PATTERNS } = loadIgnorePatterns(rootPath);
  const SUPPORTED_EXTENSIONS = ['.ts', '.js', '.vue', '.json', '.md', '.yaml', '.yml', '.css', '.scss', '.less'];
  const MAX_FILE_SIZE = 50 * 1024; // 50KB 文件大小限制

  let results: string[] = [];

  try {
    const list = fs.readdirSync(dir);

    list.forEach(file => {
      // 检查是否在忽略目录列表中
      if (IGNORE_DIRS.includes(file)) {return;}

      // 检查是否匹配忽略文件模式
      if (IGNORE_PATTERNS.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(file);
        }
        return file === pattern;
      })) {return;}

      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // 递归处理子目录
        results = results.concat(getAllCodeFiles(filePath, rootPath));
      } else if (SUPPORTED_EXTENSIONS.some(ext => file.endsWith(ext))) {
        // 检查文件大小限制
        if (stat.size > MAX_FILE_SIZE) {
          console.warn(`跳过过大文件: ${filePath} (${stat.size} bytes)`);
          return;
        }
        results.push(filePath);
      }
    });
  } catch (error) {
    console.warn(`Failed to read directory ${dir}:`, error);
  }

  return results;
}

function setupFileWatcher(context: vscode.ExtensionContext): void {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {return;}

  // 创建文件监听器
  fileWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspaceFolders[0], '**/*.{ts,js,vue,json,md,yaml,yml,css,scss,less}')
  );

  // 监听文件保存事件
  const onDidSave = vscode.workspace.onDidSaveTextDocument(async (document) => {
    const filePath = document.uri.fsPath;
    const supportedExtensions = ['.ts', '.js', '.vue', '.json', '.md', '.yaml', '.yml', '.css', '.scss', '.less'];

    if (supportedExtensions.some(ext => filePath.endsWith(ext))) {
      try {
        // 移除文件的旧节点
        knowledgeGraph.removeFile(filePath);

        // 重新解析文件
        let result: { nodes: GraphNode[]; edges: GraphEdge[] };

        if (filePath.endsWith('.vue')) {
          const nodes = parseVueFile(filePath, {
            maxNodesPerFile: 50,
            maxFileSize: 50 * 1024,
            skipMinifiedFiles: true,
            skipTestFiles: true,
            includeTemplate: false
          });
          result = { nodes, edges: [] };
        } else {
          result = parseTsFile(filePath, {
            maxNodesPerFile: 100,
            maxFileSize: 50 * 1024,
            skipMinifiedFiles: true,
            skipTestFiles: true
          });
        }

        knowledgeGraph.addNodes(result.nodes);
        knowledgeGraph.addEdges(result.edges);

        // 更新可视化界面
        graphViewer.updateGraph(knowledgeGraph);

        console.log(`Updated graph for file: ${filePath}`);
      } catch (error) {
        console.warn(`Failed to update graph for ${filePath}:`, error);
      }
    }
  });

  context.subscriptions.push(fileWatcher, onDidSave);
}

export function deactivate() { }
