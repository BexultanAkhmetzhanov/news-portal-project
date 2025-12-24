import { useEffect, useState } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Progress, Typography, 
  List, Tag, Spin, Badge, Divider 
} from 'antd';
import { 
  GlobalOutlined, UserOutlined, DesktopOutlined, 
  FireOutlined, TeamOutlined, RiseOutlined 
} from '@ant-design/icons';
import apiClient from '../api/apiClient';

const { Title, Text } = Typography;

// Типы данных
interface StatsData {
  audience: {
    totalUsers: number;
    onlineUsers: number;
  };
  content: {
    popularNews: { id: number; title: string; view_count: number; createdAt: string }[];
  };
  geo: { country: string; city: string; count: number; percent: number }[];
  tech: { type: string; percent: number }[];
  demo: {
    gender: { male: number; female: number };
    age: { range: string; percent: number }[];
  };
}

function StatisticsPanel() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get<StatsData>('/admin/stats/full');
        setStats(res.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;
  if (!stats) return <div>Нет данных</div>;

  // Колонки для таблицы Топ Статей
  const newsColumns = [
    { 
      title: 'Заголовок', 
      dataIndex: 'title', 
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>
    },
    { 
      title: 'Просмотры', 
      dataIndex: 'view_count', 
      key: 'view_count',
      render: (count: number) => <Tag color="green"><EyeIcon /> {count}</Tag>
    },
    {
      title: 'Дата',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString()
    }
  ];

  // Колонки для таблицы Географии
  const geoColumns = [
    { title: 'Страна', dataIndex: 'country', key: 'country' },
    { title: 'Город', dataIndex: 'city', key: 'city' },
    { title: 'Пользователей', dataIndex: 'count', key: 'count' },
    { 
      title: 'Процент', 
      dataIndex: 'percent', 
      key: 'percent',
      render: (percent: number) => <Progress percent={percent} size="small" />
    }
  ];

  return (
    <div className="stats-container">
      {/* 1. Верхние карточки: Онлайн и Всего */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
            <Statistic 
              title="Сейчас на сайте" 
              value={stats.audience.onlineUsers} 
              prefix={<Badge status="processing" color="green" />}
              suffix="чел."
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
            <Statistic 
              title="Всего регистраций" 
              value={stats.audience.totalUsers} 
              prefix={<TeamOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={12}>
          <Card bordered={false} style={{ height: '100%', display: 'flex', alignItems: 'center' }}>
            <Text type="secondary">Здесь могла бы быть сводка по доходам или новые подписчики...</Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        
        {/* 2. Популярность новостей */}
        <Col xs={24} lg={14}>
          <Card title={<span><FireOutlined style={{ color: '#ff4d4f' }} /> Рейтинг статей</span>}>
            <Table 
              dataSource={stats.content.popularNews} 
              columns={newsColumns} 
              rowKey="id" 
              pagination={false} 
              size="small"
            />
          </Card>

          <Card title={<span><GlobalOutlined style={{ color: '#1890ff' }} /> География читателей</span>} style={{ marginTop: 24 }}>
             <Table 
               dataSource={stats.geo} 
               columns={geoColumns} 
               rowKey="city" 
               pagination={false}
             />
          </Card>
        </Col>

        {/* 3. Правая колонка: Технологии и Демография */}
        <Col xs={24} lg={10}>
          
          {/* Технологии */}
          <Card title={<span><DesktopOutlined /> Устройства</span>} style={{ marginBottom: 24 }}>
            <List
              dataSource={stats.tech}
              renderItem={item => (
                <List.Item>
                  <div style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text>{item.type}</Text>
                      <Text strong>{item.percent}%</Text>
                    </div>
                    <Progress percent={item.percent} showInfo={false} strokeColor={item.type === 'Мобильные' ? '#13c2c2' : '#1890ff'} />
                  </div>
                </List.Item>
              )}
            />
          </Card>

          {/* Демография */}
          <Card title={<span><UserOutlined /> Демография</span>}>
             <div style={{ marginBottom: 20 }}>
               <Text strong>Пол:</Text>
               <div style={{ display: 'flex', marginTop: 10 }}>
                 <div style={{ width: `${stats.demo.gender.male}%`, background: '#36cfc9', height: 20, borderRadius: '4px 0 0 4px', textAlign: 'center', color: '#fff', fontSize: 12 }}>М ({stats.demo.gender.male}%)</div>
                 <div style={{ width: `${stats.demo.gender.female}%`, background: '#ff85c0', height: 20, borderRadius: '0 4px 4px 0', textAlign: 'center', color: '#fff', fontSize: 12 }}>Ж ({stats.demo.gender.female}%)</div>
               </div>
             </div>
             
             <Divider />

             <Text strong>Возраст:</Text>
             {stats.demo.age.map(age => (
               <div key={age.range} style={{ marginTop: 10 }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">{age.range}</Text>
                    <Text>{age.percent}%</Text>
                 </div>
                 <Progress percent={age.percent} size="small" showInfo={false} strokeColor="orange" />
               </div>
             ))}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

// Иконка глаза (замена)
const EyeIcon = () => (
  <span role="img" aria-label="view" className="anticon">
    <svg viewBox="64 64 896 896" focusable="false" data-icon="eye" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M942.2 486.2C847.4 286.5 704.1 186 512 186c-192.2 0-335.4 100.5-430.2 300.3a60.3 60.3 0 000 51.5C176.6 737.5 319.9 838 512 838c192.2 0 335.4-100.5 430.2-300.3 7.7-16.2 7.7-35 0-51.5zM512 766c-161.3 0-279.4-81.8-362.7-254C232.6 339.8 350.7 258 512 258c161.3 0 279.4 81.8 362.7 254C791.5 684.2 673.4 766 512 766zm-4-430c-97.2 0-176 78.8-176 176s78.8 176 176 176 176-78.8 176-176-78.8-176-176-176zm0 288c-61.9 0-112-50.1-112-112s50.1-112 112-112 112 50.1 112 112-50.1 112-112 112z"></path></svg>
  </span>
);

export default StatisticsPanel;