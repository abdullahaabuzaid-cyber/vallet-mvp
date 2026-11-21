import { env } from '../../config/env.ts';
type Reply = { reply: string; links: { to: string; label: string }[]; provider: string; demo: boolean };
type Intent = { keys: string[]; reply: string; links?: { to: string; label: string }[] };
const FAQ: Intent[] = [
  { keys: ['اطلب', 'ارجاع', 'إرجاع', 'سيارتي', 'استرجاع', 'return', 'car back'], reply: 'لطلب سيارتك افتح «طلباتي» واختر «أنا على بعد 5 دقائق» أو «اطلب سيارتي الآن». سيبدأ الموظف بتجهيزها وتصلك حالة «جاهزة عند البوابة».', links: [{ to: '/driver/status', label: 'طلباتي' }] },
  { keys: ['حجز', 'احجز', 'مسبق', 'book'], reply: 'يمكنك حجز موقف قبل 10 دقائق على الأقل وحتى 30 يوماً مقدماً من صفحة الحجز المسبق.', links: [{ to: '/driver/book', label: 'حجز مسبق' }] },
  { keys: ['سعر', 'كم', 'تكلفة', 'رسوم', 'price', 'fee'], reply: 'السعر يظهر قبل تسليم السيارة ويعتمد على الموقف والوقت (أسعار الذروة مُعلنة). الرسوم الرسمية تُعرض في الإيصال.', links: [{ to: '/driver', label: 'المواقف القريبة' }] },
  { keys: ['اكرامية', 'إكرامية', 'بقشيش', 'tip'], reply: 'بعد التسليم يمكنك تقييم الموظف بالاسم وإرسال إكرامية من محفظتك.', links: [{ to: '/driver/wallet', label: 'المحفظة' }] },
  { keys: ['محفظة', 'رصيد', 'شحن', 'اشتراك', 'wallet', 'subscription'], reply: 'من «المحفظة والاشتراك» يمكنك شحن الرصيد والاشتراك الشهري (الدفع في النسخة التجريبية وهمي).', links: [{ to: '/driver/wallet', label: 'المحفظة والاشتراك' }] },
  { keys: ['ضرر', 'خدش', 'صدمة', 'حالة', 'damage', 'scratch'], reply: 'صور سيارتك من 4 زوايا محفوظة عند الاستلام والتسليم. إذا لاحظت ضرراً اختر «أعترض على الحالة» في صفحة طلباتي، وستُفتح شكوى للهيئة مع الصور.', links: [{ to: '/driver/status', label: 'صور الحالة' }] },
  { keys: ['شكوى', 'مشكلة', 'complaint'], reply: 'يمكنك تقديم شكوى من صفحة طلباتي بعد الزيارة، وتتابعها الهيئة مباشرة.', links: [{ to: '/driver/status', label: 'طلباتي' }] },
  { keys: ['غير مرخص', 'مخالف', 'بلاغ', 'report', 'unlicensed'], reply: 'للإبلاغ عن فاليه غير مرخّص التقط صورة وحدد موقعك من صفحة البلاغ العام — يمكن الإبلاغ دون تسجيل.', links: [{ to: '/report', label: 'بلاغ عام' }] },
  { keys: ['ايصال', 'إيصال', 'فقدت', 'receipt'], reply: 'إيصالك محفوظ في حسابك برقم هاتفك. سجّل الدخول وافتح «طلباتي» لعرضه.', links: [{ to: '/driver/auth', label: 'تسجيل الدخول' }] },
  { keys: ['مرخص', 'آمن', 'ترخيص', 'license'], reply: 'جميع المواقف على الخريطة مرخّصة من الهيئة، وكل موظف معتمد بالاسم.', links: [{ to: '/driver', label: 'الخريطة' }] },
];
const FALLBACK: Reply = { reply: 'أستطيع المساعدة في: طلب السيارة، الحجز، الأسعار، المحفظة، الإكرامية، حالة السيارة والاعتراض، والبلاغات. اكتب سؤالك بكلمات بسيطة.', links: [{ to: '/driver/status', label: 'طلباتي' }], provider: 'faq', demo: true };
/** FAQ/rule provider. An LLM provider can be plugged in via ASSISTANT_PROVIDER + ASSISTANT_LLM_KEY (not configured). */
export function answer(message: string): Reply {
  const m = message.toLowerCase();
  let best: Intent | null = null, hits = 0;
  for (const i of FAQ) { const n = i.keys.filter((k) => m.includes(k.toLowerCase())).length; if (n > hits) { best = i; hits = n; } }
  const provider = env.ai.assistantProvider && env.ai.assistantKey ? `${env.ai.assistantProvider} (غير مفعّل — يستخدم الأسئلة الشائعة)` : 'faq';
  return best ? { reply: best.reply, links: best.links ?? [], provider, demo: true } : { ...FALLBACK, provider };
}
export const SUGGESTIONS = ['كيف أطلب سيارتي؟', 'كم السعر؟', 'لاحظت خدشاً في سيارتي', 'أريد حجز موقف', 'بلاغ فاليه غير مرخّص'];
