import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom'; // Добавили Link
import apiClient from '../api/apiClient';
import { getImageUrl } from '../utils/imageUrl';
import Comments from './Comments';
import { useAuth } from '../context/AuthContext';
import 'react-quill-new/dist/quill.snow.css';
import { 
  Spin, Tag, Button, Space, Typography, Divider, message, Tooltip 
} from 'antd';
import { 
  EyeOutlined, CalendarOutlined, WhatsAppOutlined, CopyOutlined, 
  FacebookFilled, SendOutlined, LikeOutlined, DislikeOutlined, 
  LikeFilled, DislikeFilled 
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface TagData { id: number; name: string; }
interface Article {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  categoryName: string | null;
  view_count: number;
  tags?: TagData[];
  likes?: number;
  dislikes?: number;
}

function NewsArticle() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [userVote, setUserVote] = useState<number>(0);
  const [likesCount, setLikesCount] = useState(0);
  const [dislikesCount, setDislikesCount] = useState(0);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await apiClient.get<Article>(`/news/${id}`);
        setArticle(response.data);
        setLikesCount(response.data.likes || 0);
        setDislikesCount(response.data.dislikes || 0);

        if (user) {
          const voteRes = await apiClient.get<{ userVote: number }>(`/news/${id}/vote-status`);
          setUserVote(voteRes.data.userVote);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id, user]);

  const handleVote = async (value: number) => {
    if (!user) {
      message.warning('Войдите, чтобы голосовать');
      return;
    }
    try {
      const oldVote = userVote;
      let newLikes = likesCount;
      let newDislikes = dislikesCount;

      if (oldVote === value) {
        setUserVote(0);
        if (value === 1) newLikes--;
        else newDislikes--;
      } else {
        setUserVote(value);
        if (value === 1) {
          newLikes++;
          if (oldVote === -1) newDislikes--;
        } else {
          newDislikes++;
          if (oldVote === 1) newLikes--;
        }
      }
      setLikesCount(newLikes);
      setDislikesCount(newDislikes);

      await apiClient.post(`/news/${id}/vote`, { value });
      
    } catch (err) {
      message.error('Ошибка голосования');
    }
  };

  const shareUrl = window.location.href;
  const shareText = article?.title || 'Новости';
  const handleShare = (platform: string) => {
    let url = '';
    switch (platform) {
      case 'whatsapp': url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`; break;
      case 'telegram': url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`; break;
      case 'facebook': url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`; break;
      case 'copy': navigator.clipboard.writeText(shareUrl); message.success('Ссылка скопирована!'); return;
    }
    if (url) window.open(url, '_blank');
  };

  if (loading) return <div style={{textAlign:'center', marginTop: 50}}><Spin size="large"/></div>;
  if (!article) return <p style={{textAlign:'center', marginTop: 50}}>Новость не найдена</p>;

  return (
    <div className="news-article-container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <Space style={{ marginBottom: 10, color: '#888' }}>
        <Tag color="blue">{article.categoryName || 'Новости'}</Tag>
        <span><CalendarOutlined /> {new Date(article.createdAt).toLocaleDateString()}</span>
        <span><EyeOutlined /> {article.view_count}</span>
      </Space>

      <Title level={1}>{article.title}</Title>

      {article.imageUrl && (
        <img src={getImageUrl(article.imageUrl)} alt={article.title} style={{ width: '100%', borderRadius: '8px', marginBottom: '20px' }} />
      )}

      <div className="ql-editor" style={{ padding: 0 }}>
        <div dangerouslySetInnerHTML={{ __html: article.content }} />
      </div>

      <Divider />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
        <Space size="middle">
           <Button 
             type={userVote === 1 ? 'primary' : 'default'} 
             icon={userVote === 1 ? <LikeFilled /> : <LikeOutlined />} 
             onClick={() => handleVote(1)}
             shape="round"
           >
             {likesCount}
           </Button>
           <Button 
             type={userVote === -1 ? 'primary' : 'default'} 
             danger={userVote === -1}
             icon={userVote === -1 ? <DislikeFilled /> : <DislikeOutlined />} 
             onClick={() => handleVote(-1)}
             shape="round"
           >
             {dislikesCount}
           </Button>
        </Space>

        <Space size="middle">
          <Text type="secondary">Поделиться:</Text>
          <Tooltip title="WhatsApp"><Button shape="circle" icon={<WhatsAppOutlined />} style={{ color: '#25D366', borderColor: '#25D366' }} onClick={() => handleShare('whatsapp')} /></Tooltip>
          <Tooltip title="Telegram"><Button shape="circle" icon={<SendOutlined />} style={{ color: '#0088cc', borderColor: '#0088cc' }} onClick={() => handleShare('telegram')} /></Tooltip>
          <Tooltip title="Facebook"><Button shape="circle" icon={<FacebookFilled />} style={{ color: '#1877F2', borderColor: '#1877F2' }} onClick={() => handleShare('facebook')} /></Tooltip>
          <Tooltip title="Скопировать ссылку"><Button shape="circle" icon={<CopyOutlined />} onClick={() => handleShare('copy')} /></Tooltip>
        </Space>
      </div>

      <Divider />
      
      {/* --- ИЗМЕНЕННАЯ ЧАСТЬ: КЛИКАБЕЛЬНЫЕ ТЕГИ --- */}
      {article.tags && article.tags.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ marginRight: 10 }}>Теги:</Text>
          {article.tags.map(tag => (
            <Link key={tag.id} to={`/search?q=${encodeURIComponent(tag.name)}`}>
              <Tag 
                color="geekblue" 
                style={{ cursor: 'pointer', transition: 'all 0.3s' }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                #{tag.name}
              </Tag>
            </Link>
          ))}
        </div>
      )}

      <Comments newsId={article.id} />
    </div>
  );
}

export default NewsArticle;