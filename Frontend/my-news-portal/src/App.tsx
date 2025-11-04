import { useState, useEffect, type FormEvent } from 'react'; 
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import apiClient from './api/apiClient';

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
          {!loading && categories.map((category) => (
            <NavLink 
              key={category.id} 
              to={`/category/${category.slug}`}
              className={category.slug === 'sport' ? 'active-category' : ''}
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
          <Link to="/admin" className="admin-link">Админка</Link>
        </div>
      </header>

      <main><Outlet /></main>

      <footer><p>Новости Беки</p></footer>
    </div>
  );
}

export default App;