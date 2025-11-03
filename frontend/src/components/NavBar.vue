<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { isAuthenticated, currentUser } from '../stores/auth'
import { AuthApi } from '../services/api'

const theme = ref(localStorage.getItem('theme') || 'dark')
function applyTheme(v) {
  document.documentElement.setAttribute('data-theme', v)
}
function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  localStorage.setItem('theme', theme.value)
  applyTheme(theme.value)
}
onMounted(() => { applyTheme(theme.value) })
</script>

<template>
  <header class="navbar">
    <nav class="container navbar-content">
      <div class="nav-left">
        <RouterLink :to="{ name: 'dreams' }" class="logo">
          <span class="logo-icon">🌙</span>
          <span class="logo-text">Dream Diary</span>
        </RouterLink>
        <div class="nav-links">
          <RouterLink :to="{ name: 'public-feed' }" class="nav-link">广场</RouterLink>
          <RouterLink :to="{ name: 'tags' }" class="nav-link">标签</RouterLink>
          <RouterLink v-if="isAuthenticated" :to="{ name: 'dreams' }" class="nav-link">我的梦境</RouterLink>
          <RouterLink v-if="isAuthenticated" :to="{ name: 'dream-new' }" class="nav-link nav-link-primary">新建</RouterLink>
        </div>
      </div>
      <div class="nav-right">
        <template v-if="isAuthenticated">
          <RouterLink :to="{ name: 'profile' }" class="user-profile" v-if="currentUser?.username || currentUser?.email">
            <span class="user-avatar">{{ (currentUser?.username || currentUser?.email).charAt(0).toUpperCase() }}</span>
            <span class="user-name">{{ currentUser?.username || currentUser?.email }}</span>
          </RouterLink>
          <button class="button button-logout" @click="AuthApi.logout(); location.href = '/#/login'">退出</button>
        </template>
        <template v-else>
          <RouterLink :to="{ name: 'login' }" class="nav-link">登录</RouterLink>
          <RouterLink :to="{ name: 'register' }" class="nav-link nav-link-primary">注册</RouterLink>
        </template>
        <label class="switch" title="切换主题" style="margin-left:8px">
          <input type="checkbox" :checked="theme==='light'" @change="toggleTheme" />
          <span class="slider">
            <span class="icon">{{ theme === 'light' ? '☀️' : '🌙' }}</span>
          </span>
        </label>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(135deg, rgba(18, 20, 26, 0.95), rgba(15, 20, 25, 0.95));
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--text);
  font-weight: 700;
  font-size: 1.1em;
  transition: all 0.2s ease;
}

.logo:hover {
  transform: scale(1.05);
}

.logo-icon {
  font-size: 1.4em;
  filter: drop-shadow(0 0 8px rgba(138, 180, 248, 0.5));
}

.logo-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-link {
  color: var(--muted);
  text-decoration: none;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
  position: relative;
}

.nav-link:hover {
  color: var(--text);
  background: rgba(138, 180, 248, 0.1);
}

.nav-link.router-link-active {
  color: var(--primary);
  background: rgba(138, 180, 248, 0.15);
}

.nav-link-primary {
  background: var(--gradient-primary) !important;
  color: #0a0e1a !important;
  font-weight: 600;
}

.nav-link-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(138, 180, 248, 0.4);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 20px;
  background: var(--elev);
  border: 1px solid var(--border);
  transition: all 0.2s ease;
}

.user-profile:hover {
  color: var(--text);
  border-color: var(--primary);
  background: var(--panel);
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--gradient-primary);
  color: #0a0e1a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
  font-weight: 600;
}

.user-name {
  font-size: 0.9em;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.button-logout {
  font-size: 0.85em;
  padding: 8px 12px;
}

/* 主题切换滑块 */
.switch { position: relative; display:inline-block; width:56px; height:30px }
.switch input { display:none }
.slider {
  position:absolute; inset:0; cursor:pointer; border-radius:999px; border:1px solid var(--border);
  background: linear-gradient(145deg, var(--elev), var(--panel));
  transition: background .2s ease, border-color .2s ease;
  display:flex; align-items:center; padding:2px;
}
.slider .icon {
  width: 26px; height: 26px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  background: var(--gradient-primary); color: #0a0e1a; box-shadow: 0 2px 6px rgba(0,0,0,.25);
  transform: translateX(0); transition: transform .2s ease;
}
.switch input:checked + .slider .icon { transform: translateX(26px) }

/* 亮色主题下的导航栏背景与阴影适配 */
:global([data-theme='light']) .navbar {
  background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(245,247,251,0.9));
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
</style>


