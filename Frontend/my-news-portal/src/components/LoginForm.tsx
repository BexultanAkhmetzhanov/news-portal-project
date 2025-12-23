// src/components/LoginForm.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { 
  Form, Input, Button, Card, Tabs, message, Typography, Space 
} from 'antd';
import { 
  UserOutlined, LockOutlined, LoginOutlined, UserAddOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

type FormMode = 'login' | 'register';

function LoginForm() {
  const [mode, setMode] = useState<FormMode>('login');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Ant Design Form instance
  const [form] = Form.useForm();

  // Единый обработчик для Входа и Регистрации
  const onFinish = async (values: any) => {
    setLoading(true);
    const { username, password } = values;

    if (mode === 'login') {
      // --- ВХОД ---
      try {
        const response = await apiClient.post('/login', { username, password });
        login(response.data.user);
        message.success('Добро пожаловать!');
        navigate('/admin');
      } catch (err: any) {
        console.error(err);
        message.error('Ошибка входа. Проверьте логин или пароль.');
      } finally {
        setLoading(false);
      }
    } else {
      // --- РЕГИСТРАЦИЯ ---
      try {
        await apiClient.post('/register', { username, password });
        message.success('Регистрация успешна! Теперь войдите.');
        
        // Переключаемся на вкладку входа
        setMode('login');
        form.resetFields(); 
      } catch (err: any) {
        console.error(err);
        if (err.response && err.response.status === 409) {
          message.warning('Это имя пользователя уже занято.');
        } else {
          message.error('Ошибка при регистрации.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Конфигурация вкладок (Tabs)
  const tabItems = [
    {
      key: 'login',
      label: (
        <Space>
          <LoginOutlined />
          <span>Вход</span>
        </Space>
      ),
    },
    {
      key: 'register',
      label: (
        <Space>
          <UserAddOutlined />
          <span>Регистрация</span>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#fffff', 
      padding: '20px'
    }}>
      <Card 
        style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        variant="borderless"
      >
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Title level={3} style={{ marginBottom: 5 }}>News Portal</Title>
          <Text type="secondary">
            {mode === 'login' ? 'Войдите, чтобы управлять новостями' : 'Создайте новый аккаунт'}
          </Text>
        </div>

        <Tabs 
          activeKey={mode} 
          onChange={(key) => setMode(key as FormMode)} 
          centered
          items={tabItems}
          style={{ marginBottom: 20 }}
        />

        <Form
          form={form}
          name="auth_form"
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Пожалуйста, введите логин!' }]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} 
              placeholder="Логин" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Пожалуйста, введите пароль!' }]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} 
              placeholder="Пароль" 
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 10 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
              style={{ background: mode === 'register' ? '#1890ff' : 'var(--tengri-green)' }}
            >
              {mode === 'login' ? 'Войти в систему' : 'Зарегистрироваться'}
            </Button>
          </Form.Item>

          {mode === 'login' && (
            <div style={{ textAlign: 'center' }}>
               <Text type="secondary" style={{ fontSize: 12 }}>
                 Нет аккаунта? Нажмите "Регистрация" выше.
               </Text>
            </div>
          )}
        </Form>
      </Card>
    </div>
  );
}

export default LoginForm;