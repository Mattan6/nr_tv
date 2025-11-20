import axios from 'axios';

const SEFARIA_API_URL = import.meta.env.VITE_SEFARIA_API_URL || 'https://www.sefaria.org/api';

/**
 * Get today's Daf Yomi
 * @returns {Promise} Daf Yomi information
 */
export const getDafYomi = async () => {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const response = await axios.get(
      `${SEFARIA_API_URL}/calendars`,
      {
        params: {
          diaspora: 0, // Israel calendar
        },
      }
    );

    // Get Daf Yomi from calendar
    const dafYomi = response.data?.calendar_items?.find(
      item => item.title?.en === 'Daf Yomi'
    );

    return dafYomi || null;
  } catch (error) {
    console.error('Error fetching Daf Yomi:', error);
    throw error;
  }
};

/**
 * Get text for a specific reference
 * @param {string} ref - Sefaria reference (e.g., "Berakhot 2a")
 * @returns {Promise} Text content
 */
export const getText = async (ref) => {
  try {
    const response = await axios.get(`${SEFARIA_API_URL}/texts/${ref}`, {
      params: {
        context: 0,
        commentary: 0,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching text:', error);
    throw error;
  }
};

export default {
  getDafYomi,
  getText,
};
