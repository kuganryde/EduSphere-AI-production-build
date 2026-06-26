from contextlib import asynccontextmanager
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import base64
import httpx
import numpy as np
import cv2
from deepface import DeepFace
import os
from collections import Counter

PING_INTERVAL = 14 * 60  # just under Render's 15-min spindown

async def _keep_alive():
    self_url = os.getenv("RENDER_EXTERNAL_URL", "http://localhost:8000")
    await asyncio.sleep(60)
    async with httpx.AsyncClient() as client:
        while True:
            try:
                await client.get(f"{self_url}/health", timeout=10)
            except Exception:
                pass
            await asyncio.sleep(PING_INTERVAL)

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(_keep_alive())
    yield
    task.cancel()

app = FastAPI(title="EduSphere DeepFace Service", lifespan=lifespan)

BACKEND_URL = os.getenv("BACKEND_URL", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[BACKEND_URL],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

API_KEY = os.getenv("DEEPFACE_API_KEY")

class AnalysisRequest(BaseModel):
    image_b64: str
    session_id: str
    room_id: str

ATTENTIVE_EMOTIONS = {"happy", "neutral", "surprise"}

# ── HOG person detector (loaded once at module level) ─────────────────────────
_hog = cv2.HOGDescriptor()
_hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

def detect_persons(frame: np.ndarray) -> list[dict]:
    """Detect person bounding boxes using OpenCV HOG + SVM."""
    # HOG works best on small-ish images; scale down for speed
    scale = min(1.0, 320 / max(frame.shape[:2]))
    small = cv2.resize(frame, (0, 0), fx=scale, fy=scale) if scale < 1.0 else frame
    rects, weights = _hog.detectMultiScale(
        small,
        winStride=(8, 8),
        padding=(4, 4),
        scale=1.05,
    )
    persons = []
    if len(rects) == 0:
        return persons
    for (x, y, w, h), conf in zip(rects, weights.flatten()):
        # Scale back to original frame coordinates
        persons.append({
            "box": {
                "x": int(x / scale),
                "y": int(y / scale),
                "w": int(w / scale),
                "h": int(h / scale),
            },
            "confidence": round(float(conf), 3),
        })
    return persons


@app.post("/analyze")
async def analyze(request: AnalysisRequest, x_api_key: str = Header(None)):

    if not API_KEY or x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")

    try:
        # ── 1. Decode image ────────────────────────────────────────────────────
        img_data = base64.b64decode(request.image_b64)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
            return _degraded("Could not decode image frame")

        orig_h, orig_w = frame.shape[:2]

        # ── 2. Resize for DeepFace (max 640px wide) ────────────────────────────
        max_width = 640
        if orig_w > max_width:
            scale = max_width / orig_w
            analysis_frame = cv2.resize(frame, (max_width, int(orig_h * scale)))
        else:
            analysis_frame = frame
            scale = 1.0

        analyzed_h, analyzed_w = analysis_frame.shape[:2]

        # ── 3. Face detection via DeepFace (mtcnn → opencv fallback) ──────────
        raw = None
        for backend in ("mtcnn", "opencv"):
            try:
                raw = DeepFace.analyze(
                    analysis_frame,
                    actions=["emotion"],
                    enforce_detection=False,
                    detector_backend=backend,
                    silent=True,
                )
                break
            except Exception:
                continue

        if raw is None:
            return _degraded("DeepFace analysis failed on all backends")

        results = raw if isinstance(raw, list) else [raw]

        # ── 4. Build per-face data with bounding boxes ─────────────────────────
        faces = []
        emotions = []
        attention_scores = []

        for face in results:
            dominant = face.get("dominant_emotion", "unknown")
            emotions.append(dominant)
            is_attentive = dominant in ATTENTIVE_EMOTIONS
            attention_scores.append(is_attentive)

            region = face.get("region", {})
            # Scale region back to original image coordinate space
            box = {
                "x": int(region.get("x", 0) / scale),
                "y": int(region.get("y", 0) / scale),
                "w": int(region.get("w", 0) / scale),
                "h": int(region.get("h", 0) / scale),
            }
            emotion_scores = face.get("emotion", {})
            confidence = round(float(max(emotion_scores.values())) / 100, 3) if emotion_scores else 0.5

            faces.append({
                "box": box,
                "emotion": dominant,
                "attention": is_attentive,
                "confidence": confidence,
            })

        # ── 5. Person (body) detection via HOG ────────────────────────────────
        # Run on original frame so bounding boxes are in original pixel space
        persons = detect_persons(frame)

        # ── 6. Aggregate metrics ───────────────────────────────────────────────
        total = len(results)
        attentive_count = sum(attention_scores)
        attention_rate = round((attentive_count / total) * 100) if total > 0 else 0

        emotion_counter = Counter(emotions)
        dominant_class_emotion = emotion_counter.most_common(1)[0][0] if emotion_counter else "unknown"

        return {
            # Legacy fields (backward compatible)
            "face_count": total,
            "emotions": emotions,
            "attention_scores": attention_scores,
            "aggregate": {
                "attention_rate": attention_rate,
                "dominant_class_emotion": dominant_class_emotion,
                "emotion_breakdown": dict(emotion_counter),
                "total_faces": total,
            },
            # New bounding-box fields
            "faces": faces,
            "persons": persons,
            "frame_width": orig_w,
            "frame_height": orig_h,
        }

    except Exception as e:
        return _degraded(str(e))


def _degraded(msg: str) -> dict:
    return {
        "face_count": 0,
        "emotions": [],
        "attention_scores": [],
        "aggregate": {
            "attention_rate": None,
            "dominant_class_emotion": "unknown",
            "emotion_breakdown": {},
            "total_faces": 0,
        },
        "faces": [],
        "persons": [],
        "frame_width": 0,
        "frame_height": 0,
        "degraded": True,
        "error": msg,
    }


@app.get("/health")
async def health():
    return {"status": "ok", "service": "edusphere-deepface", "model": "loaded"}
