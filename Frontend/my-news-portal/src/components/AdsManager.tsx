import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Upload, message, Card, Image, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, LinkOutlined } from '@ant-design/icons';
import apiClient from '../api/apiClient';
import { getImageUrl } from '../utils/imageUrl';

interface Ad {
  id: number;
  title: string;
  placement: string;
  imageUrl: string;
  link: string;
  views: number;
  clicks: number;
}

const AdsManager = () => {
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
    } catch (err) {
      console.error(err);
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
    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('placement', values.placement);
    formData.append('link', values.link || '#');
    
    if (fileList.length > 0) {
      formData.append('image', fileList[0].originFileObj);
    } else {
      message.error('Загрузите картинку!');
      return;
    }

    try {
      await apiClient.post('/ads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success('Реклама добавлена');
      setIsModalOpen(false);
      form.resetFields();
      setFileList([]);
      fetchAds();
    } catch (err) {
      message.error('Ошибка создания');
    }
  };

  const columns = [
    {
      title: 'Превью',
      key: 'img',
      render: (_: any, record: Ad) => (
        <Image src={getImageUrl(record.imageUrl)} width={100} />
      )
    },
    { title: 'Название', dataIndex: 'title', key: 'title' },
    { 
      title: 'Место', 
      dataIndex: 'placement', 
      key: 'placement',
      render: (text: string) => <Tag color={text === 'header' ? 'blue' : 'orange'}>{text.toUpperCase()}</Tag>
    },
    { title: 'Ссылка', dataIndex: 'link', key: 'link', render: (l: string) => <a href={l} target="_blank">{l}</a> },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Ad) => (
        <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
      )
    }
  ];

  return (
    <Card title="Управление рекламой" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>Добавить баннер</Button>}>
      <Table dataSource={ads} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 5 }} />

      <Modal title="Новый баннер" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="title" label="Название (для себя)" rules={[{ required: true }]}>
            <Input placeholder="Например: Coca-Cola Лето" />
          </Form.Item>
          
          <Form.Item name="placement" label="Где показывать?" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="header">Шапка (Header) - Длинный баннер</Select.Option>
              <Select.Option value="sidebar">Сайдбар (Sidebar) - Квадрат</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="link" label="Ссылка при клике">
            <Input prefix={<LinkOutlined />} placeholder="https://..." />
          </Form.Item>

          <Form.Item label="Изображение баннера">
            <Upload 
              listType="picture" 
              maxCount={1} 
              beforeUpload={() => false}
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
            >
              <Button icon={<UploadOutlined />}>Загрузить файл</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdsManager;