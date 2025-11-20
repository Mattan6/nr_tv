import { useState, useEffect } from 'react';
import { getParasha } from '../../services/hebcal';
import { format, addMinutes } from 'date-fns';

const ShabbatTimes = () => {
  const [shabbatData, setShabbatData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShabbatData = async () => {
      try {
        const data = await getParasha();

        // Find candle lighting and havdalah times
        const candleLighting = data.items?.find(
          (item) => item.category === 'candles'
        );
        const havdalah = data.items?.find(
          (item) => item.category === 'havdalah'
        );

        setShabbatData({
          candleLighting,
          havdalah,
        });
      } catch (error) {
        console.error('Failed to fetch Shabbat data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShabbatData();
    // Refresh every 6 hours
    const interval = setInterval(fetchShabbatData, 21600000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    try {
      const date = new Date(dateString);
      return format(date, 'HH:mm');
    } catch {
      return '--:--';
    }
  };

  const calculateMinchaTime = (candleLightingDate) => {
    if (!candleLightingDate) return '--:--';
    try {
      // 5 minutes after candle lighting
      const date = new Date(candleLightingDate);
      const minchaTime = addMinutes(date, 5);
      return format(minchaTime, 'HH:mm');
    } catch {
      return '--:--';
    }
  };

  const calculateArvitTime = (havdalahDate) => {
    if (!havdalahDate) return '--:--';
    try {
      // 12 minutes before Havdalah
      const date = new Date(havdalahDate);
      const arvitTime = addMinutes(date, -12);
      return format(arvitTime, 'HH:mm');
    } catch {
      return '--:--';
    }
  };

  if (loading) {
    return (
      <div className="decorative-border">
        <div className="text-center text-gray-400">טוען זמני שבת...</div>
      </div>
    );
  }

  if (!shabbatData || !shabbatData.candleLighting) {
    return null;
  }

  return (
    <div className="decorative-border bg-gradient-to-br from-primary-blue to-primary-dark">
      <h2 className="text-3xl font-bold text-center mb-6 text-primary-lightGold font-hebrew">
        ⭐ זמני שבת קודש
      </h2>

      {/* Candle Lighting & Havdalah */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-4 bg-white bg-opacity-15 rounded-lg border-2 border-primary-gold">
          <div className="text-primary-gold mb-2 font-hebrew text-lg">
            🕯️ כניסת שבת
          </div>
          <div className="text-4xl font-bold text-white">
            {formatTime(shabbatData.candleLighting?.date)}
          </div>
          <div className="text-sm text-gray-300 mt-1 font-hebrew">
            הדלקת נרות
          </div>
        </div>

        <div className="text-center p-4 bg-white bg-opacity-15 rounded-lg border-2 border-primary-gold">
          <div className="text-primary-gold mb-2 font-hebrew text-lg">
            ⭐ יציאת שבת
          </div>
          <div className="text-4xl font-bold text-white">
            {formatTime(shabbatData.havdalah?.date)}
          </div>
          <div className="text-sm text-gray-300 mt-1 font-hebrew">
            הבדלה
          </div>
        </div>
      </div>

      {/* Shabbat Prayer Times */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-center text-primary-lightGold font-hebrew mb-3">
          תפילות שבת
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {/* Friday Night */}
          <div className="bg-white bg-opacity-10 p-3 rounded-lg">
            <div className="text-primary-gold font-hebrew text-sm mb-1">
              מנחה ערב שבת
            </div>
            <div className="text-2xl font-bold text-white">
              {calculateMinchaTime(shabbatData.candleLighting?.date)}
            </div>
          </div>

          {/* Shabbat Morning */}
          <div className="bg-white bg-opacity-10 p-3 rounded-lg">
            <div className="text-primary-gold font-hebrew text-sm mb-1">
              שחרית שבת
            </div>
            <div className="text-2xl font-bold text-white">07:30</div>
          </div>

          {/* Shabbat Afternoon */}
          <div className="bg-white bg-opacity-10 p-3 rounded-lg">
            <div className="text-primary-gold font-hebrew text-sm mb-1">
              מנחה שבת
            </div>
            <div className="text-2xl font-bold text-white">14:30</div>
          </div>

          {/* Motzei Shabbat */}
          <div className="bg-white bg-opacity-10 p-3 rounded-lg">
            <div className="text-primary-gold font-hebrew text-sm mb-1">
              ערבית מוצ״ש
            </div>
            <div className="text-2xl font-bold text-white">
              {calculateArvitTime(shabbatData.havdalah?.date)}
            </div>
            <div className="text-xs text-gray-400 font-hebrew">
              12 דקות לפני הבדלה
            </div>
          </div>
        </div>
      </div>

      {/* Parasha name from shabbatData if available */}
      {shabbatData.candleLighting?.title && (
        <div className="mt-4 text-center text-gray-300 text-sm font-hebrew">
          {shabbatData.candleLighting.title}
        </div>
      )}
    </div>
  );
};

export default ShabbatTimes;
