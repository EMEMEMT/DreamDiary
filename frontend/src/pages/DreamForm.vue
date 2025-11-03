<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DreamApi, TagsApi } from '../services/api'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id)

const isEditing = computed(() => Boolean(id.value))
const isLoading = ref(false)
const errorMessage = ref('')

const title = ref('')
const date = ref(new Date().toISOString().slice(0, 10))
const content = ref('')
const tags = ref('')
const isPublic = ref(false)
const availableTags = ref([])
const showTagSuggestions = ref(false)

async function load() {
  if (!isEditing.value) return
  isLoading.value = true
  try {
    const d = await DreamApi.getDream(id.value)
    title.value = d.title || ''
    date.value = (d.date || '').slice(0, 10) || date.value
    content.value = d.content || ''
    tags.value = Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || '')
    isPublic.value = Boolean(d.is_public)
  } catch (err) {
    errorMessage.value = err?.message || '加载失败'
  } finally {
    isLoading.value = false
  }
}

async function loadTags() {
  try {
    availableTags.value = await TagsApi.listTags()
  } catch (err) {
    console.error('加载标签失败:', err)
  }
}

function addTag(tagName) {
  const currentTags = tags.value.split(',').map(s => s.trim()).filter(Boolean)
  if (!currentTags.includes(tagName)) {
    currentTags.push(tagName)
    tags.value = currentTags.join(', ')
  }
  showTagSuggestions.value = false
}

async function save() {
  isLoading.value = true
  errorMessage.value = ''
  const payload = {
    title: title.value.trim(),
    date: date.value,
    content: content.value,
    tags: tags.value.split(',').map(s => s.trim()).filter(Boolean),
    is_public: isPublic.value
  }
  try {
    if (isEditing.value) {
      await DreamApi.updateDream(id.value, payload)
    } else {
      await DreamApi.createDream(payload)
    }
    router.push({ name: 'dreams' })
  } catch (err) {
    errorMessage.value = err?.message || '保存失败'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  load()
  loadTags()
})
</script>

<template>
  <section class="container">
    <div class="page-header">
      <h2 style="margin:0">{{ isEditing ? '编辑梦境' : '新建梦境' }}</h2>
    </div>
    <p v-if="errorMessage" style="color:var(--danger)">{{ errorMessage }}</p>
    <form @submit.prevent="save" style="display:grid;gap:14px;max-width:720px">
      <label>
        <span class="muted">标题</span>
        <input class="input" v-model="title" type="text" placeholder="写一个简短的标题" />
      </label>
      <label>
        <span class="muted">日期</span>
        <input class="input" v-model="date" type="date" />
      </label>
      <label>
        <span class="muted">标签（用逗号分隔）</span>
        <div class="tag-input-container">
          <input 
            class="input" 
            v-model="tags" 
            type="text" 
            placeholder="清醒梦, 飞行" 
            @focus="showTagSuggestions = true"
          />
          <button 
            type="button" 
            class="button" 
            @click="showTagSuggestions = !showTagSuggestions"
            style="margin-left: 8px;"
          >
            {{ showTagSuggestions ? '隐藏' : '显示' }}建议
          </button>
        </div>
        <div v-if="showTagSuggestions && availableTags.length" class="tag-suggestions">
          <span class="muted" style="font-size: 0.85em;">点击添加常用标签：</span>
          <div class="suggestion-tags">
            <button 
              v-for="tag in availableTags.slice(0, 10)" 
              :key="tag.id"
              type="button"
              class="suggestion-tag"
              @click="addTag(tag.name)"
            >
              {{ tag.name }} ({{ tag.usage }})
            </button>
          </div>
        </div>
      </label>
      <label>
        <span class="muted">内容</span>
        <textarea class="textarea" v-model="content" rows="10" placeholder="描述一下你的梦境..."></textarea>
      </label>
      <label style="display:flex;gap:8px;align-items:center">
        <input type="checkbox" v-model="isPublic" />
        <span>公开（允许他人查看）</span>
      </label>
      <div style="display:flex;gap:10px">
        <button class="button primary" type="submit" :disabled="isLoading">{{ isLoading ? '保存中...' : '保存' }}</button>
        <button class="button" type="button" @click="router.back()">取消</button>
      </div>
    </form>
  </section>
  
</template>

<style scoped>
label { display: grid; gap: 6px; }

.tag-input-container {
  display: flex;
  align-items: center;
}

.tag-input-container .input {
  flex: 1 1 auto;
  min-width: 0;
}

.tag-input-container .button {
  flex-shrink: 0;
  white-space: nowrap;
}

.tag-suggestions {
  margin-top: 8px;
  padding: 12px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.suggestion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.suggestion-tag {
  appearance: none;
  border: 1px solid var(--border);
  background: var(--elev);
  color: var(--muted);
  padding: 4px 8px;
  border-radius: 16px;
  cursor: pointer;
  font-size: 0.85em;
  transition: all 0.2s ease;
}

.suggestion-tag:hover {
  background: var(--primary);
  color: #0b1020;
  border-color: var(--primary);
}
</style>


