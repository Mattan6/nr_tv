import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSettings, updateSettings } from '../../services/content';
import { SETTINGS_META, DEFAULT_SETTINGS_GROUP } from './timesMeta';
import { BOARDS } from './boards';
import * as S from './adminStyles';

// The pinned-times screen, one instance per settings group.
//
// This was ShabbatTimesForm until there was a second board with times. Nothing about how it
// works changed — only where the five rows and their automatic values come from, which is now
// a descriptor in timesMeta.js.
export default function TimesForm() {
  const { group = DEFAULT_SETTINGS_GROUP } = useParams();
  const meta = SETTINGS_META[group];

  const rows = useMemo(() => meta?.rows || [], [meta]);
  const blank = useMemo(() => Object.fromEntries(rows.map((r) => [r.key, ''])), [rows]);

  const [values, setValues] = useState(blank);
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
  // own server, on the LAN, and the inputs are unusable until it answers.
  useEffect(() => {
    if (!meta) return undefined;
    let cancelled = false;

    getSettings()
      .then((stored) => {
        if (cancelled) return;
        const saved_ = stored?.[group] || {};
        setValues({ ...blank, ...Object.fromEntries(rows.map((r) => [r.key, saved_[r.key] || ''])) });
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
  }, [group, meta, rows, blank]);

  // The automatic values, shown under each field so the gabbai can see what he is about to
  // replace. Deliberately a SEPARATE effect that nothing waits on: these come from Hebcal,
  // over the internet, and when it is slow or unreachable each request hangs until axios
  // gives up. Awaiting them alongside the settings — which an earlier version of this file
  // did — left the whole form disabled and empty behind a dead third party, hiding the
  // times the gabbai came here to change. Losing the hint is acceptable; losing the screen
  // is not.
  useEffect(() => {
    if (!meta) return undefined;
    let cancelled = false;

    meta
      .load()
      .then((times) => {
        if (!cancelled) setAutoTimes(times);
      })
      .catch(() => {
        // Leave it null — every row then reads 'לא ניתן לחשב כרגע' rather than a wrong number.
        if (!cancelled) setAutoTimes({});
      });

    return () => {
      cancelled = true;
    };
  }, [group, meta]);

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
      // Every key of THIS group, every time. A blank is a real value here — it is what clears
      // an override — so an omitted field would leave a stale time pinned.
      //
      // And only this group: the server merges group-wise, so saving here cannot touch another
      // board's pinned times. See validateSettings on the server.
      await updateSettings({ [group]: values });
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

  const backTo = (() => {
    const board = BOARDS.find((b) => b.settings === group);
    return board ? `/adminGabbai/board/${board.id}` : '/adminGabbai';
  })();

  if (!meta) {
    return (
      <div style={S.screen}>
        <Link to="/adminGabbai" style={S.backLink}>‹ חזרה</Link>
        <p style={S.muted}>הגדרות לא קיימות</p>
      </div>
    );
  }

  return (
    <div style={S.screen}>
      <Link to={backTo} style={S.backLink}>‹ חזרה</Link>
      <h1 style={S.title}>{meta.title}</h1>
      <p style={{ ...S.muted, marginBottom: '18px', lineHeight: 1.5 }}>{meta.intro}</p>

      {message && <div style={S.error}>{message}</div>}
      {saved && <div style={savedBanner}>נשמר — הלוח יתעדכן תוך חצי דקה</div>}
      {loading && <p style={S.muted}>טוען…</p>}

      <form onSubmit={submit}>
        {rows.map((row) => {
          const auto = autoTimes?.[row.auto];
          return (
            <div key={row.key} style={{ marginBottom: '18px' }}>
              <label style={S.label} htmlFor={row.key}>{row.label}</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  id={row.key}
                  type="time"
                  value={values[row.key] || ''}
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
                    ? `${meta.autoLabel}: ${auto}`
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
