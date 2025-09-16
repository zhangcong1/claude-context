const WikiGenerator = require('./src/wikiGenerator');
const fs = require('fs');
const path = require('path');

async function generateProjectWiki() {
    console.log('🚀 基于GraphRAG知识图谱生成项目Wiki文档');
    console.log('============================================================');

    // 创建Wiki生成器实例
    const wikiGenerator = new WikiGenerator();

    // 项目文件列表
    const projectFiles = [
        './test-files/sample.ts',
        './test-files/Component.ts', 
        './test-files/TestComponent.vue',
        './test-files/config.json',
        './test-files/README.md'
    ];

    console.log('📁 项目文件:');
    projectFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');

    try {
        // 分析项目结构
        await wikiGenerator.analyzeProject(projectFiles);

        // 生成Wiki文档
        const wikiDir = await wikiGenerator.generateWiki('./project-wiki');

        console.log('');
        console.log('📖 Wiki文档生成成功！');
        console.log('');
        console.log('📋 生成的文档文件:');
        
        // 列出生成的文件
        const wikiFiles = fs.readdirSync(wikiDir);
        wikiFiles.forEach(file => {
            const filePath = path.join(wikiDir, file);
            const stats = fs.statSync(filePath);
            console.log(`   - ${file} (${Math.round(stats.size / 1024)}KB)`);
        });

        console.log('');
        console.log('🔍 文档预览:');
        console.log('------------------------------------------------------------');

        // 显示README.md的前几行作为预览
        const readmePath = path.join(wikiDir, 'README.md');
        if (fs.existsSync(readmePath)) {
            const readmeContent = fs.readFileSync(readmePath, 'utf8');
            const previewLines = readmeContent.split('\n').slice(0, 30);
            console.log(previewLines.join('\n'));
            
            if (readmeContent.split('\n').length > 30) {
                console.log('\n... (更多内容请查看完整文件)');
            }
        }

        console.log('');
        console.log('💡 使用建议:');
        console.log('------------------------------------------------------------');
        console.log('1. 打开 ./project-wiki/navigation.md 查看文档导航');
        console.log('2. 使用Markdown编辑器查看文档 (推荐: Typora, VS Code)');
        console.log('3. 将文档部署到GitHub Pages或其他文档平台');
        console.log('4. 根据需要自定义和补充文档内容');

        console.log('');
        console.log('🔄 更新文档:');
        console.log('------------------------------------------------------------');
        console.log('- 当项目代码更新时，重新运行此脚本即可更新文档');
        console.log('- 知识图谱会自动分析新的代码结构和依赖关系');
        console.log('- 文档内容会根据最新的代码自动生成');

        console.log('');
        console.log('✨ Wiki文档生成演示完成！');

    } catch (error) {
        console.error('❌ Wiki生成失败:', error);
    }
}

// 运行演示
generateProjectWiki();