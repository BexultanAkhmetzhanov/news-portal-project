// src/components/UserManagement.tsx
import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'editor';
  fullname: string | null;
}

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<User[]>('/admin/users');
      setUsers(response.data);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить пользователей.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Загружаем пользователей при открытии
  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. Обработчик смены роли
  const handleRoleChange = async (userId: number, newRole: string) => {
    if (newRole !== 'admin' && newRole !== 'editor' && newRole !== 'user') return;

    // Оптимистичное обновление UI
    const originalUsers = [...users];
    const newUsers = users.map(u => 
      u.id === userId ? { ...u, role: newRole as 'admin' | 'editor' } : u
    );
    setUsers(newUsers);

    try {
      // Отправляем запрос на бэкенд
      await apiClient.put(`/admin/users/${userId}/role`, { role: newRole });
      // Роль уже обновлена в UI
    } catch (err) {
      console.error('Ошибка обновления роли:', err);
      setError('Не удалось обновить роль. Попробуйте снова.');
      // Откатываем изменения в UI
      setUsers(originalUsers);
    }
  };

  if (loading) return <p>Загрузка пользователей...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <section>
      <h3>Управление Пользователями</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {users.map((user) => (
          <li 
            key={user.id} 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '8px', 
              borderBottom: '1px solid #eee' 
            }}
          >
            <span>
              <strong>{user.username}</strong> ({user.fullname || 'Имя не указано'})
            </span>
            <select 
              value={user.role} 
              onChange={(e) => handleRoleChange(user.id, e.target.value)}
              style={{ padding: '5px' }}
            >
                <option value="user">User</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default UserManagement;