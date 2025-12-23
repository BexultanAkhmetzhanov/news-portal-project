import { useState } from 'react';
import apiClient from '../api/apiClient';
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface CategoryManagementProps {
  categories: Category[];
  onCategoriesUpdate: () => void;
}

function CategoryManagement({ categories, onCategoriesUpdate }: CategoryManagementProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      form.setFieldsValue(category);
    } else {
      setEditingCategory(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleFinish = async (values: { name: string; slug: string }) => {
    try {
      if (editingCategory) {
        await apiClient.put(`/admin/categories/${editingCategory.id}`, values);
        message.success('Категория обновлена');
      } else {
        await apiClient.post('/admin/categories', values);
        message.success('Категория создана');
      }
      setIsModalOpen(false);
      onCategoriesUpdate();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Ошибка');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/admin/categories/${id}`);
      message.success('Категория удалена');
      onCategoriesUpdate();
    } catch (err) {
      message.error('Ошибка удаления');
    }
  };

  const columns: ColumnsType<Category> = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    { 
      title: 'Название', 
      dataIndex: 'name', 
      // ИСПРАВЛЕНИЕ: Используем render для жирного шрифта, а не свойство fontWeight
      render: (text) => <span style={{ fontWeight: 'bold' }}>{text}</span> 
    },
    { title: 'Slug (URL)', dataIndex: 'slug' },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openModal(record)} />
          <Popconfirm title="Удалить категорию?" onConfirm={() => handleDelete(record.id)}>
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          Добавить категорию
        </Button>
      </div>

      <Table 
        dataSource={categories} 
        columns={columns} 
        rowKey="id" 
        pagination={false} 
      />

      <Modal
        title={editingCategory ? "Редактировать категорию" : "Новая категория"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input placeholder="Например: Комиксы" />
          </Form.Item>
          <Form.Item name="slug" label="Slug (URL)" rules={[{ required: true }]}>
            <Input placeholder="Например: comics" />
          </Form.Item>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setIsModalOpen(false)} style={{ marginRight: 8 }}>Отмена</Button>
            <Button type="primary" htmlType="submit">Сохранить</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default CategoryManagement;