import { useState } from 'react';
import { addDays, format } from 'date-fns';

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
    <div className="min-h-screen p-5 flex flex-col items-center" dir="rtl">
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
        </div>

      </div>
    </div>
  );
};

export default Zmanim;
