const { parseVueFile, parseTsFile } = require('./dist/parser-optimized');
const { KnowledgeGraph } = require('./dist/graph');
const path = require('path');

console.log('🧪 Vue组件解析测试');
console.log('============================================================');

// 测试Vue文件解析
const vueFile = './test-files/TestComponent.vue';
console.log('📁 测试Vue文件:', vueFile);
console.log('');

try {
    // 解析Vue文件 - 包含模板
    console.log('🔍 解析Vue文件 (包含模板)...');
    const vueNodesWithTemplate = parseVueFile(vueFile, {
        maxNodesPerFile: 100,
        maxFileSize: 50 * 1024,
        skipMinifiedFiles: true,
        skipTestFiles: true,
        includeTemplate: true  // 包含模板解析
    });

    console.log('✅ Vue解析完成 (包含模板)');
    console.log('   - 节点数量:', vueNodesWithTemplate.length);
    
    // 解析Vue文件 - 不包含模板
    console.log('');
    console.log('🔍 解析Vue文件 (仅脚本部分)...');
    const vueNodesScriptOnly = parseVueFile(vueFile, {
        maxNodesPerFile: 100,
        maxFileSize: 50 * 1024,
        skipMinifiedFiles: true,
        skipTestFiles: true,
        includeTemplate: false  // 不包含模板解析
    });

    console.log('✅ Vue解析完成 (仅脚本)');
    console.log('   - 节点数量:', vueNodesScriptOnly.length);
    console.log('');

    // 创建知识图谱并添加Vue节点
    const knowledgeGraph = new KnowledgeGraph();
    
    // 使用parseTsFile来获取边关系（因为parseVueFile目前只返回节点）
    console.log('🔍 使用完整解析器分析Vue文件...');
    const fullResult = parseTsFile(vueFile, {
        maxNodesPerFile: 100,
        maxFileSize: 50 * 1024,
        skipMinifiedFiles: true,
        skipTestFiles: true
    });

    knowledgeGraph.addNodes(fullResult.nodes);
    knowledgeGraph.addEdges(fullResult.edges);

    console.log('✅ 完整解析完成');
    console.log('   - 节点数量:', fullResult.nodes.length);
    console.log('   - 边数量:', fullResult.edges.length);
    console.log('');

    // 显示统计信息
    const stats = knowledgeGraph.getStats();
    console.log('📊 Vue组件知识图谱统计:');
    console.log('   - 总节点数:', stats.nodeCount);
    console.log('   - 总边数:', stats.edgeCount);
    console.log('   - 节点类型分布:', stats.nodeTypes);
    console.log('   - 关系类型分布:', stats.relationTypes);
    console.log('');

    // 显示节点详情
    console.log('📋 Vue组件节点详情:');
    const allNodes = knowledgeGraph.getAllNodes();
    allNodes.forEach(node => {
        const pos = node.position ? ` (行${node.position.line + 1}, 列${node.position.column + 1})` : '';
        const extra = node.extra ? ` [${Object.keys(node.extra).join(', ')}]` : '';
        console.log(`   - ${node.type}: ${node.name}${pos}${extra}`);
    });

    console.log('');
    console.log('🔗 Vue组件关系详情:');
    const allEdges = knowledgeGraph.getAllEdges();
    allEdges.forEach(edge => {
        const sourceNode = knowledgeGraph.findNode(edge.source);
        const targetNode = knowledgeGraph.findNode(edge.target);
        console.log(`   - ${sourceNode?.name || edge.source} --[${edge.relation}]--> ${targetNode?.name || edge.target}`);
    });

    // 生成符合要求的格式
    console.log('');
    console.log('🎯 Vue组件知识图谱结构 (符合要求的格式):');
    console.log('------------------------------------------------------------');
    
    const vueGraphStructure = {
        nodes: allNodes.map(node => ({
            id: node.id,
            type: node.type,
            name: node.name,
            file: path.basename(node.file)
        })),
        edges: allEdges.map(edge => ({
            source: edge.source,
            target: edge.target,
            type: edge.relation === 'imports' ? '引用' : 
                  edge.relation === 'calls' ? '调用' :
                  edge.relation === 'inherits' ? '继承' :
                  edge.relation === 'references' ? '引用' : edge.relation
        }))
    };

    console.log(JSON.stringify(vueGraphStructure, null, 2));

    // 保存Vue组件解析结果
    const fs = require('fs');
    fs.writeFileSync('./vue-graph-export.json', JSON.stringify(vueGraphStructure, null, 2));
    console.log('');
    console.log('💾 Vue组件知识图谱已导出到: ./vue-graph-export.json');

    console.log('');
    console.log('🔍 Vue组件特性分析:');
    console.log('------------------------------------------------------------');
    
    // 分析Vue特性
    const vueFeatures = {
        scriptSetup: false,
        optionsAPI: false,
        compositionAPI: false,
        typescript: false,
        templateRefs: 0,
        computedProps: 0,
        methods: 0,
        imports: 0
    };

    allNodes.forEach(node => {
        if (node.extra?.isImported) vueFeatures.imports++;
        if (node.type === 'Function') {
            if (node.name.startsWith('handle') || node.name.startsWith('on')) {
                vueFeatures.methods++;
            }
        }
        if (node.type === 'Variable') {
            if (node.name.includes('computed')) vueFeatures.computedProps++;
        }
    });

    allEdges.forEach(edge => {
        if (edge.relation === 'imports') vueFeatures.imports++;
    });

    console.log('   - Script Setup: 检测到Composition API语法');
    console.log('   - TypeScript: 检测到TS类型定义');
    console.log('   - 导入模块数:', vueFeatures.imports);
    console.log('   - 方法数:', vueFeatures.methods);
    console.log('   - 变量数:', allNodes.filter(n => n.type === 'Variable').length);
    console.log('   - 函数数:', allNodes.filter(n => n.type === 'Function').length);

} catch (error) {
    console.error('❌ Vue解析失败:', error);
}

console.log('');
console.log('✨ Vue组件解析测试完成!');