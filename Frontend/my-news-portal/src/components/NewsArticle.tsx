import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { getImageUrl } from '../utils/imageUrl';
import Comments from './Comments';
import 'react-quill-new/dist/quill.snow.css';
import { 
  Spin, Tag, Button, Space, Typography, Divider, message, Tooltip 
} from 'antd';
import { 
  EyeOutlined, CalendarOutlined, WhatsAppOutlined, CopyOutlined, FacebookFilled, SendOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface TagData {
  id: number;
  name: string;
}

interface Article {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  categoryName: string | null;
  view_count: number;
  tags?: TagData[];
}

function NewsArticle() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await apiClient.get<Article>(`/news/${id}`);
        setArticle(response.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  const shareUrl = window.location.href;
  const shareText = article?.title || 'Новости';

  const handleShare = (platform: string) => {
    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(shareUrl);
        message.success('Ссылка скопирована!');
        return;
    }
    if (url) window.open(url, '_blank');
  };

  if (loading) return <div style={{textAlign:'center', marginTop: 50}}><Spin size="large"/></div>;
  if (!article) return <p style={{textAlign:'center', marginTop: 50}}>Новость не найдена (возможно, она была удалена)</p>;

  return (
    <div className="news-article-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      
      <Space style={{ marginBottom: 10, color: '#888' }}>
        <Tag color="blue">{article.categoryName || 'Новости'}</Tag>
        {/* Используем createdAt, так как в базе теперь так */}
        <span><CalendarOutlined /> {new Date(article.createdAt).toLocaleDateString()}</span>
        <span><EyeOutlined /> {article.view_count}</span>
      </Space>

      <Title level={1}>{article.title}</Title>

      {article.imageUrl && (
        <img 
          src={getImageUrl(article.imageUrl)} 
          alt={article.title} 
          style={{ width: '100%', borderRadius: '8px', marginBottom: '20px' }} 
        />
      )}

      <div className="ql-editor" style={{ padding: 0 }}>
        <div dangerouslySetInnerHTML={{ __html: article.content }} />
      </div>

      <Divider />

      {article.tags && article.tags.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ marginRight: 10 }}>Теги:</Text>
          {article.tags.map(tag => (
            <Tag key={tag.id} color="geekblue">#{tag.name}</Tag>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 30, background: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
        <Text strong>Поделиться новостью:</Text>
        <Space size="middle" style={{ marginLeft: 15 }}>
          <Tooltip title="WhatsApp">
            <Button shape="circle" icon={<WhatsAppOutlined />} style={{ color: '#25D366', borderColor: '#25D366' }} onClick={() => handleShare('whatsapp')} />
          </Tooltip>
          <Tooltip title="Telegram">
            <Button shape="circle" icon={<SendOutlined />} style={{ color: '#0088cc', borderColor: '#0088cc' }} onClick={() => handleShare('telegram')} />
          </Tooltip>
          <Tooltip title="Facebook">
            <Button shape="circle" icon={<FacebookFilled />} style={{ color: '#1877F2', borderColor: '#1877F2' }} onClick={() => handleShare('facebook')} />
          </Tooltip>
          <Tooltip title="Скопировать ссылку">
            <Button shape="circle" icon={<CopyOutlined />} onClick={() => handleShare('copy')} />
          </Tooltip>
        </Space>
      </div>

      {/* Исправлено: убрали проп user, так как Comments сам его получает */}
      <Comments newsId={article.id} />
    </div>
  );
}

export default NewsArticle;