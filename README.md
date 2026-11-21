# فاليت (Vallet) — منصة تنظيم الفاليه في عمّان

نظام متعدد المستخدمين: واجهة React (Vite, RTL) + خادم Express + PostgreSQL، منشور على Railway.

- **Live:** https://vallet-web-production.up.railway.app
- **Railway:** project `vallet-mvp` → services `vallet-web` (app, volume `/data` for uploads) + `Postgres`.

## الأدوار
| الدور | الدخول | أهم الشاشات |
|---|---|---|
| السائق | `/driver/auth` — رقم هاتف + OTP | المواقف والخريطة، طلب تسليم، تتبّع مباشر، طلب الإرجاع، تقييم وشكوى |
| الهيئة | `/login` — `admin / Gov@2026` | مراجعة التسجيل والمستندات، المشغّلون (إنشاء حساب)، البلاغات والغرامات، الشكاوى، الإيرادات، التقارير (Excel/PDF)، تنبيهات ذكية، الخريطة |
| المشغّل | `elite`, `saffni`, `fastline`, `parkingplus` / `Operator@2026` | طلبات السائقين (مباشر)، سجل السيارات، الموظفون (إنشاء حسابات)، رفع المستندات، الفواتير والدفع، التقييمات |
| الموظف | `ahmad`, `khaled`, `omar` / `Staff@2026` | تصوير النمرة (OCR)، دخول/خروج، السيارات الحالية + «جاهزة»، بلاغ |

أرقام سائقين تجريبية: `0791234501`, `0771112233` (أي رقم أردني يعمل).

## هيكل المشروع

```
server/                 الخادم (Express + Postgres)
  index.ts              تشغيل فقط: migrate → seed → listen
  app.ts, routes.ts     تركيب الـ middleware وربط مسارات الوحدات
  config/env.ts         كل متغيرات البيئة في مكان واحد
  db/                   pool + schema + mappers + seed/ (بيانات العرض)
  middleware/           auth (الجلسة/الأدوار)، رفع الملفات، الأخطاء، SPA
  modules/<domain>/     لكل مجال: *.routes.ts (HTTP) + *.service.ts (منطق + SQL)
  utils/                http errors، تحقق المدخلات، الهاتف، PDF
  assets/fonts/         خطوط PDF العربية
common/                 مشترك بين الخادم والواجهة: types/ و constants/ (المستندات، التسميات)
src/                    الواجهة (React + Vite)
  app/                  App، جدول المسارات، Guard، ErrorBoundary، PWA
  features/<role>/      auth | driver | staff | operator | gov → pages/ components/ hooks/
  shared/               components/ (layout, ui, map, billing) + lib/ (api, toast, format…) + constants/
  store/                core.ts + slices/ (أفعال لكل مجال) + selectors/ + realtime.ts
  styles/               index.css يستورد ملفات CSS مقسّمة حسب الجزء
e2e/run.mjs             اختبار متكامل بالمتصفح (25 حالة)
```

الاستيراد في الواجهة عبر `@/…` (= `src/`) و `@common/…` (= `common/`). الخادم يستورد `common/` بمسارات نسبية (يعمل عبر tsx بدون بناء).

## الإعدادات (متغيرات البيئة)
- `DATABASE_URL` — Postgres. `JWT_SECRET` — توقيع الجلسات. `PORT` (80 على Railway). `UPLOAD_DIR` (`/data/uploads`).
- SMS: `SMS_PROVIDER=twilio` + `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` — أو `SMS_PROVIDER=webhook` + `SMS_WEBHOOK_URL` (+`SMS_WEBHOOK_TOKEN`). بدونها: وضع تطوير، الرمز يظهر على الشاشة ويُسجَّل في السجلات.
- `LICENSE_FEE_JOD` (افتراضي 500)، `FINE_DEFAULT_JOD` (افتراضي 1000). الدفع بوابة وهمية (وضع تجريبي): `4242 4242 4242 4242` تنجح، `4000 0000 0000 0002` تُرفض.

## التشغيل محلياً
```bash
npm install
# Postgres محلي ثم:
DATABASE_URL=postgres://USER@localhost:5432/vallet npm run server   # API على :8080 (يُنشئ الجداول ويزرع البيانات)
npm run dev                                                          # الواجهة على :5173 (proxy لـ /api)
```

## الاختبار
```bash
BASE=https://vallet-web-production.up.railway.app PREFIX=prod node e2e/run.mjs   # لقطات في shots/prod-*.png
```
الهيئة تقدر تعيد البيانات التجريبية من زر «إعادة البيانات».
