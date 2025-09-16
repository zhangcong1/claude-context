const { IntelligentWikiGenerator } = require('./out/generator/intelligentWikiGenerator');
const { KnowledgeGraph } = require('./out/graph');
const fs = require('fs');
const path = require('path');

// 创建测试用的知识图谱数据
function createTestKnowledgeGraph() {
    const graph = new KnowledgeGraph();
    
    // 添加登录相关的节点
    const loginNode = {
        id: 'handleLogin',
        name: 'handleLogin',
        type: 'VueMethod',
        file: '/test/Login.vue',
        position: { line: 47, column: 4 },
        snippet: `handleLogin() {
      // 模拟登录验证
      if (this.loginForm.username === 'admin' && this.loginForm.password === '123456') {
        // 登录成功，保存用户信息到本地存储
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', this.loginForm.username);
        
        // 跳转到首页
        this.$router.push('/home');
      } else {
        this.errorMessage = '用户名或密码错误';
      }
    }`,
        metadata: {}
    };
    
    const logoutNode = {
        id: 'handleLogout',
        name: 'handleLogout',
        type: 'VueMethod',
        file: '/test/Home.vue',
        position: { line: 65, column: 4 },
        snippet: `handleLogout() {
      // 清除登录信息
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('username');
      
      // 跳转到登录页
      this.$router.push('/login');
    }`,
        metadata: {}
    };
    
    // 添加节点到图中
    graph.addNode(loginNode);
    graph.addNode(logoutNode);
    
    // 添加调用关系
    graph.addEdge({
        id: 'edge1',
        source: 'handleLogin',
        target: 'handleLogout',
        relation: 'relates_to'
    });
    
    return graph;
}

async function testEnhancedWiki() {
    console.log('🧪 测试增强的智能Wiki生成器...');
    
    try {
        // 创建测试图谱
        const graph = createTestKnowledgeGraph();
        
        // 创建Wiki生成器
        const generator = new IntelligentWikiGenerator(graph);
        
        // 分析handleLogin功能
        console.log('🔍 分析handleLogin功能...');
        const feature = await generator.analyzeFeature('用户登录认证');
        
        if (feature) {
            console.log('\n✅ 功能分析结果:');
            console.log(`功能名称: ${feature.name}`);
            console.log(`相关节点: ${feature.relatedNodes.length} 个`);
            console.log(`执行流程: ${feature.flows.length} 个`);
            
            // 生成详细文档
            const doc = await generator.generateFeatureDetailDoc(feature);
            
            // 输出文档
            console.log('\n📝 生成的智能Wiki文档:');
            console.log('=' * 50);
            console.log(doc);
            
            // 保存到文件
            fs.writeFileSync('./test-wiki-output.md', doc, 'utf8');
            console.log('\n💾 文档已保存到: ./test-wiki-output.md');
            
        } else {
            console.log('❌ 未找到相关功能');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

// 运行测试
testEnhancedWiki();