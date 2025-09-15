// 测试Parser功能的脚本
const fs = require('fs');
const path = require('path');

// 导入编译后的parser模块
const { parseTsFile, parseVueFile } = require('./dist/parser');

console.log('🧪 开始测试GraphRAG Parser...\n');

// 测试文件路径
const testFiles = [
  './test-files/sample.ts',
  './test-files/Component.ts',
  './test-files/config.json',
  './test-files/README.md'
];

let totalNodes = 0;
let totalEdges = 0;
let totalStats = {};

console.log('📁 测试文件列表:');
testFiles.forEach(file => {
  console.log(`  - ${file}`);
});
console.log('');

// 测试每个文件
testFiles.forEach(filePath => {
  console.log(`\n🔍 解析文件: ${filePath}`);
  console.log('─'.repeat(50));
  
  try {
    const result = parseTsFile(filePath);
    
    console.log(`✅ 解析成功!`);
    console.log(`📊 统计信息:`);
    console.log(`   - 节点数量: ${result.stats.nodeCount}`);
    console.log(`   - 边数量: ${result.stats.edgeCount}`);
    console.log(`   - 文件大小: ${result.stats.fileSize} bytes`);
    console.log(`   - 解析时间: ${result.stats.parseTime}ms`);
    
    console.log(`\n🏷️  节点类型分布:`);
    Object.entries(result.stats.nodeTypes).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });
    
    console.log(`\n🔗 关系类型分布:`);
    Object.entries(result.stats.relationTypes).forEach(([relation, count]) => {
      console.log(`   - ${relation}: ${count}`);
    });
    
    console.log(`\n📋 节点详情:`);
    result.nodes.forEach(node => {
      const pos = node.position ? ` (行${node.position.line + 1}, 列${node.position.column + 1})` : '';
      console.log(`   - ${node.type}: ${node.name}${pos}`);
    });
    
    if (result.edges.length > 0) {
      console.log(`\n🔗 关系详情:`);
      result.edges.forEach(edge => {
        console.log(`   - ${edge.source} --[${edge.relation}]--> ${edge.target}`);
      });
    }
    
    // 累计统计
    totalNodes += result.stats.nodeCount;
    totalEdges += result.stats.edgeCount;
    
  } catch (error) {
    console.log(`❌ 解析失败: ${error.message}`);
  }
});

// 总结
console.log('\n' + '='.repeat(60));
console.log('📈 测试总结');
console.log('='.repeat(60));
console.log(`总节点数: ${totalNodes}`);
console.log(`总边数: ${totalEdges}`);
console.log(`测试文件数: ${testFiles.length}`);

console.log('\n🎉 Parser测试完成!');
