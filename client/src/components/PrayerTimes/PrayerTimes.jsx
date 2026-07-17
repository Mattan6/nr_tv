import { useState, useEffect } from 'react';
import { getZmanim } from '../../services/hebcal';
import ZmanimCard from './ZmanimCard';

const PrayerTimes = () => {
  const [zmanim, setZmanim] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchZmanim = async () => {
      try {
        const data = await getZmanim();
        setZmanim(data.times);
      } catch (error) {
        console.error('Failed to fetch zmanim:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchZmanim();
    const interval = setInterval(fetchZmanim, 21600000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="decorative-border">
        <div className="text-center text-gray-400 font-hebrew text-2xl py-8">טוען זמני תפילות...</div>
      </div>
    );
  }

  if (!zmanim) {
    return (
      <div className="decorative-border">
        <div className="text-center text-gray-400 font-hebrew text-2xl py-8">לא ניתן לטעון זמני תפילות</div>
      </div>
    );
  }

  return <ZmanimCard zmanim={zmanim} />;
};

export default PrayerTimes;
