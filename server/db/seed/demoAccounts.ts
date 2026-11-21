/** Demo logins shown on /login (data is illustrative; reset from the gov portal). */
export const DEMO_PASSWORDS = {
  gov: 'Gov@2026',
  inspector: 'Inspector@2026',
  operator: 'Operator@2026',
  staff: 'Staff@2026',
};

export const DEMO_ACCOUNTS = [
  { role: 'gov', username: 'admin', password: DEMO_PASSWORDS.gov, label: 'هيئة تنظيم الفاليه (مدير)' },
  { role: 'inspector', username: 'inspector', password: DEMO_PASSWORDS.inspector, label: 'سامر حداد — مفتش ميداني (الهيئة)' },
  { role: 'operator', username: 'elite', password: DEMO_PASSWORDS.operator, label: 'فاليه النخبة — مرخّص', operatorId: 'op-1' },
  { role: 'operator', username: 'saffni', password: DEMO_PASSWORDS.operator, label: 'صفّني — مرخّص', operatorId: 'op-5' },
  { role: 'operator', username: 'fastline', password: DEMO_PASSWORDS.operator, label: 'الصف السريع — قيد المراجعة', operatorId: 'op-2' },
  { role: 'operator', username: 'parkingplus', password: DEMO_PASSWORDS.operator, label: 'باركينغ بلس — موقوف', operatorId: 'op-3' },
  { role: 'staff', username: 'ahmad', password: DEMO_PASSWORDS.staff, label: 'أحمد سالم — موظف فاليه النخبة', employeeId: 'emp-1' },
  { role: 'staff', username: 'khaled', password: DEMO_PASSWORDS.staff, label: 'خالد يوسف — موظف فاليه النخبة', employeeId: 'emp-2' },
  { role: 'staff', username: 'omar', password: DEMO_PASSWORDS.staff, label: 'عمر ناصر — موظف صفّني', employeeId: 'emp-6' },
] as const;

export const DEMO_DRIVERS = [
  { phone: '0791234501', label: 'سائق — سيارته داخل الموقف وطلب إرجاعها' },
  { phone: '0771112233', label: 'سائق — سيارة مُسلّمة (جرّب التقييم والشكوى)' },
];
