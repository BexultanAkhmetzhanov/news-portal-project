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

export default apiClient;