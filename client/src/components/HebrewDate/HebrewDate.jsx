import { useState, useEffect } from 'react';
import { getHebrewDate } from '../../services/hebcal';

const HebrewDate = () => {
  const [hebrewDate, setHebrewDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHebrewDate = async () => {
      try {
        const data = await getHebrewDate();
        setHebrewDate(data);
      } catch (error) {
        console.error('Failed to fetch Hebrew date:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHebrewDate();
    // Refresh every hour
    const interval = setInterval(fetchHebrewDate, 3600000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-xl text-gray-400">טוען תאריך עברי...</div>;
  }

  if (!hebrewDate) {
    return <div className="text-xl text-gray-400">לא ניתן לטעון תאריך עברי</div>;
  }

  return (
    <div className="text-center">
      <div className="text-3xl font-bold font-hebrew text-primary-gold">
        {hebrewDate.hebrew}
      </div>
    </div>
  );
};

export default HebrewDate;
