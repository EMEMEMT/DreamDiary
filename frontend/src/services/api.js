const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
import { getToken, setAuth, clearAuth } from '../stores/auth';

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken?.();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  return response.text();
}

export const DreamApi = {
  listDreams(params = {}) {
    const q = new URLSearchParams(params).toString();
    const search = q ? `?${q}` : '';
    return request(`/dreams${search}`);
  },
  getDream(id) {
    return request(`/dreams/${id}`);
  },
  createDream(payload) {
    return request('/dreams', { method: 'POST', body: JSON.stringify(payload) });
  },
  updateDream(id, payload) {
    return request(`/dreams/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  },
  deleteDream(id) {
    return request(`/dreams/${id}`, { method: 'DELETE' });
  }
};

export const AuthApi = {
  async login(payload) {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
    setAuth?.(data.token, data.user);
    return data;
  },
  async register(payload) {
    const data = await request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
    setAuth?.(data.token, data.user);
    return data;
  },
  logout() { clearAuth?.(); }
};

export const PublicApi = {
  listPublicDreams() {
    return request('/public/dreams');
  },
  getPublicDream(id) {
    return request(`/public/dreams/${id}`);
  }
};

export const ReactionsApi = {
  toggleLike(dreamId) {
    return request(`/reactions/like/${dreamId}`, { method: 'POST' });
  },
  getLikes(dreamId) {
    return request(`/reactions/count/${dreamId}`);
  }
};

export const CommentsApi = {
  listByDream(dreamId) {
    return request(`/comments/dream/${dreamId}`);
  },
  add(dreamId, content) {
    return request('/comments', { method: 'POST', body: JSON.stringify({ dream_id: dreamId, content }) });
  },
  remove(id) {
    return request(`/comments/${id}`, { method: 'DELETE' });
  }
};

export const UsersApi = {
  me() { return request('/users/me'); },
  publicDreams(userId) { return request(`/users/${userId}/public-dreams`); }
};

export default DreamApi;


