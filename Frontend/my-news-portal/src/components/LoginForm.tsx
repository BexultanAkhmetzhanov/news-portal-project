// src/components/LoginForm.tsx
import { useState, type FormEvent } from 'react';  
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';  
import { useAuth } from '../context/AuthContext'; // 1. Импортируем хук

// Простой CSS для табов (вкладки Вход/Регистрация)
const tabStyles = {
  display: 'flex',
  marginBottom: '15px',
  borderBottom: '1px solid var(--border-color)',
};
const tabButton = {
  padding: '10px 15px',
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: '1.1rem',
  color: 'var(--text-secondary)',
};
const activeTabButton = {
  ...tabButton,
  color: 'var(--tengri-green)',
  borderBottom: '2px solid var(--tengri-green)',
  fontWeight: 600,
};
// ----------------

type FormMode = 'login' | 'register';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // Для сообщения об успехе регистрации
  
  const [mode, setMode] = useState<FormMode>('login'); // 'login' или 'register'
  
  const navigate = useNavigate();  
  const { login } = useAuth(); // 2. Получаем функцию login из контекста

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'login') {
      // --- Логика ВХОДА ---
      try {
        const response = await apiClient.post('/login', { username, password });
        // 3. Используем функцию login из контекста
        login(response.data.user);
        navigate('/admin'); // Переходим в админку
      } catch (err: any) {
        console.error(err);
        setError('Ошибка входа. Проверьте логин или пароль.');
      }
    } else {
      // --- Логика РЕГИСТРАЦИИ ---
      try {
        await apiClient.post('/register', { username, password });
        setSuccess('Пользователь успешно создан! Теперь вы можете войти.');
        setMode('login'); // Переключаем на вкладку входа
        setUsername(''); // Очищаем поля
        setPassword('');
      } catch (err: any) {
        console.error(err);
        if (err.response && err.response.status === 409) {
          setError('Это имя пользователя уже занято.');
        } else {
          setError('Ошибка при регистрации.');
        }
      }
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '20px auto' }}>
      
      {/* Переключатель Вход/Регистрация */}
      <div style={tabStyles}>
        <button 
          style={mode === 'login' ? activeTabButton : tabButton}
          onClick={() => setMode('login')}
        >
          Вход
        </button>
        <button
          style={mode === 'register' ? activeTabButton : tabButton}
          onClick={() => setMode('register')}
        >
          Регистрация
        </button>
      </div>

      <h2>{mode === 'login' ? 'Вход для админа' : 'Регистрация'}</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px' }}>
        <div>
          <label>Логин: </label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label>Пароль: </label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            style={{ width: '100%' }}
          />
        </div>
        
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}
        
        <button type="submit" style={{ padding: '10px', background: 'var(--tengri-green)', color: 'white', border: 'none' }}>
          {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>
    </div>
  );
}

export default LoginForm;