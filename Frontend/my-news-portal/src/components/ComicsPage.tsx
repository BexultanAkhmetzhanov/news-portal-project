import { useEffect, useState } from 'react';
import apiClient from '../api/apiClient';
import { Link } from 'react-router-dom';
import { getImageUrl } from '../utils/imageUrl';

interface ComicArticle {
  id: number;
  title: string;
  imageUrl: string | null;
  createdAt: string;
}

function ComicsPage() {
  const [comics, setComics] = useState<ComicArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComics = async () => {
      try {
        // Запрашиваем новости из категории 'comics' (убедись, что создал её в админке с slug 'comics')
        const response = await apiClient.get('/news/category/comics');
        setComics(response.data.data); // Учитываем структуру ответа { data: [...], pagination: ... }
      } catch (err) {
        console.error("Не удалось загрузить комиксы:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchComics();
  }, []);

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Загрузка комиксов...</div>;

  return (
    <div className="comics-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>Раздел Комиксов</h1>
      
      {comics.length === 0 ? (
        <p style={{ textAlign: 'center' }}>Комиксов пока нет. Загляните позже!</p>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: '25px' 
        }}>
          {comics.map((item) => (
            <Link to={`/news/${item.id}`} key={item.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <article style={{ 
                border: '1px solid #eee', 
                borderRadius: '12px', 
                overflow: 'hidden', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ height: '250px', backgroundColor: '#f9f9f9', overflow: 'hidden' }}>
                  {item.imageUrl ? (
                    <img 
                      src={getImageUrl(item.imageUrl)} 
                      alt={item.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}>
                      Нет обложки
                    </div>
                  )}
                </div>
                <div style={{ padding: '15px' }}>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', lineHeight: '1.4' }}>{item.title}</h3>
                  <small style={{ color: '#888' }}>{new Date(item.createdAt).toLocaleDateString()}</small>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default ComicsPage;