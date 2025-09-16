/**
 * 登录表单验证器
 * 提供用户登录相关的验证功能
 */

export default class LoginValidator {
  constructor() {
    // 用户名验证规则
    this.usernameRules = {
      minLength: 3,
      maxLength: 30,
      allowedChars: /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/,
      bannedWords: ['admin', 'root', 'test', 'guest']
    }
    
    // 密码验证规则
    this.passwordRules = {
      minLength: 6,
      maxLength: 50,
      requireUppercase: false,
      requireLowercase: false,
      requireNumbers: false,
      requireSpecialChars: false
    }
  }
  
  /**
   * 验证用户名
   * @param {string} username 用户名
   * @returns {boolean} 是否有效
   */
  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      return false
    }
    
    const trimmedUsername = username.trim()
    
    // 检查长度
    if (trimmedUsername.length < this.usernameRules.minLength || 
        trimmedUsername.length > this.usernameRules.maxLength) {
      return false
    }
    
    // 检查字符规则
    if (!this.usernameRules.allowedChars.test(trimmedUsername)) {
      return false
    }
    
    // 检查禁用词汇
    const lowerUsername = trimmedUsername.toLowerCase()
    if (this.usernameRules.bannedWords.some(word => lowerUsername.includes(word))) {
      return false
    }
    
    return true
  }
  
  /**
   * 验证密码强度
   * @param {string} password 密码
   * @returns {boolean} 是否有效
   */
  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return false
    }
    
    // 检查长度
    if (password.length < this.passwordRules.minLength || 
        password.length > this.passwordRules.maxLength) {
      return false
    }
    
    // 检查大写字母（如果需要）
    if (this.passwordRules.requireUppercase && !/[A-Z]/.test(password)) {
      return false
    }
    
    // 检查小写字母（如果需要）
    if (this.passwordRules.requireLowercase && !/[a-z]/.test(password)) {
      return false
    }
    
    // 检查数字（如果需要）
    if (this.passwordRules.requireNumbers && !/\d/.test(password)) {
      return false
    }
    
    // 检查特殊字符（如果需要）
    if (this.passwordRules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return false
    }
    
    return true
  }
  
  /**
   * 获取密码强度等级
   * @param {string} password 密码
   * @returns {Object} 强度信息
   */
  getPasswordStrength(password) {
    if (!password) {
      return {
        level: 0,
        label: '无',
        color: '#ccc'
      }
    }
    
    let score = 0
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      noCommon: !this.isCommonPassword(password)
    }
    
    // 计算得分
    Object.values(checks).forEach(check => {
      if (check) score++
    })
    
    // 根据得分返回强度等级
    if (score <= 2) {
      return {
        level: 1,
        label: '弱',
        color: '#ff4757',
        checks
      }
    } else if (score <= 4) {
      return {
        level: 2,
        label: '中',
        color: '#ffa502',
        checks
      }
    } else {
      return {
        level: 3,
        label: '强',
        color: '#2ed573',
        checks
      }
    }
  }
  
  /**
   * 检查是否为常见密码
   * @param {string} password 密码
   * @returns {boolean} 是否为常见密码
   */
  isCommonPassword(password) {
    const commonPasswords = [
      '123456', 'password', '123456789', '12345678', '12345',
      'qwerty', 'abc123', 'password123', 'admin', '1234567890',
      '000000', '111111', '123123', 'qwerty123'
    ]
    
    return commonPasswords.includes(password.toLowerCase())
  }
  
  /**
   * 验证电子邮箱格式
   * @param {string} email 电子邮箱
   * @returns {boolean} 是否有效
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return false
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email.trim())
  }
  
  /**
   * 验证手机号码格式（中国）
   * @param {string} phone 手机号码
   * @returns {boolean} 是否有效
   */
  validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return false
    }
    
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone.trim())
  }
  
  /**
   * 验证登录表单
   * @param {Object} formData 表单数据
   * @returns {Object} 验证结果
   */
  validateLoginForm(formData) {
    const errors = []
    
    // 验证用户名/邮箱/手机号
    if (!formData.username) {
      errors.push('请输入用户名、邮箱或手机号')
    } else {
      const username = formData.username.trim()
      
      // 尝试不同的验证方式
      const isValidUsername = this.validateUsername(username)
      const isValidEmail = this.validateEmail(username)
      const isValidPhone = this.validatePhone(username)
      
      if (!isValidUsername && !isValidEmail && !isValidPhone) {
        errors.push('用户名格式不正确')
      }
    }
    
    // 验证密码
    if (!formData.password) {
      errors.push('请输入密码')
    } else if (!this.validatePassword(formData.password)) {
      errors.push(`密码长度至少${this.passwordRules.minLength}位`)
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  /**
   * 验证注册表单
   * @param {Object} formData 表单数据
   * @returns {Object} 验证结果
   */
  validateRegisterForm(formData) {
    const errors = []
    
    // 验证用户名
    if (!formData.username) {
      errors.push('请输入用户名')
    } else if (!this.validateUsername(formData.username)) {
      errors.push('用户名格式不正确')
    }
    
    // 验证邮箱
    if (!formData.email) {
      errors.push('请输入邮箱地址')
    } else if (!this.validateEmail(formData.email)) {
      errors.push('邮箱格式不正确')
    }
    
    // 验证密码
    if (!formData.password) {
      errors.push('请输入密码')
    } else {
      const passwordStrength = this.getPasswordStrength(formData.password)
      if (passwordStrength.level < 2) {
        errors.push('密码强度太弱，请使用更复杂的密码')
      }
    }
    
    // 验证确认密码
    if (!formData.confirmPassword) {
      errors.push('请确认密码')
    } else if (formData.password !== formData.confirmPassword) {
      errors.push('两次输入的密码不一致')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
  
  /**
   * 实时验证输入
   * @param {string} field 字段名
   * @param {string} value 字段值
   * @returns {Object} 验证结果
   */
  validateField(field, value) {
    switch (field) {
      case 'username':
        return {
          isValid: this.validateUsername(value),
          message: this.validateUsername(value) ? '' : '用户名格式不正确'
        }
      
      case 'email':
        return {
          isValid: this.validateEmail(value),
          message: this.validateEmail(value) ? '' : '邮箱格式不正确'
        }
      
      case 'phone':
        return {
          isValid: this.validatePhone(value),
          message: this.validatePhone(value) ? '' : '手机号格式不正确'
        }
      
      case 'password':
        const strength = this.getPasswordStrength(value)
        return {
          isValid: this.validatePassword(value),
          message: this.validatePassword(value) ? `密码强度：${strength.label}` : '密码太短',
          strength
        }
      
      default:
        return {
          isValid: true,
          message: ''
        }
    }
  }
}