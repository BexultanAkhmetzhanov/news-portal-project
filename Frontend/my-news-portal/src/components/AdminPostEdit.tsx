import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

import { 
  Form, Input, Button, Select, Checkbox, Upload, 
  Card, Spin, message, Image, Typography 
} from 'antd';
import { 
  ArrowLeftOutlined, UploadOutlined, SaveOutlined, 
  DeleteOutlined, FileImageOutlined 
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

const { Title } = Typography;
const { Option } = Select;

function AdminPostEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [content, setContent] = useState(''); 
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [articleRes, categoriesRes] = await Promise.all([
          apiClient.get<any>(`/admin/news/${id}`),
          apiClient.get<any[]>('/categories')
        ]);

        const article = articleRes.data;
        
        // Заполняем форму данными
        form.setFieldsValue({
          title: article.title,
          category_id: article.category_id,
          imageUrl: article.imageUrl,
          is_featured: article.is_featured === 1,
          tags: article.tags ? article.tags.map((t: any) => t.name) : []
        });

        // Важно: если контент null, ставим пустую строку
        setContent(article.content || ''); 
        setCurrentImageUrl(article.imageUrl);
        setCategories(categoriesRes.data);

      } catch (err) {
        console.error(err);
        message.error('Не удалось загрузить данные новости');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, form]);

  const onFinish = async (values: any) => {
    // Проверка на пустоту (Quill иногда оставляет пустые теги)
    if (!content || content.trim() === '' || content === '<p><br></p>') {
      message.error('Контент не может быть пустым!');
      return;
    }

    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('content', content);
    formData.append('category_id', values.category_id);
    formData.append('is_featured', values.is_featured ? '1' : '0');
    
    // Передаем теги как JSON строку
    if (values.tags) {
       formData.append('tags', JSON.stringify(values.tags));
    }

    if (fileList.length > 0 && fileList[0].originFileObj) {
      formData.append('imageFile', fileList[0].originFileObj);
    } else {
      formData.append('imageUrl', values.imageUrl || '');
    }

    try {
      await apiClient.put(`/admin/news/${id}`, formData);
      message.success('Новость обновлена!');
      setTimeout(() => navigate('/admin'), 1000);
    } catch (err) {
      console.error(err);
      message.error('Ошибка при сохранении');
    }
  };

  const handleClearImage = () => {
    setCurrentImageUrl(null);
    form.setFieldValue('imageUrl', '');
  };

  const getFullImageUrl = (url: string | null) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `http://localhost:3001${url}`;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin')}>Назад</Button>
        <Title level={2}>Редактирование новости #{id}</Title>
      </div>

      {/* Показываем спиннер, если грузится */}
      {loading && <div style={{ textAlign: 'center', padding: '50px' }}><Spin size="large" /></div>}

      {/* Форма всегда присутствует в DOM, но скрыта при загрузке (чтобы useForm не ругался) */}
      <div style={{ display: loading ? 'none' : 'block' }}>
        <Card hoverable variant="borderless">
          <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ is_featured: false }}>
            
            <Form.Item name="title" label="Заголовок" rules={[{ required: true, message: 'Введите заголовок' }]}>
              <Input size="large" />
            </Form.Item>

            <Form.Item name="category_id" label="Категория" rules={[{ required: true, message: 'Выберите категорию' }]}>
              <Select placeholder="Выберите категорию" size="large">
                {categories.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
              </Select>
            </Form.Item>
            
            <Form.Item name="tags" label="Теги">
              <Select
                mode="tags"
                style={{ width: '100%' }}
                placeholder="Введите теги (нажмите Enter)"
                tokenSeparators={[',']}
              />
            </Form.Item>

            <Form.Item label="Содержание новости" required>
              <ReactQuill theme="snow" value={content} onChange={setContent} style={{ height: '300px', marginBottom: '50px' }} />
            </Form.Item>

            <Card type="inner" title="Изображение" size="small" style={{ marginBottom: 24, background: '#fafafa' }}>
              {/* Заменили Space на div с flex, чтобы убрать ошибку deprecated direction */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                
                {currentImageUrl && !fileList.length && (
                  <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    <Image width={200} src={getFullImageUrl(currentImageUrl)} />
                    <Button danger icon={<DeleteOutlined />} onClick={handleClearImage}>Удалить / Заменить</Button>
                  </div>
                )}

                <Form.Item label="Загрузить новый файл" style={{ marginBottom: 0 }}>
                  <Upload beforeUpload={() => false} fileList={fileList} onChange={({ fileList }) => setFileList(fileList)} maxCount={1} listType="picture">
                    <Button icon={<UploadOutlined />}>Выбрать файл</Button>
                  </Upload>
                </Form.Item>

                <Form.Item name="imageUrl" label="Или ссылка на изображение" style={{ marginBottom: 0 }}>
                  <Input prefix={<FileImageOutlined />} placeholder="https://..." />
                </Form.Item>
              </div>
            </Card>

            <Form.Item name="is_featured" valuePropName="checked">
              <Checkbox>Сделать главной новостью</Checkbox>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} size="large">Сохранить изменения</Button>
            </Form.Item>

          </Form>
        </Card>
      </div>
    </div>
  );
}

export default AdminPostEdit;