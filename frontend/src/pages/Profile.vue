<script setup>
import { ref, onMounted } from 'vue'
import { UsersApi } from '../services/api'

const me = ref(null)
const dreams = ref([])
const isLoading = ref(false)
const errorMessage = ref('')

async function load() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const u = await UsersApi.me()
    me.value = u
    dreams.value = await UsersApi.publicDreams(u.id)
  } catch (e) { errorMessage.value = e?.message || '加载失败' } finally { isLoading.value = false }
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
      <div><strong>{{ me.username || me.email }}</strong></div>
      <div class="muted">注册于 {{ new Date(me.created_at).toLocaleDateString() }}</div>
      <div class="muted">梦境总数 {{ me.total_dreams }} · 公开 {{ me.public_dreams }}</div>
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
</style>


