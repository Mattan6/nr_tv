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
      <div className="text-8xl font-bold font-english text-primary-lightGold mb-2">
        {format(time, 'HH:mm:ss')}
      </div>
      <div className="text-2xl text-gray-300 font-hebrew">
        {format(time, 'EEEE, dd MMMM yyyy')}
      </div>
    </div>
  );
};

export default Clock;
