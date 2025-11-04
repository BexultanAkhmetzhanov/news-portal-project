import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; // useParams, чтобы достать :slug
import apiClient from '../api/apiClient';

interface Article {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  categoryName: string | null; // Нам нужно имя категории для заголовка
  comment_count: number;
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
    <div>
 
      <h2 style={{ textTransform: 'capitalize' }}>
        {categoryName || 'Категория'}
      </h2>

      <div className="news-feed">
        {news.length === 0 ? (
          <p>В этой категории новостей пока нет.</p>
        ) : (
          news.map((article) => (
            <article key={article.id} style={{ marginBottom: '15px' }}>
              <h3>
                <Link to={`/news/${article.id}`}>{article.title}</Link>
              </h3>
              <p>{article.content.substring(0, 150)}...</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}

export default CategoryPage;