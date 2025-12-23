// src/components/NewsList.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import AdBanner from './AdBanner';
import { getImageUrl } from '../utils/imageUrl';

// Интерфейсы
interface Article {
    id: number;
    title: string;
    content: string;
    imageUrl: string | null;
    createdAt: string;
    categoryName: string | null;
    categorySlug: string | null;
    is_featured: number;
    view_count: number;
    comment_count: number;
}
interface PopularArticle {
    id: number;
    title: string;
    view_count: number;
    categoryName: string | null;
    categorySlug: string | null;
    comment_count: number;
    imageUrl: string | null;  
    createdAt: string;
}

interface NewsResponse {
  data: Article[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function formatTime(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function NewsList() {
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const [popularNews, setPopularNews] = useState<PopularArticle[]>([]);
  
  const [regularNews, setRegularNews] = useState<Article[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Загрузка статических блоков (Исправлено!)
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        // Мы ожидаем массив (Article[]), так как сервер возвращает список
        const [featuredRes, popularRes] = await Promise.all([
          apiClient.get<Article[]>('/news/featured'), 
          apiClient.get<PopularArticle[]>('/news/popular')
        ]);
        
        // БЕРЕМ ПЕРВУЮ НОВОСТЬ ИЗ МАССИВА
        const featData = featuredRes.data;
        if (Array.isArray(featData) && featData.length > 0) {
            setFeaturedArticle(featData[0]);
        } else {
            setFeaturedArticle(null);
        }

        setPopularNews(popularRes.data);
      } catch (err) {
        console.error("Ошибка загрузки шапки:", err);
      }
    };
    fetchStaticData();
  }, []);

  // 2. Загрузка ленты новостей
  useEffect(() => {
    const fetchNewsFeed = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<NewsResponse>(`/news?page=${currentPage}&limit=20`);
        
        setRegularNews(response.data.data);
        setTotalPages(response.data.pagination.totalPages);
        
        if (currentPage > 1) {
           window.scrollTo({ top: 400, behavior: 'smooth' });
        }
      } catch (err) {
        console.error("Ошибка загрузки ленты:", err);
        setError("Не удалось загрузить новости.");
      } finally {
        setLoading(false);
      }
    };

    fetchNewsFeed();
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const mainGridNews = regularNews.slice(0, 2); 
  const liveNews = popularNews.length > 0 ? popularNews[0] : null;
  const sidebarGridNews = popularNews.slice(1, 4); 
  const feedList = regularNews.slice(2); 

  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div className="home-layout">
      
      <div className="main-feed">
        
        {/* Главная новость */}
        {currentPage === 1 && featuredArticle && (
          <section className="featured-article">
            <Link to={`/news/${featuredArticle.id}`}>
              {featuredArticle.imageUrl && (
                <img src={getImageUrl(featuredArticle.imageUrl)} alt={featuredArticle.title} />
              )}
              <h2>{featuredArticle.title}</h2>
              <div className="article-meta">
                <span>{formatTime(featuredArticle.createdAt)}</span> | 
                <span> 👁 {featuredArticle.view_count}</span>
              </div>
            </Link>
          </section>
        )}
        
        {/* Сетка под главной */}
        {currentPage === 1 && (
          <section className="main-feed-grid">
            {mainGridNews.map((article) => (
              <article key={article.id} className="feed-grid-item">
                <Link to={`/news/${article.id}`}>
                  {article.imageUrl && (
                    <img src={getImageUrl(article.imageUrl)} alt={article.title} />
                  )}
                  <h3>{article.title}</h3>
                  <div className="article-meta">{formatTime(article.createdAt)}</div>
                </Link>
              </article>
            ))}
          </section>
        )}

        {/* Список новостей */}
        <section className="latest-news-list">
          <h3 style={{ borderBottom: '2px solid var(--tengri-green)', paddingBottom: '10px', marginTop: '30px' }}>
            {currentPage === 1 ? 'Последние новости' : `Страница ${currentPage}`}
          </h3>
          
          {loading ? <p>Загрузка...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {(currentPage === 1 ? feedList : regularNews).map((article) => (
                <article key={article.id} className="news-item-row" style={{ display: 'flex', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid #eee' }}>
                  <div style={{ flex: '0 0 150px' }}>
                     {article.imageUrl ? (
                        <img 
                          src={getImageUrl(article.imageUrl)} 
                          alt={article.title}
                          style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                     ) : <div style={{ width: '100%', height: '100px', background: '#eee' }}></div>}
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 10px 0' }}>
                      <Link to={`/news/${article.id}`} style={{ textDecoration: 'none', color: '#333' }}>
                        {article.title}
                      </Link>
                    </h4>
                    <small style={{ color: '#888' }}>
                      {new Date(article.createdAt).toLocaleDateString()} {formatTime(article.createdAt)}
                      {article.categoryName && ` • ${article.categoryName}`}
                    </small>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#555', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {article.content.replace(/<[^>]+>/g, '')}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '40px' }}>
              <button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} style={{ padding: '8px 16px', cursor: 'pointer' }}>&larr; Назад</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontWeight: currentPage === page ? 'bold' : 'normal',
                    backgroundColor: currentPage === page ? 'var(--tengri-green)' : '#fff',
                    color: currentPage === page ? '#fff' : '#333',
                    border: '1px solid #ddd'
                  }}
                >
                  {page}
                </button>
              ))}
              <button disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} style={{ padding: '8px 16px', cursor: 'pointer' }}>Вперед &rarr;</button>
            </div>
          )}
        </section>
      </div>

      <aside className="sidebar">
        {liveNews && (
          <section className="sidebar-section sidebar-live">
            <Link to={`/news/${liveNews.id}`}>
              <div className="live-badge">LIVE</div>
              <h3>{liveNews.title}</h3>
            </Link>
          </section>
        )}
        <section className="sidebar-section">
          <div className="sidebar-grid">
            {sidebarGridNews.map((article) => (
              <article key={article.id} className="sidebar-grid-item">
                <Link to={`/news/${article.id}`}>
                   {article.imageUrl && <img src={getImageUrl(article.imageUrl)} alt={article.title} />}
                  <h4>{article.title}</h4>
                </Link>
              </article>
            ))}
          </div>
        </section>
        <AdBanner placement="sidebar" />
      </aside>
    </div>
  );
}

export default NewsList;