"""
EduSphere AI — DeepFace Analysis Service
PDPA-compliant: thumbnails returned to frontend have face regions blurred.
Analysis frames sent to Gemini are unblurred (needed for accuracy).
"""
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

PING_INTERVAL = 14 * 60  # 14 min — just under Render's 15-min spindown

# ── Keep-alive ──────────────────────────────────────────────────────────────────
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
PDPA_BLUR = os.getenv("PDPA_FACE_BLUR", "true").lower() != "false"  # default ON

# ── HOG person detector (loaded once) ─────────────────────────────────────────
_hog = cv2.HOGDescriptor()
_hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

ATTENTIVE_EMOTIONS = {"happy", "neutral", "surprise"}


# ── Schemas ────────────────────────────────────────────────────────────────────
class AnalysisRequest(BaseModel):
    image_b64: str
    session_id: str
    room_id: str

class RtspRequest(BaseModel):
    rtsp_url: str
    session_id: str
    room_id: str


# ── PDPA: blur face regions in an image ────────────────────────────────────────
def _blur_faces(frame: np.ndarray, faces: list[dict]) -> np.ndarray:
    """Apply Gaussian blur over detected face regions for PDPA compliance."""
    if not PDPA_BLUR or not faces:
        return frame
    blurred = frame.copy()
    h, w = frame.shape[:2]
    for face in faces:
        box = face.get("box", {})
        x, y, fw, fh = int(box.get("x", 0)), int(box.get("y", 0)), int(box.get("w", 0)), int(box.get("h", 0))
        if fw < 10 or fh < 10:
            continue
        # Clamp to image bounds
        x1, y1 = max(0, x - 10), max(0, y - 10)
        x2, y2 = min(w, x + fw + 10), min(h, y + fh + 10)
        roi = blurred[y1:y2, x1:x2]
        if roi.size == 0:
            continue
        # Strong blur — ksize scales with face size
        ksize = max(31, (fw // 4) * 2 + 1)
        blurred[y1:y2, x1:x2] = cv2.GaussianBlur(roi, (ksize, ksize), 0)
    return blurred


# ── Core analysis ───────────────────────────────────────────────────────────────
def _analyze_frame(frame: np.ndarray) -> dict:
    """Run DeepFace (MTCNN→opencv fallback) + HOG on a BGR numpy frame."""
    orig_h, orig_w = frame.shape[:2]
    max_width = 640
    if orig_w > max_width:
        scale = max_width / orig_w
        analysis_frame = cv2.resize(frame, (max_width, int(orig_h * scale)))
    else:
        analysis_frame = frame
        scale = 1.0

    # Face detection
    raw = None
    used_backend = "none"
    for backend in ("mtcnn", "opencv"):
        try:
            raw = DeepFace.analyze(
                analysis_frame,
                actions=["emotion"],
                enforce_detection=False,
                detector_backend=backend,
                silent=True,
            )
            used_backend = backend
            break
        except Exception:
            continue

    if raw is None:
        return _degraded("DeepFace analysis failed on all backends")

    results = raw if isinstance(raw, list) else [raw]
    faces, emotions, attention_scores = [], [], []

    for face in results:
        dominant = face.get("dominant_emotion", "unknown")
        emotions.append(dominant)
        is_attentive = dominant in ATTENTIVE_EMOTIONS
        attention_scores.append(is_attentive)

        region = face.get("region", {})
        box = {
            "x": int(region.get("x", 0) / scale),
            "y": int(region.get("y", 0) / scale),
            "w": int(region.get("w", 0) / scale),
            "h": int(region.get("h", 0) / scale),
        }
        emotion_scores = face.get("emotion", {})
        confidence = round(float(max(emotion_scores.values())) / 100, 3) if emotion_scores else 0.5
        faces.append({"box": box, "emotion": dominant, "attention": is_attentive, "confidence": confidence})

    persons = _detect_persons(frame)

    total = len(results)
    attentive_count = sum(attention_scores)
    attention_rate = round((attentive_count / total) * 100) if total > 0 else 0
    emotion_counter = Counter(emotions)
    dominant_class_emotion = emotion_counter.most_common(1)[0][0] if emotion_counter else "unknown"

    return {
        "face_count": total,
        "emotions": emotions,
        "attention_scores": attention_scores,
        "aggregate": {
            "attention_rate": attention_rate,
            "dominant_class_emotion": dominant_class_emotion,
            "emotion_breakdown": dict(emotion_counter),
            "total_faces": total,
        },
        "faces": faces,
        "persons": persons,
        "frame_width": orig_w,
        "frame_height": orig_h,
        "detector_used": used_backend,
    }


def _detect_persons(frame: np.ndarray) -> list[dict]:
    scale = min(1.0, 320 / max(frame.shape[:2]))
    small = cv2.resize(frame, (0, 0), fx=scale, fy=scale) if scale < 1.0 else frame
    rects, weights = _hog.detectMultiScale(small, winStride=(8, 8), padding=(4, 4), scale=1.05)
    if len(rects) == 0:
        return []
    return [
        {
            "box": {"x": int(x / scale), "y": int(y / scale), "w": int(w / scale), "h": int(h / scale)},
            "confidence": round(float(conf), 3),
        }
        for (x, y, w, h), conf in zip(rects, weights.flatten())
    ]


def _encode_frame(frame: np.ndarray, max_width: int = 640, quality: int = 75) -> str:
    h, w = frame.shape[:2]
    if w > max_width:
        frame = cv2.resize(frame, (max_width, int(h * max_width / w)))
    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return base64.b64encode(buf).decode("utf-8")


def _degraded(msg: str) -> dict:
    return {
        "face_count": 0, "emotions": [], "attention_scores": [],
        "aggregate": {"attention_rate": None, "dominant_class_emotion": "unknown", "emotion_breakdown": {}, "total_faces": 0},
        "faces": [], "persons": [], "frame_width": 0, "frame_height": 0,
        "degraded": True, "error": msg,
    }


def _capture_rtsp_frame(rtsp_url: str):
    """Blocking: open RTSP, grab a current frame, release. Returns (frame, error)."""
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 8000)
    cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5000)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        cap.release()
        return None, "Could not connect to RTSP stream — check URL and network"

    for _ in range(5):
        cap.grab()  # flush stale buffered frames

    ret, frame = cap.read()
    cap.release()

    if not ret or frame is None:
        return None, "Connected but could not read a frame from the stream"
    return frame, None


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.post("/analyze")
async def analyze(request: AnalysisRequest, x_api_key: str = Header(None)):
    if not API_KEY or x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")
    try:
        img_data = base64.b64decode(request.image_b64)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return _degraded("Could not decode image frame")
        return _analyze_frame(frame)
    except Exception as e:
        return _degraded(str(e))


@app.post("/analyze/rtsp")
async def analyze_rtsp(request: RtspRequest, x_api_key: str = Header(None)):
    """
    Server-side RTSP frame capture + full analysis.
    Returns DeepFace results + PDPA-compliant thumbnail (faces blurred)
    + unblurred frame_b64 for Gemini (backend only, never sent to frontend).
    """
    if not API_KEY or x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API Key")

    loop = asyncio.get_event_loop()
    frame, capture_error = await loop.run_in_executor(None, _capture_rtsp_frame, request.rtsp_url)

    if frame is None:
        result = _degraded(capture_error or "Unknown capture error")
        result["frame_b64"] = None
        result["thumbnail_b64"] = None
        return result

    result = _analyze_frame(frame)

    # Unblurred frame for Gemini (stays on backend, not returned to browser)
    result["frame_b64"] = _encode_frame(frame, max_width=640, quality=75)

    # PDPA-compliant thumbnail: blur faces before sending to frontend
    blurred_frame = _blur_faces(frame, result.get("faces", []))
    result["thumbnail_b64"] = _encode_frame(blurred_frame, max_width=320, quality=55)

    return result


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "edusphere-deepface",
        "model": "loaded",
        "pdpa_blur": PDPA_BLUR,
        "detector_order": ["mtcnn", "opencv"],
    }
