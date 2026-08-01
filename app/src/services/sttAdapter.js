// ایشو #2: ارزیابی و انتخاب سرویس STT فارسی — این ماژول یک contract پایدار تعریف می‌کند
// تا هر سرویسی که در docs/research/stt-vendor-comparison.md انتخاب شود، بدون تغییر بقیهٔ
// پایپ‌لاین جایگزین شود.

/** @typedef {{ transcribe: (audioUrlOrBuffer: string | Buffer) => Promise<string> }} STTProvider */

/** پیاده‌سازی موقت برای توسعه/تست بدون نیاز به اعتبار سرویس خارجی. */
class MockSTTProvider {
  async transcribe(audioUrlOrBuffer) {
    if (!audioUrlOrBuffer) {
      throw new Error('ورودی صوتی خالی است');
    }
    // در محیط واقعی جایگزین با فراخوانی سرویس STT فارسی انتخاب‌شده می‌شود.
    return '[MOCK-STT] رونوشت شبیه‌سازی‌شده — جایگزین با سرویس واقعی طبق docs/research/stt-vendor-comparison.md';
  }
}

/**
 * اسکلت آمادهٔ اتصال به سرویس واقعی (HTTP-based). قبل از فعال‌سازی باید
 * STT_API_URL و STT_API_KEY در .env تنظیم و طبق مستندات سرویس انتخاب‌شده تکمیل شود.
 */
class HttpSTTProvider {
  constructor({ apiUrl, apiKey }) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async transcribe(audioUrlOrBuffer) {
    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      body: audioUrlOrBuffer,
    });
    if (!res.ok) {
      throw new Error(`STT provider خطا داد: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return data.text ?? data.transcript ?? '';
  }
}

export function getSTTProvider() {
  const provider = process.env.STT_PROVIDER || 'mock';
  if (provider === 'mock') return new MockSTTProvider();
  if (provider === 'http') {
    return new HttpSTTProvider({
      apiUrl: process.env.STT_API_URL,
      apiKey: process.env.STT_API_KEY,
    });
  }
  throw new Error(`STT_PROVIDER ناشناخته: ${provider}`);
}
