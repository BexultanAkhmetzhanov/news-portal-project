// src/components/Profile.tsx
import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';

// (Этот интерфейс дублируется из AuthContext, но это нормально)
interface UserProfile {
  id: number;
  username: string;
  role: string;
  fullname: string | null;
  avatarUrl: string | null;
}

function Profile() {
  const { user, login } = useAuth(); // login - это наш "setUser"
  const [fullname, setFullname] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);

  // 1. При загрузке страницы, берем свежие данные с сервера
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        // Используем новый API, который мы создали
        const response = await apiClient.get<UserProfile>('/api/profile'); 
        
        // Заполняем стейты формы
        setFullname(response.data.fullname || '');
        setAvatarUrl(response.data.avatarUrl || '');
        
        // Также обновляем AuthContext (на случай, если он устарел)
        login(response.data); 

      } catch (err) {
        console.error(err);
        setError('Не удалось загрузить профиль.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [login]); // Добавляем login в зависимости

  // 2. Обработчик сохранения
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    try {
      // Используем PUT
      const response = await apiClient.put<{ message: string, user: UserProfile }>(
        '/api/profile',
        {
          fullname: fullname,
          avatarUrl: avatarUrl
        }
      );
      
      // 3. Обновляем глобальное состояние (AuthContext)
      login(response.data.user);
      setSuccess(response.data.message);

    } catch (err) {
      console.error(err);
      setError('Ошибка при обновлении профиля.');
    }
  };

  if (loading) return <p>Загрузка профиля...</p>;
  if (!user) return <p>Вы не авторизованы.</p>; // Должно сработать раньше, но для подстраховки

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto' }}>
      <h2>Личный кабинет: {user.username}</h2>
      
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <img 
          src={avatarUrl || 'https://placehold.co/150'} // Новая заглушка
          alt="Avatar"
          style={{ 
            width: '150px', 
            height: '150px', 
            borderRadius: '50%', 
            objectFit: 'cover' 
          }}
        />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px' }}>
        <input
          type="text"
          placeholder="Имя Фамилия"
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
        />
        <input
          type="text"
          placeholder="URL аватара (http://...)"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
        />
        
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}

        <button type="submit">Сохранить</button>
      </form>
    </div>
  );
}

export default Profile;