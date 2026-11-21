/** Normalize Jordanian numbers to local `07XXXXXXXX` form. */
export function normalizePhone(raw: string) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('00962')) d = d.slice(5);
  else if (d.startsWith('962')) d = d.slice(3);
  if (d.length === 9 && d.startsWith('7')) d = '0' + d;
  return d;
}

export function isJordanMobile(phone: string) {
  return /^07[789]\d{7}$/.test(phone);
}

/** `07XXXXXXXX` → `+9627XXXXXXXX` for SMS gateways. */
export function toE164Jordan(phone: string) {
  return phone.startsWith('0') ? `+962${phone.slice(1)}` : phone.startsWith('+') ? phone : `+${phone}`;
}
