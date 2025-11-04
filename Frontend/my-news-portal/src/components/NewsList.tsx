import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import AdBanner from './AdBanner';

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
}

function NewsList() {
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const [popularNews, setPopularNews] = useState<PopularArticle[]>([]);
  const [regularNews, setRegularNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'latest' | 'popular'>('latest');

  useEffect(() => {
    const fetchAllNews = async () => {
      try {
        setLoading(true);
        setError(null);

        const [featuredRes, popularRes, regularRes] = await Promise.all([
          apiClient.get<Article | null>('/news/featured'),
          apiClient.get<PopularArticle[]>('/news/popular'),
          apiClient.get<Article[]>('/news')
        ]);

        const featuredArticleData = featuredRes.data;
        setFeaturedArticle(featuredArticleData);
        setPopularNews(popularRes.data);

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

  return (
    <div className="home-layout">
      
      <div className="main-feed">
        
        {featuredArticle && (
          <section className="featured-article">
            <Link to={`/news/${featuredArticle.id}`} className="featured-link-wrapper">
              {featuredArticle.imageUrl && (
                <img src={featuredArticle.imageUrl} alt={featuredArticle.title} className="featured-image" />
              )}
              <div className="featured-overlay">
                <h2>{featuredArticle.title}</h2>
                <div className="featured-meta">
                  <small>Сегодня</small> 
                  <small>👁 {featuredArticle.view_count}</small>
                  <small>💬 {featuredArticle.comment_count}</small>
                </div>
              </div>
            </Link>
          </section>
        )}
        
        <section className="sub-feed">
          {regularNews.slice(0, 3).map((article) => ( 
            <article key={article.id} className="sub-feed-item">
              {article.imageUrl && (
                <Link to={`/news/${article.id}`}>
                   <img src={article.imageUrl} alt={article.title} />
                </Link>
              )}
              <h4><Link to={`/news/${article.id}`}>{article.title}</Link></h4>
            </article>
          ))}
        </section>
      </div>

      <aside className="sidebar">
        
        <div className="sidebar-tabs">
          <button 
            className={activeTab === 'latest' ? 'active' : ''}
            onClick={() => setActiveTab('latest')}
          >
            Последнее
          </button>
          <button 
            className={activeTab === 'popular' ? 'active' : ''}
            onClick={() => setActiveTab('popular')}
          >
            Популярное
          </button>
        </div>

        <div className="sidebar-list">
          {activeTab === 'latest' ? (
            regularNews.slice(3).map((article) => (
              <div key={article.id} className="sidebar-item">
                <Link to={`/news/${article.id}`}>{article.title}</Link>
                <small>
                  {new Date(article.createdAt).toLocaleTimeString()} | 👁 {article.view_count} | 💬 {article.comment_count}
                </small>
              </div>
            ))
          ) : (
            popularNews.map((article) => (
              <div key={article.id} className="sidebar-item">
                <Link to={`/news/${article.id}`}>{article.title}</Link>
                <small>
                  👁 {article.view_count} | 💬 {article.comment_count}
                </small>
              </div>
            ))
          )}
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <AdBanner placement="sidebar" />
        </div>
      </aside>
    </div>
  );
}

export default NewsList;