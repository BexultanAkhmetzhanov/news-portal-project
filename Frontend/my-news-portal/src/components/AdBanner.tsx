import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

interface Ad {
  id: number;
  placement: string;
  adCode: string; 
}

interface AdBannerProps {
  placement: string; 
}

function AdBanner({ placement }: AdBannerProps) {
  const [adHtml, setAdHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const response = await apiClient.get<Ad[]>('/ads');
        const matchingAd = response.data.find(
          (ad) => ad.placement === placement
        );

        if (matchingAd) {
          setAdHtml(matchingAd.adCode);
        } else {
          // Если реклама для этого места не найдена
          console.warn(`No ad found for placement: ${placement}`);
        }
      } catch (err) {
        console.error("Failed to load ads:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, [placement]);  

  if (loading) {
    return <div className="ad-slot">[Загрузка рекламы...]</div>;
  }

  if (!adHtml) {
    
    return null;
  }

  return (
    <div 
      className="ad-slot" 
      dangerouslySetInnerHTML={{ __html: adHtml }} 
    />
  );
}

export default AdBanner;