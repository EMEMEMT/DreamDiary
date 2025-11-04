<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DreamApi, ReactionsApi, CommentsApi, PublicApi, AiApi } from '../services/api'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3020'

const isLoading = ref(false)
const errorMessage = ref('')
const dream = ref(null)
const likes = ref(0)
const liked = ref(false)
const comments = ref([])
const commentText = ref('')
const aiLoading = ref(false)
const aiText = ref('')
const aiError = ref('')
const aiVisible = ref(true)

async function load() {
  isLoading.value = true
  try {
    try {
      dream.value = await DreamApi.getDream(id)
    } catch (e) {
      // 若访问他人公开梦境，授权接口会 404，回退到公共详情
      dream.value = await PublicApi.getPublicDream(id)
    }
    const likeData = await ReactionsApi.getLikes(id)
    likes.value = likeData?.likes || 0
    // 查询当前用户是否已点赞（需登录）
    try {
      const likedRes = await ReactionsApi.isLiked(id)
      liked.value = !!likedRes?.liked
    } catch (_) {
      // 未登录或公开查看时忽略
      liked.value = false
    }
    comments.value = await CommentsApi.listByDream(id)
  } catch (err) {
    errorMessage.value = err?.message || '加载失败'
  } finally {
    isLoading.value = false
  }
}

async function removeDream() {
  if (!confirm('确定要删除这条梦境吗？')) return
  try {
    await DreamApi.deleteDream(id)
    router.push({ name: 'dreams' })
  } catch (err) {
    alert(err?.message || '删除失败')
  }
}

function editDream() {
  router.push({ name: 'dream-edit', params: { id } })
}

async function toggleLike() {
  try {
    const res = await ReactionsApi.toggleLike(id)
    if (res?.liked) {
      likes.value += 1
      liked.value = true
    } else {
      likes.value = Math.max(0, likes.value - 1)
      liked.value = false
    }
  } catch (e) { /* ignore */ }
}

async function addComment() {
  if (!commentText.value.trim()) return
  try {
    await CommentsApi.add(id, commentText.value.trim())
    commentText.value = ''
    comments.value = await CommentsApi.listByDream(id)
  } catch (e) { /* ignore */ }
}

function viewTagDreams(tagName) {
  router.push({ name: 'dreams', query: { tag: tagName } })
}

async function interpretByAI() {
  if (!dream.value?.content) return
  aiLoading.value = true
  aiError.value = ''
  aiText.value = ''
  try {
    // 使用流式接口，边下边显
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3020'
    const token = localStorage.getItem('token')
    const resp = await fetch(`${API_BASE}/ai/interpret/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ content: dream.value.content, tags: dream.value.tags || [] })
    })
    if (!resp.ok || !resp.body) {
      const text = await resp.text().catch(() => '')
      throw new Error(text || `HTTP ${resp.status}`)
    }
    const reader = resp.body.getReader()
    const decoder = new TextDecoder('utf-8')
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      aiText.value += decoder.decode(value, { stream: true })
    }
  } catch (e) {
    aiError.value = e?.message || 'AI 解读失败'
  } finally {
    aiLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="container">
    <p v-if="isLoading" class="muted">加载中...</p>
    <p v-if="errorMessage" style="color:var(--danger)">{{ errorMessage }}</p>
    <article v-if="dream" class="card" style="padding:16px">
      <header style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <div v-if="dream.author_avatar" class="avatar">
            <img :src="`${API_BASE}${dream.author_avatar}`" :alt="dream.author_username || dream.author_email" />
          </div>
          <div v-else class="avatar-placeholder">
            {{ (dream.author_username || dream.author_email || 'U').charAt(0).toUpperCase() }}
          </div>
          <div>
            <h2 style="margin:0">{{ dream.title || '未命名梦境' }}</h2>
            <small class="muted">
              {{ dream.author_username || dream.author_email }} · {{ new Date(dream.date || dream.createdAt).toLocaleString() }}
            </small>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge" title="点赞数" style="display:flex;align-items:center;gap:6px">
            ❤️ <strong style="font-size:0.95em">{{ likes }}</strong>
          </span>
          <button class="button" @click="editDream">编辑</button>
          <button class="button danger" @click="removeDream">删除</button>
        </div>
      </header>
      <div v-if="dream.tags?.length" class="dream-tags-section">
        <span class="muted">标签：</span>
        <span 
          v-for="tag in dream.tags" 
          :key="tag"
          class="dream-tag"
          @click="viewTagDreams(tag)"
        >
          {{ tag }}
        </span>
      </div>
      <p class="muted">可见性：{{ dream.is_public ? '公开' : '私密' }}</p>
      <pre class="dream-content">{{ dream.content }}</pre>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="icon-button" :class="{ liked }" @click="toggleLike" :title="liked ? '已点赞' : '点赞'">
          <span>{{ liked ? '❤️' : '🤍' }}</span>
        </button>
        <button class="button" @click="interpretByAI" :disabled="aiLoading">
          {{ aiLoading ? 'AI 正在解读...' : 'AI 解梦' }}
        </button>
        <button class="button" v-if="aiText || aiError" @click="aiVisible = !aiVisible">
          {{ aiVisible ? '收起解读' : '显示解读' }}
        </button>
      </div>
      <section v-show="(aiText || aiError || aiLoading) && aiVisible" class="card" style="margin-top:12px;padding:12px">
        <h3 style="margin:8px 0">AI 解梦</h3>
        <p v-if="aiLoading" class="muted">正在生成解读，请稍候...</p>
        <p v-if="aiError" style="color:var(--danger)">{{ aiError }}</p>
        <div v-if="aiText" style="white-space:pre-wrap;line-height:1.8">{{ aiText }}</div>
      </section>
      <section style="margin-top:16px">
        <h3 style="margin:8px 0">评论</h3>
        <div style="display:flex;gap:8px;margin:8px 0">
          <input class="input" v-model="commentText" placeholder="写下你的评论..." />
          <button class="button" @click="addComment">发表</button>
        </div>
        <ul class="list">
          <li v-for="c in comments" :key="c.id" class="card list-item">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <div v-if="c.author_avatar" class="avatar small">
                <img :src="`${API_BASE}${c.author_avatar}`" :alt="c.author_username || c.author_email" />
              </div>
              <div v-else class="avatar-placeholder small">
                {{ (c.author_username || c.author_email || 'U').charAt(0).toUpperCase() }}
              </div>
              <div style="flex:1">
                <div style="display:flex;justify-content:space-between;gap:8px">
                  <span class="muted">{{ c.author_username || c.author_email }} · {{ new Date(c.created_at).toLocaleString() }}</span>
                </div>
                <div style="margin-top:6px">{{ c.content }}</div>
              </div>
            </div>
          </li>
        </ul>
      </section>
    </article>
  </section>
  
</template>

<style scoped>
.dream-content {
  white-space: pre-wrap;
  line-height: 1.95;
  background: transparent;
  border: none;
  margin: 0;
  padding: 0;
  font-size: 1.05em;
  letter-spacing: 0.2px;
}

.icon-button {
  width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--border);
  background: linear-gradient(145deg, var(--elev), var(--panel)); color: #e25555;
  display:flex; align-items:center; justify-content:center; cursor:pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  transition: all .2s ease;
}
.icon-button:hover { transform: translateY(-1px); box-shadow: 0 4px 10px rgba(0,0,0,0.28); border-color: var(--primary) }
.icon-button span { font-size: 18px; line-height: 1 }
.icon-button.liked { color: #ef4444; border-color: rgba(239,68,68,0.5); box-shadow: 0 2px 8px rgba(239,68,68,0.25) }

.dream-tags-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  flex-wrap: wrap;
}

.dream-tag {
  background: var(--elev);
  color: var(--muted);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--border);
}

.dream-tag:hover {
  background: var(--primary);
  color: #0b1020;
  border-color: var(--primary);
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar.small {
  width: 32px;
  height: 32px;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary);
  color: #0b1020;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
  flex-shrink: 0;
}

.avatar-placeholder.small {
  width: 32px;
  height: 32px;
  font-size: 14px;
}

/* 确保按钮文字水平排列 */
.button { white-space: nowrap }
</style>


