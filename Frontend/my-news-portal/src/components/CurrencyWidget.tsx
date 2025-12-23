import { useState, useEffect } from 'react';
import { Button, Popover, InputNumber, Select, Space, Typography, Spin, Divider } from 'antd';
import { DollarOutlined, SwapOutlined } from '@ant-design/icons';
import apiClient from '../api/apiClient';

const { Text } = Typography;
const { Option } = Select;

interface Rates {
  [key: string]: number;
}

const CurrencyWidget = () => {
  const [rates, setRates] = useState<Rates | null>(null);
  const [loading, setLoading] = useState(false);

  // Состояние калькулятора
  const [amount, setAmount] = useState<number | null>(100);
  const [currencyFrom, setCurrencyFrom] = useState('USD');
  const [currencyTo, setCurrencyTo] = useState('KZT');

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<Rates>('/rates');
        setRates(res.data);
      } catch (error) {
        console.error('Ошибка загрузки курсов', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  const result = rates && amount ? (amount / rates[currencyFrom]) * rates[currencyTo] : 0;

  // Содержимое всплывающего окна (Калькулятор)
  const popoverContent = (
    <div style={{ width: 250 }}>
      <Text strong>Конвертер валют</Text>
      {/* Горизонтальный разделитель оставим, он работает нормально */}
      <Divider style={{ margin: '10px 0' }} />
      
      <div style={{ marginBottom: 10 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>У меня есть:</Text>
        <Space.Compact style={{ width: '100%' }}>
          <InputNumber 
            style={{ width: '60%' }} 
            value={amount} 
            onChange={setAmount} 
            min={0}
          />
          <Select value={currencyFrom} onChange={setCurrencyFrom} style={{ width: '40%' }}>
            {/* ФИЛЬТРАЦИЯ: Убираем updatedAt из списка */}
            {rates && Object.keys(rates)
              .filter(c => c !== 'updatedAt')
              .map(c => <Option key={c} value={c}>{c}</Option>)
            }
          </Select>
        </Space.Compact>
      </div>

      <div style={{ textAlign: 'center', margin: '5px 0' }}>
        <SwapOutlined style={{ transform: 'rotate(90deg)', color: '#1890ff' }} />
      </div>

      <div style={{ marginBottom: 10 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>Я получу:</Text>
        <Space.Compact style={{ width: '100%' }}>
          <div style={{ 
            width: '60%', 
            padding: '4px 11px', 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px 0 0 6px',
            background: '#f5f5f5',
            color: '#000'
          }}>
             {result.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          <Select value={currencyTo} onChange={setCurrencyTo} style={{ width: '40%' }}>
            {/* ФИЛЬТРАЦИЯ: Убираем updatedAt из списка */}
            {rates && Object.keys(rates)
              .filter(c => c !== 'updatedAt')
              .map(c => <Option key={c} value={c}>{c}</Option>)
            }
          </Select>
        </Space.Compact>
      </div>
    </div>
  );

  if (loading || !rates) return <Spin size="small" />;

  // Расчет курса для отображения в кнопке (USD -> KZT)
  const usdToKzt = rates['KZT']; 
  const eurToKzt = rates['KZT'] / rates['EUR'];

  return (
    <Popover content={popoverContent} trigger="click" placement="bottomRight">
      <Button type="text" icon={<DollarOutlined />} style={{ fontSize: 13 }}>
        <span style={{ marginLeft: 4, display: 'flex', alignItems: 'center' }}>
           USD: <Text strong style={{ marginLeft: 4 }}>{usdToKzt.toFixed(1)}₸</Text>
           
           {/* ЗАМЕНА: Вместо Divider используем обычный span */}
           <span style={{ margin: '0 8px', color: '#d9d9d9' }}>|</span>
           
           EUR: <Text strong style={{ marginLeft: 4 }}>{eurToKzt.toFixed(1)}₸</Text>
        </span>
      </Button>
    </Popover>
  );
};

export default CurrencyWidget;