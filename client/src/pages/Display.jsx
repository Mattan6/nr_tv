import { useState, useEffect } from 'react';
import Clock from '../components/Clock/Clock';
import HebrewDate from '../components/HebrewDate/HebrewDate';
import ParashaHeader from '../components/ParashaHeader/ParashaHeader';
import PrayerTimes from '../components/PrayerTimes/PrayerTimes';
import ShabbatTimes from '../components/ShabbatTimes/ShabbatTimes';
import SpecialDays from '../components/SpecialDays/SpecialDays';

const SLIDE_DURATION = 15000;
const FADE_MS = 800;

const SharedHeader = () => (
  <div className="mb-3 text-center w-full max-w-5xl" dir="rtl">
    <h1
      className="font-bold mb-2 text-primary-lightGold font-hebrew"
      style={{ fontSize: '2.6rem', letterSpacing: '0.05em', textShadow: '0 2px 16px rgba(0,0,0,0.7)' }}
    >
      בית הכנסת נווה רחמים
    </h1>
    <Clock />
    <div className="mt-2">
      <HebrewDate />
    </div>
    <div className="mt-2">
      <ParashaHeader />
    </div>
    <div className="mt-2">
      <SpecialDays />
    </div>
  </div>
);

const Display = () => {
  const [slideIndex, setSlideIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setSlideIndex((prev) => (prev + 1) % 2);
        setFading(false);
      }, FADE_MS);
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen p-5 flex flex-col items-center justify-start"
      dir="ltr"
      style={{
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
      }}
    >
      <SharedHeader />
      <div className="w-full max-w-7xl" dir="rtl">
        {slideIndex === 0 ? <PrayerTimes /> : <ShabbatTimes />}
      </div>
      <div className="text-center mt-3 text-gray-400 text-sm" dir="rtl">
        <div className="flex items-center justify-center gap-2">
          <span>נוסח עדות המזרח</span>
          <span>•</span>
          <span>ניצן</span>
        </div>
      </div>
    </div>
  );
};

export default Display;
