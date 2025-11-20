import { useState, useEffect } from 'react';
import { getZmanim } from '../../services/hebcal';
import { format } from 'date-fns';

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
    // Refresh every 6 hours
    const interval = setInterval(fetchZmanim, 21600000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    try {
      const date = new Date(timeString);
      return format(date, 'HH:mm');
    } catch {
      return '--:--';
    }
  };

  if (loading) {
    return (
      <div className="decorative-border">
        <div className="text-center text-gray-400">טוען זמני תפילות...</div>
      </div>
    );
  }

  if (!zmanim) {
    return (
      <div className="decorative-border">
        <div className="text-center text-gray-400">
          לא ניתן לטעון זמני תפילות
        </div>
      </div>
    );
  }

  return (
    <div className="decorative-border">
      <h2 className="text-3xl font-bold text-center mb-6 text-primary-lightGold font-hebrew">
        זמני תפילות
      </h2>
      <div className="grid grid-cols-2 gap-6 text-xl font-hebrew">
        <div className="text-center p-4 bg-white bg-opacity-10 rounded-lg">
          <div className="text-primary-gold mb-2">זריחה</div>
          <div className="text-3xl font-bold text-white">
            {formatTime(zmanim.sunrise)}
          </div>
        </div>
        <div className="text-center p-4 bg-white bg-opacity-10 rounded-lg">
          <div className="text-primary-gold mb-2">שקיעה</div>
          <div className="text-3xl font-bold text-white">
            {formatTime(zmanim.sunset)}
          </div>
        </div>
        <div className="text-center p-4 bg-white bg-opacity-10 rounded-lg">
          <div className="text-primary-gold mb-2">סוף זמן ק"ש</div>
          <div className="text-3xl font-bold text-white">
            {formatTime(zmanim.sofZmanShma)}
          </div>
        </div>
        <div className="text-center p-4 bg-white bg-opacity-10 rounded-lg">
          <div className="text-primary-gold mb-2">סוף זמן תפילה</div>
          <div className="text-3xl font-bold text-white">
            {formatTime(zmanim.sofZmanTfilla)}
          </div>
        </div>
        <div className="text-center p-4 bg-white bg-opacity-10 rounded-lg">
          <div className="text-primary-gold mb-2">מנחה גדולה</div>
          <div className="text-3xl font-bold text-white">
            {formatTime(zmanim.minchaGedola)}
          </div>
        </div>
        <div className="text-center p-4 bg-white bg-opacity-10 rounded-lg">
          <div className="text-primary-gold mb-2">צאת הכוכבים</div>
          <div className="text-3xl font-bold text-white">
            {formatTime(zmanim.tzeit)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrayerTimes;
