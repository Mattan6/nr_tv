import { useState } from 'react';
import * as S from './mobileStyles';

// All ten זמנים, two columns, collapsible. Open by default: the rows are the reason a
// phone opens this page as often as the minyan times are, and a collapsed panel on first
// paint reads as missing rather than as tidy. Collapsing is there for scrolling past it.
const ZmanimAccordion = ({ rows }) => {
  const [open, setOpen] = useState(true);

  return (
    <div
      style={{
        ...S.card,
        background: 'linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))',
        border: '1px solid rgba(201,168,106,0.18)',
        padding: '16px 18px',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ ...S.plainButton, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span style={{ ...S.sectionTitle, fontSize: '20px' }}>זמני היום</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: S.COLORS.muted, letterSpacing: '1px' }}>
          {open ? 'הסתר' : 'הצג'}
        </span>
      </button>

      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px', marginTop: '8px' }}>
          {rows.map((z) => (
            <div
              key={z.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '9px 0',
                borderTop: '1px solid rgba(255,255,255,0.055)',
              }}
            >
              <div style={{ fontSize: '15px', color: '#cdd5e0' }}>{z.name}</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: S.COLORS.goldText, fontVariantNumeric: 'tabular-nums' }}>
                {z.time}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ZmanimAccordion;
