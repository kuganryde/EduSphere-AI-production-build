FROM python:3.11-slim
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Pre-bake model weights into Docker image
RUN python -c "from deepface import DeepFace; import numpy as np; \
    dummy = np.zeros((100,100,3), dtype=np.uint8); \
    DeepFace.analyze(dummy, actions=['emotion'], enforce_detection=False)"
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
