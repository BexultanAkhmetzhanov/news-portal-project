import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Row, Col, Card, Avatar, Typography, Tag, List, Divider, Spin, Space } from 'antd';
import { UserOutlined, TrophyOutlined, BookOutlined, CalendarOutlined, EyeOutlined } from '@ant-design/icons';
import apiClient from '../api/apiClient';
import { getImageUrl } from '../utils/imageUrl';

const { Title, Text, Paragraph } = Typography;

interface NewsItem {
  id: number;
  title: string;
  imageUrl: string | null;
  createdAt: string;
  view_count: number;
}

interface AuthorData {
  id: number;
  username: string;
  fullname: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  bio: string | null;
  education: string | null;
  awards: string | null;
  role: string;
}

function AuthorsPage() {
  const { id } = useParams<{ id: string }>();
  const [author, setAuthor] = useState<AuthorData | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get<{ author: AuthorData, news: NewsItem[] }>(`/author/${id}`);
        setAuthor(res.data.author);
        setNews(res.data.news);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div style={{textAlign:'center', marginTop: 50}}><Spin size="large"/></div>;
  if (!author) return <div style={{textAlign:'center', marginTop: 50}}>Автор не найден</div>;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px' }}>
      
      {/* Карточка профиля */}
      <Card bordered={false} style={{ marginBottom: 30, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Row gutter={[32, 32]} align="middle">
          <Col xs={24} md={6} style={{ textAlign: 'center' }}>
            <Avatar 
              size={180} 
              src={getImageUrl(author.avatarUrl)} 
              icon={<UserOutlined />}
              style={{ border: '4px solid #f0f2f5' }}
            />
          </Col>
          <Col xs={24} md={18}>
            <Space orientation="vertical" size={5} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Title level={2} style={{ margin: 0 }}>{author.fullname || author.username}</Title>
                <Tag color="blue">{author.jobTitle || (author.role === 'admin' ? 'Главный редактор' : 'Журналист')}</Tag>
              </div>
              
              {author.bio && (
                <Paragraph type="secondary" style={{ fontSize: 16, marginTop: 10 }}>
                  {author.bio}
                </Paragraph>
              )}

              <Row gutter={[16, 16]} style={{ marginTop: 10 }}>
                {author.education && (
                  <Col span={24}>
                    <Space align="start">
                      <BookOutlined style={{ color: '#1890ff', marginTop: 4 }} />
                      <div>
                        <Text strong>Образование:</Text>
                        <br />
                        <Text type="secondary">{author.education}</Text>
                      </div>
                    </Space>
                  </Col>
                )}
                {author.awards && (
                  <Col span={24}>
                    <Space align="start">
                      <TrophyOutlined style={{ color: '#faad14', marginTop: 4 }} />
                      <div>
                        <Text strong>Награды:</Text>
                        <br />
                        <Text type="secondary">{author.awards}</Text>
                      </div>
                    </Space>
                  </Col>
                )}
              </Row>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Убрали orientation="left", теперь разделитель будет по центру (стандартно), ошибки не будет */}
      <Divider>Публикации автора ({news.length})</Divider>

      {/* Список статей */}
      <List
        grid={{ gutter: 24, xs: 1, sm: 2, md: 3, lg: 3, xl: 3 }}
        dataSource={news}
        renderItem={(item) => (
          <List.Item>
            <Link to={`/news/${item.id}`}>
              <Card
                hoverable
                cover={
                  <div style={{ height: 200, overflow: 'hidden' }}>
                    <img 
                      alt={item.title} 
                      src={getImageUrl(item.imageUrl)} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                }
                bodyStyle={{ padding: 15 }}
              >
                <Title level={5} ellipsis={{ rows: 2 }} style={{ height: 46, marginBottom: 10 }}>
                  {item.title}
                </Title>
                <Space style={{ color: '#888', fontSize: 12 }}>
                  <span><CalendarOutlined /> {new Date(item.createdAt).toLocaleDateString()}</span>
                  <span><EyeOutlined /> {item.view_count}</span>
                </Space>
              </Card>
            </Link>
          </List.Item>
        )}
      />
    </div>
  );
}

export default AuthorsPage;