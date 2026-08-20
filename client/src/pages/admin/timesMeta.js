import { getZmanim, getParasha, getHolidayCalendar } from '../../services/hebcal';
import {
  SHABBAT_CONFIG,
  resolveShabbatTimes,
  shabbatAnchors,
  upcomingSaturday,
  israelToday,
} from '../../components/display/displayData';
import {
  HOLIDAY_WINDOW_BACK_DAYS,
  HOLIDAY_WINDOW_DAYS,
  ROSH_HASHANAH,
  holidayAnchors,
  resolveRoshTimes,
} from '../../components/rosh/roshData';

// One descriptor per settings group, which is what lets a single TimesForm serve every board.
//
// `rows` names the stored key, its Hebrew label, and which key of `load`'s output holds the
// automatic value. Those two differ on the שבת board — the stored override is `mincha` while
// the computed value is `shabMincha` — which is why `auto` exists at all rather than the form
// just reusing `key`.
//
// `load` resolves with NO overrides applied: what each row would show if its field were left
// empty, which is exactly the number the gabbai's decision turns on. It is called from an
// effect that nothing else waits on — see TimesForm — so it is allowed to be slow.
export const SETTINGS_META = {
  shabbat: {
    title: 'זמני שבת',
    icon: '🕯',
    intro: 'שדה ריק מחושב אוטומטית מזמני היום. מילוי שעה קובע אותה על הלוח עד שתנקה אותה.',
    rows: [
      { key: 'candles', label: 'הדלקת נרות', auto: 'shabCandles' },
      { key: 'kabbalat', label: 'מנחה וקבלת שבת', auto: 'shabKabbalat' },
      { key: 'shacharit', label: 'שחרית', auto: 'shabShacharit' },
      { key: 'mincha', label: 'מנחה', auto: 'shabMincha' },
      { key: 'arvit', label: 'ערבית מוצ״ש', auto: 'shabArvit' },
    ],
    autoLabel: 'חישוב לשבת הקרובה',
    load: async () => {
      const saturday = upcomingSaturday(new Date());
      const [parasha, satZmanim] = await Promise.allSettled([
        getParasha(SHABBAT_CONFIG.candleLightingMinBeforeSunset),
        getZmanim(saturday),
      ]);
      const value = (r) => (r.status === 'fulfilled' ? r.value : null);

      return resolveShabbatTimes({
        ...shabbatAnchors(value(parasha), saturday),
        saturdaySunset: value(satZmanim)?.times?.sunset,
      });
    },
  },
  rosh: {
    title: 'זמני ראש השנה',
    icon: '🍎',
    intro:
      'שלושת הזמנים האלה נמשכים אוטומטית מלוח השנה עבור ניצן. שדה ריק = אוטומטי. מילוי שעה קובע אותה על הלוח עד שתנקה אותה.',
    rows: [
      { key: 'candles1', label: 'הדלקת נרות · ערב יום א׳', auto: 'candles1' },
      { key: 'candles2', label: 'הדלקת נרות · ליל יום ב׳', auto: 'candles2' },
      { key: 'havdalah', label: 'מוצאי החג', auto: 'havdalah' },
    ],
    autoLabel: 'חישוב לראש השנה הקרוב',
    load: async () => {
      const today = israelToday(new Date());
      const from = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - HOLIDAY_WINDOW_BACK_DAYS,
        12, 0, 0, 0
      );
      const response = await getHolidayCalendar(from, HOLIDAY_WINDOW_DAYS);
      return resolveRoshTimes(holidayAnchors(response, ROSH_HASHANAH), {});
    },
  },
};

// `/adminGabbai/settings` with no group still means שבת — that is the address on the gabbai's
// phone, bookmarked since before there was a second board with times.
export const DEFAULT_SETTINGS_GROUP = 'shabbat';
