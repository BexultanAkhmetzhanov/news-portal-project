// src/components/AdminPostEdit.tsx
import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';

// Эти интерфейсы нам понадобятся
interface Article {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  category_id: number | null;
  is_featured: number;
}
interface Category {
  id: number;
  name: string;
  slug: string;
}

function AdminPostEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Стейты для формы
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  // Стейты для загрузки
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- ВОТ ЭТИ СТРОКИ, СКОРЕЕ ВСЕГО, ОТСУТСТВУЮТ ---
  const [success, setSuccess] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  // ---

  // 1. Загружаем данные поста и категории
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const [articleRes, categoriesRes] = await Promise.all([
          apiClient.get<Article>(`/admin/news/${id}`),
          apiClient.get<Category[]>('/categories')
        ]);

        const article = articleRes.data;
        setTitle(article.title);
        setContent(article.content);
        setImageUrl(article.imageUrl || '');
        setCategoryId(article.category_id?.toString() || '');
        setIsFeatured(article.is_featured === 1);
        
        setCategories(categoriesRes.data);
      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить данные для редактирования.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // 2. Обработчик сохранения
  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null); // <-- Используется setSuccess

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('category_id', categoryId);
    formData.append('is_featured', isFeatured ? '1' : '0');
    
    formData.append('imageUrl', imageUrl); 
    
    if (newFile) { // <-- Используется newFile
      formData.append('imageFile', newFile);
    }
    
    try {
      await apiClient.put(`/admin/news/${id}`, formData);
      
      setSuccess('Новость успешно обновлена!'); // <-- Используется setSuccess
      setNewFile(null); // <-- Используется setNewFile
      // (Можно добавить navigate('/admin') через 2 сек)

    } catch (err) {
      console.error(err);
      setError('Ошибка при сохранении новости.');
    }
  };

  if (loading) return <p>Загрузка редактора...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (success) return <p style={{ color: 'green' }}>{success}</p>; // Показываем успех

  return (
    <div style={{ maxWidth: '700px', margin: '20px auto' }}>
      <button onClick={() => navigate('/admin')}>&larr; Назад в Админ-панель</button>
      <h2>Редактирование новости (ID: {id})</h2>
      
      {imageUrl && !newFile && ( // <-- Используется newFile
        <div>
          <p>Текущая картинка:</p>
          {/* Добавляем http://localhost:3001, если это локальный файл */}
          <img 
            src={imageUrl.startsWith('/uploads/') ? `http://localhost:3001${imageUrl}` : imageUrl} 
            alt="Preview" 
            style={{ maxWidth: '200px', height: 'auto', marginBottom: '10px' }} 
          />
          <button type="button" onClick={() => setImageUrl('null')}>Удалить картинку</button>
        </div>
      )}
      {newFile && ( // <-- Используется newFile
        <p>Новый файл: {newFile.name}</p>
      )}
      
      <form onSubmit={handleSave} style={{ display: 'grid', gap: '10px' }}>
        <input
          type="text"
          placeholder="Заголовок"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select 
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">-- Выберите категорию --</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <textarea
          rows={15}
          placeholder="Содержание"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <input
          type="text"
          placeholder="URL Картинки (если нет файла)"
          value={imageUrl === 'null' ? '' : imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        
        <label>ИЛИ Загрузить новый файл (заменит текущий):</label>
        <input 
          type="file"
          accept="image/*"
          onChange={(e) => setNewFile(e.target.files?.[0] || null)} // <-- Используется setNewFile
        />
        <div>
          <input 
            type="checkbox" 
            id="isFeaturedCheck"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
          />
          <label htmlFor="isFeaturedCheck" style={{ marginLeft: '5px' }}>
            Сделать главной новостью
          </label>
        </div>
        <button type="submit" style={{ backgroundColor: 'var(--accent-color)', color: 'white' }}>
          Сохранить изменения
        </button>
      </form>
    </div>
  );
}

export default AdminPostEdit;