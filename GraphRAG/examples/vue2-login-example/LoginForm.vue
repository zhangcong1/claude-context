<template>
  <div class="login-container">
    <div class="login-form">
      <h2>用户登录</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="username">用户名:</label>
          <input 
            id="username"
            v-model="loginForm.username" 
            type="text" 
            placeholder="请输入用户名"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="password">密码:</label>
          <input 
            id="password"
            v-model="loginForm.password" 
            type="password" 
            placeholder="请输入密码"
            required
          />
        </div>
        
        <div class="form-group">
          <label>
            <input 
              v-model="rememberMe" 
              type="checkbox"
            /> 记住我
          </label>
        </div>
        
        <button 
          type="submit" 
          :disabled="isLoading"
          class="login-button"
        >
          {{ isLoading ? '登录中...' : '立即登录' }}
        </button>
      </form>
      
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      
      <div class="login-links">
        <a href="#" @click="showForgotPassword">忘记密码？</a>
        <a href="#" @click="showRegister">注册账号</a>
      </div>
    </div>
  </div>
</template>

<script>
import { userLogin, validateCredentials, checkUserSession } from '@/api/auth'
import { setUserToken, getUserInfo, clearUserData } from '@/utils/userHelper'
import LoginValidator from '@/utils/loginValidator'

export default {
  name: 'LoginForm',
  
  data() {
    return {
      // 登录表单数据
      loginForm: {
        username: '',
        password: ''
      },
      // 记住我选项
      rememberMe: false,
      // 加载状态
      isLoading: false,
      // 错误信息
      errorMessage: '',
      // 登录重试次数
      retryCount: 0,
      maxRetries: 3
    }
  },
  
  computed: {
    // 检查登录表单是否有效
    isLoginFormValid() {
      return this.loginForm.username.trim() && 
             this.loginForm.password.trim() && 
             this.loginForm.username.length >= 3 &&
             this.loginForm.password.length >= 6
    },
    
    // 获取登录按钮文本
    loginButtonText() {
      if (this.isLoading) {
        return '正在验证用户身份...'
      }
      return this.retryCount > 0 ? `重试登录 (${this.retryCount}/${this.maxRetries})` : '立即登录'
    }
  },
  
  watch: {
    // 监听登录表单变化，清除错误信息
    loginForm: {
      handler() {
        if (this.errorMessage) {
          this.errorMessage = ''
        }
      },
      deep: true
    }
  },
  
  async mounted() {
    // 组件加载时检查用户登录状态
    await this.checkExistingLogin()
    // 自动聚焦到用户名输入框
    this.focusUsernameInput()
  },
  
  methods: {
    /**
     * 处理用户登录表单提交
     * 这是主要的登录处理方法
     */
    async handleLogin() {
      if (!this.isLoginFormValid) {
        this.showError('请填写完整的登录信息')
        return
      }
      
      this.isLoading = true
      this.errorMessage = ''
      
      try {
        // 执行用户登录验证
        const loginResult = await this.performUserLogin()
        
        if (loginResult.success) {
          // 登录成功处理
          await this.handleLoginSuccess(loginResult)
        } else {
          // 登录失败处理
          this.handleLoginFailure(loginResult.message)
        }
      } catch (error) {
        console.error('登录过程中发生错误:', error)
        this.handleLoginError(error)
      } finally {
        this.isLoading = false
      }
    },
    
    /**
     * 执行用户登录认证
     * 调用API进行用户身份验证
     */
    async performUserLogin() {
      // 验证用户输入
      const validationResult = this.validateLoginInput()
      if (!validationResult.isValid) {
        throw new Error(validationResult.message)
      }
      
      // 准备登录参数
      const loginParams = {
        username: this.loginForm.username.trim(),
        password: this.loginForm.password,
        rememberMe: this.rememberMe,
        deviceInfo: this.getDeviceInfo()
      }
      
      // 调用登录API
      const response = await userLogin(loginParams)
      
      // 验证登录响应
      if (response.data && response.data.token) {
        return {
          success: true,
          token: response.data.token,
          userInfo: response.data.user,
          message: '登录成功'
        }
      } else {
        return {
          success: false,
          message: response.message || '登录验证失败'
        }
      }
    },
    
    /**
     * 处理登录成功的情况
     * 保存用户信息并跳转
     */
    async handleLoginSuccess(loginResult) {
      try {
        // 保存用户登录令牌
        await setUserToken(loginResult.token, this.rememberMe)
        
        // 获取并保存用户详细信息
        const userDetails = await getUserInfo(loginResult.userInfo.id)
        
        // 触发登录成功事件
        this.$emit('login-success', {
          user: userDetails,
          token: loginResult.token
        })
        
        // 显示成功消息
        this.$message.success('登录成功，正在跳转...')
        
        // 跳转到目标页面
        this.redirectAfterLogin()
        
      } catch (error) {
        console.error('登录成功后处理失败:', error)
        this.showError('登录成功但初始化失败，请刷新页面')
      }
    },
    
    /**
     * 处理登录失败的情况
     */
    handleLoginFailure(message) {
      this.retryCount++
      
      if (this.retryCount >= this.maxRetries) {
        this.showError('登录失败次数过多，请稍后再试或联系管理员')
        this.lockLogin()
      } else {
        this.showError(message || '用户名或密码错误')
      }
    },
    
    /**
     * 处理登录过程中的错误
     */
    handleLoginError(error) {
      if (error.code === 'NETWORK_ERROR') {
        this.showError('网络连接失败，请检查网络设置')
      } else if (error.code === 'SERVER_ERROR') {
        this.showError('服务器错误，请稍后重试')
      } else {
        this.showError('登录失败，请重试')
      }
    },
    
    /**
     * 验证用户登录输入
     */
    validateLoginInput() {
      const validator = new LoginValidator()
      
      // 验证用户名
      if (!validator.validateUsername(this.loginForm.username)) {
        return {
          isValid: false,
          message: '用户名格式不正确'
        }
      }
      
      // 验证密码强度
      if (!validator.validatePassword(this.loginForm.password)) {
        return {
          isValid: false,
          message: '密码长度至少6位'
        }
      }
      
      return { isValid: true }
    },
    
    /**
     * 检查现有登录状态
     */
    async checkExistingLogin() {
      try {
        const existingSession = await checkUserSession()
        if (existingSession.isValid) {
          // 用户已登录，直接跳转
          this.redirectAfterLogin()
        }
      } catch (error) {
        // 忽略检查错误，继续正常登录流程
        console.warn('检查登录状态失败:', error)
      }
    },
    
    /**
     * 登录后页面跳转
     */
    redirectAfterLogin() {
      const redirect = this.$route.query.redirect || '/dashboard'
      this.$router.push(redirect)
    },
    
    /**
     * 显示忘记密码页面
     */
    showForgotPassword() {
      this.$router.push('/forgot-password')
    },
    
    /**
     * 显示注册页面
     */
    showRegister() {
      this.$router.push('/register')
    },
    
    /**
     * 获取设备信息
     */
    getDeviceInfo() {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    },
    
    /**
     * 聚焦用户名输入框
     */
    focusUsernameInput() {
      this.$nextTick(() => {
        const usernameInput = this.$el.querySelector('#username')
        if (usernameInput) {
          usernameInput.focus()
        }
      })
    },
    
    /**
     * 显示错误信息
     */
    showError(message) {
      this.errorMessage = message
    },
    
    /**
     * 锁定登录功能
     */
    lockLogin() {
      // 可以实现登录锁定逻辑
      console.log('登录已锁定')
    }
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-form {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.form-group input[type="text"],
.form-group input[type="password"] {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.login-button {
  width: 100%;
  padding: 0.75rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.3s;
}

.login-button:hover:not(:disabled) {
  background: #5a67d8;
}

.login-button:disabled {
  background: #a0aec0;
  cursor: not-allowed;
}

.error-message {
  color: #e53e3e;
  margin-top: 1rem;
  text-align: center;
}

.login-links {
  margin-top: 1rem;
  text-align: center;
}

.login-links a {
  color: #667eea;
  text-decoration: none;
  margin: 0 0.5rem;
}

.login-links a:hover {
  text-decoration: underline;
}
</style>