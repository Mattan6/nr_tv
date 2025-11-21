import axios from 'axios';

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
 * Get Zmanim (prayer times) for today
 * @returns {Promise} Prayer times including sunrise, sunset, and all zmanim
 */
export const getZmanim = async () => {
  try {
    const today = new Date();
    const response = await axios.get(`${HEBCAL_API_URL}/zmanim`, {
      params: {
        cfg: 'json',
        latitude: LOCATION.latitude,
        longitude: LOCATION.longitude,
        tzid: LOCATION.tzid,
        date: today.toISOString().split('T')[0],
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching zmanim:', error);
    throw error;
  }
};

/**
 * Get Hebrew date for today
 * @returns {Promise} Hebrew date information
 */
export const getHebrewDate = async () => {
  try {
    const today = new Date();
    const response = await axios.get(`${HEBCAL_API_URL}/converter`, {
      params: {
        cfg: 'json',
        gy: today.getFullYear(),
        gm: today.getMonth() + 1,
        gd: today.getDate(),
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
 * Get Parasha (Torah portion) for this week
 * @returns {Promise} Parasha information
 */
export const getParasha = async () => {
  try {
    const response = await axios.get(`${HEBCAL_API_URL}/shabbat`, {
      params: {
        cfg: 'json',
        latitude: LOCATION.latitude,
        longitude: LOCATION.longitude,
        tzid: LOCATION.tzid,
        M: 'on', // Include parasha
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
