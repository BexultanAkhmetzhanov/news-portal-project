import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import Comments from './Comments';

interface Article {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  category_id: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  is_featured: number;
  view_count: number;
  comment_count: number;
}

function NewsArticle() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<Article>(`/news/${id}`);
        setArticle(response.data);
      } catch (err: any) {
        console.error("Ошибка загрузки статьи:", err);
        if (err.response && err.response.status === 404) {
          setError("Новость не найдена.");
        } else {
          setError("Не удалось загрузить статью.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);
  if (loading) {
    return <p>Загрузка статьи...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  if (!article) {
    return <p>Новость не найдена.</p>;
  }

  return (
    <article>
      <Link to="/">&larr; Назад к новостям</Link>
      
      <h2>{article.title}</h2>
      <small style={{ color: '#777' }}>
  Опубликовано: {new Date(article.createdAt).toLocaleString()} | 
  Просмотров: {article.view_count} | 
  Комментариев: {article.comment_count}
</small>
      {article.imageUrl && (
        <img 
          src={article.imageUrl} 
          alt={article.title} 
          style={{ maxWidth: '100%', height: 'auto', margin: '15px 0' }} 
        />
      )}
      <p style={{ whiteSpace: 'pre-wrap' }}>
        {article.content}
      </p>
      
      <small>Опубликовано: {new Date(article.createdAt).toLocaleString()}</small>
  <Comments newsId={article.id} />
    </article>
  );
}

export default NewsArticle;