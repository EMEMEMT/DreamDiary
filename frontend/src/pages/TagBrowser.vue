<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { TagsApi } from '../services/api'

const router = useRouter()
const isLoading = ref(false)
const errorMessage = ref('')
const tags = ref([])

async function loadTags() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    tags.value = await TagsApi.listTags()
  } catch (err) {
    errorMessage.value = err?.message || '加载标签失败'
  } finally {
    isLoading.value = false
  }
}

function viewTagDreams(tagName) {
  router.push({ name: 'dreams', query: { tag: tagName } })
}

function viewPublicTagDreams(tagName) {
  router.push({ name: 'public-feed', query: { tag: tagName } })
}

onMounted(loadTags)
</script>

<template>
  <section class="container">
    <div class="page-header">
      <h2 style="margin:0">🏷️ 标签浏览</h2>
    </div>
    
    <p class="muted">点击标签查看相关梦境</p>
    
    <p v-if="isLoading" class="muted">加载中...</p>
    <p v-if="errorMessage" style="color:var(--danger)">{{ errorMessage }}</p>
    
    <div v-if="!isLoading && tags.length" class="tags-grid">
      <div v-for="tag in tags" :key="tag.id" class="tag-card card">
        <div class="tag-header">
          <h3 class="tag-name">{{ tag.name }}</h3>
          <span class="tag-count">{{ tag.usage }} 个梦境</span>
        </div>
        <div class="tag-actions">
          <button class="button" @click="viewTagDreams(tag.name)">
            我的梦境
          </button>
          <button class="button" @click="viewPublicTagDreams(tag.name)">
            公开梦境
          </button>
        </div>
      </div>
    </div>
    
    <p v-else-if="!isLoading" class="muted">还没有任何标签</p>
  </section>
</template>

<style scoped>
.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.tag-card {
  padding: 20px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tag-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.4);
}

.tag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.tag-name {
  margin: 0;
  font-size: 1.2em;
  color: var(--primary);
}

.tag-count {
  background: var(--elev);
  color: var(--muted);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.85em;
}

.tag-actions {
  display: flex;
  gap: 8px;
}

.tag-actions .button {
  flex: 1;
  font-size: 0.9em;
}
</style>
