// src/components/Comments.tsx
import { useState, useEffect, type FormEvent } from 'react';
import apiClient from '../api/apiClient';
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAuthor, setNewAuthor] = useState('');
  const [newContent, setNewContent] = useState('');
  const [postError, setPostError] = useState<string | null>(null);

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
  const handleSubmitComment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newAuthor.trim() || !newContent.trim()) {
      setPostError("Имя и комментарий обязательны.");
      return;
    }

    try {
      setPostError(null);
      const response = await apiClient.post<Comment>(`/news/${newsId}/comments`, {
        author: newAuthor,
        content: newContent,
      });
      setComments([...comments, response.data]);
      setNewAuthor('');
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
        <input
          type="text"
          placeholder="Ваше имя"
          value={newAuthor}
          onChange={(e) => setNewAuthor(e.target.value)}
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
            <p style={{ margin: '5px 0 0 0' }}>{comment.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Comments;