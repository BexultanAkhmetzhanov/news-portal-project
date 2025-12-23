import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../utils/imageUrl';
import { 
  Avatar, Form, Button, Input, message, Typography, Card, Space, Spin, theme 
} from 'antd';
import { 
  UserOutlined, SendOutlined, MessageOutlined, RollbackOutlined,
  LikeOutlined, DislikeOutlined, LikeFilled, DislikeFilled
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Text, Title } = Typography;
const { TextArea } = Input;

interface Comment {
  id: number;
  news_id: number;
  author: string | null;
  fullname?: string | null; // <--- НОВОЕ ПОЛЕ
  content: string;
  createdAt: string;
  parent_id: number | null;
  likes: number;
  dislikes: number;
  user_vote: number;
  avatarUrl?: string | null;
  children?: Comment[];
}

interface CommentsProps { newsId: number; }

function Comments({ newsId }: CommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Comment[]>(`/news/${newsId}/comments`);
      if (Array.isArray(response.data)) {
        setComments(buildCommentTree(response.data));
      } else { setComments([]); }
    } catch (err) { console.error("Ошибка:", err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchComments(); }, [newsId, user]);

  const buildCommentTree = (flatComments: Comment[]) => {
    const nodes = flatComments.map(c => ({ ...c, children: [] }));
    const map: { [key: number]: Comment } = {};
    const roots: Comment[] = [];
    
    nodes.forEach(c => map[c.id] = c);
    nodes.forEach(c => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].children?.push(c);
      } else {
        roots.push(c);
      }
    });
    return roots;
  };

  const onFinish = async (values: { content: string }) => {
    if (!user) return;
    try {
      setSubmitting(true);
      await apiClient.post<any>(`/news/${newsId}/comments`, {
        content: values.content,
        author: user.username,
        parent_id: replyTo ? replyTo.id : null
      });
      fetchComments(); 
      form.resetFields();
      setReplyTo(null);
      message.success('Комментарий опубликован!');
    } catch (err) { message.error("Не удалось отправить"); } finally { setSubmitting(false); }
  };

  const handleVote = async (commentId: number, value: number) => {
    if (!user) {
      message.warning('Войдите, чтобы голосовать');
      return;
    }
    try {
       await apiClient.post(`/comments/${commentId}/vote`, { value });
       // Тихая перезагрузка
       const response = await apiClient.get<Comment[]>(`/news/${newsId}/comments`);
       if (Array.isArray(response.data)) {
         setComments(buildCommentTree(response.data));
       }
    } catch (err) {
      message.error('Ошибка голосования');
    }
  };

  const getAvatarColor = (name: string | null | undefined) => {
    if (!name) return '#f56a00';
    const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#1890ff', '#52c41a'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
    return colors[Math.abs(hash) % colors.length];
  };

  // Хелпер для отображения имени
  const getDisplayName = (item: Comment) => {
    // Если есть ФИО - показываем его, иначе логин, иначе 'Аноним'
    return item.fullname || item.author || 'Аноним';
  };

  const renderComment = (item: Comment, level = 0) => (
    <div key={item.id} style={{ paddingLeft: level * 40, marginTop: 15 }}>
      <div style={{ display: 'flex', gap: 15 }}>
        
        <Avatar 
          src={item.avatarUrl ? getImageUrl(item.avatarUrl) : undefined} 
          icon={!item.avatarUrl && <UserOutlined />} 
          style={{ 
            backgroundColor: item.avatarUrl ? 'transparent' : getAvatarColor(item.author), 
            flexShrink: 0 
          }} 
        />

        <div style={{ flex: 1 }}>
          <div style={{ background: '#f5f5f5', padding: '10px 15px', borderRadius: '12px', display: 'inline-block' }}>
             <Space size={8}>
                {/* ИСПОЛЬЗУЕМ ФИО ИЛИ ЛОГИН */}
                <Text strong>{getDisplayName(item)}</Text>
                
                <Text type="secondary" style={{ fontSize: 11 }}>
                   {dayjs(item.createdAt).isValid() ? dayjs(item.createdAt).fromNow() : ''}
                </Text>
             </Space>
             <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{item.content}</div>
          </div>
          
          <div style={{ marginTop: 4, marginLeft: 5, display: 'flex', gap: 15, alignItems: 'center' }}>
             <Space size={4}>
                <Button 
                  type="text" 
                  size="small"
                  icon={item.user_vote === 1 ? <LikeFilled style={{ color: '#1890ff' }} /> : <LikeOutlined />}
                  onClick={() => handleVote(item.id, 1)}
                  style={{ color: item.user_vote === 1 ? '#1890ff' : 'inherit' }}
                >
                  {item.likes > 0 ? item.likes : ''}
                </Button>
                <Button 
                  type="text" 
                  size="small"
                  icon={item.user_vote === -1 ? <DislikeFilled style={{ color: '#ff4d4f' }} /> : <DislikeOutlined />}
                  onClick={() => handleVote(item.id, -1)}
                  style={{ color: item.user_vote === -1 ? '#ff4d4f' : 'inherit' }}
                >
                  {item.dislikes > 0 ? item.dislikes : ''}
                </Button>
             </Space>

             <Text 
               type="secondary" 
               style={{ fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
               onClick={() => setReplyTo({ id: item.id, name: getDisplayName(item) })}
             >
               Ответить
             </Text>
          </div>
        </div>
      </div>
      {item.children && item.children.map(child => renderComment(child, level + 1))}
    </div>
  );

  return (
    <div style={{ marginTop: 40 }}>
      <Space align="center" style={{ marginBottom: 20 }}>
        <MessageOutlined style={{ fontSize: 24, color: '#1890ff' }} />
        <Title level={3} style={{ margin: 0 }}>Комментарии ({comments.length > 0 ? 'Обсуждение' : 0})</Title>
      </Space>

      {user && (
        <Card styles={{ body: { padding: '20px' } }} variant="borderless" style={{ marginBottom: 30, background: '#fafafa' }}>
          {replyTo && (
            <div style={{ marginBottom: 10, padding: '5px 10px', background: '#e6f7ff', borderLeft: '3px solid #1890ff', display: 'flex', justifyContent: 'space-between' }}>
               <Text>Ответ пользователю <b>{replyTo.name}</b></Text>
               <Button type="text" size="small" icon={<RollbackOutlined />} onClick={() => setReplyTo(null)}>Отмена</Button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 15 }}>
            
            <Avatar 
              src={user.avatarUrl ? getImageUrl(user.avatarUrl) : undefined} 
              icon={!user.avatarUrl && <UserOutlined />} 
              style={{ backgroundColor: user.avatarUrl ? 'transparent' : getAvatarColor(user.username) }} 
              size="large"
            />

            <div style={{ flex: 1 }}>
              <Space style={{ marginBottom: 8 }} align="center">
                 {/* Тут тоже показываем ФИО текущего юзера */}
                 <Text strong>{user.fullname || user.username}</Text>
              </Space>

              <Form form={form} onFinish={onFinish}>
                <Form.Item name="content" rules={[{ required: true, message: 'Напишите что-нибудь...' }]} style={{ marginBottom: 10 }}>
                  <TextArea rows={2} placeholder={replyTo ? `Ответ для ${replyTo.name}...` : "Написать комментарий..."} style={{ borderRadius: 8 }} />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Button type="primary" htmlType="submit" loading={submitting} icon={<SendOutlined />} shape="round">
                    {replyTo ? 'Ответить' : 'Отправить'}
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </Card>
      )}

      {loading ? <div style={{ textAlign: 'center' }}><Spin /></div> : (
        <div className="comments-list">
          {comments.length === 0 ? <p style={{ color: '#999', textAlign: 'center' }}>Нет комментариев.</p> : comments.map(root => renderComment(root))}
        </div>
      )}
    </div>
  );
}

export default Comments;