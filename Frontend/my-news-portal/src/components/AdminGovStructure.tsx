import { useState, useEffect } from 'react';
import { Tree, Card, Button, Modal, Form, Input, Checkbox, message, Tag, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import apiClient from '../api/apiClient';

// Убрали лишнюю строку const { DirectoryTree } = Tree;

const AdminGovStructure = () => {
  const [treeData, setTreeData] = useState<any[]>([]); // Добавили <any[]>
  const [loading, setLoading] = useState(false);
  
  // Состояния для Модального окна
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentNode, setCurrentNode] = useState<any>(null);
  const [form] = Form.useForm();

  // 1. Загрузка дерева с сервера
  const fetchTree = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/government');
      
      // 👇 ИСПРАВЛЕНИЕ: Явно указали, что функция возвращает массив (: any[])
      const formatData = (nodes: any[]): any[] => 
        nodes.map((node: any) => ({
          ...node,
          title: renderNodeTitle(node),
          key: node.id,
          isLeaf: !node.children || node.children.length === 0,
          children: node.children ? formatData(node.children) : [],
          
        }));

      setTreeData(formatData(res.data));
    } catch (err) {
      message.error('Ошибка загрузки структуры');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, []);

  // 2. Рендер одной строки дерева
  const renderNodeTitle = (node: any) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 10 }}>
      <div>
        <strong>{node.title}</strong>
        <span style={{ marginLeft: 8, color: '#666' }}>
          {node.is_vacant ? <Tag color="red">ВАКАНТНО</Tag> : (node.occupant_name || 'Не назначен')}
        </span>
      </div>

      <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
        <Tooltip title="Добавить подчиненного">
          <Button 
            size="small" 
            type="text" 
            icon={<PlusOutlined style={{ color: 'green' }} />} 
            onClick={() => openModal('add', node)} 
          />
        </Tooltip>
        
        <Tooltip title="Редактировать">
          <Button 
            size="small" 
            type="text" 
            icon={<EditOutlined style={{ color: 'blue' }} />} 
            onClick={() => openModal('edit', node)} 
          />
        </Tooltip>

        {(!node.children || node.children.length === 0) && (
          <Tooltip title="Удалить">
            <Button 
              size="small" 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDelete(node.id)} 
            />
          </Tooltip>
        )}
      </div>
    </div>
  );

  // 3. Открытие модалки
  const openModal = (mode: 'add' | 'edit', node: any) => {
    setModalMode(mode);
    setCurrentNode(node);
    
    if (mode === 'add') {
      form.resetFields();
    } else {
      form.setFieldsValue({
        title: node.title,
        occupantName: node.occupant_name,
        photoUrl: node.photo_url,
        isVacant: node.is_vacant
      });
    }
    setIsModalOpen(true);
  };

  // 4. Сохранение
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (modalMode === 'add') {
        await apiClient.post('/government', {
          ...values,
          parentId: currentNode.id 
        });
        message.success('Должность добавлена');
      } else {
        await apiClient.put(`/government/${currentNode.id}`, values);
        message.success('Обновлено');
      }

      setIsModalOpen(false);
      fetchTree(); 
    } catch (err) {
      console.error(err);
      message.error('Ошибка сохранения');
    }
  };

  // 5. Удаление
  const handleDelete = async (id: number) => {
    if(!window.confirm('Точно удалить эту должность?')) return;
    try {
      await apiClient.delete(`/government/${id}`);
      message.success('Удалено');
      fetchTree();
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  return (
    <Card title="🏛 Структура Правительства (Редактор)" style={{ margin: 20 }}>
      {loading ? <p>Загрузка...</p> : (
        <Tree
          treeData={treeData}
          defaultExpandAll
          blockNode
          selectable={false}
          height={600}
        />
      )}

      <Modal
        title={modalMode === 'add' ? `Добавить подчиненного к "${currentNode?.title}"` : "Редактировать должность"}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Название должности" rules={[{ required: true }]}>
            <Input placeholder="Например: Министр Энергетики" />
          </Form.Item>

          <Form.Item name="isVacant" valuePropName="checked">
            <Checkbox onChange={(e) => {
               if(e.target.checked) form.setFieldValue('occupantName', '');
            }}>
              Место свободно (Вакансия)
            </Checkbox>
          </Form.Item>

          <Form.Item 
            noStyle 
            shouldUpdate={(prev, curr) => prev.isVacant !== curr.isVacant}
          >
            {({ getFieldValue }) => 
              !getFieldValue('isVacant') && (
                <>
                  <Form.Item name="occupantName" label="ФИО Чиновника">
                    <Input prefix={<UserOutlined />} placeholder="Имя Фамилия" />
                  </Form.Item>
                  <Form.Item name="photoUrl" label="Ссылка на фото">
                     <Input placeholder="https://..." />
                  </Form.Item>
                </>
              )
            }
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminGovStructure;