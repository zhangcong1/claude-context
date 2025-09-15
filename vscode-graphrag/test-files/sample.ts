// 测试文件：演示各种语法结构
import * as fs from 'fs';
import { Component } from './Component';

// 接口定义
interface User {
  id: number;
  name: string;
  email: string;
}

// 类型别名
type UserRole = 'admin' | 'user' | 'guest';

// 枚举定义
enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending'
}

// 类定义
export class UserService {
  private users: User[] = [];
  
  // 构造函数
  constructor(private api: Api) {
    this.initializeUsers();
  }
  
  // 公共方法
  public getUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }
  
  // 私有方法
  private initializeUsers(): void {
    const data = this.api.fetchUsers();
    this.users = data.map(item => ({
      id: item.id,
      name: item.name,
      email: item.email
    }));
  }
  
  // 异步方法
  async updateUser(user: User): Promise<boolean> {
    try {
      const result = await this.api.updateUser(user);
      return result.success;
    } catch (error) {
      console.error('Failed to update user:', error);
      return false;
    }
  }
}

// API类
class Api {
  constructor(private baseUrl: string) {}
  
  fetchUsers(): any[] {
    return fetch(this.baseUrl + '/users')
      .then(response => response.json());
  }
  
  updateUser(user: User): Promise<{success: boolean}> {
    return fetch(this.baseUrl + '/users/' + user.id, {
      method: 'PUT',
      body: JSON.stringify(user)
    }).then(response => response.json());
  }
}

// 工具函数
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 箭头函数
const formatUserName = (user: User): string => {
  return `${user.name} (${user.email})`;
};

// 导出函数
export function createUser(name: string, email: string): User {
  if (!validateEmail(email)) {
    throw new Error('Invalid email format');
  }
  
  return {
    id: Math.random(),
    name,
    email
  };
}

// 默认导出
export default UserService;
