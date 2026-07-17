# Animated Slide Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scrollable single-page layout with two full-screen slides cycling every 15 s in an infinite loop — Slide 1 (prayer times) fades out, Slide 2 (shabbat times, shimmer/glow card reveal) fades in, repeat forever.

**Architecture:** `Display.jsx` owns `slideIndex` (0 or 1) and `fading` (bool); a 15-second interval sets `fading=true`, waits 800 ms for the CSS opacity transition, then swaps `slideIndex` and clears `fading`. Slides are conditionally rendered (not just hidden) so `ShabbatTimes` re-mounts each cycle and its staggered CSS `@keyframes shimmerReveal` animation replays automatically. Font sizes across header components and `PrayerTimes` are reduced so every slide fits inside one viewport with no scroll.

**Tech Stack:** React 18, Tailwind CSS, CSS keyframe animations (`index.css`), `date-fns`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `client/src/pages/Display.jsx` | Modify | Slide cycling logic, shared header, opacity fade |
| `client/src/index.css` | Modify | Remove `overflow: hidden` → back, trim `decorative-border` margin, add `@keyframes shimmerReveal` + `.shimmer-reveal` |
| `client/src/components/Clock/Clock.jsx` | Modify | Smaller font sizes |
| `client/src/components/HebrewDate/HebrewDate.jsx` | Modify | Smaller font size |
| `client/src/components/PrayerTimes/PrayerTimes.jsx` | Modify | Smaller time card font, tighter padding/gaps |
| `client/src/components/ShabbatTimes/ShabbatTimes.jsx` | Rewrite | Match PrayerTimes visual style, shimmer-reveal cards |

---

## Task 1: Add shimmer animation and fix decorative-border in index.css

**Files:**
- Modify: `client/src/index.css`

- [ ] **Step 1: Restore `overflow: hidden` on body and tighten `#root`**

In `client/src/index.css`, replace the current `body` overflow line and `#root` block:

```css
body {
  margin: 0;
  min-height: 100vh;
  background-image: url('/synagogue-bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  color: #ffffff;
  overflow: hidden;
}

#root {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
```

- [ ] **Step 2: Remove the large bottom margin from `.decorative-border` and add shimmer keyframe**

Replace the entire `.decorative-border` block and add the animation after it:

```css
.decorative-border {
  border: 2px solid #D4AF37;
  border-radius: 8px;
  position: relative;
  padding: 0.75rem;
}

.decorative-border::before,
.decorative-border::after {
  content: '✡';
  position: absolute;
  top: -12px;
  background: #0B1B3D;
  padding: 0 8px;
  color: #FFD700;
  font-size: 20px;
}

.decorative-border::before {
  right: 20px;
}

.decorative-border::after {
  left: 20px;
}

@keyframes shimmerReveal {
  0% {
    opacity: 0;
    transform: scale(0.96);
    box-shadow: none;
  }
  60% {
    opacity: 0.85;
    transform: scale(1.01);
    box-shadow: 0 0 28px rgba(212, 175, 55, 0.7), inset 0 0 12px rgba(212, 175, 55, 0.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 10px rgba(212, 175, 55, 0.15);
  }
}

.shimmer-reveal {
  animation: shimmerReveal 0.7s ease-out both;
}
```

- [ ] **Step 3: Verify the full `index.css` looks correct — no duplicate blocks, no leftover `margin-bottom: 6.5rem`**

---

## Task 2: Reduce font sizes in Clock.jsx

**Files:**
- Modify: `client/src/components/Clock/Clock.jsx`

- [ ] **Step 1: Replace the return block with smaller sizes**

Full file content after change:

```jsx
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
```

---

## Task 3: Reduce font size in HebrewDate.jsx

**Files:**
- Modify: `client/src/components/HebrewDate/HebrewDate.jsx`

- [ ] **Step 1: Change `text-5xl` to `text-3xl` in the return block**

Replace only the date display div:

```jsx
<div className="text-3xl font-bold font-hebrew text-primary-gold">
  {hebrewDate.hebrew}
</div>
```

(All other lines in `HebrewDate.jsx` remain unchanged.)

---

## Task 4: Reduce font sizes and spacing in PrayerTimes.jsx

**Files:**
- Modify: `client/src/components/PrayerTimes/PrayerTimes.jsx`

- [ ] **Step 1: Shrink `TimeCard` inner sizes**

In `TimeCard`, change:
- `text-3xl mb-1` (icon) → `text-xl mb-0`
- `text-lg font-medium` (label) → `text-sm font-medium`
- `fontSize: '2.7rem'` (time) → `fontSize: '1.8rem'`
- `py-4 px-3` (inner padding div) → `py-2 px-2`
- `mt-2` (dots) → `mt-1`
- `w-10 h-px mb-2` (divider) → `w-8 h-px mb-1`

Updated `TimeCard` component:

```jsx
const TimeCard = ({ label, icon, time, glow, accentColor }) => (
  <div
    className="relative flex flex-col items-center rounded-xl overflow-hidden font-hebrew"
    style={{
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
          textShadow: glow ? `0 0 20px rgba(${hexToRgb(accentColor)},0.6)` : '0 2px 8px rgba(0,0,0,0.5)',
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
```

- [ ] **Step 2: Shrink `SectionPanel` header and card grid**

In `SectionPanel`, change:
- Section header font: `fontSize: '1rem'` → `fontSize: '0.85rem'`
- Cards grid: `gap-3 p-4` → `gap-2 p-3`

Updated `SectionPanel`:

```jsx
const SectionPanel = ({ section, times, formatTime }) => (
  <div
    className="rounded-2xl overflow-hidden"
    style={{
      background: section.bg,
      border: `1px solid ${section.panelBorder}`,
      boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)`,
    }}
  >
    <div
      className="flex items-center gap-3 px-5 py-2"
      style={{
        background: `linear-gradient(90deg, transparent, rgba(${hexToRgb(section.accentColor)},0.12), transparent)`,
        borderBottom: `1px solid ${section.panelBorder}`,
      }}
    >
      <div className="h-px flex-1" style={{ background: `linear-gradient(to left, ${section.accentColor}50, transparent)` }} />
      <span className="select-none" style={{ color: section.accentColor, fontSize: '0.85rem' }}>◈</span>
      <span
        className="font-hebrew font-semibold tracking-widest"
        style={{ color: section.accentColor, fontSize: '0.85rem', letterSpacing: '0.18em' }}
      >
        {section.title}
      </span>
      <span className="select-none" style={{ color: section.accentColor, fontSize: '0.85rem' }}>◈</span>
      <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${section.accentColor}50, transparent)` }} />
    </div>
    <div className="grid grid-cols-3 gap-2 p-3">
      {section.items.map((item) => (
        <TimeCard
          key={item.label}
          label={item.label}
          icon={item.icon}
          time={item.isTzeit ? times.tzeit : formatTime(item.getTime(times.zmanim))}
          glow={item.glow}
          accentColor={section.accentColor}
        />
      ))}
    </div>
  </div>
);
```

- [ ] **Step 3: Shrink title, divider spacing, and section gaps in `PrayerTimes` return**

Change:
- `fontSize: '3rem'` (title) → `fontSize: '2rem'`
- `mb-6` (divider wrapper) → `mb-3`
- `space-y-3` (sections list) → `space-y-2`
- `mt-5` (bottom ornament) → `mt-3`
- `mb-3` (top ornament) → `mb-2`
- `mb-1` (title) → stays `mb-1`

Updated `PrayerTimes` return:

```jsx
return (
  <div className="decorative-border">
    <div className="flex items-center justify-center gap-3 mb-2 select-none">
      {['✦', '✡', '✦', '✡', '✦'].map((s, i) => (
        <span key={i} style={{ color: i % 2 === 0 ? '#D4AF37' : '#FFD700', fontSize: i === 2 ? '1.1rem' : '0.7rem', opacity: i === 2 ? 1 : 0.5 }}>
          {s}
        </span>
      ))}
    </div>

    <h2
      className="text-center font-bold font-hebrew mb-1"
      style={{
        fontSize: '2rem',
        color: '#FFD700',
        letterSpacing: '0.12em',
        textShadow: '0 0 30px rgba(212,175,55,0.5), 0 2px 12px rgba(0,0,0,0.8)',
      }}
    >
      זמני היום
    </h2>

    <div className="flex flex-col items-center gap-1 mb-3">
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

    <div className="space-y-2">
      {SECTIONS.map((section, i) => (
        <div key={section.title}>
          <SectionPanel section={section} times={times} formatTime={formatTime} />
          {i < SECTIONS.length - 1 && (
            <div className="flex items-center justify-center gap-2 my-1 select-none">
              {[0, 1, 2, 3, 4].map((j) => (
                <div
                  key={j}
                  className="rounded-full"
                  style={{
                    width: j === 2 ? '6px' : '4px',
                    height: j === 2 ? '6px' : '4px',
                    background: j === 2 ? '#D4AF37' : 'rgba(212,175,55,0.3)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>

    <div className="flex items-center justify-center gap-3 mt-3 select-none">
      {['✦', '✡', '✦', '✡', '✦'].map((s, i) => (
        <span key={i} style={{ color: i % 2 === 0 ? '#D4AF37' : '#FFD700', fontSize: i === 2 ? '1.1rem' : '0.7rem', opacity: i === 2 ? 1 : 0.5 }}>
          {s}
        </span>
      ))}
    </div>
  </div>
);
```

---

## Task 5: Rewrite ShabbatTimes.jsx with matching design + shimmer reveal

**Files:**
- Modify: `client/src/components/ShabbatTimes/ShabbatTimes.jsx`

- [ ] **Step 1: Replace the entire file with the new design**

```jsx
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
  { label: 'הדלקת נרות', icon: '🕯️', key: 'candle',        glow: true,  accentColor: '#FFD700' },
  { label: 'הבדלה',       icon: '⭐',  key: 'havdalah',     glow: false, accentColor: '#D4AF37' },
  { label: 'מנחה וקבלת שבת', icon: '✡', key: 'mincha',    glow: false, accentColor: '#D4AF37' },
  { label: 'שחרית שבת',  icon: '☀',  key: 'shacharit',    glow: false, accentColor: '#D4AF37' },
  { label: 'מנחה שבת',   icon: '◐',  key: 'minchaShabbat', glow: false, accentColor: '#D4AF37' },
  { label: 'ערבית מוצ״ש', icon: '★', key: 'arvit',         glow: false, accentColor: '#ff8c3c' },
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
```

---

## Task 6: Rewrite Display.jsx with slide cycling and shared header

**Files:**
- Modify: `client/src/pages/Display.jsx`

- [ ] **Step 1: Replace the entire file**

```jsx
import { useState, useEffect } from 'react';
import Clock from '../components/Clock/Clock';
import HebrewDate from '../components/HebrewDate/HebrewDate';
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
```

- [ ] **Step 2: Verify the app runs without errors**

```bash
cd client && npm run dev
```

Open the browser and confirm:
- Synagogue name, clock, Hebrew date all show at the top
- Prayer times slide fills the viewport without scrolling
- After 15 s the page fades out, then the Shabbat slide fades in with cards glowing in one by one (120 ms apart)
- After another 15 s it cycles back to prayer times
- No scroll bar appears on either slide

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Display.jsx client/src/index.css client/src/components/Clock/Clock.jsx client/src/components/HebrewDate/HebrewDate.jsx client/src/components/PrayerTimes/PrayerTimes.jsx client/src/components/ShabbatTimes/ShabbatTimes.jsx
git commit -m "feat: animated two-slide display with shimmer reveal for shabbat"
```
