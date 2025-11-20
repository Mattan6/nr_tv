import { useState, useEffect } from 'react';
import { getDafYomi } from '../../services/sefaria';

const DafYomi = () => {
  const [dafYomi, setDafYomi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDafYomi = async () => {
      try {
        const data = await getDafYomi();
        setDafYomi(data);
      } catch (error) {
        console.error('Failed to fetch Daf Yomi:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDafYomi();
    // Refresh every day
    const interval = setInterval(fetchDafYomi, 86400000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white bg-opacity-10 rounded-lg p-4">
        <div className="text-center text-gray-400">טוען דף יומי...</div>
      </div>
    );
  }

  if (!dafYomi) {
    return null;
  }

  return (
    <div className="bg-white bg-opacity-10 rounded-lg p-4">
      <h3 className="text-xl font-bold text-center mb-2 text-primary-gold font-hebrew">
        דף יומי
      </h3>
      <div className="text-center">
        <div className="text-2xl font-bold text-white font-hebrew">
          {dafYomi.displayValue?.he || dafYomi.title?.he || 'לא זמין'}
        </div>
      </div>
    </div>
  );
};

export default DafYomi;
