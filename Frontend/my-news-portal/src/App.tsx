// src/App.tsx
import { useState, useEffect, type FormEvent } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import apiClient from './api/apiClient';
import { useAuth } from './context/AuthContext'; // 1. Импортируем хук

interface Category {
  id: number;
  name: string;
  slug: string;
}

function App() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const { user } = useAuth(); // 2. Получаем пользователя из контекста

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await apiClient.get<Category[]>('/categories');
        setCategories(response.data);
      } catch (err) {
        console.error("Не удалось загрузить категории:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedTerm = searchTerm.trim();
    if (trimmedTerm) {
      navigate(`/search?q=${trimmedTerm}`);
      setSearchTerm('');
    }
  };

  return (
    <div className="app-container">
      <div className="top-bar">
        <div className="top-bar-content">
          <NavLink
            to="/"
            className={({ isActive }) => isActive ? 'active' : ''}
            end // 'end' нужен, чтобы эта ссылка не была активна на /category/sport
          >
            Главная
          </NavLink>

          {!loading && categories.map((category) => (
            <NavLink
              key={category.id}
              to={`/category/${category.slug}`}
              className={({ isActive }) => isActive ? 'active' : ''} // Исправлен класс
            >
              {category.name}
            </NavLink>
          ))}
        </div>
      </div>

      <header className="main-header">
        <div className="header-logo">
          <Link to="/">MOЙ NEWS</Link>
        </div>
        <div className="header-actions">
          <form onSubmit={handleSearchSubmit} className="header-search">
            <input
              type="text"
              placeholder="Поиск..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit">🔍</button>
          </form>

          {user ? (
            <>
              {/* --- НОВАЯ ПРОВЕРКА РОЛИ --- */}
              {(user.role === 'admin' || user.role === 'editor') && (
                <Link to="/admin" className="admin-link">
                  Админка
                </Link>
              )}
              
              {/* Ссылка на профиль (с именем) */}
              <Link to="/profile" className="admin-link" style={{ fontWeight: 'bold', color: 'var(--tengri-green)' }}>
                {user.username}
              </Link>
            </>
          ) : (
            <Link to="/login" className="admin-link">
              Войти
            </Link>
          )}
        </div>     </header>

      <main><Outlet /></main>

      <footer><p>Новости Беки</p></footer>
    </div>
  );
}

export default App;