import { useState, useEffect } from 'react';
import { getParasha } from '../../services/hebcal';

const ParashaWeek = () => {
  const [parasha, setParasha] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParasha = async () => {
      try {
        const data = await getParasha();
        // Find the parasha in the items array
        const parashaItem = data.items?.find(
          (item) => item.category === 'parashat'
        );
        setParasha(parashaItem);
      } catch (error) {
        console.error('Failed to fetch parasha:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchParasha();
    // Refresh every day
    const interval = setInterval(fetchParasha, 86400000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="decorative-border">
        <div className="text-center text-gray-400">טוען פרשת השבוע...</div>
      </div>
    );
  }

  if (!parasha) {
    return (
      <div className="decorative-border">
        <div className="text-center text-gray-400">אין פרשה השבוע</div>
      </div>
    );
  }

  return (
    <div className="decorative-border">
      <h2 className="text-2xl font-bold text-center mb-4 text-primary-lightGold font-hebrew">
        פרשת השבוע
      </h2>
      <div className="text-center">
        <div className="text-4xl font-bold text-white font-hebrew mb-2">
          {parasha.hebrew}
        </div>
        {parasha.link && (
          <div className="text-lg text-gray-300 font-hebrew mt-2">
            {parasha.title}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParashaWeek;
