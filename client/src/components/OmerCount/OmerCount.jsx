import { useState, useEffect } from 'react';
import { getOmerCount } from '../../services/hebcal';

const OmerCount = () => {
  const [omerCount, setOmerCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOmerCount = async () => {
      try {
        const data = await getOmerCount();
        setOmerCount(data);
      } catch (error) {
        console.error('Failed to fetch Omer count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOmerCount();
    // Refresh every day
    const interval = setInterval(fetchOmerCount, 86400000);

    return () => clearInterval(interval);
  }, []);

  if (loading || !omerCount) {
    return null; // Don't show anything if not in Omer period
  }

  return (
    <div className="bg-white bg-opacity-10 rounded-lg p-4">
      <h3 className="text-xl font-bold text-center mb-2 text-primary-gold font-hebrew">
        ספירת העומר
      </h3>
      <div className="text-center">
        <div className="text-2xl font-bold text-white font-hebrew">
          {omerCount.hebrew}
        </div>
      </div>
    </div>
  );
};

export default OmerCount;
