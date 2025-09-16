const { parseTsFile, parseVueFile } = require('./dist/parser-optimized');
const { KnowledgeGraph } = require('./dist/graph');
const fs = require('fs');
const path = require('path');

console.log('🔧 GraphRAG 知识图谱生成演示');
console.log('============================================================');

// 创建知识图谱实例
const knowledgeGraph = new KnowledgeGraph();

// 获取测试文件
const testFiles = [
    './test-files/sample.ts',
    './test-files/Component.ts',
    './test-files/config.json',
    './test-files/README.md'
];

console.log('📁 待解析的测试文件:');
testFiles.forEach(file => console.log(`   - ${file}`));
console.log('');

// 解析所有文件并添加到知识图谱
testFiles.forEach(file => {
    try {
        const result = parseTsFile(file);
        knowledgeGraph.addNodes(result.nodes);
        knowledgeGraph.addEdges(result.edges);
        console.log(`✅ 已解析: ${file} (节点: ${result.nodes.length}, 边: ${result.edges.length})`);
    } catch (error) {
        console.log(`❌ 解析失败: ${file} - ${error.message}`);
    }
});

console.log('');
console.log('📊 知识图谱统计:');
const stats = knowledgeGraph.getStats();
console.log(`   - 总节点数: ${stats.nodeCount}`);
console.log(`   - 总边数: ${stats.edgeCount}`);
console.log('   - 节点类型分布:', stats.nodeTypes);
console.log('   - 关系类型分布:', stats.relationTypes);

console.log('');
console.log('🎯 生成符合你要求的GraphRAG知识图谱结构:');
console.log('============================================================');

// 生成符合要求的格式
const graphStructure = {
    nodes: knowledgeGraph.getAllNodes().map(node => ({
        id: node.id,
        type: node.type,
        name: node.name,
        file: path.basename(node.file) // 使用文件名而不是完整路径
    })),
    edges: knowledgeGraph.getAllEdges().map(edge => ({
        source: edge.source,
        target: edge.target,
        type: edge.relation === 'imports' ? '引用' : 
              edge.relation === 'calls' ? '调用' :
              edge.relation === 'inherits' ? '继承' :
              edge.relation === 'references' ? '引用' : edge.relation
    }))
};

console.log(JSON.stringify(graphStructure, null, 2));

// 保存到文件
const outputFile = './test-graph-export.json';
fs.writeFileSync(outputFile, JSON.stringify(graphStructure, null, 2));
console.log('');
console.log(`💾 知识图谱已导出到: ${outputFile}`);

console.log('');
console.log('🔍 示例查询功能演示:');
console.log('------------------------------------------------------------');

// 搜索功能演示
console.log('🔎 搜索 "User" 相关节点:');
const userNodes = knowledgeGraph.searchNodes('User');
userNodes.forEach(node => {
    console.log(`   - ${node.type}: ${node.name} (${path.basename(node.file)})`);
});

console.log('');
console.log('🔎 查找 Class 类型的所有节点:');
const classNodes = knowledgeGraph.findNodesByType('Class');
classNodes.forEach(node => {
    console.log(`   - ${node.name} (${path.basename(node.file)})`);
});

console.log('');
console.log('🔎 查找节点邻居关系:');
if (classNodes.length > 0) {
    const firstClass = classNodes[0];
    const neighbors = knowledgeGraph.findNeighbors(firstClass.id);
    console.log(`   - ${firstClass.name} 的邻居节点:`);
    neighbors.nodes.forEach(neighbor => {
        console.log(`     • ${neighbor.name} (${neighbor.type})`);
    });
    console.log(`   - 相关关系:`);
    neighbors.edges.forEach(edge => {
        const sourceNode = knowledgeGraph.findNode(edge.source);
        const targetNode = knowledgeGraph.findNode(edge.target);
        console.log(`     • ${sourceNode?.name || edge.source} --[${edge.relation}]--> ${targetNode?.name || edge.target}`);
    });
}

console.log('');
console.log('✨ 演示完成! 项目已完全实现了GraphRAG知识图谱生成功能!');