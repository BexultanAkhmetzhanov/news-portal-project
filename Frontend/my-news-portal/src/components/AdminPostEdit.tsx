// src/components/AdminPostEdit.tsx
import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

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
  // const [content, setContent] = useState(''); // <-- УБРАЛИ старый content, используем newContent для редактора
  const [newContent, setNewContent] = useState(''); // <-- ✅ ПЕРЕНЕСЛИ СЮДА (теперь это content)
  
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  // Стейты для загрузки
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);

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
        setNewContent(article.content); // <-- Заполняем редактор
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
    setSuccess(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', newContent); // <-- Отправляем newContent из редактора
    formData.append('category_id', categoryId);
    formData.append('is_featured', isFeatured ? '1' : '0');

    // Если пользователь не менял картинку, imageUrl останется старым URL
    // Если менял через input URL, будет новый URL
    formData.append('imageUrl', imageUrl);

    if (newFile) {
      formData.append('imageFile', newFile);
    }

    try {
      await apiClient.put(`/admin/news/${id}`, formData);

      setSuccess('Новость успешно обновлена!');
      setNewFile(null);
      // setTimeout(() => navigate('/admin'), 1500); // Можно раскомментировать для авто-перехода

    } catch (err) {
      console.error(err);
      setError('Ошибка при сохранении новости.');
    }
  };

  // 3. Условный рендеринг идет ТОЛЬКО ПОСЛЕ всех хуков
  if (loading) return <p>Загрузка редактора...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (success) return <p style={{ color: 'green' }}>{success}</p>;

  return (
    <div style={{ maxWidth: '700px', margin: '20px auto' }}>
      <button onClick={() => navigate('/admin')}>&larr; Назад в Админ-панель</button>
      <h2>Редактирование новости (ID: {id})</h2>

      {imageUrl && !newFile && (
        <div>
          <p>Текущая картинка:</p>
          <img
            src={imageUrl.startsWith('/uploads/') ? `http://localhost:3001${imageUrl}` : imageUrl}
            alt="Preview"
            style={{ maxWidth: '200px', height: 'auto', marginBottom: '10px' }}
          />
          <button type="button" onClick={() => setImageUrl('null')}>Удалить картинку</button>
        </div>
      )}
      {newFile && (
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
        
        {/* Редактор ReactQuill */}
        <div style={{ marginBottom: '50px', height: '300px' }}> 
          <ReactQuill
            theme="snow"
            value={newContent}
            onChange={setNewContent} 
            placeholder="Напишите что-нибудь потрясающее..."
            style={{ height: '250px' }}
          />
        </div>

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
          onChange={(e) => setNewFile(e.target.files?.[0] || null)}
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