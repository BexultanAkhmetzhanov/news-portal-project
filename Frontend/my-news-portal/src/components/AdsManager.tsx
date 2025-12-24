import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Upload, message, Popconfirm, Image } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import apiClient from '../api/apiClient';
import { getImageUrl } from '../utils/imageUrl';

const { Option } = Select;

interface Ad {
  id: number;
  title: string;
  placement: string;
  imageUrl: string;
  link: string;
  createdAt: string;
}

function AdsManager() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Ad[]>('/ads');
      setAds(res.data);
    } catch (error) {
      message.error('Не удалось загрузить рекламу');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/ads/${id}`);
      message.success('Баннер удален');
      fetchAds();
    } catch (err) {
      message.error('Ошибка удаления');
    }
  };

  const handleCreate = async (values: any) => {
    if (fileList.length === 0) {
      return message.error('Пожалуйста, загрузите изображение!');
    }

    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('placement', values.placement);
    formData.append('link', values.link || '#');
    formData.append('imageFile', fileList[0].originFileObj);

    try {
      await apiClient.post('/ads', formData);
      message.success('Баннер добавлен!');
      setIsModalOpen(false);
      form.resetFields();
      setFileList([]);
      fetchAds();
    } catch (err) {
      message.error('Ошибка создания');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 50 },
    { 
      title: 'Превью', 
      dataIndex: 'imageUrl',
      render: (url: string) => <Image src={getImageUrl(url)} width={100} />
    },
    { title: 'Название', dataIndex: 'title' },
    { 
      title: 'Место', 
      dataIndex: 'placement',
      render: (text: string) => text === 'sidebar' ? 'Сайдбар' : 'Шапка (Header)'
    },
    { 
      title: 'Ссылка', 
      dataIndex: 'link',
      render: (link: string) => <a href={link} target="_blank" rel="noreferrer">{link}</a>
    },
    {
      title: 'Действия',
      key: 'action',
      render: (_: any, record: Ad) => (
        <Popconfirm title="Удалить?" onConfirm={() => handleDelete(record.id)}>
          <Button danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          Добавить баннер
        </Button>
      </div>

      <Table 
        columns={columns} 
        dataSource={ads} 
        rowKey="id" 
        loading={loading} 
        pagination={{ pageSize: 5 }}
      />

      <Modal
        title="Новый рекламный баннер"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="title" label="Название (для админа)" rules={[{ required: true }]}>
            <Input placeholder="Пример: Акция Coca-Cola" />
          </Form.Item>

          <Form.Item name="placement" label="Где показывать?" rules={[{ required: true }]}>
            <Select placeholder="Выберите место">
              <Option value="sidebar">Сайдбар (Сбоку)</Option>
              <Option value="header">Хедер (Сверху)</Option>
            </Select>
          </Form.Item>

          <Form.Item name="link" label="Ссылка при клике">
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item label="Изображение баннера" required>
            <Upload 
              beforeUpload={() => false}
              maxCount={1}
              listType="picture"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
            >
              <Button icon={<UploadOutlined />}>Загрузить картинку</Button>
            </Upload>
          </Form.Item>

          <div style={{ textAlign: 'right', marginTop: 20 }}>
            <Button type="primary" htmlType="submit">Создать</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default AdsManager;