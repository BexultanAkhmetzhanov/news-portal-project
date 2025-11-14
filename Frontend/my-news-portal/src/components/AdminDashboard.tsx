import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import UserManagement from './UserManagement';
import CategoryManagement from './CategoryManagement'; // (Этот импорт теперь будет работать)

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
  status: 'pending' | 'approved';
}

interface CreateNewsResponse {
  message: string;
  id: number;
}
 
interface Category {
  id: number;
  name: string;
  slug: string;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth(); 
  
  const [isFeatured, setIsFeatured] = useState(false);
  const [newsList, setNewsList] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  
  // --- 1. ИСПРАВЛЕНИЕ ТИПА ---
  // Добавляем 'categories' в список возможных вкладок
  const [activeTab, setActiveTab] = useState<'manage' | 'create' | 'moderate' | 'categories'>('manage');

  const fetchManageNews = async () => {
    try {
      const newsResponse = await apiClient.get<Article[]>('/admin/news/all');
      setNewsList(newsResponse.data);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить список новостей');
    }
  };
  
  const fetchCategories = async () => {
    try {
      const res = await apiClient.get<Category[]>('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Не удалось загрузить категории:', err);
      setError('Не удалось загрузить категории');
    }
  };

  const handleMakeFeatured = async (id: number) => {
    try {
      await apiClient.put(`/admin/news/${id}/feature`);
      await fetchManageNews();
    } catch (err) {
      console.error(err);
      alert('Ошибка при установке главной новости.');
    }
  };

  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchManageNews(), 
        fetchCategories()
      ]).catch((err) => {
        console.error(err);
        setError('Не удалось загрузить данные');
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [user]); 

  const handleLogout = async () => {
    await logout();
    navigate('/'); 
  };

  const handleCreateNews = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTitle || !newContent) {
      alert('Заголовок и контент обязательны!');
      return;
    }

    // 1. Создаем FormData
    const formData = new FormData();
    formData.append('title', newTitle);
    formData.append('content', newContent);
    formData.append('category_id', newCategoryId);
    formData.append('is_featured', isFeatured ? '1' : '0');
    formData.append('imageUrl', newImageUrl); // URL (текст)
    
    // 2. Добавляем файл, если он выбран
    if (newFile) {
      formData.append('imageFile', newFile);
    }

    try {
      // 3. Отправляем FormData
      const response = await apiClient.post<CreateNewsResponse>('/admin/news', formData, {
        headers: {
          // Axios сам установит 'Content-Type': 'multipart/form-data'
        }
      });

      alert(response.data.message);
      // Сбрасываем все поля
      setNewTitle('');
      setNewContent('');
      setNewImageUrl('');
      setNewCategoryId('');
      setIsFeatured(false);
      setNewFile(null); // <-- Сброс файла
      
      await fetchManageNews();
      setActiveTab('manage');

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
  
  if (!user) return <p>Перенаправление на страницу входа...</p>;
  if (loading) return <p>Загрузка админ-панели...</p>;

  return (
    <div className="admin-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Админ-панель (Вы вошли как: {user.username})</h2>
        <button onClick={handleLogout} style={{ background: 'gray', color: 'white' }}>
          Выйти
        </button>
      </div>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <nav style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #333', marginBottom: '20px' }}>
        <button onClick={() => setActiveTab('manage')} style={activeTab === 'manage' ? { fontWeight: 'bold' } : {}}>
          Управление новостями
        </button>
        <button onClick={() => setActiveTab('create')} style={activeTab === 'create' ? { fontWeight: 'bold' } : {}}>
          Создать новость
        </button>
        {user.role === 'admin' && (
          // --- 2. ИСПРАВЛЕНИЕ JSX (Добавлен React Fragment <>) ---
          <>
            <button onClick={() => setActiveTab('moderate')} style={activeTab === 'moderate' ? { fontWeight: 'bold' } : {}}>
              Модерация
            </button>
            <button onClick={() => setActiveTab('categories')} style={activeTab === 'categories' ? { fontWeight: 'bold' } : {}}>
              Категории
            </button>
          </>
        )}
      </nav>
      
      {activeTab === 'create' && (
        <section>
          <h3>Создать новость</h3>
          <form onSubmit={handleCreateNews} style={{ display: 'grid', gap: '10px', maxWidth: '500px' }}>
            {/* ... (код формы) ... */}
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
            <label>ИЛИ Загрузить файл (приоритет):</label>
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
            <button type="submit">Опубликовать</button>
          </form>
        </section>
      )}

      {activeTab === 'manage' && (
        <>
          <section>
            <h3>Управление новостями</h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
              {user.role === 'editor' 
                ? 'Новые посты появятся здесь после одобрения админом.' 
                : 'Здесь показаны все новости (одобренные и на рассмотрении).'}
            </p>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {newsList.map((article) => (
                <li key={article.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px', borderBottom: '1px solid #eee' }}>
                  <span>
                    {article.is_featured === 1 && <strong style={{ color: 'blue' }}>[Главная] </strong>}
                    {article.status === 'pending' && <strong style={{ color: 'orange' }}>[На рассмотрении] </strong>}
                    
                    <Link to={`/admin/edit/${article.id}`}>{article.title}</Link>
                    {article.categoryName && (
                      <em style={{ marginLeft: '10px', color: '#777' }}>
                        ({article.categoryName})
                      </em>
                    )}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <small style={{ color: '#777' }}>(Просмотры: {article.view_count})</small>
                    
                    {article.is_featured === 0 && (
                      <button 
                        onClick={() => handleMakeFeatured(article.id)}
                        style={{ backgroundColor: '#007aff', color: 'white', fontSize: '0.8rem' }}
                      >
                        Сделать главной
                      </button>
                    )}
                    
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

          {user.role === 'admin' && (
            <>
              <hr style={{ margin: '20px 0' }} />
              <UserManagement />
            </>
          )}
        </>
      )}

      {activeTab === 'moderate' && user.role === 'admin' && (
        <NewsModeration />
      )}

      {/* Эта вкладка теперь будет работать */}
      {activeTab === 'categories' && user.role === 'admin' && (
        <CategoryManagement 
          categories={categories}       
          onCategoriesUpdate={fetchCategories} 
        />
      )}

    </div>
  );
}

export default AdminDashboard;

// ... (код NewsModeration остается без изменений) ...

function NewsModeration() {
  const [pendingNews, setPendingNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPending = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<Article[]>('/admin/news/pending');
      setPendingNews(response.data);
    } catch (err) {
      setError('Не удалось загрузить новости для модерации.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: number) => {
    if (!window.confirm('Одобрить эту новость?')) return;
    try {
      await apiClient.put(`/admin/news/${id}/approve`);
      setPendingNews(pendingNews.filter(n => n.id !== id));
    } catch (err) {
      setError('Ошибка при одобрении.');
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm('Отклонить (удалить) эту новость?')) return;
    try {
      await apiClient.delete(`/admin/news/${id}`);
      setPendingNews(pendingNews.filter(n => n.id !== id));
    } catch (err) {
      setError('Ошибка при отклонении.');
    }
  };

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <section>
      <h3>Новости на модерации</h3>
      {pendingNews.length === 0 && <p>Новых новостей на рассмотрении нет.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {pendingNews.map((article) => (
          <li key={article.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px', borderBottom: '1px solid #eee' }}>
            
            <Link to={`/admin/edit/${article.id}`}>
              {article.title}
              {article.categoryName && <em style={{ marginLeft: '10px', color: '#777' }}>({article.categoryName})</em>}
            </Link>

            <div style={{ display: 'flex', gap: '5px' }}>
              <button 
                onClick={() => handleApprove(article.id)}
                style={{ backgroundColor: 'var(--tengri-green)', color: 'white' }}
              >
                Одобрить
              </button>
              <button 
                onClick={() => handleReject(article.id)}
                style={{ backgroundColor: '#ff4d4d', color: 'white' }}
              >
                Отклонить
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}