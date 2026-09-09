# منصة خارطة الثغور

## التشغيل محليًا (بدون Docker)
يتطلب هذا وجود PostgreSQL على جهازك (أو أي Postgres متاح عبر الشبكة).

```bash
npm install
cp .env.local.example .env.local   # واملأ DATABASE_URL ومتغيرات Google OAuth
npm run db:generate                # توليد Prisma Client
npm run db:migrate:deploy          # تطبيق migrations على القاعدة
npm run dev
```

لإضافة بيانات تجريبية (اختياري، يعمل يدويًا فقط ولا يُنفَّذ تلقائيًا):
```bash
npm run db:seed
```

## التشغيل عبر Docker Compose (يشمل PostgreSQL)
```bash
cp .env.local.example .env         # docker-compose يقرأ .env تلقائيًا
docker compose up --build
```
- يبدأ التطبيق تلقائيًا بتطبيق `prisma migrate deploy` عند كل إقلاع (آمن عند
  إعادة التشغيل — لا يُعيد تنفيذ migrations مطبَّقة مسبقًا).
- الـ seed **لا** يعمل تلقائيًا. لتشغيله يدويًا داخل الحاوية:
  ```bash
  docker compose exec app npx tsx prisma/seed.ts
  ```
- فحص الجاهزية: `GET /api/health` (يتحقق من الاتصال الفعلي بقاعدة البيانات).

## ملاحظات مهمة

1. **قاعدة البيانات حقيقية الآن (PostgreSQL عبر Prisma).** جدول `Gap` و
   `Project` في `prisma/schema.prisma`، والبيانات تُقرأ وتُكتب عبر
   `app/api/gaps` و `app/api/projects` بدلاً من الذاكرة المؤقتة.
2. **تسجيل الدخول عبر Gmail (NextAuth v4 + Google Provider)** يتطلب بيانات
   اعتماد Google OAuth حقيقية في `.env.local` / `.env`
   (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`,
   `NEXTAUTH_URL`).

## البنية
```
app/
  page.tsx                        → لوحة الثغور (الرئيسية)
  gaps/[id]/page.tsx              → تفاصيل ثغر + تبويب نشط/منتهٍ
  projects/[id]/page.tsx          → تفاصيل مشروع (والكتل الثلاث عند الانتهاء)
  components/                     → Navbar, FilterBar, GapCard
  components/modals/              → AddGapModal, AddProjectModal, CompleteProjectModal
  api/auth/[...nextauth]/route.ts → إعداد NextAuth (Google)
  api/gaps/route.ts               → GET/POST الثغور (Prisma)
  api/projects/route.ts           → GET/POST المشاريع (Prisma)
  api/projects/[id]/complete/     → PATCH إنهاء مشروع وتوثيقه (Prisma)
  api/health/route.ts             → فحص اتصال قاعدة البيانات
lib/
  types.ts                        → الأنواع (Gap, Project)
  prisma.ts                       → عميل Prisma (singleton)
  store.tsx                       → إدارة الحالة على مستوى العميل (تجلب من API)
prisma/
  schema.prisma                   → مخطط قاعدة البيانات
  migrations/                     → migrations إنتاجية (prisma migrate deploy)
  seed.ts                         → بيانات تجريبية أولية (تشغيل يدوي فقط)
Dockerfile                        → بناء إنتاجي متعدد المراحل (Next.js standalone)
docker-compose.yml                → app + PostgreSQL مع healthcheck
docker-entrypoint.sh              → يطبّق migrate deploy قبل بدء التطبيق
```
