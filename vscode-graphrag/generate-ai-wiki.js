const AIWikiGenerator = require('./src/aiWikiGenerator');

async function generateAIWiki() {
    console.log('🤖 GraphRAG + AI智能Wiki文档生成演示');
    console.log('============================================================');
    console.log('🔥 特色功能: 基于知识图谱的AI代码分析和智能文档生成');
    console.log('');

    // 创建AI Wiki生成器
    const aiWikiGenerator = new AIWikiGenerator({
        aiProvider: 'mock', // 使用模拟AI分析（可扩展为真实AI API）
        generateDetailedDocs: true
    });

    // 项目文件列表
    const projectFiles = [
        './test-files/sample.ts',
        './test-files/Component.ts', 
        './test-files/TestComponent.vue',
        './test-files/config.json',
        './test-files/README.md'
    ];

    console.log('📁 分析的项目文件:');
    projectFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');

    try {
        // 分析项目结构
        console.log('🔍 Stage 1: 构建知识图谱...');
        await aiWikiGenerator.analyzeProject(projectFiles);

        // 生成AI增强的Wiki文档
        console.log('🤖 Stage 2: AI智能分析和文档生成...');
        const wikiDir = await aiWikiGenerator.generateEnhancedWiki('./ai-enhanced-wiki');

        console.log('');
        console.log('🎉 AI增强Wiki文档生成成功！');
        console.log('');

        // 显示生成的文件
        const fs = require('fs');
        const path = require('path');
        const wikiFiles = fs.readdirSync(wikiDir);
        
        console.log('📋 生成的AI文档文件:');
        wikiFiles.forEach(file => {
            const filePath = path.join(wikiDir, file);
            const stats = fs.statSync(filePath);
            const description = {
                'README.md': 'AI增强版导航和概览',
                'overview.md': '项目统计和架构概述',
                'modules.md': '详细模块文档',
                'architecture.md': '架构图和依赖关系',
                'ai-summary.md': 'AI项目分析报告',
                'enhanced-api.md': 'AI增强的API文档'
            };
            console.log(`   - ${file} (${Math.round(stats.size / 1024)}KB) - ${description[file] || '其他文档'}`);
        });

        console.log('');
        console.log('🤖 AI分析报告预览:');
        console.log('------------------------------------------------------------');

        // 显示AI分析报告的预览
        const aiSummaryPath = path.join(wikiDir, 'ai-summary.md');
        if (fs.existsSync(aiSummaryPath)) {
            const summaryContent = fs.readFileSync(aiSummaryPath, 'utf8');
            const previewLines = summaryContent.split('\n').slice(0, 40);
            console.log(previewLines.join('\n'));
            
            if (summaryContent.split('\n').length > 40) {
                console.log('\n... (查看完整文件获取更多AI分析内容)');
            }
        }

        console.log('');
        console.log('💡 AI增强功能亮点:');
        console.log('------------------------------------------------------------');
        console.log('✅ 智能代码用途分析 - AI理解每个函数、类的具体作用');
        console.log('✅ 复杂度自动评估 - 基于依赖关系评估代码复杂度');
        console.log('✅ 个性化改进建议 - 针对技术栈提供最佳实践建议');
        console.log('✅ 使用示例生成 - 自动生成API使用代码示例');
        console.log('✅ 架构模式识别 - 识别项目采用的架构模式');
        console.log('✅ 技术栈智能分析 - 自动识别使用的技术和框架');

        console.log('');
        console.log('🔄 扩展到真实AI API:');
        console.log('------------------------------------------------------------');
        console.log('1. 集成OpenAI GPT API进行更深度的代码理解');
        console.log('2. 使用Claude API生成更详细的文档说明');
        console.log('3. 集成GitHub Copilot进行代码质量分析');
        console.log('4. 连接专业代码分析工具（如SonarQube）');

        console.log('');
        console.log('📖 如何使用生成的文档:');
        console.log('------------------------------------------------------------');
        console.log('1. 打开 ./ai-enhanced-wiki/README.md 查看完整导航');
        console.log('2. 查看 ai-summary.md 获取AI项目分析报告'); 
        console.log('3. 查看 enhanced-api.md 获取详细的API文档');
        console.log('4. 可将文档部署到团队wiki或GitHub Pages');

        console.log('');
        console.log('✨ AI增强Wiki生成演示完成！');
        console.log('🚀 项目现在具备了自动生成智能项目文档的能力！');

    } catch (error) {
        console.error('❌ AI Wiki生成失败:', error);
        console.error(error.stack);
    }
}

// 运行AI Wiki生成演示
generateAIWiki();