import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { getImageUrl } from '../utils/imageUrl';
import { Typography, Spin, Empty, Tag, Space, Grid, theme } from 'antd';
import { CalendarOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface NewsItem {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  view_count: number;
  categoryName?: string;
}

function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  const screens = useBreakpoint();
  const { token } = theme.useToken();
  const isMobile = screens.md === false;

  useEffect(() => {
    const fetchResults = async () => {
      if (!query) return;
      setLoading(true);
      try {
        const res = await apiClient.get<NewsItem[]>(`/search?q=${encodeURIComponent(query)}`);
        setNews(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const renderNewsItem = (item: NewsItem) => {
    return (
      <Link to={`/news/${item.id}`} key={item.id} style={{ display: 'block', color: 'inherit' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          gap: '24px',
          padding: '24px 0',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          transition: 'background-color 0.3s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = token.colorFillAlter}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <div style={{ 
            flexShrink: 0, 
            width: isMobile ? '100%' : '260px', 
            height: isMobile ? '200px' : '175px',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: token.colorFillContent 
          }}>
            <img 
              alt={item.title} 
              src={getImageUrl(item.imageUrl)} 
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/260x175?text=No+Image'; 
              }}
            />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 10 }}>
               {item.categoryName && <Tag color="blue" style={{ margin: 0 }}>{item.categoryName}</Tag>}
            </div>
            
            <Title level={isMobile ? 4 : 3} style={{ margin: '0 0 12px 0', fontWeight: 700, lineHeight: 1.3 }}>
              {item.title}
            </Title>
            
            <div style={{ marginTop: 'auto' }}>
               <Space separator="•" style={{ fontSize: 13, color: token.colorTextSecondary }}>
                 <span><CalendarOutlined /> {dayjs(item.createdAt).format('D MMMM YYYY, HH:mm')}</span>
                 <span><EyeOutlined /> {item.view_count}</span>
               </Space>
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div style={{ maxWidth: 960, margin: '40px auto', padding: '0 20px' }}>
      <Title level={2} style={{ marginBottom: 30 }}>
        <SearchOutlined style={{ color: token.colorPrimary }} /> Поиск по запросу: «{query}»
      </Title>
      
      {loading ? (
        <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>
      ) : news.length === 0 ? (
        // ИСПРАВЛЕНИЕ ЗДЕСЬ: imageStyle -> styles={{ image: ... }}
        <Empty 
          description={<Text strong>По вашему запросу ничего не найдено.</Text>} 
          style={{ marginTop: 100 }} 
          styles={{ image: { height: 100 } }} 
        />
      ) : (
        <div style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          {news.map(renderNewsItem)}
        </div>
      )}
    </div>
  );
}

export default SearchPage;