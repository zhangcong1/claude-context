const BusinessWikiGenerator = require('./src/businessWikiGenerator');

async function generateBusinessWiki() {
    console.log('📋 GraphRAG 业务文档生成演示');
    console.log('============================================================');
    console.log('🎯 专注提取业务逻辑、功能模块、数据模型等业务相关文档');
    console.log('');

    const businessWiki = new BusinessWikiGenerator();

    const projectFiles = [
        './test-files/sample.ts',
        './test-files/Component.ts', 
        './test-files/TestComponent.vue',
        './test-files/config.json',
        './test-files/README.md'
    ];

    console.log('📁 分析的业务代码文件:');
    projectFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');

    try {
        // 分析业务逻辑
        await businessWiki.analyzeBusinessLogic(projectFiles);

        // 生成业务Wiki
        const wikiDir = await businessWiki.generateBusinessWiki('./business-wiki');

        console.log('');
        console.log('📋 生成的业务文档:');
        
        const fs = require('fs');
        const path = require('path');
        const wikiFiles = fs.readdirSync(wikiDir);
        
        wikiFiles.forEach(file => {
            const filePath = path.join(wikiDir, file);
            const stats = fs.statSync(filePath);
            const descriptions = {
                'README.md': '业务概览和统计',
                'features.md': '核心业务功能说明',
                'data-models.md': '业务数据模型',
                'apis.md': 'API接口文档',
                'components.md': '前端业务组件',
                'services.md': '后端业务服务'
            };
            console.log(`   - ${file} (${Math.round(stats.size / 1024)}KB) - ${descriptions[file] || '其他文档'}`);
        });

        console.log('');
        console.log('📊 业务分析结果预览:');
        console.log('------------------------------------------------------------');

        // 显示业务概览
        const overviewPath = path.join(wikiDir, 'README.md');
        if (fs.existsSync(overviewPath)) {
            const overviewContent = fs.readFileSync(overviewPath, 'utf8');
            console.log(overviewContent);
        }

        console.log('');
        console.log('💡 业务Wiki特色功能:');
        console.log('------------------------------------------------------------');
        console.log('✅ 自动识别业务功能 - 从函数名和注释提取业务用途');
        console.log('✅ 数据模型分析 - 解析接口定义和数据结构');
        console.log('✅ API接口文档 - 识别HTTP方法和业务用途');
        console.log('✅ Vue组件业务作用 - 分析组件的业务价值');
        console.log('✅ 业务流程梳理 - 基于调用关系分析业务流程');
        console.log('✅ 注释内容提取 - 将代码注释转化为文档说明');

        console.log('');
        console.log('🔄 与技术Wiki的区别:');
        console.log('------------------------------------------------------------');
        console.log('📋 业务Wiki - 关注业务价值、功能用途、数据含义');
        console.log('🔧 技术Wiki - 关注代码结构、依赖关系、技术实现');
        console.log('');
        console.log('两种文档相互补充，为团队提供完整的项目理解！');

        console.log('');
        console.log('💡 优化建议:');
        console.log('------------------------------------------------------------');
        console.log('1. 在代码中添加更多业务相关的注释');
        console.log('2. 使用有意义的函数和变量命名');
        console.log('3. 为接口字段添加注释说明业务含义');
        console.log('4. 在关键业务逻辑处添加JSDoc注释');

        console.log('');
        console.log('✨ 业务Wiki生成完成！');
        console.log('🎯 现在你有了专门的业务逻辑文档！');

    } catch (error) {
        console.error('❌ 业务Wiki生成失败:', error);
    }
}

generateBusinessWiki();