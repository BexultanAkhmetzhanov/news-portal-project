import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';
import { 
  Card, Avatar, Typography, Tag, Row, Col, Tabs, 
  Form, Input, Button, message, Statistic, Divider, Space 
} from 'antd';
import { 
  UserOutlined, MailOutlined, SafetyOutlined, 
  LockOutlined, SaveOutlined, EditOutlined, CrownOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

function Profile() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formProfile] = Form.useForm();
  const [formPassword] = Form.useForm();

  // Заполняем форму текущими данными при загрузке
  useEffect(() => {
    if (user) {
      formProfile.setFieldsValue({
        username: user.username,
        fullname: user.fullname || '', // Предполагаем, что fullname может быть в объекте user
      });
    }
  }, [user, formProfile]);

  // Обработчик обновления профиля
  const handleUpdateProfile = async (values: any) => {
    setLoading(true);
    try {
      // Пример запроса (нужно реализовать на бэкенде)
      await apiClient.put(`/users/${user?.id}`, { 
        fullname: values.fullname 
      });
      message.success('Профиль обновлен!');
    } catch (err) {
      console.error(err);
      message.error('Ошибка обновления профиля');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик смены пароля
  const handleChangePassword = async (values: any) => {
    setLoading(true);
    try {
      // Пример запроса (нужно реализовать на бэкенде)
      await apiClient.put(`/users/${user?.id}/password`, { 
        password: values.newPassword 
      });
      message.success('Пароль успешно изменен');
      formPassword.resetFields();
    } catch (err) {
      console.error(err);
      message.error('Ошибка при смене пароля');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div style={{ padding: 50, textAlign: 'center' }}>Загрузка...</div>;

  // Определение цвета роли
  const getRoleColor = (role: string) => {
    if (role === 'admin') return 'red';
    if (role === 'editor') return 'blue';
    return 'green';
  };

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return <CrownOutlined />;
    if (role === 'editor') return <EditOutlined />;
    return <UserOutlined />;
  };

  // Вкладки справа
  const tabItems = [
    {
      key: '1',
      label: <span><UserOutlined />Личные данные</span>,
      children: (
        <Form
          form={formProfile}
          layout="vertical"
          onFinish={handleUpdateProfile}
          initialValues={{ username: user.username }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="Имя пользователя (Логин)">
                <Input prefix={<UserOutlined />} disabled value={user.username} />
                <Text type="secondary" style={{ fontSize: '12px' }}>Логин изменить нельзя</Text>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item 
                name="fullname" 
                label="Полное имя"
                rules={[{ max: 50, message: 'Слишком длинное имя' }]}
              >
                <Input placeholder="Иван Иванов" prefix={<EditOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              Сохранить изменения
            </Button>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: '2',
      label: <span><SafetyOutlined />Безопасность</span>,
      children: (
        <Form
          form={formPassword}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            name="newPassword"
            label="Новый пароль"
            rules={[
              { required: true, message: 'Введите новый пароль' },
              { min: 6, message: 'Минимум 6 символов' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Новый пароль" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Подтвердите пароль"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Подтвердите пароль' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Пароли не совпадают!'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Повторите пароль" />
          </Form.Item>

          <Form.Item>
            <Button danger htmlType="submit" icon={<LockOutlined />} loading={loading}>
              Сменить пароль
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '40px auto', padding: '0 20px' }}>
      <Row gutter={[24, 24]}>
        
        {/* ЛЕВАЯ КОЛОНКА: Карточка пользователя */}
        <Col xs={24} md={8}>
          <Card 
            hoverable
            style={{ textAlign: 'center' }}
            cover={
              <div style={{ 
                height: 120, 
                background: 'linear-gradient(135deg, var(--tengri-green) 0%, #004d40 100%)',
                borderRadius: '8px 8px 0 0'
              }} />
            }
          >
            <div style={{ marginTop: -60, marginBottom: 20 }}>
              <Avatar 
                size={100} 
                icon={<UserOutlined />} 
                style={{ 
                  backgroundColor: '#fde3cf', 
                  color: '#f56a00',
                  border: '4px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }} 
              />
            </div>
            
            <Title level={3} style={{ marginBottom: 5 }}>{user.fullname || user.username}</Title>
            <Tag color={getRoleColor(user.role)} icon={getRoleIcon(user.role)} style={{ padding: '5px 10px', fontSize: '14px', marginBottom: 20 }}>
              {user.role.toUpperCase()}
            </Tag>

            <Divider />

            <div style={{ textAlign: 'left' }}>
               <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MailOutlined style={{ color: '#888' }} />
                    <Text>user@{user.username}.com</Text> {/* Заглушка, если нет реального email */}
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <SafetyOutlined style={{ color: '#888' }} />
                    <Text>ID Аккаунта: {user.id}</Text>
                 </div>
               </Space>
            </div>
            
            <Divider />
            
            <Button block onClick={logout}>Выйти</Button>
          </Card>
        </Col>

        {/* ПРАВАЯ КОЛОНКА: Настройки */}
        <Col xs={24} md={16}>
          <Card>
            <Tabs defaultActiveKey="1" items={tabItems} size="large" />
          </Card>

          {/* Пример блока статистики (можно убрать, если не нужно) */}
          {(user.role === 'admin' || user.role === 'editor') && (
            <Card style={{ marginTop: 24 }} title="Ваша статистика">
              <Row gutter={16} style={{ textAlign: 'center' }}>
                <Col span={12}>
                  <Statistic title="Опубликовано новостей" value={12} prefix={<EditOutlined />} />
                </Col>
                <Col span={12}>
                  <Statistic title="Рейтинг редактора" value={4.8} suffix="/ 5" groupSeparator="," />
                </Col>
              </Row>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}

export default Profile;