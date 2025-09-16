/**
 * 用户认证相关API接口
 * 包含登录、注册、密码重置等功能
 */

import axios from '@/utils/request'

// API基础路径
const AUTH_API_BASE = '/api/auth'

/**
 * 用户登录接口
 * @param {Object} loginData 登录数据
 * @param {string} loginData.username 用户名
 * @param {string} loginData.password 密码
 * @param {boolean} loginData.rememberMe 是否记住登录
 * @param {Object} loginData.deviceInfo 设备信息
 */
export async function userLogin(loginData) {
  try {
    const response = await axios.post(`${AUTH_API_BASE}/login`, {
      username: loginData.username,
      password: loginData.password,
      remember_me: loginData.rememberMe,
      device_info: loginData.deviceInfo
    })
    
    return {
      success: true,
      data: response.data,
      message: '登录成功'
    }
  } catch (error) {
    console.error('用户登录API调用失败:', error)
    return {
      success: false,
      message: error.response?.data?.message || '登录失败'
    }
  }
}

/**
 * 验证用户凭据
 * 在登录前进行初步验证
 */
export async function validateCredentials(username, password) {
  try {
    const response = await axios.post(`${AUTH_API_BASE}/validate`, {
      username,
      password
    })
    
    return response.data.isValid
  } catch (error) {
    console.error('凭据验证失败:', error)
    return false
  }
}

/**
 * 检查用户登录会话
 * 验证当前用户是否已登录
 */
export async function checkUserSession() {
  try {
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken')
    
    if (!token) {
      return { isValid: false, message: '未找到登录令牌' }
    }
    
    const response = await axios.get(`${AUTH_API_BASE}/session/check`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    return {
      isValid: response.data.valid,
      user: response.data.user,
      expiresAt: response.data.expiresAt
    }
  } catch (error) {
    console.error('会话检查失败:', error)
    return { isValid: false, message: '会话验证失败' }
  }
}

/**
 * 用户注册接口
 */
export async function userRegister(registerData) {
  try {
    const response = await axios.post(`${AUTH_API_BASE}/register`, registerData)
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || '注册失败')
  }
}

/**
 * 发送密码重置邮件
 */
export async function sendPasswordResetEmail(email) {
  try {
    const response = await axios.post(`${AUTH_API_BASE}/password/reset/send`, { email })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || '发送重置邮件失败')
  }
}

/**
 * 重置密码
 */
export async function resetPassword(token, newPassword) {
  try {
    const response = await axios.post(`${AUTH_API_BASE}/password/reset`, {
      token,
      new_password: newPassword
    })
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || '密码重置失败')
  }
}

/**
 * 用户注销
 */
export async function userLogout() {
  try {
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken')
    
    if (token) {
      await axios.post(`${AUTH_API_BASE}/logout`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
    }
    
    // 清除本地存储的令牌
    localStorage.removeItem('userToken')
    sessionStorage.removeItem('userToken')
    localStorage.removeItem('userInfo')
    
    return { success: true, message: '注销成功' }
  } catch (error) {
    console.error('注销失败:', error)
    // 即使API调用失败，也清除本地令牌
    localStorage.removeItem('userToken')
    sessionStorage.removeItem('userToken')
    localStorage.removeItem('userInfo')
    
    return { success: false, message: '注销失败' }
  }
}

/**
 * 刷新用户令牌
 */
export async function refreshUserToken() {
  try {
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken')
    
    const response = await axios.post(`${AUTH_API_BASE}/token/refresh`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    return {
      success: true,
      token: response.data.token,
      expiresAt: response.data.expiresAt
    }
  } catch (error) {
    console.error('令牌刷新失败:', error)
    return { success: false, message: '令牌刷新失败' }
  }
}

/**
 * 获取用户信息
 */
export async function getUserProfile() {
  try {
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken')
    
    const response = await axios.get(`${AUTH_API_BASE}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || '获取用户信息失败')
  }
}

/**
 * 更新用户信息
 */
export async function updateUserProfile(profileData) {
  try {
    const token = localStorage.getItem('userToken') || sessionStorage.getItem('userToken')
    
    const response = await axios.put(`${AUTH_API_BASE}/profile`, profileData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    return response.data
  } catch (error) {
    throw new Error(error.response?.data?.message || '更新用户信息失败')
  }
}