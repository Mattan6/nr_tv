# מדריך הפעלה - אפליקציית מסך דיגיטלי לבית הכנסת

⚠️ **הערה**: השרת רץ כיום **בלי מסד נתונים בכלל** — ה-cluster הישן ב-MongoDB Atlas
כבר לא קיים, וזו החלטה מכוונת. תוכן המסך (הודעות, שיעורים, מזל טוב, אזכרות) נשמר
בקובץ `server/data/content.json` ונערך דרך פאנל הניהול ב-`/adminGabbai`, שאין בו
התחברות בכלל. **כל שלבי ה-MongoDB וה"משתמש Admin" למטה הם legacy** — שרידים משלב
מוקדם יותר של הפרויקט — ואינם נחוצים כדי להריץ את המסך או את פאנל הניהול. הם
מסומנים בהתאם בכל שלב.

## דרישות מקדימות

לפני שמתחילים, ודא שמותקן במחשב שלך:
- **Node.js** (גרסה 18 ומעלה) - [הורד כאן](https://nodejs.org/)

<details>
<summary>Legacy — לא נחוץ: MongoDB</summary>

- **MongoDB** - אחת מהאופציות הבאות:
  - MongoDB מותקן מקומי - [הורד כאן](https://www.mongodb.com/try/download/community)
  - MongoDB Atlas (חינמי בענן) - [הרשם כאן](https://www.mongodb.com/cloud/atlas/register)

</details>

## שלב 1: התקנת Dependencies

### Backend (Server)
```bash
cd server
npm install
```

### Frontend (Client)
```bash
cd client
npm install
```

## שלב 2: הגדרת מסד נתונים

⚠️ **Legacy — ניתן לדלג על השלב הזה כולו.** השרת רץ ללא מסד נתונים; שלב זה נשאר
בתיעוד עבור מי שמתחבר לקוד ה-Mongoose הישן (`models/`, `controllers/announcementController.js`
וכו') שאינו בשימוש בפועל.

### אופציה א': MongoDB מקומי
1. התקן MongoDB במחשב
2. הפעל את MongoDB:
   ```bash
   mongod
   ```

### אופציה ב': MongoDB Atlas (מומלץ)
1. צור חשבון ב-[MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. צור Cluster חדש (בחר ב-Free Tier)
3. לחץ על "Connect" וקבל את ה-connection string
4. העתק את ה-connection string (יראה כך: `mongodb+srv://username:password@cluster.mongodb.net/`)

## שלב 3: הגדרת משתני סביבה

### Backend (.env)
צור קובץ `.env` בתיקיית `server`:

```env
PORT=5000
# Legacy — לא נדרש בפועל; השרת רץ בלי חיבור למסד נתונים.
MONGODB_URI=mongodb://localhost:27017/synagogue-display
# או אם משתמשים ב-MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/synagogue-display
JWT_SECRET=synagogue_display_secret_key_2024
NODE_ENV=development
```

### Frontend (.env)
צור קובץ `.env` בתיקיית `client` (או העתק מ-`client/.env.example`):
```env
# השאר את VITE_API_URL לא מוגדר! כשהוא לא מוגדר, client/src/services/api.js
# נופל אוטומטית ל-`${window.location.hostname}:5000` — כלומר לכתובת שממנה
# הדף עצמו נטען, בין אם זה מהמחשב, מהטלוויזיה או מהטלפון של הגבאי.
# הגדר VITE_API_URL רק אם ה-API רץ על מכונה אחרת לגמרי מהדף.
# VITE_API_URL=http://localhost:5000
VITE_HEBCAL_API_URL=https://www.hebcal.com
VITE_SEFARIA_API_URL=https://www.sefaria.org/api
```

⚠️ **חשוב**: אם תגדיר `VITE_API_URL=http://localhost:5000`, האפליקציה תעבוד רק
מהמחשב שמריץ את השרת — בטלפון של הגבאי `localhost` מתפענח לטלפון עצמו, לא לשרת,
והפאנל לא יעבוד בכלל.

## שלב 4: יצירת משתמש Admin ראשוני

⚠️ **Legacy — ניתן לדלג על השלב הזה כולו.** פאנל הניהול האמיתי נמצא ב-`/adminGabbai`
(ראו "ניהול תוכן (Admin panel)" למטה) ואין בו התחברות בכלל — אין צורך במשתמש admin
כדי לערוך תוכן. השלב הבא רלוונטי רק לקוד ה-Mongoose/auth הישן שאינו בשימוש.

רוץ את הפקודה הבאה ליצירת משתמש מנהל:

```bash
cd server
npm run seed
```

פרטי התחברות ראשוניים:
- **שם משתמש**: admin
- **סיסמה**: admin123

⚠️ **חשוב**: שנה את הסיסמה לאחר ההתחברות הראשונה!

## שלב 5: הפעלת האפליקציה

### הפעלת Backend
פתח טרמינל ראשון:
```bash
cd server
npm run dev
```

השרת ירוץ על: `http://localhost:5000`

### הפעלת Frontend
פתח טרמינל שני:
```bash
cd client
npm run dev
```

האפליקציה תרוץ על: `http://localhost:5173`

## שלב 6: פתיחת האפליקציה

1. פתח דפדפן
2. גש ל-`http://localhost:5173`
3. המסך הדיגיטלי יופיע עם כל המידע

## תצורה לטלוויזיה

### הצגה על טלוויזיה עם אנדרואיד:

1. **התקן Chrome או Firefox** על הטלוויזיה
2. **גש ל-URL**: הקלד את כתובת ה-IP של המחשב שלך + הפורט:
   - למשל: `http://192.168.1.100:5173`
   - למצוא את ה-IP שלך (Windows): `ipconfig` בטרמינל
   - למצוא את ה-IP שלך (Mac/Linux): `ifconfig` בטרמינל

3. **מצב מסך מלא (Fullscreen)**:
   - לחץ F11 בדפדפן
   - או השתמש בתפריט הדפדפן → "מסך מלא"

4. **מניעת כיבוי מסך**:
   - הגדרות אנדרואיד → תצוגה → Sleep → Never
   - או התקן אפליקציה כמו "Stay Alive!"

### טיפים נוספים:
- השתמש ב-Chrome כדי לשמור את הדף כ-"Add to Home Screen" לגישה מהירה
- ודא שהטלוויזיה והמחשב באותה רשת WiFi
- אם אתה רוצה שהאפליקציה תרוץ 24/7, שקול להריץ אותה על Raspberry Pi או מחשב ייעודי

## פתרון בעיות נפוצות

### שגיאת חיבור למסד נתונים
Legacy — רלוונטי רק אם עדיין מנסים להריץ את קוד ה-Mongoose הישן. השרת עצמו רץ
בכוונה בלי מסד נתונים, ואזהרת חיבור כזו בלוג אינה משפיעה על המסך או על פאנל הניהול.
```
Error: connect ECONNREFUSED
```
**פתרון**: ודא ש-MongoDB רץ (הפעל `mongod` או בדוק את MongoDB Atlas)

### שגיאת CORS
```
Access to XMLHttpRequest has been blocked by CORS policy
```
**פתרון**: ודא ש-Backend רץ על פורט 5000 וש-Frontend על 5173

### הודעות/אירועים לא מופיעים
**פתרון**:
1. ודא ש-Backend רץ
2. בדוק שיש חיבור למסד נתונים
3. צור הודעות/אירועים דרך Admin Panel (יתווסף בשלב הבא)

### זמני תפילות לא מופיעים
**פתרון**:
1. ודא שיש חיבור לאינטרנט
2. בדוק את ה-Console בדפדפן לשגיאות
3. ה-Hebcal API עשוי להיות זמנית לא זמין - נסה שוב מאוחר יותר

## מבנה הפרויקט

```
synagogue-display/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # קומפוננטות תצוגה
│   │   ├── pages/         # דפים
│   │   ├── services/      # APIs
│   │   └── App.jsx
│   └── package.json
│
├── server/                # Node.js Backend
│   ├── src/
│   │   ├── models/       # מודלי MongoDB
│   │   ├── routes/       # API routes
│   │   ├── controllers/  # Logic
│   │   ├── middleware/   # Authentication
│   │   └── server.js
│   └── package.json
│
└── README.md
```

## מה הלאה?

השלבים הבאים בפיתוח:
1. ✅ מסך תצוגה עובד עם כל הקומפוננטות
2. 🔨 Admin Panel להוספת הודעות ואירועים
3. 🎨 עיצוב מתקדם עם אלמנטים יהודיים
4. 🚀 Deployment לענן (Vercel + Railway)

## תמיכה

יש בעיה? פתח Issue ב-GitHub או פנה למפתח.

---

**בהצלחה! 🎉**

## ניהול תוכן (Admin panel)

The gabbai edits הודעות, שיעורי תורה, שמחות ומזל טוב and לעילוי נשמת at
**`/adminGabbai`** — for example `http://192.168.1.20:5173/adminGabbai`. There is no
login; access is by knowing the path. Do not expose the server outside the local
network without adding authentication first.

Content lives in `server/data/content.json`, which is git-ignored and created on first
boot from `server/src/store/defaultContent.js`. Back it up by copying that one file.

The store caches the file in memory, so **editing `content.json` by hand requires a
server restart.** Edit through the admin panel instead wherever possible.

The display screen re-fetches `/api/content` every **30 seconds** (via
`client/src/hooks/useDisplayContent.js`), so a change saved in the admin panel reaches
the TV within half a minute — no need to touch the TV, which is opened once and left
running. Only `isActive` items are shown; hidden ones stay off the screen.

If the server is briefly unreachable, the display keeps showing the last content it saw
rather than blanking, and it caches that content to the browser so even a TV reboot
during an outage still has something to show.

Note: after changing any client source or `client/.env`, the Vite dev server must be
restarted (`npm run dev`) for the change to reach an already-open browser — a page that
has been open since before the change will otherwise keep running the old code.

Still static (no admin panel yet): פרנס היום, the ticker, and prayer/zmanim times.
