import { useLocation } from 'react-router-dom';
import { PageHeader } from '../ui/PageHeader';
import { NAV, NAV_ICONS, ROLE_LABELS } from './nav';
import { resetDemo, useStore } from '@/store';

const SUBTITLES: Record<string, string> = {
  '/gov': 'نظرة شاملة على قطاع الفاليه في عمّان، لحظة بلحظة.',
  '/operator': 'كل ما تحتاجه لإدارة يومك، فريقك ومواقفك بكفاءة.',
  '/staff': 'جاهز ليوم جديد؟ استلام وتسليم أسهل، بكل ثقة.',
  licenses: 'طلبات موثّقة، مراجعة دقيقة، وقرارات واضحة.',
  visits: 'كل سيارة إلها حكاية. تابع تفاصيل الدخول والتسليم بمكان واحد.',
  payments: 'فواتير واضحة ومتابعة أسهل للمستحقات والمدفوعات.',
  employees: 'فريق واحد، معايير موحّدة، وخدمة أفضل.',
  complaints: 'اسمع للسائق، تابع المشكلة، واحفظ حق الجميع.',
  incidents: 'رصد المخالفات والبلاغات ومتابعتها حتى الحل.',
  alerts: 'رصد تلقائي يساعدك تتخذ القرار المناسب في الوقت المناسب.',
  requests: 'تابع طلبات السائقين ووزّعها على فريقك مباشرة.',
  map: 'كل المواقع على خريطة واحدة. رؤية أوضح وقرارات أسرع.',
  cars: 'السيارات في عهدة موقعك — من الاستلام حتى التسليم.',
  reports: 'حوّل بيانات التشغيل إلى قرارات مدروسة.',
};
export function PortalPageHeading() {
  const loc = useLocation();
  const role = useStore((s) => s.role);
  const title = NAV[role].find((n) => n.to === loc.pathname)?.label || 'لوحة التحكم';
  const key = loc.pathname.split('/')[2] || loc.pathname;
  return <PageHeader title={!loc.pathname.split('/')[2] ? (role === 'gov' ? 'نظرة عامة' : role === 'operator' ? 'لوحة التشغيل' : 'مساحة الموظف') : title} icon={NAV_ICONS[key] ?? 'grid'} subtitle={SUBTITLES[key] || 'تفاصيل منظّمة، تجربة أسهل، وحقوق محفوظة.'} eyebrow={`فاليت / ${ROLE_LABELS[role]}`}><span className="date-pill">{new Date().toLocaleDateString('ar-JO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Amman' })}</span><span className="demo-pill">بيئة تجريبية</span>{role === 'gov' && <button className="btn btn-sm" type="button" onClick={() => { if (confirm('إعادة كل البيانات التجريبية؟ سيتم حذف أي بيانات مضافة.')) void resetDemo(); }}>إعادة البيانات</button>}</PageHeader>;
}
