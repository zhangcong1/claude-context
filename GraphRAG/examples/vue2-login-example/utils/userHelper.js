/**
 * 用户相关的工具函数
 * 包含用户令牌管理、用户信息处理等功能
 */

/**
 * 设置用户登录令牌
 * @param {string} token 用户令牌
 * @param {boolean} rememberMe 是否记住登录
 */
export function setUserToken(token, rememberMe = false) {
  try {
    if (rememberMe) {
      // 记住登录，保存到localStorage
      localStorage.setItem('userToken', token)
      localStorage.setItem('tokenExpiresAt', Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7天
    } else {
      // 不记住登录，保存到sessionStorage
      sessionStorage.setItem('userToken', token)
      sessionStorage.setItem('tokenExpiresAt', Date.now() + (24 * 60 * 60 * 1000)) // 1天
    }
    
    // 设置令牌类型标记
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem('tokenType', rememberMe ? 'persistent' : 'session')
    
    console.log('用户令牌已保存')
    return true
  } catch (error) {
    console.error('保存用户令牌失败:', error)
    return false
  }
}

/**
 * 获取用户令牌
 * @returns {string|null} 用户令牌
 */
export function getUserToken() {
  try {
    // 先检查localStorage，再检查sessionStorage
    let token = localStorage.getItem('userToken')
    let storage = localStorage
    
    if (!token) {
      token = sessionStorage.getItem('userToken')
      storage = sessionStorage
    }
    
    if (token) {
      // 检查令牌是否过期
      const expiresAt = storage.getItem('tokenExpiresAt')
      if (expiresAt && Date.now() > parseInt(expiresAt)) {
        console.warn('用户令牌已过期')
        clearUserData()
        return null
      }
    }
    
    return token
  } catch (error) {
    console.error('获取用户令牌失败:', error)
    return null
  }
}

/**
 * 获取用户信息
 * @param {string} userId 用户ID（可选）
 * @returns {Object|null} 用户信息
 */
export async function getUserInfo(userId = null) {
  try {
    // 先从本地存储获取
    let userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo')
    
    if (userInfo) {
      userInfo = JSON.parse(userInfo)
      
      // 如果指定了userId，检查是否匹配
      if (userId && userInfo.id !== userId) {
        console.warn('用户ID不匹配，重新获取用户信息')
        userInfo = null
      }
    }
    
    // 如果本地没有用户信息，从API获取
    if (!userInfo) {
      const { getUserProfile } = await import('@/api/auth')
      userInfo = await getUserProfile()
      
      // 保存到本地存储
      const storage = localStorage.getItem('userToken') ? localStorage : sessionStorage
      storage.setItem('userInfo', JSON.stringify(userInfo))
    }
    
    return userInfo
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

/**
 * 更新用户信息
 * @param {Object} newUserInfo 新的用户信息
 */
export function updateUserInfo(newUserInfo) {
  try {
    const storage = localStorage.getItem('userToken') ? localStorage : sessionStorage
    const currentUserInfo = storage.getItem('userInfo')
    
    if (currentUserInfo) {
      const updatedInfo = {
        ...JSON.parse(currentUserInfo),
        ...newUserInfo,
        updatedAt: new Date().toISOString()
      }
      
      storage.setItem('userInfo', JSON.stringify(updatedInfo))
      console.log('用户信息已更新')
      return updatedInfo
    } else {
      console.warn('未找到当前用户信息')
      return null
    }
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return null
  }
}

/**
 * 清除用户数据
 * 清除所有与用户相关的本地存储数据
 */
export function clearUserData() {
  try {
    // 清除localStorage中的用户数据
    localStorage.removeItem('userToken')
    localStorage.removeItem('userInfo')
    localStorage.removeItem('tokenExpiresAt')
    localStorage.removeItem('tokenType')
    localStorage.removeItem('userPreferences')
    
    // 清除sessionStorage中的用户数据
    sessionStorage.removeItem('userToken')
    sessionStorage.removeItem('userInfo')
    sessionStorage.removeItem('tokenExpiresAt')
    sessionStorage.removeItem('tokenType')
    sessionStorage.removeItem('userPreferences')
    
    console.log('用户数据已清除')
    return true
  } catch (error) {
    console.error('清除用户数据失败:', error)
    return false
  }
}

/**
 * 检查用户是否已登录
 * @returns {boolean} 是否已登录
 */
export function isUserLoggedIn() {
  const token = getUserToken()
  return !!token
}

/**
 * 获取用户角色
 * @returns {string|null} 用户角色
 */
export function getUserRole() {
  try {
    const userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo')
    if (userInfo) {
      const parsed = JSON.parse(userInfo)
      return parsed.role || parsed.userRole || null
    }
    return null
  } catch (error) {
    console.error('获取用户角色失败:', error)
    return null
  }
}

/**
 * 检查用户权限
 * @param {string} permission 权限名称
 * @returns {boolean} 是否有权限
 */
export function hasUserPermission(permission) {
  try {
    const userInfo = localStorage.getItem('userInfo') || sessionStorage.getItem('userInfo')
    if (userInfo) {
      const parsed = JSON.parse(userInfo)
      const permissions = parsed.permissions || []
      return permissions.includes(permission)
    }
    return false
  } catch (error) {
    console.error('检查用户权限失败:', error)
    return false
  }
}

/**
 * 保存用户偏好设置
 * @param {Object} preferences 偏好设置
 */
export function saveUserPreferences(preferences) {
  try {
    const storage = localStorage.getItem('userToken') ? localStorage : sessionStorage
    const currentPrefs = storage.getItem('userPreferences')
    
    const updatedPrefs = currentPrefs ? 
      { ...JSON.parse(currentPrefs), ...preferences } : 
      preferences
    
    storage.setItem('userPreferences', JSON.stringify(updatedPrefs))
    console.log('用户偏好设置已保存')
    return true
  } catch (error) {
    console.error('保存用户偏好设置失败:', error)
    return false
  }
}

/**
 * 获取用户偏好设置
 * @returns {Object} 偏好设置
 */
export function getUserPreferences() {
  try {
    const preferences = localStorage.getItem('userPreferences') || 
                       sessionStorage.getItem('userPreferences')
    
    return preferences ? JSON.parse(preferences) : {}
  } catch (error) {
    console.error('获取用户偏好设置失败:', error)
    return {}
  }
}

/**
 * 格式化用户显示名称
 * @param {Object} userInfo 用户信息
 * @returns {string} 格式化的显示名称
 */
export function formatUserDisplayName(userInfo) {
  if (!userInfo) return '未知用户'
  
  if (userInfo.displayName) {
    return userInfo.displayName
  }
  
  if (userInfo.firstName && userInfo.lastName) {
    return `${userInfo.firstName} ${userInfo.lastName}`
  }
  
  if (userInfo.username) {
    return userInfo.username
  }
  
  if (userInfo.email) {
    return userInfo.email.split('@')[0]
  }
  
  return '用户'
}

/**
 * 获取用户头像URL
 * @param {Object} userInfo 用户信息
 * @returns {string} 头像URL
 */
export function getUserAvatarUrl(userInfo) {
  if (!userInfo) return '/default-avatar.png'
  
  if (userInfo.avatar) {
    return userInfo.avatar
  }
  
  if (userInfo.avatarUrl) {
    return userInfo.avatarUrl
  }
  
  // 使用Gravatar作为默认头像
  if (userInfo.email) {
    const crypto = require('crypto')
    const hash = crypto.createHash('md5').update(userInfo.email.toLowerCase()).digest('hex')
    return `https://www.gravatar.com/avatar/${hash}?d=identicon`
  }
  
  return '/default-avatar.png'
}