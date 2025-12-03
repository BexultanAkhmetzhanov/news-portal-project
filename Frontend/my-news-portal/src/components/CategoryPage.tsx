import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { getImageUrl } from '../utils/imageUrl'; // Импортируем нашу утилиту

interface Article {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  categoryName: string;
}

interface CategoryResponse {
  data: Article[];
  categoryName: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  
  const [news, setNews] = useState<Article[]>([]);
  const [categoryName, setCategoryName] = useState('');
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Сброс страницы на 1-ю при смене категории (например, перешли из Спорт в Экономику)
  useEffect(() => {
    setCurrentPage(1);
  }, [slug]);

  useEffect(() => {
    const fetchCategoryNews = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Запрос с пагинацией
        const response = await apiClient.get<CategoryResponse>(`/news/category/${slug}?page=${currentPage}&limit=20`);
        
        setNews(response.data.data);
        setCategoryName(response.data.categoryName);
        setTotalPages(response.data.pagination.totalPages);
        
        // Скролл наверх
        window.scrollTo({ top: 0, behavior: 'smooth' });

      } catch (err: any) {
        console.error("Ошибка:", err);
        // Если 404, значит категории нет, иначе ошибка сети
        if (err.response && err.response.status === 404) {
            setError("Категория не найдена");
        } else {
            setError("Не удалось загрузить новости.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryNews();
  }, [slug, currentPage]); // Перезапускаем при смене URL или номера страницы

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Загрузка категории...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

  return (
    <div className="category-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      
      <h2 style={{ borderBottom: '2px solid var(--tengri-green)', paddingBottom: '15px', marginBottom: '25px' }}>
        {categoryName.toUpperCase()}
        {totalPages > 1 && <span style={{ fontSize: '0.6em', color: '#777', marginLeft: '15px' }}>(Страница {currentPage})</span>}
      </h2>

      {news.length === 0 ? (
        <p>В этой категории пока нет новостей.</p>
      ) : (
        <div className="category-list">
          {news.map((article) => (
            <article key={article.id} style={{ display: 'flex', gap: '20px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #eee' }}>
              <div style={{ flex: '0 0 240px' }}>
                <Link to={`/news/${article.id}`}>
                  {article.imageUrl ? (
                    <img 
                      src={getImageUrl(article.imageUrl)} 
                      alt={article.title} 
                      style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '160px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                      Нет фото
                    </div>
                  )}
                </Link>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ marginTop: '0' }}>
                  <Link to={`/news/${article.id}`} style={{ textDecoration: 'none', color: '#333' }}>
                    {article.title}
                  </Link>
                </h3>
                <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '10px' }}>
                  {new Date(article.createdAt).toLocaleDateString()} | {formatTime(article.createdAt)}
                </div>
                <p style={{ color: '#555', lineHeight: '1.5' }}>
                  {article.content.replace(/<[^>]+>/g, '').substring(0, 150)}...
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ПАГИНАЦИЯ */}
      {totalPages > 1 && (
        <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '40px' }}>
          <button 
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            &larr; Назад
          </button>
          
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

          <button 
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            style={{ padding: '8px 16px', cursor: 'pointer' }}
          >
            Вперед &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

export default CategoryPage;