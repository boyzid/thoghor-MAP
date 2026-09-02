# منصة خارطة الثغور — نسخة أولية (UI/UX Routing)

## التشغيل
```bash
npm install
cp .env.local.example .env.local   # ثم عبّئ متغيرات Google OAuth
npm run dev
```

## ملاحظات مهمة قبل الاستخدام الفعلي

1. **لا يوجد قاعدة بيانات حقيقية بعد.** كل البيانات (الثغور والمشاريع) محفوظة في
   الذاكرة عبر `lib/store.tsx` باستخدام React Context، وتُفقد عند إعادة تحميل
   الصفحة. الهدف من هذا التسليم هو الواجهات والمسارات فقط، كما طُلب.
2. **تسجيل الدخول عبر Gmail (NextAuth + Google Provider)** لن يعمل فعليًا حتى
   تُنشئ بيانات اعتماد Google OAuth حقيقية وتضعها في `.env.local`
   (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`).
3. حقل **"الدولة" ورابط التواصل** في المشاريع لم يكونا جزءًا من هيكل البيانات
   المتفق عليه سابقًا (ثغر ← مشروع ← نتائج/دروس)، لكن أُضيفا هنا تنفيذًا لطلبك
   الأخير. إن أردت إزالتهما لاحقًا للحفاظ على أبسط نسخة MVP، فالأمر سهل.

## البنية
```
app/
  page.tsx                        → لوحة الثغور (الرئيسية)
  gaps/[id]/page.tsx              → تفاصيل ثغر + تبويب نشط/منتهٍ
  projects/[id]/page.tsx          → تفاصيل مشروع (والكتل الثلاث عند الانتهاء)
  components/                     → Navbar, FilterBar, GapCard
  components/modals/              → AddGapModal, AddProjectModal, CompleteProjectModal
  api/auth/[...nextauth]/route.ts → إعداد NextAuth (Google)
lib/
  types.ts                        → الأنواع (Gap, Project)
  data.ts                         → البيانات الأولية (9 ثغور + نماذج مشاريع)
  store.tsx                       → إدارة الحالة على مستوى العميل
```
