import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import AdBanner from './AdBanner';


interface Article { 
  id: number;
  title: string;
  createdAt: string;
  view_count: number;
  comment_count: number;
}
interface PopularArticle {
  id: number;
  title: string;
  view_count: number;
  comment_count: number;
}

function Sidebar() {
  const [popularNews, setPopularNews] = useState<PopularArticle[]>([]);
  const [latestNews, setLatestNews] = useState<Article[]>([]);
  const [activeTab, setActiveTab] = useState<'latest' | 'popular'>('latest');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSidebarData = async () => {
      try {
        setLoading(true);
        const [popularRes, latestRes] = await Promise.all([
          apiClient.get<PopularArticle[]>('/news/popular'),
          apiClient.get<Article[]>('/news?limit=10')
        ]);
        setPopularNews(popularRes.data);
        setLatestNews(latestRes.data);
      } catch (err) {
        console.error("Failed to load sidebar data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSidebarData();
  }, []);

  return (
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

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <div className="sidebar-list">
          {activeTab === 'latest' ? (
            latestNews.map((article) => (
              <div key={article.id} className="sidebar-item">
                <Link to={`/news/${article.id}`}>{article.title}</Link>
                <small>
                  {new Date(article.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} | 👁 {article.view_count} | 💬 {article.comment_count}
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
      )}

      <div style={{ marginTop: '20px' }}>
        <AdBanner placement="sidebar" />
      </div>
    </aside>
  );
}

export default Sidebar;