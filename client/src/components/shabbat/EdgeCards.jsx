import { C, CARD, DEEP_CARD, SERIF } from './shabbatStyle';
import { TwinCandles, HavdalahSet } from './icons';

// The three cards across the top of the שבת board. They share a row, a height and a visual
// weight, so they share a file — and the two white ones share a shape that would otherwise be
// copied twice.
//
// Every time here may be null, which renders '--:--'. That is deliberate and matches the rest
// of the display: a failed Hebcal leg blanks its own row and leaves the others alone.
const clock = (t) => t || '--:--';

const EdgeShell = ({ icon, title, children }) => (
  <div style={{ ...CARD, padding: '14px 22px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {icon}
      <div style={{ fontSize: '24px', fontWeight: 700, color: C.goldDeep, letterSpacing: '3px' }}>{title}</div>
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', marginTop: '2px' }}>{children}</div>
  </div>
);

const Big = ({ children }) => (
  <div style={{ fontSize: '38px', fontWeight: 800, color: C.navy, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
    {children}
  </div>
);

const Sub = ({ children }) => (
  <div style={{ fontFamily: SERIF, fontSize: '23px', fontWeight: 700, color: C.navySoft }}>{children}</div>
);

// `sunset` is FRIDAY's, on Saturday as much as on Friday — see shabbatFriday in displayData.js.
// The card is a statement about the Shabbat being kept, not a countdown.
export const CandleCard = ({ candles, sunset }) => (
  <EdgeShell icon={<TwinCandles />} title="הַדְלָקַת נֵרוֹת">
    <Big>{clock(candles)}</Big>
    <Sub>שקיעת החמה (שישי) {clock(sunset)}</Sub>
  </EdgeShell>
);

// `tzeit` is Saturday's שקיעה + 18, the same reckoning the זמנים grid uses. `tzeitRT` is
// Saturday's צאת ר״ת, read straight off Hebcal.
export const HavdalahCard = ({ tzeit, tzeitRT }) => (
  <EdgeShell icon={<HavdalahSet />} title="מוֹצָאֵי שַׁבָּת">
    <Big>{clock(tzeit)}</Big>
    <Sub>הבדלה · ר״ת {clock(tzeitRT)}</Sub>
  </EdgeShell>
);

// The one card on this row that changes every second. `next` comes from computeNextMinyan over
// the שבת list, so on Friday it names קבלת שבת and on Saturday afternoon it names מנחה — the
// `day` tag on each SHABBAT_PRAYERS row is what keeps it from offering Friday's candle lighting
// to a hall sitting in shul on Saturday morning.
export const NextPrayerCard = ({ next }) => (
  <div style={{ ...DEEP_CARD, padding: '12px 24px', textAlign: 'center' }}>
    <div style={{ fontSize: '24px', fontWeight: 700, color: C.goldLight, letterSpacing: '4px' }}>הַתְּפִלָּה הַבָּאָה</div>
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '24px', marginTop: '2px' }}>
      <div style={{ fontFamily: SERIF, fontSize: '25px', fontWeight: 700, color: C.onDeepBright }}>{next.name}</div>
      <div style={{ fontSize: '54px', fontWeight: 800, color: C.onDeep, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05 }}>
        {next.time}
      </div>
      <div style={{ fontSize: '24px', fontWeight: 700, color: C.goldLight, fontVariantNumeric: 'tabular-nums' }}>
        בעוד {next.countdown}
      </div>
    </div>
  </div>
);
