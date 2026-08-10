# سرویس STT خودمیزبان فارسی (ایشو #2) — بر پایهٔ Whisper-base با فاین‌تیون LoRA برای فارسی
# مدل: https://huggingface.co/Paulwalker4884/whisper-persian (Apache-2.0)
#
# این سرویس مستقل از اپ اصلی Node.js اجرا می‌شود (چون به torch/transformers نیاز دارد) و
# قرارداد HttpSTTProvider موجود در app/src/services/sttAdapter.js را برآورده می‌کند:
# بدنهٔ درخواست = بایت خام صوت (WAV)، پاسخ = JSON با کلید `text`.
#
# اجرا طبق docs/build.md فقط روی سرور واقعی (SSH) انجام شود، نه داخل کانتینر کدنویسی —
# نصب torch/transformers یک بیلد سنگین است.

import io
import os

import librosa
import numpy as np
import soundfile as sf
import torch
from fastapi import FastAPI, HTTPException, Request
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor

MODEL_ID = os.environ.get("STT_MODEL_ID", "Paulwalker4884/whisper-persian")
TARGET_SR = 16000

app = FastAPI(title="TabibYar STT Service — whisper-persian")

_state = {"processor": None, "model": None, "device": "cuda" if torch.cuda.is_available() else "cpu"}


@app.on_event("startup")
def load_model():
    _state["processor"] = AutoProcessor.from_pretrained(MODEL_ID)
    _state["model"] = AutoModelForSpeechSeq2Seq.from_pretrained(MODEL_ID).to(_state["device"])
    _state["model"].eval()


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_ID, "device": _state["device"]}


@app.post("/transcribe")
async def transcribe(request: Request):
    audio_bytes = await request.body()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="بدنهٔ درخواست خالی است")

    try:
        audio, sample_rate = sf.read(io.BytesIO(audio_bytes), dtype="float32")
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"فرمت صوتی پشتیبانی نمی‌شود (WAV مورد انتظار است): {exc}",
        )

    if audio.ndim > 1:
        audio = audio.mean(axis=1)

    if sample_rate != TARGET_SR:
        audio = librosa.resample(audio.astype(np.float32), orig_sr=sample_rate, target_sr=TARGET_SR)

    processor = _state["processor"]
    model = _state["model"]
    device = _state["device"]

    inputs = processor(audio, sampling_rate=TARGET_SR, return_tensors="pt")
    input_features = inputs.input_features.to(device)

    with torch.no_grad():
        predicted_ids = model.generate(input_features, language="fa", task="transcribe")

    text = processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()
    return {"text": text}
