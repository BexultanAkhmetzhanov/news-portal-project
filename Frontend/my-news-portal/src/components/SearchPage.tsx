import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';

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

function SearchPage() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q');

  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!searchQuery) {
      setResults([]);
      setLoading(false);
      return;
    }

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<Article[]>(`/search?q=${searchQuery}`);
        setResults(response.data);
      } catch (err) {
        console.error("Ошибка поиска:", err);
        setError("Не удалось выполнить поиск.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [searchQuery]); 
  if (loading) {
    return <p>Идет поиск...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div>
      <h2>Результаты поиска по: "{searchQuery}"</h2>

      <div className="news-feed">
        {results.length === 0 ? (
          <p>По вашему запросу ничего не найдено.</p>
        ) : (
          results.map((article) => (
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

export default SearchPage;