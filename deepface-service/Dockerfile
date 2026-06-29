# python:3.12-slim-bookworm — Debian 12 (Bookworm), fewest open CVEs in the 3.x slim line
FROM python:3.12-slim-bookworm

# Apply all OS security patches, then install runtime libs
# Pinned to bookworm repos; upgrade first to pull in any patched packages
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        libgomp1 \
        ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Unprivileged user — don't run the process as root
RUN useradd --create-home --shell /bin/bash appuser
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Pre-download YOLO weights + warm up HSEmotion ONNX so first request is instant
RUN python -c "\
import numpy as np; \
from ultralytics import YOLO; \
model = YOLO('yolo11n-pose.pt'); \
model(np.zeros((480,640,3), dtype=np.uint8), verbose=False); \
print('YOLOv11n-pose ready'); \
from hsemotion_onnx.facial_emotions import HSEmotionRecognizer; \
fer = HSEmotionRecognizer(model_name='enet_b2_8'); \
fer.predict_emotions(np.zeros((96,96,3), dtype=np.uint8)); \
print('HSEmotion enet_b2_8 ready')"

COPY . .

# Hand ownership to unprivileged user (models downloaded above are in /root/.cache;
# chown so appuser can access them at runtime)
RUN chown -R appuser:appuser /app /root/.cache 2>/dev/null || true
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
