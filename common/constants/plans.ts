/** Demo subscription plans (JOD / 30 days). Paid from the mock wallet only. */
export const PLANS = {
  basic: { name: 'أساسي', price: 15, benefit: 'حتى 10 زيارات شهرياً بدون رسوم خدمة التطبيق' },
  plus: { name: 'بلس', price: 25, benefit: 'زيارات غير محدودة + أولوية بطابور التجهيز' },
} as const;
export type PlanKey = keyof typeof PLANS;
