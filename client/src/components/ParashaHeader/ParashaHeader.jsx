import { useState, useEffect } from 'react';
import { getParasha } from '../../services/hebcal';

const ParashaHeader = () => {
  const [parasha, setParasha] = useState(null);

  useEffect(() => {
    const fetchParasha = async () => {
      try {
        const data = await getParasha();
        const item = data.items?.find((it) => it.category === 'parashat');
        setParasha(item || null);
      } catch (error) {
        console.error('Failed to fetch parasha:', error);
      }
    };

    fetchParasha();
    // Refresh once a day
    const interval = setInterval(fetchParasha, 86400000);
    return () => clearInterval(interval);
  }, []);

  // Nothing to show while loading or if there is no parasha this week
  // (e.g. a Shabbat that falls entirely on a festival). Render nothing so the
  // header layout doesn't jump.
  if (!parasha?.hebrew) return null;

  return (
    <div className="flex items-center justify-center gap-3 select-none" dir="rtl">
      <span className="text-primary-gold text-sm opacity-70">✦</span>
      <span className="text-2xl font-bold font-hebrew text-primary-lightGold">
        {parasha.hebrew}
      </span>
      <span className="text-primary-gold text-sm opacity-70">✦</span>
    </div>
  );
};

export default ParashaHeader;
