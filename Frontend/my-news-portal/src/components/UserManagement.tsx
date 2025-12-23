import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { Table, Select, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'editor' | 'user';
  fullname: string | null;
}

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<User[]>('/admin/users');
      setUsers(response.data);
    } catch (err) {
      message.error('Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: number, newRole: string) => {
    // Оптимистичное обновление
    const oldUsers = [...users];
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));

    try {
      await apiClient.put(`/admin/users/${userId}/role`, { role: newRole });
      message.success('Роль обновлена');
    } catch (err) {
      message.error('Ошибка обновления роли');
      setUsers(oldUsers); // Откат
    }
  };

  const columns: ColumnsType<User> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { 
      title: 'Пользователь', 
      dataIndex: 'username',
      render: (text, record) => (
        <div>
           <div style={{ fontWeight: 'bold' }}>{text}</div>
           <div style={{ fontSize: '0.8em', color: '#888' }}>{record.fullname || 'Без имени'}</div>
        </div>
      )
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      render: (role, record) => (
        <Select
          value={role}
          style={{ width: 120 }}
          onChange={(val) => handleRoleChange(record.id, val)}
          options={[
            { value: 'user', label: <Tag>User</Tag> },
            { value: 'editor', label: <Tag color="blue">Editor</Tag> },
            { value: 'admin', label: <Tag color="red">Admin</Tag> },
          ]}
        />
      ),
    },
  ];

  return (
    <Table 
      dataSource={users} 
      columns={columns} 
      rowKey="id" 
      loading={loading} 
      pagination={{ pageSize: 10 }}
    />
  );
}

export default UserManagement;