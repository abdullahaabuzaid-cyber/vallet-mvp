/**
 * Pluggable SMS provider. Configure with SMS_PROVIDER=twilio + TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM,
 * or SMS_PROVIDER=webhook + SMS_WEBHOOK_URL (POST {to, message}). Without config → dev mode (code logged + shown on screen).
 */
export interface SmsProvider {
  name: string;
  devMode: boolean;
  send(to: string, message: string): Promise<void>;
}

function toE164Jordan(phone: string) {
  return phone.startsWith('0') ? `+962${phone.slice(1)}` : phone.startsWith('+') ? phone : `+${phone}`;
}

class DevProvider implements SmsProvider {
  name = 'dev';
  devMode = true;
  async send(to: string, message: string) {
    console.log(`[sms:dev] to=${to} message="${message}"`);
  }
}

class TwilioProvider implements SmsProvider {
  name = 'twilio';
  devMode = false;
  constructor(private sid: string, private token: string, private from: string) {}
  async send(to: string, message: string) {
    const body = new URLSearchParams({ To: toE164Jordan(to), From: this.from, Body: message });
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${this.sid}:${this.token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!r.ok) throw new Error(`twilio ${r.status}: ${await r.text()}`);
  }
}

class WebhookProvider implements SmsProvider {
  name = 'webhook';
  devMode = false;
  constructor(private url: string, private token?: string) {}
  async send(to: string, message: string) {
    const r = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) },
      body: JSON.stringify({ to: toE164Jordan(to), message }),
    });
    if (!r.ok) throw new Error(`sms webhook ${r.status}`);
  }
}

export function makeSmsProvider(): SmsProvider {
  const p = (process.env.SMS_PROVIDER || '').toLowerCase();
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, SMS_WEBHOOK_URL, SMS_WEBHOOK_TOKEN } = process.env;
  if (p === 'twilio' && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM) {
    return new TwilioProvider(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM);
  }
  if (p === 'webhook' && SMS_WEBHOOK_URL) return new WebhookProvider(SMS_WEBHOOK_URL, SMS_WEBHOOK_TOKEN);
  return new DevProvider();
}
