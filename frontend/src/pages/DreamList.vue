<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { DreamApi, TagsApi } from '../services/api'

const router = useRouter()
const route = useRoute()
const isLoading = ref(false)
const errorMessage = ref('')
const dreams = ref([])
const tags = ref([])
const selectedTag = ref(route.query.tag || '')

async function loadDreams() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const params = selectedTag.value ? { tag: selectedTag.value } : {}
    dreams.value = await DreamApi.listDreams(params)
  } catch (err) {
    errorMessage.value = err?.message || '加载梦境失败'
  } finally {
    isLoading.value = false
  }
}

async function loadTags() {
  try {
    tags.value = await TagsApi.listTags()
  } catch (err) {
    console.error('加载标签失败:', err)
  }
}

function filterByTag(tagName) {
  selectedTag.value = tagName
  router.push({ name: 'dreams', query: tagName ? { tag: tagName } : {} })
}

function clearFilter() {
  selectedTag.value = ''
  router.push({ name: 'dreams' })
}

function openNew() {
  router.push({ name: 'dream-new' })
}

function openDetail(dream) {
  router.push({ name: 'dream-detail', params: { id: dream.id } })
}

function onTagClick(tagName) {
  filterByTag(tagName)
}

// 监听路由变化
watch(() => route.query.tag, (newTag) => {
  selectedTag.value = newTag || ''
  loadDreams()
})

onMounted(() => {
  loadDreams()
  loadTags()
})
</script>

<template>
  <section class="container">
    <div class="page-header">
      <h2 style="margin:0">我的梦境</h2>
      <button class="button primary" @click="openNew">新建梦境</button>
    </div>

    <!-- 标签筛选区域 -->
    <div class="filter-section" v-if="tags.length">
      <div class="filter-header">
        <span class="muted">按标签筛选：</span>
        <button v-if="selectedTag" class="button" @click="clearFilter" style="font-size: 0.85em;">
          清除筛选
        </button>
      </div>
      <div class="tags-filter">
        <button 
          v-for="tag in tags" 
          :key="tag.id"
          class="tag-button"
          :class="{ active: selectedTag === tag.name }"
          @click="filterByTag(tag.name)"
        >
          {{ tag.name }} ({{ tag.usage }})
        </button>
      </div>
    </div>

    <!-- 当前筛选状态 -->
    <div v-if="selectedTag" class="current-filter">
      <span class="muted">正在显示标签为 "</span>
      <span class="filter-tag">{{ selectedTag }}</span>
      <span class="muted">" 的梦境</span>
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
            <!-- 显示梦境的标签 -->
            <div v-if="d.tags && d.tags.length" class="dream-tags">
              <span 
                v-for="tag in d.tags" 
                :key="tag"
                class="dream-tag"
                @click.stop="onTagClick(tag)"
              >
                {{ tag }}
              </span>
            </div>
          </div>
          <span class="muted" style="font-size:12px">查看 ›</span>
        </div>
      </li>
    </ul>

    <p v-else-if="!isLoading && selectedTag" class="muted">
      没有找到标签为 "{{ selectedTag }}" 的梦境
    </p>
    <p v-else-if="!isLoading" class="muted">还没有梦境，去创建你的第一个吧！</p>
  </section>
  
</template>

<style scoped>
.filter-section {
  margin: 20px 0;
  padding: 16px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tags-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-button {
  appearance: none;
  border: 1px solid var(--border);
  background: var(--elev);
  color: var(--muted);
  padding: 6px 12px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s ease;
}

.tag-button:hover {
  border-color: var(--primary);
  color: var(--text);
}

.tag-button.active {
  background: var(--primary);
  color: #0b1020;
  border-color: var(--primary);
}

.current-filter {
  margin: 12px 0;
  padding: 8px 12px;
  background: rgba(110, 168, 254, 0.1);
  border: 1px solid rgba(110, 168, 254, 0.3);
  border-radius: 8px;
}

.filter-tag {
  color: var(--primary);
  font-weight: 600;
}

.dream-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.dream-tag {
  background: var(--elev);
  color: var(--muted);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dream-tag:hover {
  background: var(--primary);
  color: #0b1020;
}
</style>


