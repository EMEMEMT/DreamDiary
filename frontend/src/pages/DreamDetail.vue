<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DreamApi, ReactionsApi, CommentsApi, PublicApi } from '../services/api'

const route = useRoute()
const router = useRouter()
const id = route.params.id

const isLoading = ref(false)
const errorMessage = ref('')
const dream = ref(null)
const likes = ref(0)
const comments = ref([])
const commentText = ref('')

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
    likes.value += res?.liked ? 1 : -1
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
            <img :src="`http://localhost:3000${dream.author_avatar}`" :alt="dream.author_username || dream.author_email" />
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
        <div style="display:flex;gap:8px">
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
      <p class="muted">可见性：{{ dream.is_public ? '公开' : '私密' }} · 赞 {{ likes }}</p>
      <pre style="white-space:pre-wrap;line-height:1.8;background:transparent;border:none;margin:0;padding:0">{{ dream.content }}</pre>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="button" @click="toggleLike">点赞</button>
      </div>
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
                <img :src="`http://localhost:3000${c.author_avatar}`" :alt="c.author_username || c.author_email" />
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
</style>


