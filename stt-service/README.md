# سرویس STT فارسی خودمیزبان (ایشو #2)

پیاده‌سازی گزینهٔ «Whisper خودمیزبان» از `docs/research/stt-vendor-comparison.md` با مدل مشخص:

- **مدل:** [`Paulwalker4884/whisper-persian`](https://huggingface.co/Paulwalker4884/whisper-persian)
- **پایه:** `openai/whisper-base` با فاین‌تیون LoRA (PEFT) روی دیتاست فارسی Common Voice
- **لایسنس:** Apache-2.0 (مناسب استفادهٔ تجاری/تغییر)
- **اندازه:** حدود ۷۲ میلیون پارامتر (سبک، قابل اجرا حتی روی CPU برای بار کم)
- **چرا این گزینه:** خودمیزبان بودن یعنی صدای بیمار هرگز به بیرون از زیرساخت داخلی ارسال نمی‌شود —
  هم‌راستا با الزام محل نگهداریِ دادهٔ سلامت (ایشو #19).

## قرارداد با اپ اصلی

این سرویس مستقل (Python/FastAPI) اجرا می‌شود و از طریق HTTP به `HttpSTTProvider` موجود در
`app/src/services/sttAdapter.js` وصل می‌شود — **بدون نیاز به تغییر کد اپ Node.js**:

- درخواست: `POST /transcribe`، بدنه = بایت خام فایل WAV (هر نرخ نمونه‌برداری؛ در صورت نیاز
  به ۱۶kHz resample می‌شود)
- پاسخ: `{"text": "متن رونوشت‌شده"}`

## اجرا

> ⚠️ نصب `torch`/`transformers` یک بیلد سنگین است — طبق قانون پروژه **فقط روی سرور واقعی
> (SSH)** اجرا شود، نه داخل کانتینر کدنویسی.

```bash
cd stt-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # در صورت نیاز STT_MODEL_ID/PORT را تغییر دهید
uvicorn server:app --host 0.0.0.0 --port 8000
```

سپس در `app/.env`:

```
STT_PROVIDER=http
STT_API_URL=http://localhost:8000/transcribe
STT_API_KEY=            # این سرویس نیازی به کلید ندارد؛ خالی بگذارید یا پشت یک reverse proxy با auth قرار دهید
```

## وضعیت اعتبارسنجی

مدل و سرویس آماده و از نظر فنی با contract موجود سازگار است. طبق یادداشت باز ایشو #2،
**تست عملی دقت (WER) روی نمونهٔ صدای واقعی پزشکان با اصطلاحات مخلوط فارسی/لاتین** هنوز
انجام نشده — این بخش نیازمند صدای واقعی و رضایت پزشکان پایلوت است و در این محیط قابل انجام
نیست. نتیجهٔ آن تست باید در `docs/research/stt-vendor-comparison.md` ثبت شود.
