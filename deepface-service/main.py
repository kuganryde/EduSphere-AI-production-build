from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import numpy as np
import cv2
from deepface import DeepFace
import os
from collections import Counter

app = FastAPI(title="EduSphere DeepFace Service")

# ── CORS ──────────────────────────────────────────────────────
# Locks to your Node.js backend only
BACKEND_URL = os.getenv("BACKEND_URL", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[BACKEND_URL],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ── Auth ──────────────────────────────────────────────────────
API_KEY = os.getenv("DEEPFACE_API_KEY")

# ── Schemas ───────────────────────────────────────────────────
class AnalysisRequest(BaseModel):
    image_b64: str
    session_id: str
    room_id: str

# ── Attention logic ───────────────────────────────────────────
# Emotions that indicate a student is paying attention
ATTENTIVE_EMOTIONS = {"happy", "neutral", "surprise"}

# ── Routes ───────────────────────────────────────────────────

@app.post("/analyze")
async def analyze(request: AnalysisRequest, x_api_key: str = Header(None)):

    # Auth check
    if not API_KEY or x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")

    try:
        # ── 1. Decode base64 image ─────────────────────────────
        img_data = base64.b64decode(request.image_b64)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return {
                "face_count": 0,
                "emotions": [],
                "attention_scores": [],
                "aggregate": {
                    "attention_rate": 0,
                    "dominant_class_emotion": "unknown",
                    "emotion_breakdown": {},
                    "total_faces": 0
                },
                "degraded": True,
                "error": "Could not decode image frame"
            }

        # ── 2. Resize for performance (max 640px wide) ─────────
        max_width = 640
        h, w = frame.shape[:2]
        if w > max_width:
            scale = max_width / w
            frame = cv2.resize(frame, (max_width, int(h * scale)))

        # ── 3. DeepFace analysis ───────────────────────────────
        raw = DeepFace.analyze(
            frame,
            actions=["emotion"],
            enforce_detection=False,
            detector_backend="opencv",
            silent=True
        )

        # FIX #1: Normalize — DeepFace returns dict for 1 face, list for many
        results = raw if isinstance(raw, list) else [raw]

        # ── 4. Extract per-face data ───────────────────────────
        emotions = []
        attention_scores = []

        for face in results:
            dominant = face.get("dominant_emotion", "unknown")
            emotions.append(dominant)
            attention_scores.append(dominant in ATTENTIVE_EMOTIONS)

        # FIX #2: Calculate attention_rate dynamically
        total = len(results)
        attentive_count = sum(attention_scores)
        attention_rate = round((attentive_count / total) * 100) if total > 0 else 0

        # FIX #3: Calculate dominant_class_emotion dynamically
        emotion_counter = Counter(emotions)
        dominant_class_emotion = (
            emotion_counter.most_common(1)[0][0] if emotion_counter else "unknown"
        )

        # FIX #4: Real emotion breakdown
        emotion_breakdown = dict(emotion_counter)

        return {
            "face_count": total,
            "emotions": emotions,
            "attention_scores": attention_scores,
            "aggregate": {
                "attention_rate": attention_rate,
                "dominant_class_emotion": dominant_class_emotion,
                "emotion_breakdown": emotion_breakdown,
                "total_faces": total
            }
        }

    except Exception as e:
        # Never crash — always return valid JSON with degraded flag
        return {
            "face_count": 0,
            "emotions": [],
            "attention_scores": [],
            "aggregate": {
                "attention_rate": None,
                "dominant_class_emotion": "unknown",
                "emotion_breakdown": {},
                "total_faces": 0
            },
            "degraded": True,
            "error": str(e)
        }


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "edusphere-deepface",
        "model": "loaded"
    }