# Prayer Times Date Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone `/zmanim` page where a user picks any date and sees the prayer times (zmanim) for that date, without changing the passive TV display.

**Architecture:** Extract the existing styled zmanim card out of `PrayerTimes.jsx` into a reusable `ZmanimCard` presentational component. The TV display's `PrayerTimes` keeps fetching *today* and renders `ZmanimCard`. A new `Zmanim` page holds a selected-date state, fetches zmanim + Hebrew date for that date, and renders the same `ZmanimCard`. Route added in `App.jsx`.

**Tech Stack:** React 19, react-router-dom 7, Vite 7, Tailwind CSS 4, date-fns 4, axios, Hebcal public API. No backend/database involved.

## Global Constraints

- **No new npm dependencies.** Use native `<input type="date">` and the already-installed `date-fns`.
- **No backend/database.** Data comes from the Hebcal API directly, exactly like the current `PrayerTimes`.
- **The TV display at `/` must stay visually identical** after the refactor.
- **RTL + gold/dark theme.** Reuse existing classes: `decorative-border`, `font-hebrew`, colors `#D4AF37` / `#FFD700`, and existing loading/error copy (`טוען זמני תפילות...`, `לא ניתן לטעון זמני תפילות`).
- **Any date is selectable** (past or future).
- **Known limitation (unchanged):** times render in the viewer's local timezone (correct when viewed from Israel).

## Testing Approach

This codebase has **no test runner** (client has ESLint only; server `test` is a stub). Adding a test framework is out of scope for this feature. Each task is verified by:
1. `npm run lint` inside `client/` — must introduce **no new** lint errors.
2. Explicit manual browser checks with the dev server running (`npm run dev` from the repo root, then open the URL).

## File Structure

- `client/src/services/hebcal.js` — **Modify.** `getZmanim(date)` and `getHebrewDate(date)` accept an optional `Date` (default today); format the date in **local** time.
- `client/src/components/PrayerTimes/ZmanimCard.jsx` — **Create.** Presentational styled zmanim card. Props: `zmanim`, optional `title`.
- `client/src/components/PrayerTimes/PrayerTimes.jsx` — **Modify.** Fetch today's zmanim (unchanged behavior) and render `ZmanimCard`.
- `client/src/pages/Zmanim.jsx` — **Create.** Date-picker lookup page.
- `client/src/App.jsx` — **Modify.** Add `<Route path="/zmanim" element={<Zmanim />} />`.

---

### Task 1: Make the Hebcal service date-aware

**Files:**
- Modify: `client/src/services/hebcal.js`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `getZmanim(date?: Date) => Promise<{ times: object, ... }>` — defaults to today; formats date as local `yyyy-MM-dd`.
  - `getHebrewDate(date?: Date) => Promise<{ hebrew: string, ... }>` — defaults to today; uses local calendar fields.

- [ ] **Step 1: Add the `date-fns` import for local date formatting**

At the top of `client/src/services/hebcal.js`, below the existing `import axios from 'axios';` line, add:

```js
import { format } from 'date-fns';
```

- [ ] **Step 2: Make `getZmanim` accept an optional date and format it locally**

Replace the entire existing `getZmanim` function with:

```js
/**
 * Get Zmanim (prayer times) for a given date (defaults to today).
 * @param {Date} [date] - The date to fetch zmanim for. Defaults to today.
 * @returns {Promise} Prayer times including sunrise, sunset, and all zmanim
 */
export const getZmanim = async (date = new Date()) => {
  try {
    const response = await axios.get(`${HEBCAL_API_URL}/zmanim`, {
      params: {
        cfg: 'json',
        latitude: LOCATION.latitude,
        longitude: LOCATION.longitude,
        tzid: LOCATION.tzid,
        date: format(date, 'yyyy-MM-dd'),
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching zmanim:', error);
    throw error;
  }
};
```

Note: this replaces the previous `today.toISOString().split('T')[0]` (UTC) with `format(date, 'yyyy-MM-dd')` (local), fixing an off-by-one near midnight and enabling arbitrary dates.

- [ ] **Step 3: Make `getHebrewDate` accept an optional date**

Replace the entire existing `getHebrewDate` function with:

```js
/**
 * Get Hebrew date for a given date (defaults to today).
 * @param {Date} [date] - The date to convert. Defaults to today.
 * @returns {Promise} Hebrew date information (including a `hebrew` string field)
 */
export const getHebrewDate = async (date = new Date()) => {
  try {
    const response = await axios.get(`${HEBCAL_API_URL}/converter`, {
      params: {
        cfg: 'json',
        gy: date.getFullYear(),
        gm: date.getMonth() + 1,
        gd: date.getDate(),
        g2h: 1,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching Hebrew date:', error);
    throw error;
  }
};
```

- [ ] **Step 4: Lint**

Run: `cd client && npm run lint`
Expected: no new errors referencing `hebcal.js`.

- [ ] **Step 5: Regression-check the display still shows today**

Run `npm run dev` from the repo root, open `http://localhost:5173/`. The PrayerTimes slide must still show today's times exactly as before (default-argument path).

- [ ] **Step 6: Commit**

```bash
git add client/src/services/hebcal.js
git commit -m "feat: make getZmanim/getHebrewDate accept an optional date (local formatting)"
```

---

### Task 2: Extract `ZmanimCard` and refactor `PrayerTimes`

**Files:**
- Create: `client/src/components/PrayerTimes/ZmanimCard.jsx`
- Modify: `client/src/components/PrayerTimes/PrayerTimes.jsx`

**Interfaces:**
- Consumes: `getZmanim()` (Task 1), the `zmanim.times` object shape (`chatzotNight`, `alotHaShachar`, `sunrise`, `sofZmanShma`, `sofZmanTfilla`, `chatzot`, `minchaGedola`, `sunset`).
- Produces: `ZmanimCard({ zmanim: object, title?: string })` default-exported from `components/PrayerTimes/ZmanimCard.jsx`. `title` defaults to `'זמני היום'`.

- [ ] **Step 1: Create `ZmanimCard.jsx` with the full extracted card**

Create `client/src/components/PrayerTimes/ZmanimCard.jsx` with exactly:

```jsx
import { format } from 'date-fns';

const SECTIONS = [
  {
    title: 'לילה ושחרית',
    titleIcon: '☽',
    bg: 'linear-gradient(135deg, rgba(8,14,50,0.75) 0%, rgba(18,30,80,0.55) 100%)',
    panelBorder: 'rgba(100,130,255,0.3)',
    accentColor: '#8899ff',
    items: [
      { label: 'חצות לילה',  icon: '☽',  getTime: (z) => z.chatzotNight,  glow: false },
      { label: 'עלות השחר', icon: '✦',  getTime: (z) => z.alotHaShachar, glow: false },
      { label: 'זריחה',      icon: '☀',  getTime: (z) => z.sunrise,        glow: true  },
    ],
  },
  {
    title: 'בוקר',
    titleIcon: '✡',
    bg: 'linear-gradient(135deg, rgba(11,27,61,0.65) 0%, rgba(20,45,100,0.45) 100%)',
    panelBorder: 'rgba(212,175,55,0.3)',
    accentColor: '#D4AF37',
    items: [
      { label: 'סוף זמן ק"ש',  icon: '✡', getTime: (z) => z.sofZmanShma,   glow: false },
      { label: 'סוף זמן תפילה', icon: '✡', getTime: (z) => z.sofZmanTfilla, glow: false },
      { label: 'זמן חצות',      icon: '◎', getTime: (z) => z.chatzot,        glow: true  },
    ],
  },
  {
    title: 'אחה"צ וערב',
    titleIcon: '★',
    bg: 'linear-gradient(135deg, rgba(35,15,8,0.65) 0%, rgba(20,10,40,0.65) 100%)',
    panelBorder: 'rgba(255,140,60,0.3)',
    accentColor: '#ff8c3c',
    items: [
      { label: 'מנחה גדולה',   icon: '◆', getTime: (z) => z.minchaGedola, glow: false },
      { label: 'שקיעה',        icon: '◐', getTime: (z) => z.sunset,        glow: true  },
      { label: 'צאת הכוכבים', icon: '★', getTime: (z) => null,            glow: false, isTzeit: true },
    ],
  },
];

// helper: convert hex color to "r,g,b" string for rgba()
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

const formatTime = (timeString) => {
  if (!timeString) return '--:--';
  try {
    return format(new Date(timeString), 'HH:mm');
  } catch {
    return '--:--';
  }
};

const computeTzeit = (zmanim) => {
  if (!zmanim?.sunset) return '--:--';
  try {
    const d = new Date(zmanim.sunset);
    d.setMinutes(d.getMinutes() + 18);
    return format(d, 'HH:mm');
  } catch {
    return '--:--';
  }
};

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
    {/* Top accent stripe */}
    <div
      className="w-full h-1"
      style={{
        background: glow
          ? `linear-gradient(to right, transparent, ${accentColor}, transparent)`
          : 'linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)',
      }}
    />

    <div className="py-2 px-2 w-full flex flex-col items-center gap-1">
      {/* Icon */}
      <div
        className="text-xl mb-0 leading-none select-none"
        style={{
          color: glow ? accentColor : 'rgba(212,175,55,0.7)',
          textShadow: glow ? `0 0 14px ${accentColor}` : 'none',
        }}
      >
        {icon}
      </div>

      {/* Thin divider */}
      <div
        className="w-8 h-px mb-1"
        style={{
          background: `linear-gradient(to right, transparent, ${glow ? accentColor : 'rgba(212,175,55,0.4)'}, transparent)`,
        }}
      />

      {/* Label */}
      <div
        className="text-sm font-medium leading-tight text-center mb-1"
        style={{ color: glow ? accentColor : '#D4AF37' }}
      >
        {label}
      </div>

      {/* Time */}
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

      {/* Bottom dots ornament */}
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

    {/* Bottom accent stripe */}
    <div
      className="w-full h-px"
      style={{
        background: `linear-gradient(to right, transparent, ${glow ? accentColor + '40' : 'rgba(255,255,255,0.06)'}, transparent)`,
      }}
    />
  </div>
);

const SectionPanel = ({ section, times, formatTime }) => (
  <div
    className="rounded-2xl overflow-hidden"
    style={{
      background: section.bg,
      border: `1px solid ${section.panelBorder}`,
      boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)`,
    }}
  >
    {/* Section header banner */}
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

    {/* Cards grid */}
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

const ZmanimCard = ({ zmanim, title = 'זמני היום' }) => {
  const times = { zmanim, tzeit: computeTzeit(zmanim) };

  return (
    <div className="decorative-border">

      {/* Top ornament row */}
      <div className="flex items-center justify-center gap-3 mb-2 select-none">
        {['✦', '✡', '✦', '✡', '✦'].map((s, i) => (
          <span key={i} style={{ color: i % 2 === 0 ? '#D4AF37' : '#FFD700', fontSize: i === 2 ? '1.1rem' : '0.7rem', opacity: i === 2 ? 1 : 0.5 }}>
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
        {title}
      </h2>

      {/* Double-line divider */}
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

      {/* Sections */}
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

      {/* Bottom ornament row */}
      <div className="flex items-center justify-center gap-3 mt-3 select-none">
        {['✦', '✡', '✦', '✡', '✦'].map((s, i) => (
          <span key={i} style={{ color: i % 2 === 0 ? '#D4AF37' : '#FFD700', fontSize: i === 2 ? '1.1rem' : '0.7rem', opacity: i === 2 ? 1 : 0.5 }}>
            {s}
          </span>
        ))}
      </div>

    </div>
  );
};

export default ZmanimCard;
```

- [ ] **Step 2: Replace `PrayerTimes.jsx` with the slim version that renders `ZmanimCard`**

Replace the entire contents of `client/src/components/PrayerTimes/PrayerTimes.jsx` with:

```jsx
import { useState, useEffect } from 'react';
import { getZmanim } from '../../services/hebcal';
import ZmanimCard from './ZmanimCard';

const PrayerTimes = () => {
  const [zmanim, setZmanim] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchZmanim = async () => {
      try {
        const data = await getZmanim();
        setZmanim(data.times);
      } catch (error) {
        console.error('Failed to fetch zmanim:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchZmanim();
    const interval = setInterval(fetchZmanim, 21600000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="decorative-border">
        <div className="text-center text-gray-400 font-hebrew text-2xl py-8">טוען זמני תפילות...</div>
      </div>
    );
  }

  if (!zmanim) {
    return (
      <div className="decorative-border">
        <div className="text-center text-gray-400 font-hebrew text-2xl py-8">לא ניתן לטעון זמני תפילות</div>
      </div>
    );
  }

  return <ZmanimCard zmanim={zmanim} />;
};

export default PrayerTimes;
```

- [ ] **Step 3: Lint**

Run: `cd client && npm run lint`
Expected: no new errors in `ZmanimCard.jsx` or `PrayerTimes.jsx`.

- [ ] **Step 4: Verify the display is visually unchanged**

With `npm run dev` running, open `http://localhost:5173/`. Wait for the PrayerTimes slide. It must look **identical** to before: title "זמני היום", three section panels, all times, ornaments. Compare against the pre-refactor look (git stash if needed).

- [ ] **Step 5: Commit**

```bash
git add client/src/components/PrayerTimes/ZmanimCard.jsx client/src/components/PrayerTimes/PrayerTimes.jsx
git commit -m "refactor: extract reusable ZmanimCard from PrayerTimes"
```

---

### Task 3: Zmanim page scaffold — route, date controls, Gregorian heading

**Files:**
- Create: `client/src/pages/Zmanim.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**
- Consumes: `ZmanimCard` (Task 2, imported but rendered in Task 4).
- Produces: default-exported `Zmanim` page component; route `/zmanim` in `App.jsx`. Owns `selectedDate` state (`Date`) with setters via prev/next-day, calendar input, and Today.

- [ ] **Step 1: Create `Zmanim.jsx` with date state, controls, and a heading (no zmanim fetch yet)**

Create `client/src/pages/Zmanim.jsx` with:

```jsx
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
```

- [ ] **Step 2: Register the `/zmanim` route in `App.jsx`**

In `client/src/App.jsx`, add the import below the existing `import Display from './pages/Display';` line:

```jsx
import Zmanim from './pages/Zmanim';
```

Then change the `<Routes>` block from:

```jsx
        <Routes>
          <Route path="/" element={<Display />} />
          {/* Admin routes will be added here */}
        </Routes>
```

to:

```jsx
        <Routes>
          <Route path="/" element={<Display />} />
          <Route path="/zmanim" element={<Zmanim />} />
          {/* Admin routes will be added here */}
        </Routes>
```

- [ ] **Step 3: Lint**

Run: `cd client && npm run lint`
Expected: no new errors in `Zmanim.jsx` or `App.jsx`.

- [ ] **Step 4: Verify controls and heading**

With `npm run dev` running, open `http://localhost:5173/zmanim`:
- Heading shows today's weekday (Hebrew) and today's date `dd/MM/yyyy`.
- ▶ moves the heading back one day; ◀ moves it forward one day.
- The calendar field opens a date picker; choosing a date updates the heading to that date.
- "היום" is disabled when the selected date is today, and returns to today after navigating away.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Zmanim.jsx client/src/App.jsx
git commit -m "feat: add /zmanim page scaffold with date controls and heading"
```

---

### Task 4: Wire zmanim + Hebrew date fetching into the Zmanim page

**Files:**
- Modify: `client/src/pages/Zmanim.jsx`

**Interfaces:**
- Consumes: `getZmanim(date)` and `getHebrewDate(date)` (Task 1); `ZmanimCard` (Task 2).
- Produces: fully working `/zmanim` — fetches on `selectedDate` change, renders the card, shows the Hebrew date in the heading, and handles loading/error.

- [ ] **Step 1: Add imports for the service and the card**

In `client/src/pages/Zmanim.jsx`, update the top imports. Change:

```jsx
import { useState } from 'react';
import { addDays, format } from 'date-fns';
```

to:

```jsx
import { useState, useEffect } from 'react';
import { addDays, format } from 'date-fns';
import { getZmanim, getHebrewDate } from '../services/hebcal';
import ZmanimCard from '../components/PrayerTimes/ZmanimCard';
```

- [ ] **Step 2: Add fetch state and effect**

Inside the `Zmanim` component, immediately after the line `const [selectedDate, setSelectedDate] = useState(new Date());`, add:

```jsx
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
```

- [ ] **Step 3: Show the Hebrew date in the heading**

In the heading block, replace:

```jsx
        {/* Selected-date heading */}
        <div className="text-center mb-4 font-hebrew" dir="rtl">
          <div className="text-2xl font-bold" style={{ color: '#FFD700' }}>{weekday}</div>
          <div className="text-lg tabular-nums" style={{ color: '#D4AF37' }}>{gregorian}</div>
        </div>
```

with:

```jsx
        {/* Selected-date heading */}
        <div className="text-center mb-4 font-hebrew" dir="rtl">
          <div className="text-2xl font-bold" style={{ color: '#FFD700' }}>{weekday}</div>
          <div className="text-lg tabular-nums" style={{ color: '#D4AF37' }}>{gregorian}</div>
          {hebrewDate && (
            <div className="text-xl mt-1" style={{ color: '#D4AF37' }}>{hebrewDate}</div>
          )}
        </div>
```

- [ ] **Step 4: Render the card and loading/error states**

Immediately after the closing `</div>` of the heading block (and before the closing `</div>` of `max-w-7xl`), add:

```jsx
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
```

- [ ] **Step 5: Lint**

Run: `cd client && npm run lint`
Expected: no new errors in `Zmanim.jsx`.

- [ ] **Step 6: Verify end-to-end behavior**

With `npm run dev` running, open `http://localhost:5173/zmanim`:
- Page loads with today selected, shows a loading state briefly, then the zmanim card with today's times.
- Heading shows weekday + `dd/MM/yyyy` + Hebrew date string.
- ◀ / ▶ change the date and the card refetches and updates; the calendar field jumps to any date and refetches; "היום" returns to today.
- Pick a clearly future date (e.g. a month ahead) and confirm the times differ from today and the calendar day is correct (no off-by-one).
- Simulate an error: temporarily disconnect the network (or set DevTools offline) and change the date — the error message shows and controls stay usable.
- Confirm the TV display at `http://localhost:5173/` is still unaffected.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/Zmanim.jsx
git commit -m "feat: fetch and render zmanim + Hebrew date for the selected date"
```

---

## Self-Review

**Spec coverage:**
- New `/zmanim` route → Task 3 (route) + Tasks 3–4 (page).
- Date field + prev/next arrows + Today reset → Task 3 controls.
- Any date (past/future) → `addDays` and native date input impose no bounds.
- Heading with weekday + Gregorian + Hebrew date → Task 3 (weekday/Gregorian) + Task 4 (Hebrew date).
- Reusable card, display unchanged → Task 2.
- `getZmanim(date)` / `getHebrewDate(date)` → Task 1.
- Loading + error states reuse existing copy → Task 4.
- No new deps, no backend → satisfied (native input, date-fns, Hebcal API).
- Local-timezone limitation acknowledged; UTC off-by-one fixed in Task 1.

**Placeholder scan:** No TBD/TODO; all code steps contain full code.

**Type consistency:** `getZmanim`/`getHebrewDate` signatures match between Task 1 and Task 4. `ZmanimCard({ zmanim, title })` defined in Task 2 and consumed with `zmanim` in Tasks 2 and 4. `status` values `'loading' | 'ready' | 'error'` consistent within Task 4. `z.times` / `h.hebrew` match the Hebcal response fields used in `PrayerTimes` today.
