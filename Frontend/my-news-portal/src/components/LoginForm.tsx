import { useState, type FormEvent } from 'react';  
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';  

interface LoginResponse {
  token: string;
}
interface User {
  id: number;
  username: string;
  role: string;
}
interface LoginResponse {
  user: User;
}
function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();  

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setError('');
  try {
    const response = await apiClient.post<LoginResponse>('/login', {
      username,
      password,
    });

    const { user } = response.data;
    localStorage.setItem('user', JSON.stringify(user));

    navigate('/admin');

  } catch (err: any) {
    console.error(err);
    setError('Ошибка входа. Проверьте логин или пароль.');
  }
};

  return (
    <div>
      <h2>Вход для Админа</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Логин: </label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
          />
        </div>
        <div>
          <label>Пароль: </label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">Войти</button>
      </form>
    </div>
  );
}

export default LoginForm;