import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSettings, updateSettings } from '../../services/content';
import { getZmanim, getParasha } from '../../services/hebcal';
import {
  SHABBAT_CONFIG,
  resolveShabbatTimes,
  shabbatAnchors,
  upcomingSaturday,
} from '../../components/display/displayData';
import * as S from './adminStyles';

// The five שבת rows, in the order the display posts them. `auto` names the key each row
// takes out of resolveShabbatTimes' output, which is why it differs from `key`: the
// stored override is `mincha`, the computed value is `shabMincha`.
const ROWS = [
  { key: 'candles', label: 'הדלקת נרות', auto: 'shabCandles' },
  { key: 'kabbalat', label: 'מנחה וקבלת שבת', auto: 'shabKabbalat' },
  { key: 'shacharit', label: 'שחרית', auto: 'shabShacharit' },
  { key: 'mincha', label: 'מנחה', auto: 'shabMincha' },
  { key: 'arvit', label: 'ערבית מוצ״ש', auto: 'shabArvit' },
];

const BLANK = Object.fromEntries(ROWS.map((r) => [r.key, '']));

export default function ShabbatTimesForm() {
  const [values, setValues] = useState(BLANK);
  // null until the Hebcal round trip settles, so "still calculating" and "could not be
  // calculated" read differently — they are one slow network apart and the gabbai should
  // not be told the second while the first is true.
  const [autoTimes, setAutoTimes] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // The stored overrides. This is the only request the form waits on: it comes from our
  // own server, on the LAN, and the five inputs are unusable until it answers.
  useEffect(() => {
    let cancelled = false;

    getSettings()
      .then((stored) => {
        if (cancelled) return;
        const shabbat = stored?.shabbat || {};
        setValues({ ...BLANK, ...Object.fromEntries(ROWS.map((r) => [r.key, shabbat[r.key] || ''])) });
      })
      .catch(() => {
        if (!cancelled) setMessage('לא ניתן לטעון את ההגדרות');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The automatic values, shown under each field so the gabbai can see what he is about to
  // replace. Deliberately a SEPARATE effect that nothing waits on: these come from Hebcal,
  // over the internet, and when it is slow or unreachable each request hangs until axios
  // gives up. Awaiting them alongside the settings — which an earlier version of this file
  // did — left the whole form disabled and empty behind a dead third party, hiding the
  // times the gabbai came here to change. Losing the hint is acceptable; losing the screen
  // is not.
  useEffect(() => {
    let cancelled = false;

    const loadAuto = async () => {
      const saturday = upcomingSaturday(new Date());
      const [parasha, satZmanim] = await Promise.allSettled([
        getParasha(SHABBAT_CONFIG.candleLightingMinBeforeSunset),
        getZmanim(saturday),
      ]);
      if (cancelled) return;
      const value = (r) => (r.status === 'fulfilled' ? r.value : null);

      // Resolved with NO overrides: this is what each row would show if its field were
      // left empty, which is exactly the number the decision turns on.
      setAutoTimes(
        resolveShabbatTimes({
          ...shabbatAnchors(value(parasha), saturday),
          saturdaySunset: value(satZmanim)?.times?.sunset,
        })
      );
    };

    loadAuto();
    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving || loading) return;
    setSaving(true);
    setFieldErrors({});
    setMessage('');
    setSaved(false);

    try {
      // All five keys every time. A blank is a real value here — it is what clears an
      // override — so an omitted field would leave a stale time pinned.
      await updateSettings({ shabbat: values });
      setSaved(true);
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      setFieldErrors(data?.errors || {});
      setMessage((status === 400 && data?.message) || 'השמירה נכשלה — בדוק את החיבור לשרת');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={S.screen}>
      <Link to="/adminGabbai" style={S.backLink}>‹ חזרה</Link>
      <h1 style={S.title}>זמני שבת</h1>
      <p style={{ ...S.muted, marginBottom: '18px', lineHeight: 1.5 }}>
        שדה ריק מחושב אוטומטית מזמני היום. מילוי שעה קובע אותה על הלוח עד שתנקה אותה.
      </p>

      {message && <div style={S.error}>{message}</div>}
      {saved && <div style={savedBanner}>נשמר — הלוח יתעדכן תוך חצי דקה</div>}
      {loading && <p style={S.muted}>טוען…</p>}

      <form onSubmit={submit}>
        {ROWS.map((row) => {
          const auto = autoTimes?.[row.auto];
          return (
            <div key={row.key} style={{ marginBottom: '18px' }}>
              <label style={S.label} htmlFor={row.key}>{row.label}</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id={row.key}
                  type="time"
                  value={values[row.key]}
                  onChange={(e) => setField(row.key, e.target.value)}
                  disabled={loading || saving}
                  style={{ ...S.input, flex: 1, opacity: loading || saving ? 0.6 : 1 }}
                />
                {/* Clearing is how a row goes back to automatic, and a native time input
                    makes that unobvious on some browsers. */}
                <button
                  type="button"
                  onClick={() => setField(row.key, '')}
                  disabled={!values[row.key] || saving}
                  style={{ ...S.button, opacity: values[row.key] ? 1 : 0.4, padding: '10px 14px' }}
                >
                  נקה
                </button>
              </div>
              <div style={{ ...S.muted, fontSize: '14px', marginTop: '5px' }}>
                {values[row.key] ? 'קבוע · ' : 'אוטומטי · '}
                {autoTimes === null
                  ? 'מחשב…'
                  : auto
                    ? `חישוב לשבת הקרובה: ${auto}`
                    : 'לא ניתן לחשב כרגע'}
              </div>
              {fieldErrors[row.key] && <div style={S.fieldError}>{fieldErrors[row.key]}</div>}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={loading || saving}
          style={{ ...S.primaryButton, opacity: loading || saving ? 0.6 : 1 }}
        >
          {saving ? 'שומר…' : 'שמור'}
        </button>
      </form>
    </div>
  );
}

const savedBanner = {
  background: 'rgba(201,168,106,0.12)',
  border: '1px solid rgba(201,168,106,0.45)',
  borderRadius: '10px',
  padding: '10px 14px',
  color: S.COLORS.goldLight,
  fontSize: '16px',
  marginBottom: '14px',
};
