import { useState, useEffect } from 'react';
import { getHolidays } from '../../services/hebcal';

const SpecialDays = () => {
  const [todayEvents, setTodayEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpecialDays = async () => {
      try {
        const data = await getHolidays();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter events for today
        const todaysEvents = data.items?.filter((item) => {
          const itemDate = new Date(item.date);
          itemDate.setHours(0, 0, 0, 0);
          return itemDate.getTime() === today.getTime();
        }) || [];

        setTodayEvents(todaysEvents);
      } catch (error) {
        console.error('Failed to fetch special days:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSpecialDays();
    // Refresh every day
    const interval = setInterval(fetchSpecialDays, 86400000);

    return () => clearInterval(interval);
  }, []);

  if (loading || todayEvents.length === 0) {
    return null;
  }

  return (
    <div className="bg-white bg-opacity-10 rounded-lg p-4">
      <h3 className="text-xl font-bold text-center mb-2 text-primary-gold font-hebrew">
        {todayEvents.length === 1 ? 'היום' : 'היום מצוינים'}
      </h3>
      <div className="space-y-2">
        {todayEvents.map((event, index) => (
          <div
            key={index}
            className="text-center text-xl font-bold text-white font-hebrew"
          >
            {event.hebrew || event.title}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpecialDays;
