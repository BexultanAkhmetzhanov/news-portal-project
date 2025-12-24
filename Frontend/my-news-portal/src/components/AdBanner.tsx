import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';
import { getImageUrl } from '../utils/imageUrl';

interface Ad {
  id: number;
  placement: string;
  imageUrl: string;
  link: string;
}

interface AdBannerProps {
  placement: string;
}

function AdBanner({ placement }: AdBannerProps) {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await apiClient.get<Ad[]>('/ads');
        const matchingAd = response.data.find(
          (a) => a.placement === placement
        );
        setAd(matchingAd || null);
      } catch (err) {
        console.error("Failed to load ads:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAds();
  }, [placement]);

  if (loading || !ad) return null;

  // ОПРЕДЕЛЯЕМ СТИЛИ В ЗАВИСИМОСТИ ОТ МЕСТА
  const isHeader = placement === 'header';

  return (
    <div 
      className="ad-slot" 
      style={{ 
        marginBottom: 20, 
        marginTop: 20, 
        textAlign: 'center',
        // Если это хедер — добавим серый фон, если картинка не на всю ширину
        backgroundColor: isHeader ? '#f5f5f5' : 'transparent',
        borderRadius: 8,
        padding: isHeader ? '10px' : '0' // Немного воздуха для хедера
      }}
    >
      <a 
        href={ad.link} 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ display: 'inline-block' }} // Чтобы ссылка обтягивала картинку по центру
      >
        <img 
          src={getImageUrl(ad.imageUrl)} 
          alt="Реклама" 
          style={{ 
            // ДЛЯ ХЕДЕРА:
            height: isHeader ? '100%' : 'auto', 
            maxHeight: isHeader ? '150px' : 'none', // Ограничиваем высоту (120-150px — стандарт)
            width: isHeader ? 'auto' : '100%',       // Ширина подстраивается под высоту
            maxWidth: '100%',
            
            // ОБЩИЕ СТИЛИ:
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            objectFit: 'contain', // Чтобы картинка не обрезалась
            display: 'block'
          }} 
        />
      </a>
    </div>
  );
}

export default AdBanner;