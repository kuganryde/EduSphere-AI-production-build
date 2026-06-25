FROM python:3.11-slim
 
# Fix: libgl1-mesa-glx was renamed to libgl1 in newer Debian
# libxrender-dev renamed to libxrender1
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*
 
WORKDIR /app
 
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
 
# Pre-bake DeepFace emotion model into image
RUN python -c "\
from deepface import DeepFace; \
import numpy as np; \
dummy = np.zeros((100,100,3), dtype=np.uint8); \
DeepFace.analyze(dummy, actions=['emotion'], enforce_detection=False); \
print('Model pre-loaded successfully')"
 
COPY . .
 
EXPOSE 8000
 
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
