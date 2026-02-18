# تفعيل الذكاء الاصطناعي (Groq)

لتشغيل ميزات الذكاء الاصطناعي (الأستاذ الذكي، التلخيص، البطاقات، الاختبارات، الترجمة):

1. انسخ ملف البيئة:
   ```bash
   copy .env.example .env
   ```
   (على Linux/Mac: `cp .env.example .env`)

2. افتح `.env` وضَع مفتاح Groq API:
   ```
   GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
   ```
   احصل على المفتاح من: [Groq Console](https://console.groq.com/) → API Keys.

3. أعد تشغيل السيرفر:
   ```bash
   npm run server
   ```

بدون `GROQ_API_KEY` ستعمل الواجهة لكن طلبات الـ AI سترجع خطأ "AI is not configured".

**ملاحظة:** لا ترفع ملف `.env` إلى Git (موجود في `.gitignore`).
