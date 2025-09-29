<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { PublicApi } from '../services/api'

const router = useRouter()
const isLoading = ref(false)
const errorMessage = ref('')
const items = ref([])

async function load() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    items.value = await PublicApi.listPublicDreams()
  } catch (e) { errorMessage.value = e?.message || '加载失败' } finally { isLoading.value = false }
}

function openDetail(id) { router.push({ name: 'dream-detail', params: { id } }) }

onMounted(load)
</script>

<template>
  <section class="container">
    <div class="page-header">
      <h2 style="margin:0">公开梦境</h2>
    </div>
    <p v-if="isLoading" class="muted">加载中...</p>
    <p v-if="errorMessage" style="color:var(--danger)">{{ errorMessage }}</p>
    <ul v-if="!isLoading && items.length" class="list">
      <li v-for="d in items" :key="d.id" class="card list-item" @click="openDetail(d.id)">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div style="min-width:0">
            <div style="display:flex;align-items:center;gap:8px;min-width:0">
              <strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ d.title || 'Untitled dream' }}</strong>
              <small class="muted">{{ new Date(d.date || d.created_at).toLocaleDateString() }}</small>
            </div>
            <div class="muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">by {{ d.author_email }} · 赞 {{ d.likes }} · 评论 {{ d.comments }}</div>
          </div>
          <span class="muted" style="font-size:12px">查看 ›</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
</style>


