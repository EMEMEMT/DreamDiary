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
    errorMessage.value = err?.message || 'Failed to load dream'
  } finally {
    isLoading.value = false
  }
}

async function removeDream() {
  if (!confirm('Delete this dream?')) return
  try {
    await DreamApi.deleteDream(id)
    router.push({ name: 'dreams' })
  } catch (err) {
    alert(err?.message || 'Delete failed')
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

onMounted(load)
</script>

<template>
  <section class="container">
    <p v-if="isLoading" class="muted">Loading...</p>
    <p v-if="errorMessage" style="color:var(--danger)">{{ errorMessage }}</p>
    <article v-if="dream" class="card" style="padding:16px">
      <header style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <div>
          <h2 style="margin:0">{{ dream.title || 'Untitled dream' }}</h2>
          <small class="muted">{{ new Date(dream.date || dream.createdAt).toLocaleString() }}</small>
        </div>
        <div style="display:flex;gap:8px">
          <button class="button" @click="editDream">Edit</button>
          <button class="button danger" @click="removeDream">Delete</button>
        </div>
      </header>
      <p v-if="dream.tags?.length" class="muted">Tags: {{ dream.tags.join(', ') }}</p>
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
            <div style="display:flex;justify-content:space-between;gap:8px">
              <span class="muted">{{ c.author_username || c.author_email }} · {{ new Date(c.created_at).toLocaleString() }}</span>
            </div>
            <div style="margin-top:6px">{{ c.content }}</div>
          </li>
        </ul>
      </section>
    </article>
  </section>
  
</template>

<style scoped>
</style>


