FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends libsndfile1 && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 stt
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=stt:stt server.py ./
ENV HF_HOME=/home/stt/.cache/huggingface
USER stt
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=300s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4)"
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log"]
