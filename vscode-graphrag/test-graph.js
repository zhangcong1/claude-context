// 测试KnowledgeGraph功能的脚本
const { KnowledgeGraph } = require('./dist/graph');
const { parseTsFile } = require('./dist/parser');

console.log('🧠 开始测试KnowledgeGraph...\n');

// 创建知识图谱实例
const graph = new KnowledgeGraph();

// 解析测试文件
const testFiles = [
  './test-files/sample.ts',
  './test-files/Component.ts',
  './test-files/config.json',
  './test-files/README.md'
];

console.log('📊 构建知识图谱...\n');

testFiles.forEach(filePath => {
  console.log(`🔍 解析并添加: ${filePath}`);
  
  try {
    const result = parseTsFile(filePath);
    graph.addNodes(result.nodes);
    graph.addEdges(result.edges);
    
    console.log(`   ✅ 添加了 ${result.nodes.length} 个节点, ${result.edges.length} 条边`);
  } catch (error) {
    console.log(`   ❌ 失败: ${error.message}`);
  }
});

console.log('\n📈 知识图谱统计信息:');
console.log('─'.repeat(50));

const stats = graph.getStats();
console.log(`总节点数: ${stats.nodeCount}`);
console.log(`总边数: ${stats.edgeCount}`);
console.log(`最后更新: ${stats.lastUpdated.toLocaleString()}`);

console.log('\n🏷️ 节点类型分布:');
Object.entries(stats.nodeTypes).forEach(([type, count]) => {
  console.log(`  - ${type}: ${count}`);
});

console.log('\n🔗 关系类型分布:');
Object.entries(stats.relationTypes).forEach(([relation, count]) => {
  console.log(`  - ${relation}: ${count}`);
});

// 测试搜索功能
console.log('\n🔍 测试搜索功能:');
console.log('─'.repeat(50));

const searchQueries = ['User', 'function', 'class', 'json'];
searchQueries.forEach(query => {
  const results = graph.searchNodes(query);
  console.log(`搜索 "${query}": 找到 ${results.length} 个结果`);
  results.slice(0, 3).forEach(node => {
    console.log(`  - ${node.type}: ${node.name} (${node.file})`);
  });
  if (results.length > 3) {
    console.log(`  ... 还有 ${results.length - 3} 个结果`);
  }
});

// 测试邻居查找
console.log('\n🔗 测试邻居查找:');
console.log('─'.repeat(50));

const allNodes = graph.getAllNodes();
if (allNodes.length > 0) {
  const testNode = allNodes.find(n => n.type === 'Class');
  if (testNode) {
    const neighbors = graph.findNeighbors(testNode.id);
    console.log(`节点 "${testNode.name}" 的邻居:`);
    console.log(`  - 邻居节点: ${neighbors.nodes.length} 个`);
    console.log(`  - 连接边: ${neighbors.edges.length} 条`);
    
    neighbors.nodes.slice(0, 3).forEach(node => {
      console.log(`    - ${node.type}: ${node.name}`);
    });
  }
}

// 测试导出功能
console.log('\n💾 测试导出功能:');
console.log('─'.repeat(50));

try {
  const exportedData = graph.exportToJson();
  const exportSize = Buffer.byteLength(exportedData, 'utf8');
  console.log(`✅ 导出成功! 数据大小: ${exportSize} bytes`);
  
  // 保存到文件
  require('fs').writeFileSync('./test-graph-export.json', exportedData);
  console.log(`📁 已保存到: ./test-graph-export.json`);
} catch (error) {
  console.log(`❌ 导出失败: ${error.message}`);
}

// 测试导入功能
console.log('\n📥 测试导入功能:');
console.log('─'.repeat(50));

try {
  const newGraph = new KnowledgeGraph();
  const importData = require('fs').readFileSync('./test-graph-export.json', 'utf8');
  const importSuccess = newGraph.importFromJson(importData);
  
  if (importSuccess) {
    const importStats = newGraph.getStats();
    console.log(`✅ 导入成功!`);
    console.log(`   - 节点数: ${importStats.nodeCount}`);
    console.log(`   - 边数: ${importStats.edgeCount}`);
  } else {
    console.log(`❌ 导入失败`);
  }
} catch (error) {
  console.log(`❌ 导入测试失败: ${error.message}`);
}

console.log('\n🎉 KnowledgeGraph测试完成!');
