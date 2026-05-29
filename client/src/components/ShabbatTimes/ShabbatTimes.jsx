import { useState, useEffect } from 'react';
import { getParasha } from '../../services/hebcal';
import { format, addMinutes } from 'date-fns';

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

const CARDS = [
  { label: 'הדלקת נרות',    icon: '🕯️', key: 'candle',        glow: true,  accentColor: '#FFD700' },
  { label: 'הבדלה',          icon: '⭐',  key: 'havdalah',      glow: false, accentColor: '#D4AF37' },
  { label: 'מנחה וקבלת שבת', icon: '✡',  key: 'mincha',        glow: false, accentColor: '#D4AF37' },
  { label: 'שחרית שבת',     icon: '☀',  key: 'shacharit',     glow: false, accentColor: '#D4AF37' },
  { label: 'מנחה שבת',      icon: '◐',  key: 'minchaShabbat', glow: false, accentColor: '#D4AF37' },
  { label: 'ערבית מוצ״ש',   icon: '★',  key: 'arvit',         glow: false, accentColor: '#ff8c3c' },
];

const ShabbatCard = ({ label, icon, time, glow, accentColor, delay }) => (
  <div
    className="relative flex flex-col items-center rounded-xl overflow-hidden font-hebrew shimmer-reveal"
    style={{
      animationDelay: `${delay}ms`,
      background: glow
        ? `linear-gradient(160deg, rgba(${hexToRgb(accentColor)},0.22) 0%, rgba(${hexToRgb(accentColor)},0.06) 100%)`
        : 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
      border: `1px solid ${glow ? accentColor + '55' : 'rgba(255,255,255,0.12)'}`,
      boxShadow: glow
        ? `0 0 22px rgba(${hexToRgb(accentColor)},0.25), inset 0 1px 0 rgba(255,255,255,0.08)`
        : 'inset 0 1px 0 rgba(255,255,255,0.05)',
    }}
  >
    <div
      className="w-full h-1"
      style={{
        background: glow
          ? `linear-gradient(to right, transparent, ${accentColor}, transparent)`
          : 'linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)',
      }}
    />
    <div className="py-2 px-2 w-full flex flex-col items-center gap-1">
      <div
        className="text-xl mb-0 leading-none select-none"
        style={{
          color: glow ? accentColor : 'rgba(212,175,55,0.7)',
          textShadow: glow ? `0 0 14px ${accentColor}` : 'none',
        }}
      >
        {icon}
      </div>
      <div
        className="w-8 h-px mb-1"
        style={{
          background: `linear-gradient(to right, transparent, ${glow ? accentColor : 'rgba(212,175,55,0.4)'}, transparent)`,
        }}
      />
      <div
        className="text-sm font-medium leading-tight text-center mb-1"
        style={{ color: glow ? accentColor : '#D4AF37' }}
      >
        {label}
      </div>
      <div
        className="font-bold text-white tabular-nums"
        style={{
          fontSize: '1.8rem',
          lineHeight: 1,
          letterSpacing: '0.04em',
          textShadow: glow
            ? `0 0 20px rgba(${hexToRgb(accentColor)},0.6)`
            : '0 2px 8px rgba(0,0,0,0.5)',
        }}
      >
        {time}
      </div>
      <div className="flex gap-1 mt-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full"
            style={{
              background: i === 1
                ? (glow ? accentColor : '#D4AF37')
                : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>
    </div>
    <div
      className="w-full h-px"
      style={{
        background: `linear-gradient(to right, transparent, ${glow ? accentColor + '40' : 'rgba(255,255,255,0.06)'}, transparent)`,
      }}
    />
  </div>
);

const ShabbatTimes = () => {
  const [shabbatData, setShabbatData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShabbatData = async () => {
      try {
        const data = await getParasha();
        const candleLighting = data.items?.find((item) => item.category === 'candles');
        const havdalah = data.items?.find((item) => item.category === 'havdalah');
        setShabbatData({ candleLighting, havdalah });
      } catch (error) {
        console.error('Failed to fetch Shabbat data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShabbatData();
    const interval = setInterval(fetchShabbatData, 21600000);
    return () => clearInterval(interval);
  }, []);

  const fmt = (dateStr) => {
    if (!dateStr) return '--:--';
    try { return format(new Date(dateStr), 'HH:mm'); } catch { return '--:--'; }
  };

  if (loading) {
    return (
      <div className="decorative-border">
        <div className="text-center text-gray-400 font-hebrew text-xl py-6">טוען זמני שבת...</div>
      </div>
    );
  }

  if (!shabbatData?.candleLighting) return null;

  const { candleLighting, havdalah } = shabbatData;

  const times = {
    candle:        fmt(candleLighting?.date),
    havdalah:      fmt(havdalah?.date),
    mincha:        candleLighting?.date ? format(addMinutes(new Date(candleLighting.date), 5), 'HH:mm') : '--:--',
    shacharit:     '07:30',
    minchaShabbat: '14:30',
    arvit:         havdalah?.date ? format(addMinutes(new Date(havdalah.date), -12), 'HH:mm') : '--:--',
  };

  return (
    <div className="decorative-border">
      {/* Top ornament */}
      <div className="flex items-center justify-center gap-3 mb-2 select-none">
        {['✦', '✡', '✦', '✡', '✦'].map((s, i) => (
          <span
            key={i}
            style={{ color: i % 2 === 0 ? '#D4AF37' : '#FFD700', fontSize: i === 2 ? '1.1rem' : '0.7rem', opacity: i === 2 ? 1 : 0.5 }}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Title */}
      <h2
        className="text-center font-bold font-hebrew mb-1"
        style={{
          fontSize: '2rem',
          color: '#FFD700',
          letterSpacing: '0.12em',
          textShadow: '0 0 30px rgba(212,175,55,0.5), 0 2px 12px rgba(0,0,0,0.8)',
        }}
      >
        זמני שבת קודש
      </h2>

      {/* Divider */}
      <div className="flex flex-col items-center gap-1 mb-4">
        <div className="flex items-center gap-3 w-full max-w-sm">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, #D4AF37, transparent)' }} />
          <span className="text-primary-gold text-xs select-none">◆</span>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, #D4AF37, transparent)' }} />
        </div>
        <div className="flex items-center gap-3 w-full max-w-xs">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, rgba(212,175,55,0.4), transparent)' }} />
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, rgba(212,175,55,0.4), transparent)' }} />
        </div>
      </div>

      {/* 3-column × 2-row card grid */}
      <div className="grid grid-cols-3 gap-3">
        {CARDS.map((card, i) => (
          <ShabbatCard
            key={card.key}
            label={card.label}
            icon={card.icon}
            time={times[card.key]}
            glow={card.glow}
            accentColor={card.accentColor}
            delay={i * 120}
          />
        ))}
      </div>

      {/* Bottom ornament */}
      <div className="flex items-center justify-center gap-3 mt-3 select-none">
        {['✦', '✡', '✦', '✡', '✦'].map((s, i) => (
          <span
            key={i}
            style={{ color: i % 2 === 0 ? '#D4AF37' : '#FFD700', fontSize: i === 2 ? '1.1rem' : '0.7rem', opacity: i === 2 ? 1 : 0.5 }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ShabbatTimes;
