// src/api/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true, // <-- ВАЖНО: Разрешаем отправку cookies
});

// Interceptor ответа (для обработки протухшего токена)
apiClient.interceptors.response.use(
  (response) => response, // Успех: просто возвращаем
  (error) => {
    // Если ошибка 401 (токен протух), разлогиниваем пользователя
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user'); // Очищаем UI
      // Жесткий редирект на логин, чтобы очистить состояние
      if (window.location.pathname !== '/login') {
         window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  // Твои существующие методы (без префикса /auth, так как в твоем коде роуты без него)
  login: (data: any) => apiClient.post('/login', data),
  register: (data: any) => apiClient.post('/register', data),
  logout: () => apiClient.post('/logout'),
  
  // Новый метод для Google (отправляем access token)
  googleLogin: (token: string) => apiClient.post('/google', { token }),
};

// ... (Остальные API методы: newsAPI, categoriesAPI и т.д. оставляем как есть)
export const newsAPI = {
  getAll: (params?: any) => apiClient.get('/news', { params }),
  getById: (id: number) => apiClient.get(`/news/${id}`),
  create: (data: FormData) => apiClient.post('/news', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id: number, data: FormData) => apiClient.put(`/news/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id: number) => apiClient.delete(`/news/${id}`),
  vote: (id: number, type: 'like' | 'dislike') => apiClient.post(`/news/${id}/vote`, { type }),
  addComment: (newsId: number, content: string) => apiClient.post(`/news/${newsId}/comments`, { content }),
  getComments: (newsId: number) => apiClient.get(`/news/${newsId}/comments`),
  deleteComment: (commentId: number) => apiClient.delete(`/comments/${commentId}`),
  likeComment: (commentId: number) => apiClient.post(`/comments/${commentId}/like`),
};

export const categoriesAPI = {
  getAll: () => apiClient.get('/categories'),
  create: (name: string) => apiClient.post('/categories', { name }),
  delete: (id: number) => apiClient.delete(`/categories/${id}`),
};

export const usersAPI = {
    getAll: () => apiClient.get('/users'),
    updateRole: (id: number, role: string) => apiClient.put(`/users/${id}/role`, { role }),
    delete: (id: number) => apiClient.delete(`/users/${id}`),
};

export const adsAPI = {
    getAll: () => apiClient.get('/ads'),
    create: (data: any) => apiClient.post('/ads', data),
    delete: (id: number) => apiClient.delete(`/ads/${id}`),
    incrementViews: (id: number) => apiClient.post(`/ads/${id}/view`),
    incrementClicks: (id: number) => apiClient.post(`/ads/${id}/click`),
};

export default apiClient;