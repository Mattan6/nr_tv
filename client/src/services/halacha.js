import axios from 'axios';

/**
 * Fetch Halacha Yomit from Hebcal API
 * Using Mishna Yomi as a source for daily learning content
 * @returns {Promise} Daily Halacha/Learning content
 */
export const getDailyHalacha = async () => {
  try {
    // Use Hebcal's calendar API which includes daily learning
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const response = await axios.get('https://www.hebcal.com/hebcal', {
      params: {
        cfg: 'json',
        year: year,
        month: month,
        v: 1,
        maj: 'on',
        min: 'on',
        nx: 'on',
        mf: 'on',
        ss: 'on',
        mod: 'ashkenazi',
        s: 'on', // Sedrot
        i: 'on', // Israeli holidays
        lg: 'he', // Hebrew
        d: 'on', // Daf Yomi
        F: 'on', // Yerushalmi Yomi
      },
    });

    // Get today's items
    const todayStr = `${year}-${month}-${day}`;
    const todayItems = response.data.items?.filter(
      (item) => item.date?.startsWith(todayStr)
    ) || [];

    // Find learning content (Daf Yomi, Mishna, etc.)
    const learningContent = todayItems.filter(
      (item) =>
        item.category === 'dafyomi' ||
        item.category === 'mishna' ||
        item.category === 'yerushalmi'
    );

    // If we have learning content, format it as halacha
    if (learningContent.length > 0) {
      return {
        text: learningContent.map((item) => item.hebrew || item.title).join(' • '),
        category: 'לימוד יומי',
        source: 'hebcal',
      };
    }

    // Fallback to a curated list of short halachot
    return getFallbackHalacha();
  } catch (error) {
    console.error('Failed to fetch daily halacha:', error);
    return getFallbackHalacha();
  }
};

/**
 * Fallback halachot when API is unavailable
 * Returns a rotating halacha based on day of month
 */
const getFallbackHalacha = () => {
  const halachot = [
    {
      text: 'יש להקדים תפילת מנחה לתפילת ערבית, ולא להתפלל ערבית קודם למנחה.',
      category: 'תפילה',
    },
    {
      text: 'אסור לאכול לפני קידוש בשבת ויום טוב, ויש להקפיד על כך גם לילדים קטנים.',
      category: 'שבת',
    },
    {
      text: 'המברך ברכת המזון צריך לכוון לפטור את השומעים, והם צריכים לכוון להיפטר בברכתו.',
      category: 'ברכות',
    },
    {
      text: 'נטילת ידיים שחרית צריכה להיות שלוש פעמים לסירוגין על כל יד.',
      category: 'הלכות היום',
    },
    {
      text: 'אין לדבר בין נטילת ידיים להמוציא, ויש להקפיד על זה מאוד.',
      category: 'ברכות',
    },
    {
      text: 'המתפלל צריך לכוון את לבו לשמים, ובפרט בפסוק ראשון של קריאת שמע.',
      category: 'תפילה',
    },
    {
      text: 'בשבת אין לטלטל מוקצה, ויש להיזהר שלא לטלטל דברים שאינם מיועדים לשבת.',
      category: 'שבת',
    },
    {
      text: 'המזוזה צריכה להיבדק פעמיים בשבע שנים, כדי לוודא שהיא כשרה.',
      category: 'מצוות',
    },
    {
      text: 'יש לברך ברכת הגומל לאחר שעבר סכנה, בפני עשרה אנשים מישראל.',
      category: 'ברכות',
    },
    {
      text: 'אין לקרוא קריאת שמע במקום שאינו נקי, ויש להקפיד על טהרת המקום.',
      category: 'תפילה',
    },
    {
      text: 'בליל שבת יש להדליק נרות לכבוד שבת, והברכה היא "להדליק נר של שבת".',
      category: 'שבת',
    },
    {
      text: 'המברך על הפת צריך להחזיק את הפת בעשר אצבעותיו בשעת הברכה.',
      category: 'ברכות',
    },
    {
      text: 'תפילין צריכים להיות מונחים על הזרוע שמול הלב ועל הראש כנגד המוח.',
      category: 'מצוות',
    },
    {
      text: 'יש לעמוד בשעת אמירת קדיש וקדושה, ואין לדבר בשעת אמירתם.',
      category: 'תפילה',
    },
    {
      text: 'חלה יש להפריש מעיסה שמכילה קמח בשיעור של 1.666 ק"ג ומעלה.',
      category: 'מצוות',
    },
    {
      text: 'אין לברך על אכילה או שתייה פחות מכשיעור, והשיעור הוא כזית או כביצה.',
      category: 'ברכות',
    },
    {
      text: 'הקורא בתורה צריך לעמוד, ואסור לשבת בשעת קריאת התורה אלא למי שמותר.',
      category: 'מצוות',
    },
    {
      text: 'מי שהתפלל בטעות תפילת חול בשבת, צריך לחזור ולהתפלל תפילת שבת.',
      category: 'תפילה',
    },
    {
      text: 'בהבדלה יש לברך על הבשמים ועל האש, וצריך ליהנות מהבשמים ולראות את האש.',
      category: 'שבת',
    },
    {
      text: 'המברך על הפירות צריך להקפיד על סדר הברכות לפי חשיבות הפרי.',
      category: 'ברכות',
    },
    {
      text: 'יש להקפיד לומר "ברוך שם כבוד מלכותו לעולם ועד" בלחש אחרי פסוק ראשון של שמע.',
      category: 'תפילה',
    },
    {
      text: 'בשבת אין לבשל אפילו מים חמים, ויש להכין את כל הצורך לפני כניסת השבת.',
      category: 'שבת',
    },
    {
      text: 'על לחם יש לברך "המוציא לחם מן הארץ" ויש לאכול כזית לפחות.',
      category: 'ברכות',
    },
    {
      text: 'תפילת העמידה צריכה להיאמר בעמידה, ורגלים צמודות זו לזו.',
      category: 'תפילה',
    },
    {
      text: 'טלית קטן צריך ללבוש כל היום, ויש להקפיד שהציציות יהיו כשרות.',
      category: 'מצוות',
    },
    {
      text: 'קידוש בשבת צריך להיות על יין או על חלה, והעדיפות היא על יין.',
      category: 'שבת',
    },
    {
      text: 'לפני אכילת פת יש לנטול ידיים ולברך "על נטילת ידיים".',
      category: 'ברכות',
    },
    {
      text: 'יש להזהר שלא לדבר דיבורים בטלים בבית הכנסת, ובפרט בזמן התפילה.',
      category: 'תפילה',
    },
    {
      text: 'בשבת אין לכתוב, ואפילו באופן זמני כמו על אדים או על חול.',
      category: 'שבת',
    },
    {
      text: 'על מיני מזונות יש לברך "בורא מיני מזונות" ולאחר מכן ברכה מעין שלוש.',
      category: 'ברכות',
    },
    {
      text: 'בתפילת שמונה עשרה אין לפסוע ואין להפסיק, וצריך לעמוד במקום אחד.',
      category: 'תפילה',
    },
  ];

  // Rotate based on day of month
  const dayOfMonth = new Date().getDate();
  const index = (dayOfMonth - 1) % halachot.length;

  return halachot[index];
};

export default {
  getDailyHalacha,
};
