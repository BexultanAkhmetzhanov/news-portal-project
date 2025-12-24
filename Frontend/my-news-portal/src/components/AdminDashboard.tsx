import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

import { 
  Layout, Tabs, Table, Tag, Button, Modal, Form, Input, 
  Select, Upload, Checkbox, message, Popconfirm, Space, Card 
} from 'antd';
import { 
  DeleteOutlined, PlusOutlined, UploadOutlined, 
  LogoutOutlined, CheckCircleOutlined 
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';

import CategoryManagement from './CategoryManagement';
import UserManagement from './UserManagement';
import AdsManager from '../components/AdsManager';
import StatisticsPanel from './StatisticsPanel';

const { Header, Content } = Layout;
const { Option } = Select;

interface Article {
  id: number;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  category_id: number | null;
  categoryName: string | null;
  is_featured: number;
  view_count: number;
  status: 'pending' | 'approved';
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

function AdminDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [form] = Form.useForm();

  const [newsList, setNewsList] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [newsRes, catRes] = await Promise.all([
        apiClient.get<Article[]>('/admin/news/all'),
        apiClient.get<Category[]>('/categories')
      ]);
      setNewsList(newsRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error(err);
      message.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/admin/news/${id}`);
      message.success('Новость удалена');
      setNewsList(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      message.error('Ошибка при удалении');
    }
  };

  const handleMakeFeatured = async (id: number) => {
    try {
      await apiClient.put(`/admin/news/${id}/feature`);
      message.success('Статус ТОП изменен');
      fetchData();
    } catch (err) {
      message.error('Ошибка');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await apiClient.put(`/admin/news/${id}/approve`);
      message.success('Одобрено');
      fetchData();
    } catch (err) { message.error('Ошибка'); }
  };

  const onFinishCreate = async (values: any) => {
    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('content', values.content);
    formData.append('category_id', values.category_id);
    formData.append('is_featured', values.is_featured ? '1' : '0');
    
    // --- ДОБАВЛЕНО: Отправка тегов ---
    if (values.tags) {
        formData.append('tags', JSON.stringify(values.tags));
    }
    
    if (fileList.length > 0 && fileList[0].originFileObj) {
      formData.append('imageFile', fileList[0].originFileObj);
    } else if (values.imageUrl) {
      formData.append('imageUrl', values.imageUrl);
    }

    try {
      await apiClient.post('/admin/news', formData);
      message.success('Новость создана!');
      setIsModalOpen(false);
      form.resetFields();
      setFileList([]);
      fetchData();
    } catch (err) {
      message.error('Ошибка создания новости');
    }
  };

  const columns: ColumnsType<Article> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Дата',
      dataIndex: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Заголовок',
      dataIndex: 'title',
      render: (text, record) => (
        <Space orientation="vertical" size={0}>
            <Link to={`/admin/edit/${record.id}`} style={{ fontWeight: 'bold' }}>{text}</Link>
            {record.is_featured === 1 && <Tag color="blue">Главная</Tag>}
        </Space>
      )
    },
    {
      title: 'Категория',
      dataIndex: 'categoryName',
      filters: categories.map(c => ({ text: c.name, value: c.name })),
      onFilter: (value, record) => record.categoryName === value,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      render: (status) => (
        <Tag color={status === 'approved' ? 'green' : 'orange'}>
          {status === 'approved' ? 'Опубликовано' : 'На проверке'}
        </Tag>
      ),
      filters: [
        { text: 'Опубликовано', value: 'approved' },
        { text: 'На проверке', value: 'pending' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Просмотры',
      dataIndex: 'view_count',
      sorter: (a, b) => a.view_count - b.view_count,
    },
    {
      title: 'Действия',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          {user?.role === 'admin' && record.status === 'pending' && (
             <Button type="primary" size="small" icon={<CheckCircleOutlined/>} onClick={() => handleApprove(record.id)}>OK</Button>
          )}
          {user?.role === 'admin' && (
             <Button size="small" onClick={() => handleMakeFeatured(record.id)}>
               {record.is_featured === 1 ? 'ТОП' : 'В ТОП'}
             </Button>
          )}
          <Popconfirm title="Удалить?" onConfirm={() => handleDelete(record.id)}>
            <Button danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!user) return <p>Доступ запрещен</p>;

  const items = [
    {
      key: '1',
      label: 'Новости',
      children: (
        <>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{fontSize: '1.1rem', fontWeight: 500 }}>Всего новостей: {newsList.length}</span>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
              Добавить новость
            </Button>
          </div>
          <Table 
            columns={columns} 
            dataSource={newsList} 
            rowKey="id" 
            loading={loading}
            pagination={{ pageSize: 10 }} 
          />
        </>
      ),
    },
  ];

  if (user.role === 'admin') {
    items.push(
      {
        key: '2',
        label: 'Категории',
        children: <CategoryManagement categories={categories} onCategoriesUpdate={fetchData} />
      },
      {
        key: 'stats',
        label: 'Статистика',
        children: <StatisticsPanel />
      },
      {
        key: '3',
        label: 'Пользователи',
        children: <UserManagement />
      },

      {
        key: '4',
        label: 'Реклама',
        children: <AdsManager />
      }
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <Header style={{ background: '#001529', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
        <h2 style={{ color: 'white', margin: 0 }}>Admin Panel</h2>
        <Space>
           <span style={{ color: 'rgba(255,255,255,0.7)' }}>Привет, {user.username}</span>
           <Button type="primary" danger icon={<LogoutOutlined />} onClick={handleLogout}>Выйти</Button>
        </Space>
      </Header>
      
      <Content style={{ padding: '20px 50px' }}>
        {/* 👇 Кнопка для перехода к Правительству (только для админов) */}
        {user.role === 'admin' && (
          <div style={{ marginBottom: 16 }}>
            <Button 
              type="dashed" 
              size="large"
              onClick={() => navigate('/admin/government')}
              style={{ width: '100%' }}
            >
              🏛 Управление структурой Правительства
            </Button>
          </div>
        )}

        <Card>
          <Tabs defaultActiveKey="1" items={items} />
        </Card>
      </Content>

      <Modal
        title="Создать новость"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={onFinishCreate}>
          <Form.Item name="title" label="Заголовок" rules={[{ required: true }]}>
            <Input placeholder="Введите заголовок" />
          </Form.Item>

          <Form.Item name="category_id" label="Категория" rules={[{ required: true }]}>
            <Select placeholder="Выберите категорию">
              {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
            </Select>
          </Form.Item>
          
          <Form.Item name="tags" label="Теги">
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Введите теги и нажмите Enter"
              tokenSeparators={[',']}
            />
          </Form.Item>

          <Form.Item label="Изображение">
             <Upload 
                beforeUpload={() => false}
                maxCount={1}
                fileList={fileList}
                onChange={({ fileList }) => setFileList(fileList)}
                listType="picture"
             >
                <Button icon={<UploadOutlined />}>Загрузить файл</Button>
             </Upload>
             <div style={{ marginTop: 8 }}>ИЛИ ссылка:</div>
             <Form.Item name="imageUrl" noStyle>
               <Input placeholder="http://..." />
             </Form.Item>
          </Form.Item>

          <Form.Item name="content" label="Текст новости" rules={[{ required: true }]}>
             <ReactQuill theme="snow" style={{ height: 200, marginBottom: 50 }} />
          </Form.Item>

          <Form.Item name="is_featured" valuePropName="checked">
            <Checkbox>Сделать главной новостью</Checkbox>
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 8 }}>Отмена</Button>
            <Button type="primary" htmlType="submit">Опубликовать</Button>
          </div>
        </Form>
      </Modal>
    </Layout>
  );
}

export default AdminDashboard;