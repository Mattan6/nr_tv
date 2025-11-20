import { useState, useEffect } from 'react';
import { getDailyHalacha } from '../../services/halacha';

const DailyHalacha = () => {
  const [halacha, setHalacha] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHalacha = async () => {
      try {
        const data = await getDailyHalacha();
        setHalacha(data);
      } catch (error) {
        console.error('Failed to fetch daily halacha:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHalacha();

    // Refresh halacha every 30 seconds to get new content
    const interval = setInterval(fetchHalacha, 30000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-primary-gold to-yellow-600 p-6 rounded-lg shadow-lg">
        <div className="text-center text-primary-dark font-hebrew">
          טוען הלכה יומית...
        </div>
      </div>
    );
  }

  if (!halacha) {
    return null;
  }

  // Limit text to approximately 5 lines (around 250 characters)
  const truncateText = (text, maxLength = 250) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <div className="bg-gradient-to-r from-primary-gold to-yellow-600 p-6 rounded-lg shadow-lg animate-fadeIn">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="text-5xl flex-shrink-0">📖</div>

        {/* Content */}
        <div className="flex-grow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-2xl font-bold text-primary-dark font-hebrew">
              הלכה יומית
            </h3>
            <span className="text-sm bg-white bg-opacity-30 px-3 py-1 rounded-full text-primary-dark font-hebrew">
              {halacha.category}
            </span>
          </div>

          <p className="text-xl leading-relaxed text-primary-dark font-hebrew font-medium">
            {truncateText(halacha.text)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DailyHalacha;
