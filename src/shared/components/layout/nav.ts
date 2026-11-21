import type { Role } from '@common/types';
import type { IconName } from '../ui/Icon';

export const ROLE_LABELS: Record<Role, string> = {
  gov: 'الهيئة',
  operator: 'مشغّل',
  staff: 'موظف',
  driver: 'سائق / صاحب سيارة',
};

/** Portal tabs per role (drivers use the top bar only). */
export const NAV: Record<Role, { to: string; label: string }[]> = {
  staff: [
    { to: '/staff', label: 'الرئيسية' },
    { to: '/staff/scan', label: 'صوّر النمرة' },
    { to: '/staff/checkin', label: 'دخول' },
    { to: '/staff/checkout', label: 'خروج' },
    { to: '/staff/cars', label: 'الحالية' },
    { to: '/staff/condition', label: 'صور الحالة' },
    { to: '/staff/incident', label: 'بلاغ' },
  ],
  operator: [
    { to: '/operator', label: 'اليوم' },
    { to: '/operator/visits', label: 'سجل السيارات' },
    { to: '/operator/requests', label: 'طلبات السائقين' },
    { to: '/operator/employees', label: 'الموظفون' },
    { to: '/operator/license', label: 'التسجيل / الترخيص' },
    { to: '/operator/payments', label: 'الفواتير والدفع' },
    { to: '/operator/feedback', label: 'التقييمات والشكاوى' },
  ],
  gov: [
    { to: '/gov', label: 'الملخص' },
    { to: '/gov/alerts', label: 'تنبيهات ذكية' },
    { to: '/gov/map', label: 'الخريطة' },
    { to: '/gov/licenses', label: 'مراجعة التسجيل' },
    { to: '/gov/operators', label: 'المشغّلون' },
    { to: '/gov/visits', label: 'تدقيق' },
    { to: '/gov/incidents', label: 'بلاغات' },
    { to: '/gov/public-reports', label: 'بلاغات الجمهور' },
    { to: '/gov/complaints', label: 'الشكاوى' },
    { to: '/gov/payments', label: 'الإيرادات' },
    { to: '/gov/reports', label: 'التقارير' },
  ],
  driver: [],
};

/** Icon per route segment (sidebar + page heading). */
export const NAV_ICONS: Record<string, IconName> = {
  alerts: 'bell', map: 'map', licenses: 'shield', operators: 'users', visits: 'car', incidents: 'shield',
  complaints: 'message', payments: 'wallet', reports: 'chart', requests: 'bell', employees: 'users',
  license: 'file', feedback: 'message', scan: 'scan', checkin: 'arrow', checkout: 'arrow', cars: 'car', incident: 'shield', condition: 'scan', 'public-reports': 'pin',
};
