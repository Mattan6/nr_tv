import { C, SERIF } from './roshStyle';
// Their own module rather than a member of icons.jsx: eight drawings is most of a file on its
// own, and mixing a data export in beside the icon components trips react-refresh's
// only-export-components rule.
import { SIMANIM } from './simanim';

// סימני השנה — the eight foods eaten on ראש השנה night.
//
// Fixed content, deliberately not gabbai-editable: it is the same eight in every Sephardi shul
// in every year, and it is drawn rather than typed. This strip is the board's decoration — the
// counterpart of the שבת board's tallit band — and the one element on it carrying no data at
// all. If a shul ever wanted a different set, that is a new panel, not a config flag on this.
const SimanimStrip = () => (
  <div
    style={{
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '22px',
      padding: '10px 46px 12px',
      background: 'linear-gradient(180deg,#fbf5e7,#f6ecd6)',
      borderTop: '1px solid rgba(176,135,63,0.4)',
    }}
  >
    <div style={{ flex: 'none', textAlign: 'center', paddingLeft: '6px' }}>
      <div style={{ fontFamily: SERIF, fontSize: '24px', fontWeight: 900, color: C.pomegranate, lineHeight: 1.15 }}>
        סִימָנֵי
        <br />
        הַשָּׁנָה
      </div>
    </div>

    <div style={{ width: '1px', alignSelf: 'stretch', background: C.goldEdgeStrong }} />

    <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '10px' }}>
      {SIMANIM.map((siman) => (
        <div key={siman.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          <svg width="58" height="58" viewBox="0 0 58 58" aria-hidden="true">
            {siman.draw}
          </svg>
          <div style={{ fontFamily: SERIF, fontSize: '24px', fontWeight: 700, color: C.inkSteel }}>{siman.name}</div>
        </div>
      ))}
    </div>
  </div>
);

export default SimanimStrip;
