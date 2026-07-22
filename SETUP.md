# מדריך הפעלה - אפליקציית מסך דיגיטלי לבית הכנסת

## דרישות מקדימות

לפני שמתחילים, ודא שמותקנים במחשב שלך:
- **Node.js** (גרסה 18 ומעלה) - [הורד כאן](https://nodejs.org/)
- **MongoDB** - אחת מהאופציות הבאות:
  - MongoDB מותקן מקומי - [הורד כאן](https://www.mongodb.com/try/download/community)
  - MongoDB Atlas (חינמי בענן) - [הרשם כאן](https://www.mongodb.com/cloud/atlas/register)

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
MONGODB_URI=mongodb://localhost:27017/synagogue-display
# או אם משתמשים ב-MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/synagogue-display
JWT_SECRET=synagogue_display_secret_key_2024
NODE_ENV=development
```

### Frontend (.env)
הקובץ כבר קיים בתיקיית `client/.env`:
```env
VITE_API_URL=http://localhost:5000
VITE_HEBCAL_API_URL=https://www.hebcal.com
VITE_SEFARIA_API_URL=https://www.sefaria.org/api
```

## שלב 4: יצירת משתמש Admin ראשוני

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

⚠️ **Not wired up yet**: the display screen (`SynagogueDisplay.jsx`) still reads its
הודעות, שיעורי תורה, שמחות ומזל טוב and לעילוי נשמת from a static file
(`displayData.js`), not from `/api/content`. Saving a change in the admin panel updates
`content.json` correctly, but it does **not** yet reach the TV — the display still shows
the old static content until this connection is built. Whoever wires the display to
`/api/content` should update this paragraph to describe the real refresh behavior
(polling interval, reachability fallback) once it ships.
