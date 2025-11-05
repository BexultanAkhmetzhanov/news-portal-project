import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';  
import apiClient from '../api/apiClient';

interface Article {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  categoryName: string | null;  
  comment_count: number;
  view_count: number;     
  is_featured: number;
}

function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();  
  const [news, setNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string>(''); 

  useEffect(() => {
    const fetchNewsByCategory = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiClient.get<Article[]>(`/news/category/${slug}`);
        
        setNews(response.data);
        
        if (response.data.length > 0) {
        
          setCategoryName(response.data[0].categoryName || slug);
        } else {
          setCategoryName(slug); 
        }
        
      } catch (err: any) {
        console.error("Ошибка загрузки категории:", err);
        if (err.response && err.response.status === 404) {
          setError("Категория не найдена.");
        } else {
          setError("Не удалось загрузить новости.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNewsByCategory();
  }, [slug]); 

  if (loading) {
    return <p>Загрузка новостей...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

 return (
    <div className="home-layout"> 
      
      <div className="main-feed">
        <h2 style={{textTransform: 'capitalize', borderBottom: '2px solid var(--tengri-green)', paddingBottom: '10px'}}>
          {categoryName}
        </h2>

        {news.length === 0 ? (
          <p>В этой категории новостей пока нет.</p>
        ) : (
          <section className="sub-feed" style={{marginTop: '20px'}}> 
            {news.map((article) => ( 
              <article key={article.id} className="sub-feed-item">
                {article.imageUrl && (
                  <Link to={`/news/${article.id}`}>
                    <img src={article.imageUrl} alt={article.title} />
                  </Link>
                )}
                <h4><Link to={`/news/${article.id}`}>{article.title}</Link></h4>
                <small>
                  {new Date(article.createdAt).toLocaleDateString()} | 👁 {article.view_count} | 💬 {article.comment_count}
                </small>
              </article>
            ))}
          </section>
        )}
      </div>
      <aside className="sidebar">
      </aside>

    </div>
  );
}

export default CategoryPage;