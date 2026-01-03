import { useState, useEffect, type FormEvent } from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import apiClient from './api/apiClient';
import { useAuth } from './context/AuthContext';
import CurrencyWidget from './components/CurrencyWidget'; 
import AdBanner from './components/AdBanner';

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
      
      {/* 1. ВЕРХНЕЕ МЕНЮ КАТЕГОРИЙ */}
      <div className="top-bar">
        <div className="top-bar-content">
          <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''} end>
            Главная
          </NavLink>

          {/* СИНИЙ ДЛЯ КОМИКСОВ */}
          <NavLink to="/comics" className={({ isActive }) => isActive ? 'active' : ''} style={{ fontWeight: 'bold', color: '#0077cc' }}>
            КОМИКСЫ
          </NavLink>

          {/* ЗОЛОТОЙ ДЛЯ ПРАВИТЕЛЬСТВА */}
          <NavLink to="/government" className={({ isActive }) => isActive ? 'active' : ''} style={{ fontWeight: 'bold', color: '#e6b800' }}>
            ПРАВИТЕЛЬСТВО
          </NavLink>

          {!loading && categories.map((category) => (
            category.slug !== 'comics' && (
              <NavLink key={category.id} to={`/category/${category.slug}`} className={({ isActive }) => isActive ? 'active' : ''}>
                {category.name}
              </NavLink>
            )
          ))}
        </div>
      </div>

      {/* 2. ШАПКА САЙТА */}
      <header className="main-header">
        <div className="header-logo">
          {/* MOЙ - черный, NEWS - синий */}
          <Link to="/">MOЙ <span>NEWS</span></Link>
        </div>
        
        {/* Все элементы в одну строку */}
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

          <CurrencyWidget />

          {/* Блок авторизации */}
          {user ? (
            <>
              {(user.role === 'admin' || user.role === 'editor') && (
                <Link to="/admin" className="nav-btn" style={{ color: 'red', fontWeight: 'bold' }}>
                  Админка
                </Link>
              )}
              
              <Link to="/profile" className="nav-btn profile-link" style={{ fontWeight: 'bold' }}>
                {user.username}
              </Link>
            </>
          ) : (
            /* КНОПКА ВОЙТИ С ДИЗАЙНОМ */
            <Link to="/login" className="nav-btn login-btn">
              Войти
            </Link>
          )}
        </div>
      </header>
      
      {/* Баннер */}
      <div style={{ maxWidth: '1200px', margin: '20px auto 0', padding: '0 30px' }}>
         <AdBanner placement="header" />
      </div>

      <main>
        <Outlet />
      </main>

      <footer>
        <p>© 2025 Мой News. Все права защищены.</p>
      </footer>
    </div>
  );
}

export default App;