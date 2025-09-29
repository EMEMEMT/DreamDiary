import { createRouter, createWebHistory } from 'vue-router'
import DreamList from '../pages/DreamList.vue'
import DreamForm from '../pages/DreamForm.vue'
import DreamDetail from '../pages/DreamDetail.vue'
import Login from '../pages/Login.vue'
import Register from '../pages/Register.vue'
import { isAuthenticated } from '../stores/auth'
import PublicFeed from '../pages/PublicFeed.vue'
import Profile from '../pages/Profile.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: { name: 'dreams' } },
    { path: '/login', name: 'login', component: Login, meta: { public: true } },
    { path: '/register', name: 'register', component: Register, meta: { public: true } },
    { path: '/public', name: 'public-feed', component: PublicFeed, meta: { public: true } },
    { path: '/me', name: 'profile', component: Profile },
    { path: '/dreams', name: 'dreams', component: DreamList },
    { path: '/dreams/new', name: 'dream-new', component: DreamForm },
    { path: '/dreams/:id', name: 'dream-detail', component: DreamDetail },
    { path: '/dreams/:id/edit', name: 'dream-edit', component: DreamForm }
  ],
})

router.beforeEach((to) => {
  if (to.meta?.public) return true
  if (isAuthenticated.value) return true
  return { name: 'login', query: { redirect: to.fullPath } }
})

export default router
