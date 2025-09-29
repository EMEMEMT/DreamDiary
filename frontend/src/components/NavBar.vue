<script setup>
import { RouterLink } from 'vue-router'
import { isAuthenticated, currentUser } from '../stores/auth'
import { AuthApi } from '../services/api'
</script>

<template>
  <header style="position:sticky;top:0;z-index:10;background:linear-gradient(180deg, #121418, #0e1013);border-bottom:1px solid var(--border);backdrop-filter: blur(6px)">
    <nav class="container" style="display:flex;gap:16px;align-items:center;justify-content:space-between;padding:12px 0">
      <div style="display:flex;gap:12px;align-items:center">
        <RouterLink :to="{ name: 'dreams' }" style="text-decoration:none;color:var(--text)"><strong>🌙 Dream Diary</strong></RouterLink>
        <RouterLink :to="{ name: 'public-feed' }">广场</RouterLink>
        <RouterLink v-if="isAuthenticated" :to="{ name: 'dreams' }">我的梦境</RouterLink>
        <RouterLink v-if="isAuthenticated" :to="{ name: 'dream-new' }">New</RouterLink>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <template v-if="isAuthenticated">
          <RouterLink :to="{ name: 'profile' }" class="muted" v-if="currentUser?.email">{{ currentUser.email }}</RouterLink>
          <button class="button" @click="AuthApi.logout(); location.href = '/#/login'">退出</button>
        </template>
        <template v-else>
          <RouterLink :to="{ name: 'login' }">登录</RouterLink>
          <RouterLink :to="{ name: 'register' }">注册</RouterLink>
        </template>
      </div>
    </nav>
  </header>
</template>

<style scoped>
a { color: var(--muted); text-decoration: none; }
a.router-link-active { color: var(--primary); font-weight: 600; }
</style>


