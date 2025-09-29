<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { AuthApi } from '../services/api'

const router = useRouter()
const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

async function submit() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await AuthApi.login({ email: email.value.trim(), password: password.value })
    router.replace({ name: 'dreams' })
  } catch (err) {
    errorMessage.value = err?.message || '登录失败'
  } finally { isLoading.value = false }
}
</script>

<template>
  <section class="container" style="max-width:560px">
    <div class="card" style="padding:20px">
      <h2 style="margin-top:0">登录</h2>
      <p v-if="errorMessage" style="color:var(--danger)">{{ errorMessage }}</p>
      <form @submit.prevent="submit" style="display:grid;gap:12px">
        <label>
          <span class="muted">邮箱</span>
          <input class="input" v-model="email" type="email" placeholder="you@example.com" />
        </label>
        <label>
          <span class="muted">密码</span>
          <input class="input" v-model="password" type="password" placeholder="••••••••" />
        </label>
        <button class="button primary" type="submit" :disabled="isLoading">{{ isLoading ? '登录中...' : '登录' }}</button>
        <p class="muted">没有账号？<router-link :to="{ name: 'register' }">去注册</router-link></p>
      </form>
    </div>
  </section>
</template>

<style scoped>
</style>


