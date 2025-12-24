import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/apiClient'; // Используем authAPI из apiClient
import { useAuth } from '../context/AuthContext';
import { 
  Form, Input, Button, message, Typography, Divider 
} from 'antd';
import { 
  UserOutlined, LockOutlined, GoogleOutlined
} from '@ant-design/icons';
// Хук для вызова окна Google
import { useGoogleLogin } from '@react-oauth/google';

const { Title, Text } = Typography;

type FormMode = 'login' | 'register';

function LoginForm() {
  const [mode, setMode] = useState<FormMode>('login');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [form] = Form.useForm();

  // Реальная логика Google входа
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // Отправляем токен (access_token) на наш сервер
        const response = await authAPI.googleLogin(tokenResponse.access_token);
        
        // Сервер проверит токен, создаст юзера и вернет нам данные
        login(response.data.user);
        message.success('Вход через Google выполнен!');
        navigate('/admin');
      } catch (err: any) {
        console.error(err);
        message.error('Ошибка входа через Google');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      message.error('Не удалось открыть окно Google');
    }
  });

  // Обычный вход/регистрация
  const onFinish = async (values: any) => {
    setLoading(true);
    const { username, password } = values;

    try {
      if (mode === 'login') {
        const response = await authAPI.login({ username, password });
        login(response.data.user);
        message.success('Добро пожаловать!');
        navigate('/admin');
      } else {
        await authAPI.register({ username, password });
        message.success('Регистрация успешна! Теперь войдите.');
        setMode('login');
        form.resetFields();
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'Ошибка запроса';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 360, margin: '40px auto', padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: 8, backgroundColor: '#fff' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ color: 'var(--tengri-blue)' }}>
          {mode === 'login' ? 'Вход' : 'Регистрация'}
        </Title>
        <Text type="secondary">
          {mode === 'login' ? 'Войдите, чтобы управлять новостями' : 'Создайте аккаунт для начала работы'}
        </Text>
      </div>

      <Form
        form={form}
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
            style={{ background: mode === 'register' ? '#1890ff' : 'var(--tengri-green)', borderColor: 'transparent' }}
          >
            {mode === 'login' ? 'Войти в систему' : 'Зарегистрироваться'}
          </Button>
        </Form.Item>
        
        <Divider plain style={{ margin: '12px 0' }}>Или</Divider>

        <Button 
          block 
          icon={<GoogleOutlined />} 
          onClick={() => googleLogin()} 
          loading={loading}
          danger
          style={{ marginBottom: 16 }}
        >
          Войти через Google
        </Button>

        <div style={{ textAlign: 'center' }}>
           <Text type="secondary" style={{ fontSize: 14 }}>
             {mode === 'login' ? 'Нет аккаунта?' : 'Есть аккаунт?'}
             <a 
               style={{ marginLeft: 5, color: 'var(--tengri-blue)' }} 
               onClick={() => {
                 setMode(mode === 'login' ? 'register' : 'login');
                 form.resetFields();
               }}
             >
               {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
             </a>
           </Text>
        </div>
      </Form>
    </div>
  );
}

export default LoginForm;