import { useEffect, useState } from 'react';
// 👇 Добавили Tag в этот список
import { Tree, Card, Avatar, Typography, Spin, message, Tag } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import apiClient from '../api/apiClient';

const { Title, Text } = Typography;

const GovernmentPage = () => {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/government');
        
        // Форматируем данные
        const formatData = (nodes: any[]): any[] => 
          nodes.map((node: any) => ({
            ...node,
            key: node.id,
            selectable: false,
            title: (
              <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0' }}>
                {/* Аватарка */}
                <Avatar 
                  size="large"
                  src={node.photo_url} 
                  icon={<UserOutlined />} 
                  style={{ marginRight: 15, flexShrink: 0, border: '1px solid #eee' }} 
                />
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Text strong style={{ fontSize: '16px', lineHeight: 1.2 }}>
                    {node.title}
                  </Text>
                  
                  {node.is_vacant ? (
                    <Tag color="red" style={{ width: 'fit-content', marginTop: 4 }}>
                      Вакансия
                    </Tag>
                  ) : (
                    <Text type="secondary" style={{ fontSize: '14px' }}>
                      {node.occupant_name || 'Не назначен'}
                    </Text>
                  )}
                </div>
              </div>
            ),
            children: node.children ? formatData(node.children) : [],
          }));

        setTreeData(formatData(res.data));
      } catch (err) {
        message.error('Не удалось загрузить данные');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 20px' }}>
      <Card style={{ 
    borderRadius: 12, 
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)', 
    borderTop: '5px solid #00509d' // 🟦 Синяя "шапка" у карточки
}}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <Title level={2} style={{ marginBottom: 5 }}>🏛 Правительство РК</Title>
            <Text type="secondary">Официальная структура и иерархия</Text>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>
        ) : (
          <Tree
            treeData={treeData}
            defaultExpandAll
            showLine={{ showLeafIcon: false }} 
            blockNode
            height={800}
            style={{ fontSize: '16px' }}
          />
        )}
      </Card>
    </div>
  );
};

export default GovernmentPage;