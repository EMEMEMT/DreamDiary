<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { DreamApi } from '../services/api'

const router = useRouter()
const isLoading = ref(false)
const errorMessage = ref('')
const dreams = ref([])

async function loadDreams() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    dreams.value = await DreamApi.listDreams()
  } catch (err) {
    errorMessage.value = err?.message || '加载梦境失败'
  } finally {
    isLoading.value = false
  }
}

function openNew() {
  router.push({ name: 'dream-new' })
}

function openDetail(dream) {
  router.push({ name: 'dream-detail', params: { id: dream.id } })
}

onMounted(loadDreams)
</script>

<template>
  <section class="container">
    <div class="page-header">
      <h2 style="margin:0">我的梦境</h2>
      <button class="button primary" @click="openNew">新建梦境</button>
    </div>

    <p v-if="isLoading" class="muted">加载中...</p>
    <p v-if="errorMessage" style="color:var(--danger)">{{ errorMessage }}</p>

    <ul v-if="!isLoading && dreams.length" class="list">
      <li v-for="d in dreams" :key="d.id" class="card list-item" @click="openDetail(d)">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:8px;min-width:0">
              <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ d.title || '未命名梦境' }}</strong>
              <small class="muted">{{ new Date(d.date || d.createdAt).toLocaleDateString() }}</small>
            </div>
            <div class="muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ d.summary || d.content }}</div>
          </div>
          <span class="muted" style="font-size:12px">查看 ›</span>
        </div>
      </li>
    </ul>

    <p v-else-if="!isLoading" class="muted">还没有梦境，去创建你的第一个吧！</p>
  </section>
  
</template>

<style scoped>
</style>


