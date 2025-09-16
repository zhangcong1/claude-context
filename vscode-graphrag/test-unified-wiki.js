#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const UnifiedWikiGenerator = require('./src/unifiedWikiGenerator');

async function testUnifiedWikiGenerator() {
    console.log('🚀 开始测试统一知识图谱Wiki生成器...\n');
    
    try {
        const generator = new UnifiedWikiGenerator();
        const projectPath = __dirname;
        
        console.log('📁 分析项目路径:', projectPath);
        console.log('⚙️ 开始分析项目结构...');
        
        // 分析项目
        await generator.analyzeProject(projectPath);
        
        console.log('📊 项目分析完成！');
        console.log('- 技术模块数量:', generator.analysis.technical.modules.length);
        console.log('- 依赖关系数量:', generator.analysis.technical.dependencies.length);
        console.log('- 业务功能数量:', generator.analysis.business.features.length);
        console.log('- 数据模型数量:', generator.analysis.business.dataModels.length);
        console.log('- API接口数量:', generator.analysis.business.apis.length);
        
        console.log('\n📝 生成统一Wiki文档...');
        
        // 生成统一Wiki
        const wikiContent = await generator.generateUnifiedWiki();
        
        // 保存到文件
        const outputFile = path.join(__dirname, 'unified-wiki-test.md');
        fs.writeFileSync(outputFile, wikiContent, 'utf8');
        
        console.log('✅ 统一Wiki生成成功！');
        console.log('📄 输出文件:', outputFile);
        console.log('📏 文档长度:', wikiContent.length, '字符');
        
        // 显示文档结构预览
        const lines = wikiContent.split('\n');
        const headers = lines.filter(line => line.startsWith('#')).slice(0, 10);
        console.log('\n📋 文档结构预览:');
        headers.forEach(header => console.log('  ', header));
        
        if (headers.length > 10) {
            console.log('   ... 还有更多章节');
        }
        
        console.log('\n🎉 测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error('详细错误:', error.stack);
    }
}

// 运行测试
testUnifiedWikiGenerator();