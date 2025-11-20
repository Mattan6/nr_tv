# Synagogue Display System
## אפליקציית מסך דיגיטלי לבית הכנסת

מערכת תצוגה דיגיטלית לבית כנסת המציגה זמני תפילות, תאריכים עבריים, הודעות ועוד.

## תכונות

- 🕐 שעון דיגיטלי בזמן אמת
- 📅 תאריך עברי ולועזי
- 🕍 זמני תפילות (נוסח עדות המזרח)
- 🌅 זמני זריחה ושקיעה
- 📖 פרשת השבוע
- 📚 דף יומי
- ⭐ ספירת העומר (בתקופה הרלוונטית)
- 🎉 ימים מיוחדים וחגים
- 📢 מערכת הודעות
- 📆 לוח אירועים קהילתיים
- 🔐 ממשק ניהול מאובטח

## טכנולוגיות

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Query
- Axios

### Backend
- Node.js
- Express
- MongoDB
- JWT Authentication

### APIs
- Hebcal API - זמנים עבריים
- Sefaria API - דף יומי

## התקנה

### Client
```bash
cd client
npm install
npm run dev
```

### Server
```bash
cd server
npm install
npm run dev
```

## הגדרות

1. צור קובץ `.env` בתיקיית `server`:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

2. צור קובץ `.env` בתיקיית `client`:
```
VITE_API_URL=http://localhost:5000
```

## פיתוח

- מיקום: ניצן
- נוסח: עדות המזרח
- מסך: טלוויזיה עם אנדרואיד (1920x1080)

## License

MIT
