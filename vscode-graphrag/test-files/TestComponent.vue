<template>
  <div class="test-component">
    <h1>{{ title }}</h1>
    <button @click="handleClick" :disabled="loading">
      {{ buttonText }}
    </button>
    <UserCard 
      v-for="user in users" 
      :key="user.id"
      :user="user"
      @delete="handleDeleteUser"
    />
    <div v-if="showModal" class="modal">
      <slot name="modal-content"></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import UserCard from './UserCard.vue'
import { UserService } from './services/UserService'

// 接口定义
interface User {
  id: number
  name: string
  email: string
}

// 响应式数据
const title = ref('测试组件')
const users = ref<User[]>([])
const loading = ref(false)
const showModal = ref(false)

// 路由
const router = useRouter()

// 服务实例
const userService = new UserService()

// 计算属性
const buttonText = computed(() => {
  return loading.value ? '加载中...' : '点击我'
})

const userCount = computed(() => users.value.length)

// 方法
const handleClick = async () => {
  loading.value = true
  try {
    await fetchUsers()
  } catch (error) {
    console.error('获取用户失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchUsers = async () => {
  const result = await userService.getAllUsers()
  users.value = result.data
}

const handleDeleteUser = (userId: number) => {
  users.value = users.value.filter(user => user.id !== userId)
}

const openModal = () => {
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const navigateToProfile = (userId: number) => {
  router.push(`/profile/${userId}`)
}

// 生命周期
onMounted(() => {
  fetchUsers()
})

// 暴露方法给父组件
defineExpose({
  openModal,
  closeModal,
  refreshUsers: fetchUsers
})
</script>

<script lang="ts">
// Options API 部分
export default {
  name: 'TestComponent',
  props: {
    initialTitle: {
      type: String,
      default: '默认标题'
    }
  },
  emits: ['user-selected', 'modal-closed']
}
</script>

<style scoped>
.test-component {
  padding: 20px;
  background-color: #f5f5f5;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>