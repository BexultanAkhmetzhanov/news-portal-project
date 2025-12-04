// src/components/Comments.tsx
import { useState, useEffect, type FormEvent } from 'react';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext'; // 1. Импортируем useAuth

interface Comment {
  id: number;
  news_id: number;
  author: string;
  content: string;
  createdAt: string;
}
interface CommentsProps {
  newsId: number;
}

function Comments({ newsId }: CommentsProps) {
  const { user } = useAuth(); // 2. Получаем текущего пользователя

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [newAuthor, setNewAuthor] = useState('');
  const [newContent, setNewContent] = useState('');
  const [postError, setPostError] = useState<string | null>(null);
  
  // 3. Состояние, чтобы знать, вошел ли юзер (для блокировки поля)
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 4. Загрузка комментариев (без изменений)
  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<Comment[]>(`/news/${newsId}/comments`);
      setComments(response.data);
    } catch (err) {
      console.error("Ошибка загрузки комментариев:", err);
      setError("Не удалось загрузить комментарии.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [newsId]);

  // 5. Эффект для авто-заполнения имени
  useEffect(() => {
    if (user) {
      setNewAuthor(user.username);
      setIsLoggedIn(true);
    } else {
      setNewAuthor(''); // Если вышел, очищаем
      setIsLoggedIn(false);
    }
  }, [user]); // Запускается, когда 'user' меняется

  // 6. Обновленный обработчик отправки
  const handleSubmitComment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 6.1. Если автор не указан (и не залогинен), ставим "Аноним"
    const authorToSend = (newAuthor.trim() === '') ? 'Аноним' : newAuthor;
    
    if (!newContent.trim()) {
      setPostError("Комментарий не может быть пустым.");
      return;
    }

    try {
      setPostError(null);
      const response = await apiClient.post<Comment>(`/news/${newsId}/comments`, {
        author: authorToSend, // 6.2. Отправляем 'Аноним' или имя
        content: newContent,
      });
      
      // Обновляем список комментов
      setComments([...comments, response.data]);
      
      // 6.3. Очищаем поля (но не имя, если залогинен)
      if (!isLoggedIn) {
        setNewAuthor('');
      }
      setNewContent('');

    } catch (err) {
      console.error("Ошибка отправки комментария:", err);
      setPostError("Не удалось отправить комментарий.");
    }
  };

  return (
    <section className="comments-section" style={{ marginTop: '30px', borderTop: '1px solid #ccc', paddingTop: '15px' }}>
      <h3>Комментарии</h3>

      <form onSubmit={handleSubmitComment} style={{ display: 'grid', gap: '10px', maxWidth: '400px', marginBottom: '20px' }}>
        
        {/* 7. Обновленное поле "Имя" */}
        <input
          type="text"
          placeholder={isLoggedIn ? '' : "Ваше имя (или Аноним)"}
          value={newAuthor}
          onChange={(e) => setNewAuthor(e.target.value)}
          disabled={isLoggedIn} // 7.1. Блокируем, если вошел
          style={isLoggedIn ? { backgroundColor: '#eee' } : {}} // 7.2. Делаем серым
        />
        
        <textarea
          rows={4}
          placeholder="Ваш комментарий..."
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
        />
        {postError && <p style={{ color: 'red' }}>{postError}</p>}
        <button type="submit">Отправить</button>
      </form>

      {/* Список комментариев (без изменений) */}
      {loading && <p>Загрузка комментариев...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <div className="comments-list">
        {comments.length === 0 && !loading && (
          <p>Комментариев пока нет. Будьте первым!</p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
            <strong>{comment.author}</strong>
            <small style={{ marginLeft: '10px', color: '#777' }}>
              {new Date(comment.createdAt).toLocaleString()}
            </small>
            <p style={{ 
                margin: '5px 0 0 0', 
                whiteSpace: 'pre-wrap',      /* Сохраняет переносы строк (Enter) */
                overflowWrap: 'anywhere',    /* Принудительно ломает длинные слова */
                wordBreak: 'break-word'      /* Дополнительная страховка для старых браузеров */
            }}>{comment.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Comments;