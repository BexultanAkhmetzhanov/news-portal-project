import { useState, useEffect, type FormEvent } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import apiClient from './api/apiClient';
import { useAuth } from './context/AuthContext';

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

  const { user } = useAuth();

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
            end
          >
            Главная
          </NavLink>

          {/* --- Яркая ссылка на КОМИКСЫ --- */}
          <NavLink
            to="/comics"
            className={({ isActive }) => isActive ? 'active' : ''}
            style={{ fontWeight: 'bold', color: '#ff7f50' }}
          >
            КОМИКСЫ
          </NavLink>

          {/* --- Остальные категории (скрываем 'comics', чтобы не дублировалось) --- */}
          {!loading && categories.map((category) => (
            category.slug !== 'comics' && (
              <NavLink
                key={category.id}
                to={`/category/${category.slug}`}
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                {category.name}
              </NavLink>
            )
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
              {(user.role === 'admin' || user.role === 'editor') && (
                <Link to="/admin" className="admin-link">
                  Админка
                </Link>
              )}
              
              <Link to="/profile" className="admin-link" style={{ fontWeight: 'bold', color: 'var(--tengri-green)' }}>
                {user.username}
              </Link>
            </>
          ) : (
            <Link to="/login" className="admin-link">
              Войти
            </Link>
          )}
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer>
        <p>Новости Беки</p>
      </footer>
    </div>
  );
}

export default App;