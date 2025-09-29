import { ref, computed } from 'vue'

const tokenRef = ref(localStorage.getItem('token') || '')
const userRef = ref(JSON.parse(localStorage.getItem('user') || 'null'))

export const isAuthenticated = computed(() => Boolean(tokenRef.value))
export const currentUser = computed(() => userRef.value)

export function setAuth(token, user) {
  tokenRef.value = token || ''
  userRef.value = user || null
  if (token) localStorage.setItem('token', token); else localStorage.removeItem('token')
  if (user) localStorage.setItem('user', JSON.stringify(user)); else localStorage.removeItem('user')
}

export function clearAuth() {
  setAuth('', null)
}

export function getToken() {
  return tokenRef.value
}


