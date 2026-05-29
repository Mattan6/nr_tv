import { useState, useEffect } from 'react';
import { format } from 'date-fns';

const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center">
      <div
        className="font-bold font-english text-primary-lightGold mb-1"
        style={{ fontSize: '3.5rem', lineHeight: 1 }}
      >
        {format(time, 'HH:mm:ss')}
      </div>
      <div className="text-lg text-gray-300 font-hebrew">
        {format(time, 'EEEE, dd MMMM yyyy')}
      </div>
    </div>
  );
};

export default Clock;
