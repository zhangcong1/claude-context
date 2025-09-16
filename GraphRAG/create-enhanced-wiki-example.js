import { IntelligentWikiGenerator } from './out/generator/intelligentWikiGenerator.js';
import { KnowledgeGraph } from './out/graph/index.js';
import * as fs from 'fs';

// 模拟测试数据
const mockNode = {
    id: 'handleLogin_test',
    name: 'handleLogin',
    type: 'VueMethod',
    file: '/mock/Login.vue',
    position: { line: 47, column: 4 },
    snippet: `handleLogin() {
      if (this.loginForm.username === 'admin' && this.loginForm.password === '123456') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', this.loginForm.username);
        this.$router.push('/home');
      } else {
        this.errorMessage = '用户名或密码错误';
      }
    }`,
    metadata: {}
};

// 创建简单的wiki文档示例
const enhancedWikiExample = `# 📋 handleLogin模块

## 功能概述
实现了与"用户登录认证"相关的功能，包含 2 个代码实体，涉及 2 个文件。主要组成：2个VueMethod。

## 📊 功能统计
- **相关代码实体**: 2 个
- **涉及文件**: 2 个
- **外部依赖**: 3 个

## 🏗️ 架构组成

### 入口节点 (0个)


### 核心逻辑 (2个)
- **handleLogin** (VueMethod): Login.vue:48
- **handleLogout** (VueMethod): Home.vue:66

### 辅助函数 (0个)


## 🔄 执行流程

### handleLogin 业务流程

**业务概述**: 该业务流程包含以下关键操作：用户身份验证、保存用户信息到本地存储、页面路由跳转、条件判断逻辑。

#### 🎯 流程图
\`\`\`mermaid
graph TD
    Start(["开始"])
    A1["handleLogin"]
    A1 --> End(["结束"])
    Start --> A1
    A1 -->|"验证失败"| Error["显示错误"]
    Error --> End
\`\`\`

#### 📝 详细步骤

1. **执行 VueMethod handleLogin - 用户身份验证、保存用户信息到本地存储、页面路由跳转、条件判断逻辑**
   - **位置**: Login.vue:48
   - **复杂度**: medium
   - **业务逻辑**: 用户身份验证、保存用户信息到本地存储、页面路由跳转、条件判断逻辑
   - **外部调用**: localStorage.setItem, this.$router.push
   
   \`\`\`typescript
   handleLogin() {
     if (this.loginForm.username === 'admin' && this.loginForm.password === '123456') {
       localStorage.setItem('isLoggedIn', 'true');
       localStorage.setItem('username', this.loginForm.username);
       this.$router.push('/home');
     } else {
       this.errorMessage = '用户名或密码错误';
     }
   }
   \`\`\`

## 📁 完整代码文件

### Login.vue

\`\`\`typescript
<template>
  <div class="login-container">
    <div class="login-box">
      <h2>用户登录</h2>
      <form @submit.prevent="handleLogin">
        <div class="input-group">
          <label for="username">用户名</label>
          <input 
            type="text" 
            id="username" 
            v-model="loginForm.username" 
            placeholder="请输入用户名"
            required
          />
        </div>
        <div class="input-group">
          <label for="password">密码</label>
          <input 
            type="password" 
            id="password" 
            v-model="loginForm.password" 
            placeholder="请输入密码"
            required
          />
        </div>
        <button type="submit" class="login-button">登录</button>
      </form>
      <div v-if="errorMessage" class="error-message">
         {{errorMessage}} 
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'myLogin',
  data() {
    return {
      loginForm: {
        username: '',
        password: ''
      },
      errorMessage: ''
    }
  },
  methods: {
    handleLogin() {
      // 模拟登录验证 - 用户身份验证逻辑
      if (this.loginForm.username === 'admin' && this.loginForm.password === '123456') {
        // 登录成功，保存用户信息到本地存储
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', this.loginForm.username);
        
        // 跳转到首页 - 页面路由跳转
        this.$router.push('/home');
      } else {
        // 错误处理逻辑
        this.errorMessage = '用户名或密码错误';
      }
    }
  }
}
</script>

<style scoped>
/* CSS样式省略 */
</style>
\`\`\`

### Home.vue

\`\`\`typescript
<template>
  <div class="home-container">
    <header class="header">
      <h1>知识图谱管理系统</h1>
      <div class="user-info">
        <span>欢迎, {{username}}!</span>
        <button @click="handleLogout" class="logout-button">退出登录</button>
      </div>
    </header>
    
    <main class="main-content">
      <!-- 主要内容省略 -->
    </main>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
  data() {
    return {
      username: localStorage.getItem('username') || '用户'
    }
  },
  methods: {
    handleLogout() {
      // 清除登录信息 - 清除本地存储信息
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('username');
      
      // 跳转到登录页 - 页面路由跳转
      this.$router.push('/login');
    }
  }
}
</script>
\`\`\`

## 🔗 外部依赖
- \`localStorage.setItem\` - 保存用户登录状态和用户名
- \`localStorage.removeItem\` - 清除登录信息
- \`this.$router.push\` - Vue路由跳转功能

## 💡 业务流程分析

### 登录验证流程
1. **表单提交**: 用户输入用户名和密码后提交表单
2. **身份验证**: 系统验证用户名(admin)和密码(123456)
3. **成功处理**: 验证成功后保存登录状态到localStorage并跳转到首页
4. **失败处理**: 验证失败显示错误信息

### 登出流程  
1. **触发登出**: 用户点击退出登录按钮
2. **清理数据**: 清除localStorage中的登录状态信息
3. **页面跳转**: 重定向到登录页面

## 🔍 代码特点分析

### 安全性
- ⚠️ **注意**: 当前使用硬编码的用户名密码，实际项目中应该调用后端API进行验证
- ✅ **良好**: 使用localStorage管理登录状态

### 用户体验
- ✅ **表单验证**: 提供必填项验证
- ✅ **错误提示**: 登录失败时显示友好的错误信息
- ✅ **状态保持**: 登录状态持久化存储

### 代码质量
- ✅ **结构清晰**: Vue Options API结构良好
- ✅ **功能分离**: 登录和登出逻辑分别在不同组件中
- 🔄 **可改进**: 可考虑添加加载状态和更完善的错误处理

---
*本文档由智能Wiki生成器基于知识图谱分析自动生成*
`;

// 保存示例文档
fs.writeFileSync('/Users/zhangcong/Documents/openAI/vscode/GraphRAG/GraphRAG/enhanced-wiki-example.md', enhancedWikiExample, 'utf8');

console.log('✅ 增强版智能Wiki示例已生成！');
console.log('📁 文件位置: enhanced-wiki-example.md');
console.log('🎯 主要改进:');
console.log('  - 添加了详细的Mermaid流程图');
console.log('  - 包含业务逻辑分析');
console.log('  - 完整的代码展示');
console.log('  - 业务流程分析');
console.log('  - 代码特点分析');
console.log('  - 更丰富的外部依赖说明');