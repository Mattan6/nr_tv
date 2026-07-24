import { format } from 'date-fns';
import { TZEIT_AFTER_SUNSET_MIN } from '../display/displayData';

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
      { label: 'צאת הכוכבים', icon: '★', getTime: () => null,            glow: false, isTzeit: true },
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

// Same reckoning as the main display's זמנים panel, off the same constant — the two
// screens post the same zman under the same name and must never disagree. The 18 used
// to be a literal here while the display read Hebcal's 8.5° field, and the two were
// 22 minutes apart in July.
const computeTzeit = (zmanim) => {
  if (!zmanim?.sunset) return '--:--';
  try {
    const d = new Date(zmanim.sunset);
    d.setMinutes(d.getMinutes() + TZEIT_AFTER_SUNSET_MIN);
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
