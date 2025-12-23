import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';
// ВОТ ЭТА СТРОКА БЫЛА ПРОПУЩЕНА:
import { getImageUrl } from '../utils/imageUrl'; 
import ImgCrop from 'antd-img-crop'; 
import { 
  Card, Avatar, Typography, Tag, Row, Col, Tabs, 
  Form, Input, Button, message, Statistic, Divider, Space, Upload 
} from 'antd';
import { 
  UserOutlined, MailOutlined, SafetyOutlined, 
  LockOutlined, SaveOutlined, EditOutlined, CrownOutlined,
  UploadOutlined, CameraOutlined
} from '@ant-design/icons';
import type { UploadProps } from 'antd';

const { Title, Text } = Typography;

function Profile() {
  const { user, logout, login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  
  const [formProfile] = Form.useForm();
  const [formPassword] = Form.useForm();

  useEffect(() => {
    if (user) {
      formProfile.setFieldsValue({
        username: user.username,
        fullname: user.fullname || '',
      });
    }
  }, [user, formProfile]);

  const handleUpdateProfile = async (values: any) => {
    setLoading(true);
    try {
      await apiClient.put('/users/profile', { 
        fullname: values.fullname 
      });
      message.success('Профиль обновлен!');
      if (user) login({ ...user, fullname: values.fullname });
    } catch (err) {
      console.error(err);
      message.error('Ошибка обновления профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    setLoading(true);
    try {
      await apiClient.put('/users/profile', { 
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

  const handleAvatarUpload: UploadProps['customRequest'] = async ({ file, onSuccess, onError }) => {
    setAvatarLoading(true);
    const formData = new FormData();
    formData.append('avatar', file as File);

    try {
      const response = await apiClient.post('/users/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      message.success('Аватар обновлен!');
      
      if (user && onSuccess) {
        login({ ...user, avatarUrl: response.data.avatarUrl });
        onSuccess("ok");
      }
    } catch (err) {
      console.error(err);
      message.error('Ошибка загрузки фото');
      if (onError) onError(err as any);
    } finally {
      setAvatarLoading(false);
    }
  };

  if (!user) return <div style={{ padding: 50, textAlign: 'center' }}>Загрузка...</div>;

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
              <ImgCrop 
                rotationSlider 
                showGrid 
                aspect={1} 
                quality={0.8}
                modalTitle="Редактировать фото"
                modalOk="Сохранить"
                modalCancel="Отмена"
              >
                <Upload 
                  customRequest={handleAvatarUpload}
                  showUploadList={false}
                  maxCount={1}
                >
                  <div style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }} title="Нажмите, чтобы изменить фото">
                    <Avatar 
                      size={100} 
                      src={getImageUrl(user.avatarUrl)} 
                      icon={<UserOutlined />} 
                      style={{ 
                        backgroundColor: '#fde3cf', 
                        color: '#f56a00',
                        border: '4px solid white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }} 
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: 5,
                      right: 5,
                      background: '#1890ff',
                      color: 'white',
                      borderRadius: '50%',
                      width: 28,
                      height: 28,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid white'
                    }}>
                      {avatarLoading ? <UploadOutlined spin /> : <CameraOutlined />}
                    </div>
                  </div>
                </Upload>
              </ImgCrop>
            </div>
            
            <Title level={3} style={{ marginBottom: 5 }}>{user.fullname || user.username}</Title>
            <Tag color={getRoleColor(user.role)} icon={getRoleIcon(user.role)} style={{ padding: '5px 10px', fontSize: '14px', marginBottom: 20 }}>
              {user.role.toUpperCase()}
            </Tag>

            <Divider />

            <div style={{ textAlign: 'left' }}>
               <Space 
                 // @ts-ignore
                 orientation="vertical" 
                 size="middle" 
                 style={{ width: '100%', display: 'flex', flexDirection: 'column' }}
               >
                 <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MailOutlined style={{ color: '#888' }} />
                    <Text>user@{user.username}.com</Text>
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

        <Col xs={24} md={16}>
          <Card>
            <Tabs defaultActiveKey="1" items={tabItems} size="large" />
          </Card>

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