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

// 解析 .ts/.js 文件
export function parseTsFile(filePath: string): { nodes: GraphNode[]; edges: GraphEdge[]; stats: ParseStats } {
  const startTime = Date.now();
  const ext = path.extname(filePath).toLowerCase();
  let code: string;
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  try {
    code = fs.readFileSync(filePath, 'utf8');

    // 跳过过大的文件
    if (code.length > 100000) { // 100KB 代码限制
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
    const MAX_NODES_PER_FILE = 200; // 每个文件最多200个节点

    function visit(node: ts.Node) {
      // 如果节点数量过多，跳过后续解析
      if (nodeCount >= MAX_NODES_PER_FILE) return;

      if (ts.isFunctionDeclaration(node) && node.name) {
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        nodes.push({
          id: `${filePath}:${node.name.text}`,
          type: 'Function',
          name: node.name.text,
          file: filePath,
          position: { line: pos.line, column: pos.character }
        });
      } else if (ts.isClassDeclaration(node) && node.name) {
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        nodes.push({
          id: `${filePath}:${node.name.text}`,
          type: 'Class',
          name: node.name.text,
          file: filePath,
          position: { line: pos.line, column: pos.character }
        });
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
          }
        });
      } else if (ts.isCallExpression(node)) {
        // 函数调用关系 - 需要更精确的调用者识别
        const caller = node.expression.getText();
        // 尝试找到调用者所在的函数/方法
        let currentParent = node.parent;
        let callerNode: GraphNode | undefined;

        while (currentParent && !callerNode) {
          if (ts.isFunctionDeclaration(currentParent) && currentParent.name) {
            callerNode = nodes.find(n => n.id === `${filePath}:${(currentParent as ts.FunctionDeclaration).name?.text}`);
            break;
          } else if (ts.isMethodDeclaration(currentParent)) {
            const methodName = (currentParent.name as ts.Identifier)?.text;
            if (methodName) {
              callerNode = nodes.find(n => n.id === `${filePath}:${methodName}`);
              break;
            }
          }
          currentParent = currentParent.parent;
        }

        if (callerNode) {
          edges.push({
            source: callerNode.id,
            target: caller,
            relation: 'calls',
            extra: { args: node.arguments.map(a => a.getText()) }
          });
        }
      } else if (ts.isImportDeclaration(node)) {
        // 模块导入关系
        const importPath = node.moduleSpecifier.getText().replace(/['"]/g, '');
        const fileNodeId = `${filePath}:module`;

        // 确保文件模块节点存在
        if (!nodes.find(n => n.id === fileNodeId)) {
          nodes.push({
            id: fileNodeId,
            type: 'Module',
            name: path.basename(filePath),
            file: filePath
          });
        }

        edges.push({
          source: fileNodeId,
          target: importPath,
          relation: 'imports'
        });
      } else if (ts.isMethodDeclaration(node)) {
        // 方法声明
        const methodName = (node.name as ts.Identifier)?.text;
        if (methodName) {
          const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          nodes.push({
            id: `${filePath}:${methodName}`,
            type: 'Function',
            name: methodName,
            file: filePath,
            position: { line: pos.line, column: pos.character },
            extra: { isMethod: true }
          });
        }
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        // 接口声明
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        nodes.push({
          id: `${filePath}:${node.name.text}`,
          type: 'Module',
          name: node.name.text,
          file: filePath,
          position: { line: pos.line, column: pos.character },
          extra: { isInterface: true }
        });
      } else if (ts.isTypeAliasDeclaration(node) && node.name) {
        // 类型别名声明
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        nodes.push({
          id: `${filePath}:${node.name.text}`,
          type: 'Type',
          name: node.name.text,
          file: filePath,
          position: { line: pos.line, column: pos.character },
          extra: { isTypeAlias: true }
        });
      } else if (ts.isEnumDeclaration(node) && node.name) {
        // 枚举声明
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        nodes.push({
          id: `${filePath}:${node.name.text}`,
          type: 'Enum',
          name: node.name.text,
          file: filePath,
          position: { line: pos.line, column: pos.character },
          extra: {
            members: node.members.map(m => ts.isEnumMember(m) && ts.isIdentifier(m.name) ? m.name.text : 'unknown')
          }
        });
      } else if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
        // 类属性声明
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        nodes.push({
          id: `${filePath}:${node.name.text}`,
          type: 'Variable',
          name: node.name.text,
          file: filePath,
          position: { line: pos.line, column: pos.character },
          extra: { isProperty: true }
        });
      } else if (ts.isArrowFunction(node)) {
        // 箭头函数 - 尝试从父节点获取名称
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        let functionName = 'anonymous';

        if (ts.isVariableDeclaration(node.parent)) {
          const varDecl = node.parent as ts.VariableDeclaration;
          if (ts.isIdentifier(varDecl.name)) {
            functionName = varDecl.name.text;
          }
        } else if (ts.isPropertyAssignment(node.parent)) {
          const propAssign = node.parent as ts.PropertyAssignment;
          if (ts.isIdentifier(propAssign.name)) {
            functionName = propAssign.name.text;
          }
        }

        nodes.push({
          id: `${filePath}:${functionName}`,
          type: 'Function',
          name: functionName,
          file: filePath,
          position: { line: pos.line, column: pos.character },
          extra: { isArrowFunction: true }
        });
      } else if (ts.isExportDeclaration(node)) {
        // 导出声明
        if (node.moduleSpecifier) {
          const exportPath = node.moduleSpecifier.getText().replace(/['"]/g, '');
          const fileNodeId = `${filePath}:module`;

          // 确保文件模块节点存在
          if (!nodes.find(n => n.id === fileNodeId)) {
            nodes.push({
              id: fileNodeId,
              type: 'Module',
              name: path.basename(filePath),
              file: filePath
            });
          }

          edges.push({
            source: fileNodeId,
            target: exportPath,
            relation: 'exports'
          });
        }
      } else if (ts.isPropertyAccessExpression(node)) {
        // 属性访问 - 可能表示对象方法调用
        const propertyName = ts.isIdentifier(node.name) ? node.name.text : '';
        const objectName = ts.isIdentifier(node.expression) ? node.expression.text : '';

        if (propertyName && objectName) {
          edges.push({
            source: objectName,
            target: propertyName,
            relation: 'references',
            extra: { isPropertyAccess: true }
          });
        }
      } else if (ts.isNewExpression(node)) {
        // new 表达式 - 构造函数调用
        const constructorName = ts.isIdentifier(node.expression) ? node.expression.text : '';
        if (constructorName) {
          // 尝试找到调用者
          let currentParent = node.parent;
          let callerNode: GraphNode | undefined;

          while (currentParent && !callerNode) {
            if (ts.isFunctionDeclaration(currentParent) && currentParent.name) {
              callerNode = nodes.find(n => n.id === `${filePath}:${(currentParent as ts.FunctionDeclaration).name?.text}`);
              break;
            } else if (ts.isMethodDeclaration(currentParent)) {
              const methodName = (currentParent.name as ts.Identifier)?.text;
              if (methodName) {
                callerNode = nodes.find(n => n.id === `${filePath}:${methodName}`);
                break;
              }
            }
            currentParent = currentParent.parent;
          }

          if (callerNode) {
            edges.push({
              source: callerNode.id,
              target: constructorName,
              relation: 'calls',
              extra: { isConstructorCall: true }
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  } else if (ext === '.json') {
    try {
      const json = JSON.parse(code);

      // 创建根节点
      nodes.push({
        id: `${filePath}:json-root`,
        type: 'Json',
        name: 'root',
        file: filePath,
        extra: { keys: Object.keys(json) }
      });

      // 递归解析JSON结构
      function parseJsonObject(obj: any, parentPath: string, depth: number = 0) {
        if (depth > 3) return; // 限制递归深度

        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = parentPath ? `${parentPath}.${key}` : key;

          if (typeof value === 'object' && value !== null) {
            // 对象或数组
            nodes.push({
              id: `${filePath}:json:${currentPath}`,
              type: 'Json',
              name: key,
              file: filePath,
              extra: {
                path: currentPath,
                isArray: Array.isArray(value),
                keys: typeof value === 'object' ? Object.keys(value) : undefined
              }
            });

            // 添加父子关系
            edges.push({
              source: parentPath ? `${filePath}:json:${parentPath}` : `${filePath}:json-root`,
              target: `${filePath}:json:${currentPath}`,
              relation: 'references'
            });

            parseJsonObject(value, currentPath, depth + 1);
          } else {
            // 基本类型值
            nodes.push({
              id: `${filePath}:json:${currentPath}`,
              type: 'Json',
              name: key,
              file: filePath,
              extra: {
                path: currentPath,
                value: String(value),
                type: typeof value
              }
            });

            edges.push({
              source: parentPath ? `${filePath}:json:${parentPath}` : `${filePath}:json-root`,
              target: `${filePath}:json:${currentPath}`,
              relation: 'references'
            });
          }
        });
      }

      parseJsonObject(json, '');
    } catch (error) {
      console.warn(`Failed to parse JSON file ${filePath}:`, error);
    }
  } else if (ext === '.md') {
    // 解析Markdown标题结构
    const lines = code.split('\n');
    const headings: { level: number; text: string; line: number }[] = [];

    lines.forEach((line, index) => {
      const match = line.match(/^(#{1,6})\s+(.+)/);
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

    // 为每个标题创建节点
    headings.forEach((heading, index) => {
      nodes.push({
        id: `${filePath}:markdown:${heading.text}`,
        type: 'Markdown',
        name: heading.text,
        file: filePath,
        position: { line: heading.line, column: 0 },
        extra: {
          level: heading.level,
          isHeading: true,
          headingIndex: index
        }
      });

      // 添加父子关系（简化的层级关系）
      if (index > 0) {
        const prevHeading = headings[index - 1];
        if (heading.level > prevHeading.level) {
          // 子标题
          edges.push({
            source: `${filePath}:markdown:${prevHeading.text}`,
            target: `${filePath}:markdown:${heading.text}`,
            relation: 'references'
          });
        }
      } else {
        // 第一个标题连接到文档根
        edges.push({
          source: `${filePath}:markdown`,
          target: `${filePath}:markdown:${heading.text}`,
          relation: 'references'
        });
      }
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

// 解析 .vue 文件，抽取 <script> 部分
export function parseVueFile(filePath: string): GraphNode[] {
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
    function visit(node: ts.Node) {
      if (ts.isFunctionDeclaration(node) && node.name) {
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        nodes.push({
          id: `${filePath}:${node.name.text}`,
          type: 'Function',
          name: node.name.text,
          file: filePath,
          position: { line: pos.line, column: pos.character }
        });
      } else if (ts.isClassDeclaration(node) && node.name) {
        const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        nodes.push({
          id: `${filePath}:${node.name.text}`,
          type: 'Class',
          name: node.name.text,
          file: filePath,
          position: { line: pos.line, column: pos.character }
        });
      } else if (ts.isVariableStatement(node)) {
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
          }
        });
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }

  // 解析 <template> 部分，抽取组件标签和指令
  if (sfc.descriptor.template && sfc.descriptor.template.content) {
    try {
      const { parse: parseTemplate } = require('@vue/compiler-dom');
      const templateAst = parseTemplate(sfc.descriptor.template.content);
      function walkTemplate(node: any) {
        if (node.type === 1) { // ELEMENT
          nodes.push({
            id: `${filePath}:template:${node.tag}:${node.loc.start.line}`,
            type: 'Module',
            name: node.tag,
            file: filePath,
            position: { line: node.loc.start.line - 1, column: node.loc.start.column - 1 },
            extra: { directives: node.props?.map((p: any) => p.name).filter(Boolean) }
          });
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
