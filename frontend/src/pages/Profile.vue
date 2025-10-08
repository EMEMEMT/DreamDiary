<script setup>
import { ref, onMounted } from 'vue'
import { UsersApi } from '../services/api'

const me = ref(null)
const dreams = ref([])
const isLoading = ref(false)
const errorMessage = ref('')
const isUploading = ref(false)
const fileInput = ref(null)

async function load() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const u = await UsersApi.me()
    me.value = u
    dreams.value = await UsersApi.publicDreams(u.id)
  } catch (e) { errorMessage.value = e?.message || '加载失败' } finally { isLoading.value = false }
}

async function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    errorMessage.value = '请选择图片文件'
    return
  }
  
  // 验证文件大小 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    errorMessage.value = '图片大小不能超过5MB'
    return
  }
  
  isUploading.value = true
  errorMessage.value = ''
  
  try {
    const result = await UsersApi.uploadAvatar(file)
    me.value.avatar_url = result.avatar_url
    alert('头像上传成功！')
  } catch (e) {
    errorMessage.value = e?.message || '头像上传失败'
  } finally {
    isUploading.value = false
    // 清空文件输入
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

async function deleteAvatar() {
  if (!confirm('确定要删除头像吗？')) return
  
  try {
    await UsersApi.deleteAvatar()
    me.value.avatar_url = null
    alert('头像删除成功！')
  } catch (e) {
    errorMessage.value = e?.message || '头像删除失败'
  }
}

function selectAvatar() {
  fileInput.value?.click()
}

onMounted(load)
</script>

<template>
  <section class="container">
    <div class="page-header">
      <h2 style="margin:0">我的主页</h2>
    </div>
    <p v-if="isLoading" class="muted">加载中...</p>
    <p v-if="errorMessage" style="color:var(--danger)">{{ errorMessage }}</p>
    <div v-if="me" class="card" style="padding:16px;margin-bottom:12px">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
        <div class="avatar-large">
          <img v-if="me.avatar_url" :src="`http://localhost:3000${me.avatar_url}`" :alt="me.username || me.email" />
          <div v-else class="avatar-placeholder-large">
            {{ (me.username || me.email || 'U').charAt(0).toUpperCase() }}
          </div>
        </div>
        <div style="flex:1">
          <div><strong>{{ me.username || me.email }}</strong></div>
          <div class="muted">注册于 {{ new Date(me.created_at).toLocaleDateString() }}</div>
          <div class="muted">梦境总数 {{ me.total_dreams }} · 公开 {{ me.public_dreams }}</div>
        </div>
      </div>
      
      <div style="display:flex;gap:8px;align-items:center">
        <button class="button" @click="selectAvatar" :disabled="isUploading">
          {{ isUploading ? '上传中...' : '更换头像' }}
        </button>
        <button v-if="me.avatar_url" class="button danger" @click="deleteAvatar" :disabled="isUploading">
          删除头像
        </button>
        <input 
          ref="fileInput"
          type="file" 
          accept="image/*" 
          @change="handleAvatarUpload"
          style="display:none"
        />
      </div>
    </div>
    <h3>我的公开梦境</h3>
    <ul v-if="dreams.length" class="list">
      <li v-for="d in dreams" :key="d.id" class="card list-item">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:8px;min-width:0">
              <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ d.title || 'Untitled dream' }}</strong>
              <small class="muted">{{ new Date(d.date || d.created_at).toLocaleDateString() }}</small>
            </div>
            <div class="muted">赞 {{ d.likes }} · 评论 {{ d.comments }}</div>
          </div>
        </div>
      </li>
    </ul>
    <p v-else class="muted">暂无公开梦境</p>
  </section>
</template>

<style scoped>
.avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid var(--border);
}

.avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--primary);
  color: #0b1020;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 32px;
  flex-shrink: 0;
  border: 2px solid var(--border);
}
</style>


