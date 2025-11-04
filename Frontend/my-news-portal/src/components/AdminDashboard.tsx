
import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';


interface Article {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  category_id: number | null;  
  categoryName: string | null;  
  categorySlug: string | null;  
  is_featured: number;  
  view_count: number;   
  comment_count: number;
}
 
interface Category {
  id: number;
  name: string;
  slug: string;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [isFeatured, setIsFeatured] = useState(false);
  const [newsList, setNewsList] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [newImageUrl, setNewImageUrl] = useState('');
 
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<Article[]>('/news'); 
        setNewsList(response.data); 
        const categoriesResponse = await apiClient.get<Category[]>('/categories');
        setCategories(categoriesResponse.data);

      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить список новостей');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []); 

  const handleCreateNews = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTitle || !newContent) {
      alert('Заголовок и контент обязательны!');
      return;
    }

    try {
      await apiClient.post<Article>('/admin/news', { 
      title: newTitle,
      content: newContent,
      imageUrl: newImageUrl || null,
      category_id: newCategoryId ? parseInt(newCategoryId) : null, 
      is_featured: isFeatured,
       });

      alert('Новость создана!');
      setNewTitle('');
      setNewContent('');
      setNewImageUrl('');
      setNewCategoryId('');
      setIsFeatured(false);
      
       const newsResponse = await apiClient.get<Article[]>('/news');
      setNewsList(newsResponse.data);

    } catch (err) {
      console.error(err);
      setError('Ошибка при создании новости');
    }
  };


  const handleDeleteNews = async (id: number) => {

    if (!window.confirm('Вы уверены, что хотите удалить эту новость?')) {
      return;
    }

    try { 
      await apiClient.delete(`/admin/news/${id}`);
      setNewsList(newsList.filter((article) => article.id !== id));
      alert('Новость удалена');
    } catch (err) {
      console.error(err);
      setError('Ошибка при удалении новости');
    }
  };
  
  if (loading) return <p>Загрузка админ-панели...</p>;

  return (
    <div className="admin-dashboard">
      <h2>Админ-панель</h2>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}


      <section>
        <h3>Создать новость</h3>
        <form onSubmit={handleCreateNews} style={{ display: 'grid', gap: '10px', maxWidth: '500px' }}>
          <input
            type="text"
            placeholder="Заголовок"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <select 
            value={newCategoryId}
            onChange={(e) => setNewCategoryId(e.target.value)}
          >
            <option value="">-- Выберите категорию --</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <textarea
            rows={10}
            placeholder="Содержание (можно использовать переносы строк)"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
          />
          <input
            type="text"
            placeholder="URL Картинки (необязательно)"
            value={newImageUrl}
            onChange={(e) => setNewImageUrl(e.target.value)}
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
          <button type="submit">Опубликовать</button>
        </form>
      </section>

      <hr style={{ margin: '20px 0' }} />

      <section>
        <h3>Управление новостями</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {newsList.map((article) => (
            <li key={article.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px', borderBottom: '1px solid #eee' }}>
              <span>
                {article.is_featured === 1 && <strong style={{ color: 'blue' }}>[Главная] </strong>}
                {article.title}
                {article.categoryName && (
                  <em style={{ marginLeft: '10px', color: '#777' }}>
                    ({article.categoryName})
                  </em>
                )}
              </span>
              <div>
                <small style={{ marginRight: '10px', color: '#777' }}>
                  (Просмотры: {article.view_count})
                </small>
                <button 
                  onClick={() => handleDeleteNews(article.id)}
                  style={{ backgroundColor: '#ff4d4d', color: 'white' }}
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default AdminDashboard;