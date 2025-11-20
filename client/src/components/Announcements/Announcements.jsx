import { useState, useEffect } from 'react';
import { getAnnouncements } from '../../services/api';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await getAnnouncements();
        setAnnouncements(response.data);
      } catch (error) {
        console.error('Failed to fetch announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
    // Refresh every minute
    const interval = setInterval(fetchAnnouncements, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (announcements.length === 0) return;

    // Rotate announcements every 10 seconds
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 10000);

    return () => clearInterval(timer);
  }, [announcements.length]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-primary-blue to-primary-dark p-6 rounded-lg">
        <div className="text-center text-gray-300">טוען הודעות...</div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div className="bg-gradient-to-r from-primary-blue to-primary-dark p-6 rounded-lg shadow-lg animate-fadeIn">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-primary-lightGold font-hebrew">
          📢 הודעות
        </h3>
        {announcements.length > 1 && (
          <div className="text-sm text-gray-300">
            {currentIndex + 1} / {announcements.length}
          </div>
        )}
      </div>
      <div className="bg-white bg-opacity-10 p-4 rounded-lg">
        <h4 className="text-2xl font-bold mb-2 text-white font-hebrew">
          {currentAnnouncement.title}
        </h4>
        <p className="text-xl text-gray-200 font-hebrew whitespace-pre-wrap">
          {currentAnnouncement.content}
        </p>
      </div>
    </div>
  );
};

export default Announcements;
