# 🔧 API 文档

## 接口定义

### User (第6行)

**文件**: sample.ts

---

### Component (第2行)

**文件**: Component.ts

---

### User (第21行)

**文件**: TestComponent.vue

---

## 类定义

### UserService (第23行)

**文件**: sample.ts

**关系**:

---

### Api (第59行)

**文件**: sample.ts

---

### ButtonComponent (第7行)

**文件**: Component.ts

**关系**:
- 继承自: `Component`

---

## 函数定义

### getUserById (第32行)

**文件**: sample.ts

**调用的函数**:
- `this.users.find`

**特性**:  - 方法

---

### updateUser (第67行)

**文件**: sample.ts

**调用的函数**:
- `this.api.updateUser`
- `console.error`
- `fetch(this.baseUrl + '/users/' + user.id, {
      method: 'PUT',
      body: JSON.stringify(user)
    }).then`
- `fetch`
- `JSON.stringify`
- `response.json`

**特性**:  - 方法

---

### fetchUsers (第62行)

**文件**: sample.ts

**调用的函数**:
- `fetch(this.baseUrl + '/users')
      .then`
- `fetch`
- `response.json`

**特性**:  - 方法

---

### validateEmail (第76行)

**文件**: sample.ts

**调用的函数**:
- `emailRegex.test`

---

### createUser (第87行)

**文件**: sample.ts

**调用的函数**:
- `validateEmail`
- `Math.random`

---

### render (第10行)

**文件**: Component.ts

**特性**:  - 方法

---

