import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { getImageUrl } from '../utils/imageUrl';
import { 
  Avatar, Form, Button, Input, message, Typography, Card, Space, Spin, Popconfirm 
} from 'antd';
import { 
  UserOutlined, SendOutlined, MessageOutlined, RollbackOutlined,
  LikeOutlined, DislikeOutlined, LikeFilled, DislikeFilled, DownOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('ru');

const { Text, Title } = Typography;
const { TextArea } = Input;

// --- Интерфейсы ---
interface Comment {
  id: number;
  news_id: number;
  author: string | null;
  fullname?: string | null;
  content: string;
  createdAt: string;
  parent_id: number | null;
  likes: number;
  dislikes: number;
  user_vote: number;
  avatarUrl?: string | null;
  children?: Comment[];
}

interface CommentsResponse {
  data: Comment[];
  total: number;
}

interface CommentsProps { newsId: number; }

function Comments({ newsId }: CommentsProps) {
  const { user } = useAuth();
  
  // --- Состояния ---
  const [comments, setComments] = useState<Comment[]>([]);
  const [flatComments, setFlatComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalRoots, setTotalRoots] = useState(0);
  const [loadedRootsCount, setLoadedRootsCount] = useState(0);
  const [form] = Form.useForm();
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);

  // --- Загрузка данных ---
  const fetchComments = async (pageNum: number, isLoadMore = false) => {
    try {
      if (isLoadMore) setLoadingMore(true);
      else setLoading(true);

      const response = await apiClient.get<CommentsResponse>(`/news/${newsId}/comments`, {
        params: { page: pageNum, limit: 5 }
      });

      const newComments = response.data.data;
      setTotalRoots(response.data.total);

      setFlatComments(prev => {
        if (pageNum === 1) return newComments;
        const combined = [...prev, ...newComments];
        // Убираем дубликаты по ID
        const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
        return unique;
      });

    } catch (err) { console.error("Ошибка:", err); } finally { setLoading(false); setLoadingMore(false); }
  };

  useEffect(() => {
    setPage(1);
    setFlatComments([]);
    fetchComments(1, false);
  }, [newsId, user]);

  useEffect(() => {
    if (flatComments.length > 0) {
      const tree = buildCommentTree(flatComments);
      setComments(tree);
      setLoadedRootsCount(tree.length);
    } else {
      setComments([]);
      setLoadedRootsCount(0);
    }
  }, [flatComments]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage, true);
  };

  // --- Построение дерева ---
  const buildCommentTree = (items: Comment[]) => {
    const nodes = items.map(c => ({ ...c, children: [] }));
    const map: { [key: number]: Comment } = {};
    const roots: Comment[] = [];
    nodes.forEach(c => map[c.id] = c);
    // Сортируем корни: новые сверху
    nodes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    nodes.forEach(c => {
      if (c.parent_id && map[c.parent_id]) {
        map[c.parent_id].children?.push(c);
        // Сортируем ответы: старые сверху (хронология)
        map[c.parent_id].children?.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } else {
        if (!c.parent_id) roots.push(c);
      }
    });
    return roots;
  };

  // --- Действия ---
  const onFinish = async (values: { content: string }) => {
    if (!user) return;
    try {
      setSubmitting(true);
      const res = await apiClient.post<any>(`/news/${newsId}/comments`, {
        content: values.content,
        author: user.username,
        parent_id: replyTo ? replyTo.id : null
      });

      const newComment = {
        ...res.data,
        likes: 0, dislikes: 0, user_vote: 0,
        fullname: user.fullname,
        avatarUrl: user.avatarUrl
      };
      setFlatComments(prev => [newComment, ...prev]);
      form.resetFields();
      setReplyTo(null);
      message.success('Комментарий опубликован!');
    } catch (err) { message.error("Не удалось отправить"); } finally { setSubmitting(false); }
  };

  const handleVote = async (commentId: number, value: number) => {
    if (!user) { message.warning('Войдите, чтобы голосовать'); return; }
    try {
       await apiClient.post(`/comments/${commentId}/vote`, { value });
       // Перезагружаем текущую страницу для актуализации лайков
       const response = await apiClient.get<CommentsResponse>(`/news/${newsId}/comments`, {
          params: { page: 1, limit: page * 5 } 
       });
       setFlatComments(response.data.data);
    } catch (err) { message.error('Ошибка голосования'); }
  };

  const handleDelete = async (commentId: number) => {
    try {
      await apiClient.delete(`/comments/${commentId}`);
      message.success('Комментарий удален');
      setFlatComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
    } catch (err) {
      console.error(err);
      message.error('Не удалось удалить');
    }
  };

  // --- Хелперы ---
  const getAvatarColor = (name: string | null | undefined) => {
    if (!name) return '#f56a00';
    const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#1890ff', '#52c41a'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
    return colors[Math.abs(hash) % colors.length];
  };

  const getDisplayName = (item: Comment) => item.fullname || item.author || 'Аноним';

  // --- Рендер комментария (ИЗМЕНЕН) ---
  const renderComment = (item: Comment, level = 0) => (
    <div key={item.id} style={{ paddingLeft: level * 40, marginTop: 15 }}>
      <div style={{ display: 'flex', gap: 15 }}>
        {/* Аватарка слева */}
        <Avatar 
          src={item.avatarUrl ? getImageUrl(item.avatarUrl) : undefined} 
          icon={!item.avatarUrl && <UserOutlined />} 
          style={{ backgroundColor: item.avatarUrl ? 'transparent' : getAvatarColor(item.author), flexShrink: 0 }} 
        />
        
        {/* Основной блок комментария */}
        <div style={{ flex: 1 }}>
          <div style={{ background: '#f5f5f5', padding: '12px 15px', borderRadius: '12px' }}>
             
             {/* --- ШАПКА КОММЕНТАРИЯ (Flexbox для разделения) --- */}
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                
                {/* Слева: Имя и Время */}
                <Space size={8} style={{ flexWrap: 'wrap' }}>
                   <Text strong>{getDisplayName(item)}</Text>
                   <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(item.createdAt).fromNow()}</Text>
                </Space>

                {/* Справа: Кнопка удаления (Только для админа) */}
                {user?.role === 'admin' && (
                  <Popconfirm
                    title="Удалить комментарий?"
                    description="Это действие необратимо."
                    onConfirm={() => handleDelete(item.id)}
                    okText="Да"
                    cancelText="Нет"
                  >
                    <Button 
                      type="text" 
                      danger 
                      size="small" 
                      icon={<DeleteOutlined />} 
                      // Небольшой отрицательный отступ, чтобы компенсировать внутренние отступы кнопки
                      style={{ margin: '-4px -8px 0 0' }} 
                    />
                  </Popconfirm>
               )}
             </div>
             {/* -------------------------------------------------- */}

             <div style={{ whiteSpace: 'pre-wrap' }}>{item.content}</div>
          </div>
          
          {/* Блок действий снизу (Лайки, Ответить) */}
          <div style={{ marginTop: 4, marginLeft: 5, display: 'flex', gap: 15, alignItems: 'center' }}>
             <Space size={4}>
                <Button type="text" size="small" icon={item.user_vote === 1 ? <LikeFilled style={{ color: '#1890ff' }} /> : <LikeOutlined />} onClick={() => handleVote(item.id, 1)} style={{ color: item.user_vote === 1 ? '#1890ff' : 'inherit' }}>{item.likes > 0 ? item.likes : ''}</Button>
                <Button type="text" size="small" icon={item.user_vote === -1 ? <DislikeFilled style={{ color: '#ff4d4f' }} /> : <DislikeOutlined />} onClick={() => handleVote(item.id, -1)} style={{ color: item.user_vote === -1 ? '#ff4d4f' : 'inherit' }}>{item.dislikes > 0 ? item.dislikes : ''}</Button>
             </Space>
             <Text type="secondary" style={{ fontSize: 12, cursor: 'pointer', fontWeight: 500 }} onClick={() => setReplyTo({ id: item.id, name: getDisplayName(item) })}>Ответить</Text>
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
        <Title level={3} style={{ margin: 0 }}>Комментарии ({totalRoots > 0 ? totalRoots : 0})</Title>
      </Space>

      {/* Форма отправки */}
      {user && (
        <Card styles={{ body: { padding: '20px' } }} variant="borderless" style={{ marginBottom: 30, background: '#fafafa' }}>
          {replyTo && (
            <div style={{ marginBottom: 10, padding: '5px 10px', background: '#e6f7ff', borderLeft: '3px solid #1890ff', display: 'flex', justifyContent: 'space-between' }}>
               <Text>Ответ пользователю <b>{replyTo.name}</b></Text>
               <Button type="text" size="small" icon={<RollbackOutlined />} onClick={() => setReplyTo(null)}>Отмена</Button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 15 }}>
            <Avatar src={user.avatarUrl ? getImageUrl(user.avatarUrl) : undefined} icon={!user.avatarUrl && <UserOutlined />} style={{ backgroundColor: user.avatarUrl ? 'transparent' : getAvatarColor(user.username) }} size="large"/>
            <div style={{ flex: 1 }}>
              <Form form={form} onFinish={onFinish}>
                <Form.Item name="content" rules={[{ required: true, message: 'Напишите что-нибудь...' }]} style={{ marginBottom: 10 }}>
                  <TextArea rows={2} placeholder={replyTo ? `Ответ для ${replyTo.name}...` : "Написать комментарий..."} style={{ borderRadius: 8 }} />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                  <Button type="primary" htmlType="submit" loading={submitting} icon={<SendOutlined />} shape="round">{replyTo ? 'Ответить' : 'Отправить'}</Button>
                </Form.Item>
              </Form>
            </div>
          </div>
        </Card>
      )}

      {loading ? <div style={{ textAlign: 'center' }}><Spin /></div> : (
        <div className="comments-list">
          {comments.length === 0 ? <p style={{ color: '#999', textAlign: 'center' }}>Нет комментариев.</p> : comments.map(root => renderComment(root))}
          
          {/* Кнопка "Загрузить еще" */}
          {loadedRootsCount < totalRoots && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <Button onClick={handleLoadMore} loading={loadingMore} type="dashed" shape="round" icon={<DownOutlined />}>
                Загрузить еще комментарии
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Comments;