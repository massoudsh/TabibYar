// ایشو #17: انتخاب سرویس پیامکی داخلی — contract پایدار برای هر دو گزینهٔ اصلی
// (Kavenegar/Ippanel) طبق docs/research/sms-vendor-comparison.md، به‌علاوه یک
// پیاده‌سازی mock برای توسعه بدون اعتبار واقعی.
// ایشو #16: ارسال خلاصه/پیگیری فقط بعد از تأیید پزشک — این محدودیت در routes اعمال
// می‌شود (adapter خودش فقط «ارسال» است، نه تصمیم‌گیری دربارهٔ چه‌زمانی ارسال شود).

/** @typedef {{ send: (to: string, text: string) => Promise<{ id: string }> }} SMSProvider */

class MockSMSProvider {
  async send(to, text) {
    console.log(`[MOCK-SMS] به ${to}:\n${text}`);
    return { id: `mock-${Date.now()}` };
  }
}

class KavenegarProvider {
  constructor({ apiKey, sender }) {
    this.apiKey = apiKey;
    this.sender = sender;
  }

  async send(to, text) {
    const url = `https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json`;
    const params = new URLSearchParams({ receptor: to, message: text, sender: this.sender || '' });
    const res = await fetch(`${url}?${params.toString()}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok || data?.return?.status !== 200) {
      throw new Error(`Kavenegar خطا داد: ${JSON.stringify(data)}`);
    }
    return { id: String(data.entries?.[0]?.messageid ?? '') };
  }
}

class IppanelProvider {
  constructor({ apiKey, sender }) {
    this.apiKey = apiKey;
    this.sender = sender;
  }

  async send(to, text) {
    const res = await fetch('https://rest.ippanel.com/v1/messages', {
      method: 'POST',
      headers: { Authorization: this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: [to], sender: this.sender, message: text }),
    });
    if (!res.ok) {
      throw new Error(`Ippanel خطا داد: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return { id: String(data?.data?.message_id ?? '') };
  }
}

export function getSMSProvider() {
  const provider = process.env.SMS_PROVIDER || 'mock';
  if (provider === 'mock') return new MockSMSProvider();
  if (provider === 'kavenegar') {
    return new KavenegarProvider({ apiKey: process.env.SMS_API_KEY, sender: process.env.SMS_SENDER });
  }
  if (provider === 'ippanel') {
    return new IppanelProvider({ apiKey: process.env.SMS_API_KEY, sender: process.env.SMS_SENDER });
  }
  throw new Error(`SMS_PROVIDER ناشناخته: ${provider}`);
}

// ایشو #18: قالب پیامک خلاصهٔ ویزیت به زبان ساده برای بیمار.
export function buildPatientSummarySMS({ clinicName, patientSummary, followUpItems, warnings }) {
  const lines = [`${clinicName}:`, patientSummary.trim()];

  if (followUpItems?.length) {
    lines.push('پیگیری‌های بعدی:');
    for (const item of followUpItems) {
      lines.push(`- ${item.description}${item.due_hint ? ` (${item.due_hint})` : ''}`);
    }
  }

  if (warnings?.length) {
    lines.push('هشدار: در صورت بروز این علائم فوراً تماس بگیرید:');
    for (const w of warnings) lines.push(`- ${w}`);
  }

  lines.push('این پیام خلاصهٔ تأییدشده توسط پزشک شماست، جایگزین ویزیت حضوری نیست.');
  return lines.join('\n');
}
