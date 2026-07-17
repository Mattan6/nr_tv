import { useState, useEffect } from 'react';
import { addDays, format } from 'date-fns';
import { getZmanim, getHebrewDate } from '../services/hebcal';
import ZmanimCard from '../components/PrayerTimes/ZmanimCard';

const HEBREW_WEEKDAYS = [
  'יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'שבת',
];

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const controlStyle = {
  background: 'linear-gradient(160deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.05) 100%)',
  border: '1px solid rgba(212,175,55,0.45)',
  color: '#FFD700',
};

const Zmanim = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [zmanim, setZmanim] = useState(null);
  const [hebrewDate, setHebrewDate] = useState('');
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'

  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setStatus('loading');
      try {
        const [z, h] = await Promise.all([
          getZmanim(selectedDate),
          getHebrewDate(selectedDate),
        ]);
        if (cancelled) return;
        setZmanim(z.times);
        setHebrewDate(h.hebrew || '');
        setStatus('ready');
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to fetch zmanim for date:', error);
        setStatus('error');
      }
    };
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const goToPrevDay = () => setSelectedDate((d) => addDays(d, -1));
  const goToNextDay = () => setSelectedDate((d) => addDays(d, 1));
  const goToToday = () => setSelectedDate(new Date());

  const onDateInputChange = (e) => {
    const value = e.target.value; // 'YYYY-MM-DD' or ''
    if (!value) return;
    const [y, m, d] = value.split('-').map(Number);
    setSelectedDate(new Date(y, m - 1, d));
  };

  const weekday = HEBREW_WEEKDAYS[selectedDate.getDay()];
  const gregorian = format(selectedDate, 'dd/MM/yyyy');
  const inputValue = format(selectedDate, 'yyyy-MM-dd');
  const isToday = isSameDay(selectedDate, new Date());

  return (
    <div className="h-screen overflow-y-auto p-5 flex flex-col items-center" dir="rtl">
      <div className="w-full max-w-7xl">

        {/* Date controls */}
        <div className="flex items-center justify-center flex-wrap gap-3 mb-4">
          {/* In RTL: right chevron = previous day, left chevron = next day */}
          <button
            type="button"
            onClick={goToPrevDay}
            title="יום קודם"
            aria-label="יום קודם"
            className="rounded-lg px-4 py-2 text-xl font-bold font-hebrew"
            style={controlStyle}
          >
            ▶
          </button>

          <input
            type="date"
            value={inputValue}
            onChange={onDateInputChange}
            aria-label="בחר תאריך"
            className="rounded-lg px-4 py-2 text-lg font-hebrew tabular-nums"
            style={controlStyle}
          />

          <button
            type="button"
            onClick={goToNextDay}
            title="יום הבא"
            aria-label="יום הבא"
            className="rounded-lg px-4 py-2 text-xl font-bold font-hebrew"
            style={controlStyle}
          >
            ◀
          </button>

          <button
            type="button"
            onClick={goToToday}
            disabled={isToday}
            className="rounded-lg px-4 py-2 text-lg font-bold font-hebrew"
            style={{ ...controlStyle, opacity: isToday ? 0.4 : 1 }}
          >
            היום
          </button>
        </div>

        {/* Selected-date heading */}
        <div className="text-center mb-4 font-hebrew" dir="rtl">
          <div className="text-2xl font-bold" style={{ color: '#FFD700' }}>{weekday}</div>
          <div className="text-lg tabular-nums" style={{ color: '#D4AF37' }}>{gregorian}</div>
          {hebrewDate && (
            <div className="text-xl mt-1" style={{ color: '#D4AF37' }}>{hebrewDate}</div>
          )}
        </div>

        {/* Zmanim card / states */}
        {status === 'loading' && (
          <div className="decorative-border">
            <div className="text-center text-gray-400 font-hebrew text-2xl py-8">טוען זמני תפילות...</div>
          </div>
        )}
        {status === 'error' && (
          <div className="decorative-border">
            <div className="text-center text-gray-400 font-hebrew text-2xl py-8">לא ניתן לטעון זמני תפילות</div>
          </div>
        )}
        {status === 'ready' && zmanim && <ZmanimCard zmanim={zmanim} />}

      </div>
    </div>
  );
};

export default Zmanim;
