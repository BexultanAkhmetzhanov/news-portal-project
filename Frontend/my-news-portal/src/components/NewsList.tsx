// src/components/NewsList.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import AdBanner from './AdBanner'; // Мы все еще используем баннер

// Интерфейсы (без изменений)
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

// Вспомогательный компонент для форматирования времени (как на скриншоте "13:12")
function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function NewsList() {
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const [popularNews, setPopularNews] = useState<PopularArticle[]>([]);
  const [regularNews, setRegularNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllNews = async () => {
      try {
        setLoading(true);
        setError(null);

        // Загружаем все 3 типа новостей параллельно
        const [featuredRes, popularRes, regularRes] = await Promise.all([
          apiClient.get<Article | null>('/news/featured'),
          apiClient.get<PopularArticle[]>('/news/popular'),
          apiClient.get<Article[]>('/news')
        ]);

        const featuredArticleData = featuredRes.data;
        setFeaturedArticle(featuredArticleData);
        setPopularNews(popularRes.data);

        // Фильтруем обычные новости, чтобы убрать из них главную
        let filteredNews = regularRes.data;
        if (featuredArticleData) {
          filteredNews = filteredNews.filter(
            (article) => article.id !== featuredArticleData.id
          );
        }
        setRegularNews(filteredNews);

      } catch (err) {
        console.error("Ошибка загрузки главной страницы:", err);
        setError("Не удалось загрузить новости. Попробуйте позже.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllNews();
  }, []);

  if (loading) return <p>Загрузка новостей...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  // --- Готовим данные для сетки (как на скриншоте) ---

  // Главная новость (уже в featuredArticle)

  // 2 новости в левой колонке под главной
  const mainGridNews = regularNews.slice(0, 2);

  // "LIVE" новость (берем самую популярную)
  const liveNews = popularNews.length > 0 ? popularNews[0] : null;
  
  // 3 новости в правой колонке (берем остальные популярные + обычные)
  const sidebarGridNews = [
    ...popularNews.slice(1, 3), // 2-я и 3-я по популярности
    ...regularNews.slice(2, 3)  // 1 из обычных
  ].slice(0, 3); // Убедимся, что их не больше 3-х

  return (
    <div className="home-layout">
      
      {/* --- ЛЕВАЯ КОЛОНКА --- */}
      <div className="main-feed">
        
        {/* ГЛАВНАЯ НОВОСТЬ */}
        {featuredArticle && (
          <section className="featured-article">
            <Link to={`/news/${featuredArticle.id}`}>
              {featuredArticle.imageUrl && (
                <img src={featuredArticle.imageUrl} alt={featuredArticle.title} />
              )}
              <h2>{featuredArticle.title}</h2>
              <div className="article-meta">
                <span>{formatTime(featuredArticle.createdAt)}</span> | 
                <span> 👁 {featuredArticle.view_count}</span>
              </div>
            </Link>
          </section>
        )}
        
        {/* СЕТКА ПОД ГЛАВНОЙ НОВОСТЬЮ */}
        <section className="main-feed-grid">
          {mainGridNews.map((article) => (
            <article key={article.id} className="feed-grid-item">
              <Link to={`/news/${article.id}`}>
                {article.imageUrl && (
                  <img src={article.imageUrl} alt={article.title} />
                )}
                {/* Показываем категорию, если она есть */}
                {article.categoryName && (
                  <small style={{ color: 'var(--accent-color)', fontWeight: 500 }}>
                    {article.categoryName.toUpperCase()}
                  </small>
                )}
                <h3>{article.title}</h3>
                <div className="article-meta">
                  {formatTime(article.createdAt)}
                </div>
              </Link>
            </article>
          ))}
        </section>
      </div>

      {/* --- ПРАВАЯ КОЛОНКА (САЙДБАР) --- */}
      <aside className="sidebar">
        
        {/* "LIVE" БЛОК */}
        {liveNews && (
          <section className="sidebar-section sidebar-live">
            <Link to={`/news/${liveNews.id}`}>
              <div className="live-badge">LIVE</div>
              <h3>{liveNews.title}</h3>
              <div className="article-meta">
                {formatTime(liveNews.createdAt)} {/* (На самом деле у popular нет createdAt, берем из заглушки) */}
              </div>
            </Link>
          </section>
        )}

        {/* СЕТКА В САЙДБАРЕ */}
        <section className="sidebar-section">
          <div className="sidebar-grid">
            {sidebarGridNews.map((article) => (
              <article key={article.id} className="sidebar-grid-item">
                <Link to={`/news/${article.id}`}>
                   {article.imageUrl && (
                    <img src={article.imageUrl} alt={article.title} />
                  )}
                  {article.categoryName && (
                    <small style={{ color: 'var(--accent-color)', fontWeight: 500, fontSize: '0.8rem' }}>
                      {article.categoryName.toUpperCase()}
                    </small>
                  )}
                  <h4>{article.title}</h4>
                  <div className="article-meta">
                    {formatTime(article.createdAt)}
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* РЕКЛАМНЫЙ БАННЕР */}
        <AdBanner placement="sidebar" />
      </aside>
    </div>
  );
}

export default NewsList;