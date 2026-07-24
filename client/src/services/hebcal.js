import axios from 'axios';
import { format } from 'date-fns';
import { SHABBAT_CONFIG } from '../components/display/displayData';

const HEBCAL_API_URL = import.meta.env.VITE_HEBCAL_API_URL || 'https://www.hebcal.com';

// Nitzan, Israel - accurate coordinates
// Located south of Ashdod, near the coast
const LOCATION = {
  latitude: 31.7167,
  longitude: 34.6333,
  tzid: 'Asia/Jerusalem',
  city: 'Nitzan',
};

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

/**
 * Get Parasha (Torah portion), candle lighting and havdalah for this week.
 * @param {number} [candleLightingMin] - Minutes before sunset for candle lighting,
 *   sent as Hebcal's `b` parameter. Passed explicitly rather than left to Hebcal's
 *   per-location default so the shul's posted time can only change when this number
 *   does. Defaults to `SHABBAT_CONFIG.candleLightingMinBeforeSunset` — the one place
 *   the number lives, and the seam the future admin panel attaches to. Do NOT restore
 *   a literal default here: the legacy callers below pass no argument, and a second
 *   copy of the number would let them silently diverge from the display the first
 *   time the config changed.
 * @returns {Promise} Parasha information
 */
export const getParasha = async (candleLightingMin = SHABBAT_CONFIG.candleLightingMinBeforeSunset) => {
  try {
    const response = await axios.get(`${HEBCAL_API_URL}/shabbat`, {
      params: {
        cfg: 'json',
        latitude: LOCATION.latitude,
        longitude: LOCATION.longitude,
        tzid: LOCATION.tzid,
        // הבדלה at nightfall (sun 8.5° below the horizon) instead of Hebcal's default
        // of a fixed 50 minutes after sundown. This does NOT control the parasha —
        // that comes back by default — so do not drop the line on those grounds:
        // winter's ערבית מוצ״ש counts back 10 minutes from this הבדלה
        // (SHABBAT_CONFIG.arvitBefore), and removing it would move that posted time.
        M: 'on',
        b: candleLightingMin,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching parasha:', error);
    throw error;
  }
};

/**
 * Get holidays and special days
 * @returns {Promise} Holidays for current Hebrew year
 */
export const getHolidays = async () => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const response = await axios.get(`${HEBCAL_API_URL}/hebcal`, {
      params: {
        cfg: 'json',
        year: year,
        month: 'x', // All months
        ss: 'on', // Include sunset
        mod: 'ashkenazi',
        lg: 'he', // Hebrew
        maj: 'on', // Major holidays
        min: 'on', // Minor holidays
        nx: 'on', // Rosh Chodesh
        mf: 'on', // Minor fasts
        o: 'on', // Omer count
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching holidays:', error);
    throw error;
  }
};

/**
 * Get Omer count if in Omer period
 * @returns {Promise} Omer count or null
 */
export const getOmerCount = async () => {
  try {
    const holidays = await getHolidays();
    const today = new Date();

    // Find today's Omer count in the holidays data
    const omerToday = holidays.items?.find(item => {
      const itemDate = new Date(item.date);
      return item.category === 'omer' &&
             itemDate.toDateString() === today.toDateString();
    });

    return omerToday || null;
  } catch (error) {
    console.error('Error fetching Omer count:', error);
    return null;
  }
};

export default {
  getZmanim,
  getHebrewDate,
  getParasha,
  getHolidays,
  getOmerCount,
};
