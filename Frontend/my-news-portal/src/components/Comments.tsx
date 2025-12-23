import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { 
  Avatar, Form, Button, Input, message, Typography, Card, Space, Spin 
} from 'antd';
import { UserOutlined, SendOutlined, MessageOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import relativeTime from 'dayjs/plugin/relativeTime';

// Настройка дат
dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Text, Title } = Typography;
const { TextArea } = Input;

interface Comment {
  id: number;
  news_id: number;
  author: string | null;
  content: string;
  createdAt: string;
}

interface CommentsProps {
  newsId: number;
}

function Comments({ newsId }: CommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [form] = Form.useForm();

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Comment[]>(`/news/${newsId}/comments`);
      if (Array.isArray(response.data)) {
        setComments(response.data);
      } else {
        setComments([]);
      }
    } catch (err) {
      console.error("Ошибка загрузки комментариев:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [newsId]);

  const onFinish = async (values: { content: string }) => {
    if (!user) return;

    try {
      setSubmitting(true);
      // 1. Отправляем запрос на сервер
      const response = await apiClient.post<any>(`/news/${newsId}/comments`, {
        content: values.content,
        author: user.username 
      });
      
      // 2. ФОРМИРУЕМ ОБЪЕКТ САМИ для мгновенного показа
      // Даже если сервер вернул не всё, мы берем текст из формы (values.content)
      // и имя из авторизации (user.username)
      const newComment: Comment = {
        id: response.data.id || Date.now(), // Берем ID от сервера или генерируем временный
        news_id: newsId,
        author: user.username, // Гарантированно ставим текущего юзера
        content: values.content, // Гарантированно ставим текст из формы
        createdAt: new Date().toISOString() // Ставим текущее время
      };

      // 3. Добавляем этот правильный объект в начало списка
      setComments([newComment, ...comments]);
      
      form.resetFields();
      message.success('Комментарий опубликован!');
    } catch (err) {
      console.error("Ошибка отправки:", err);
      message.error("Не удалось отправить комментарий");
    } finally {
      setSubmitting(false);
    }
  };

  const getAvatarColor = (name: string | null | undefined) => {
    if (!name) return '#f56a00';
    const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#1890ff', '#52c41a'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div style={{ marginTop: 40 }}>
      <Space align="center" style={{ marginBottom: 20 }}>
        <MessageOutlined style={{ fontSize: 24, color: '#1890ff' }} />
        <Title level={3} style={{ margin: 0 }}>Комментарии ({comments.length})</Title>
      </Space>

      {/* ФОРМА ОТПРАВКИ */}
      {user && (
        <Card 
          styles={{ body: { padding: '20px' } }}
          variant="borderless"
          style={{ marginBottom: 30, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} 
        >
          <div style={{ display: 'flex', gap: 15 }}>
            <Avatar 
              src={user.avatarUrl} 
              icon={<UserOutlined />} 
              style={{ backgroundColor: getAvatarColor(user.username), flexShrink: 0 }}
              size="large"
            />
            <div style={{ flex: 1 }}>
              <Text strong>{user.fullname || user.username}</Text>
              <Form form={form} onFinish={onFinish} style={{ marginTop: 10 }}>
                <Form.Item 
                  name="content" 
                  rules={[{ required: true, message: 'Напишите что-нибудь...' }]}
                  style={{ marginBottom: 10 }}
                >
                  <TextArea 
                    rows={3} 
                    placeholder="Написать комментарий..." 
                    style={{ resize: 'none', borderRadius: 8 }} 
                  />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={submitting} 
                    icon={<SendOutlined />}
                    shape="round"
                  >
                    Отправить
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </Card>
      )}

      {/* СПИСОК КОММЕНТАРИЕВ */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
      ) : (
        <div className="comments-list">
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              Нет комментариев. Будьте первым!
            </div>
          ) : (
            comments.map((item, index) => (
              <div 
                key={item.id || index} 
                style={{ 
                  display: 'flex', 
                  gap: 15, 
                  padding: '20px 0', 
                  borderBottom: '1px solid #f0f0f0' 
                }}
              >
                <Avatar 
                  icon={<UserOutlined />} 
                  style={{ backgroundColor: getAvatarColor(item.author), flexShrink: 0 }} 
                />
                
                <div style={{ flex: 1 }}>
                  <Space size={8} style={{ marginBottom: 5 }}>
                    <Text strong>{item.author || 'Аноним'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(item.createdAt).isValid() ? dayjs(item.createdAt).fromNow() : 'только что'}
                    </Text>
                  </Space>
                  <div style={{ 
                    color: '#262626', 
                    fontSize: '15px', 
                    lineHeight: '1.6',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {item.content}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Comments;