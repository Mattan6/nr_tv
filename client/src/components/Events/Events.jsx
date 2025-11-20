import { useState, useEffect } from 'react';
import { getEvents } from '../../services/api';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await getEvents();
        // Get next 5 events
        setEvents(response.data.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    // Refresh every minute
    const interval = setInterval(fetchEvents, 60000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="decorative-border">
        <div className="text-center text-gray-400">טוען אירועים...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="decorative-border">
      <h2 className="text-2xl font-bold text-center mb-4 text-primary-lightGold font-hebrew">
        אירועים קרובים
      </h2>
      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event._id}
            className="bg-white bg-opacity-10 p-3 rounded-lg"
          >
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-xl font-bold text-white font-hebrew">
                {event.title}
              </h3>
              <span className="text-sm bg-primary-gold text-primary-dark px-2 py-1 rounded font-hebrew">
                {event.category}
              </span>
            </div>
            <div className="text-gray-300 font-hebrew">
              <div>
                📅 {format(new Date(event.eventDate), 'dd MMMM yyyy', { locale: he })}
              </div>
              {event.eventTime && <div>🕐 {event.eventTime}</div>}
              {event.location && <div>📍 {event.location}</div>}
            </div>
            {event.description && (
              <p className="text-gray-200 mt-2 text-sm font-hebrew">
                {event.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Events;
