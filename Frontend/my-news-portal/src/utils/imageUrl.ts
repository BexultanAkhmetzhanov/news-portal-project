// Frontend/my-news-portal/src/utils/imageUrl.ts

// Адрес вашего бэкенда
export const BASE_URL = 'http://localhost:3001';

export const getImageUrl = (path: string | null | undefined) => {
  if (!path) return undefined;
  
  // Если это уже полная ссылка (например, с другого сайта), возвращаем как есть
  if (path.startsWith('http')) {
    return path;
  }
  
  // Если это относительный путь, добавляем адрес сервера
  return `${BASE_URL}${path}`;
};