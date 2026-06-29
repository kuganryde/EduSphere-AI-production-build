"""
EduSphere AI — Vision Analysis Sidecar  v2
Models: YOLOv11n-pose (person detection + keypoints) + HSEmotion enet_b2_8 (emotions)
API contract unchanged — drop-in replacement for the DeepFace sidecar.
PDPA: face regions are Gaussian-blurred in thumbnails returned to frontend.
"""
from __future__ import annotations

import asyncio
import base64
import logging
import os
from collections import Counter
from contextlib import asynccontextmanager
from typing import Any

import cv2
import httpx
import numpy as np
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

log = logging.getLogger("edusphere_sidecar")
logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")

# ── Constants ───────────────────────────────────────────────────────────────────
PING_INTERVAL = 14 * 60  # keep-alive: just under Render's 15-min spindown

# HSEmotion returns these labels (AffectNet-8 training)
HS_TO_STD: dict[str, str] = {
    "Happiness": "happy",   "Neutral":  "neutral", "Surprise": "surprise",
    "Sadness":   "sad",     "Anger":    "angry",   "Fear":     "fear",
    "Disgust":   "disgust", "Contempt": "disgust",
}
ATTENTIVE_EMOTIONS = {"happy", "neutral", "surprise"}
ALL_EMOTIONS       = ["happy", "neutral", "surprise", "sad", "angry", "fear", "disgust"]

# COCO pose keypoint indices
KP_NOSE, KP_LEYE, KP_REYE, KP_LEAR, KP_REAR = 0, 1, 2, 3, 4
HEAD_KPS = [KP_NOSE, KP_LEYE, KP_REYE, KP_LEAR, KP_REAR]
KP_CONF_THRESH = 0.35

# ── Singletons loaded at startup ────────────────────────────────────────────────
_pose_model  = None
_emotion_rec = None


def _load_models() -> None:
    global _pose_model, _emotion_rec

    from ultralytics import YOLO
    for weights in ("yolo11n-pose.pt", "yolov8n-pose.pt"):
        try:
            _pose_model = YOLO(weights)
            _pose_model(np.zeros((480, 640, 3), dtype=np.uint8), verbose=False)  # warm-up
            log.info("Pose model loaded: %s", weights)
            break
        except Exception as exc:
            log.warning("Could not load %s: %s", weights, exc)

    try:
        from hsemotion_onnx.facial_emotions import HSEmotionRecognizer
        _emotion_rec = HSEmotionRecognizer(model_name="enet_b2_8")
        _emotion_rec.predict_emotions(np.zeros((96, 96, 3), dtype=np.uint8))  # warm-up
        log.info("HSEmotion enet_b2_8 loaded")
    except Exception as exc:
        log.error("Could not load HSEmotion: %s", exc)


# ── Keep-alive: prevent Render free/starter from spinning down ──────────────────
async def _keep_alive() -> None:
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
    _load_models()
    task = asyncio.create_task(_keep_alive())
    yield
    task.cancel()


# ── App ─────────────────────────────────────────────────────────────────────────
app = FastAPI(title="EduSphere Vision Sidecar v2", lifespan=lifespan)

BACKEND_URL = os.getenv("BACKEND_URL", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[BACKEND_URL],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

API_KEY   = os.getenv("DEEPFACE_API_KEY", "")
PDPA_BLUR = os.getenv("PDPA_FACE_BLUR", "true").lower() != "false"


# ── Request schemas ──────────────────────────────────────────────────────────────
class AnalysisRequest(BaseModel):
    image_b64: str
    session_id: str = "none"
    room_id:    str = "unknown"

class RtspRequest(BaseModel):
    rtsp_url:   str
    session_id: str = "none"
    room_id:    str = "unknown"


# ── Helpers ─────────────────────────────────────────────────────────────────────
def _degraded(msg: str) -> dict:
    return {
        "face_count": 0, "emotions": [], "attention_scores": [],
        "aggregate": {
            "attention_rate": None,
            "dominant_class_emotion": "neutral",
            "emotion_breakdown": {},
            "total_faces": 0,
        },
        "faces": [], "persons": [],
        "frame_width": 0, "frame_height": 0,
        "degraded": True, "error": msg,
    }


def _kps_to_face_box(
    kps: np.ndarray,
) -> tuple[tuple[int, int, int, int] | None, bool]:
    """
    Derive face bounding box from COCO head keypoints.
    Returns (x1,y1,x2,y2) or None, and attention boolean.
    """
    visible = [
        (kps[i, 0], kps[i, 1])
        for i in HEAD_KPS
        if kps[i, 2] > KP_CONF_THRESH
    ]
    if len(visible) < 2:
        return None, False

    xs = [p[0] for p in visible]
    ys = [p[1] for p in visible]
    cx, cy = float(np.mean(xs)), float(np.mean(ys))
    span   = max(max(xs) - min(xs), max(ys) - min(ys), 20.0)
    pad    = max(span * 0.65, 22.0)

    x1, y1 = int(cx - pad),        int(cy - pad)
    x2, y2 = int(cx + pad),        int(cy + pad * 1.3)  # chin room

    # Attention: nose + at least one eye visible → facing camera
    nose_ok = kps[KP_NOSE,  2] > KP_CONF_THRESH
    leye_ok = kps[KP_LEYE, 2] > KP_CONF_THRESH
    reye_ok = kps[KP_REYE, 2] > KP_CONF_THRESH
    attention = nose_ok and (leye_ok or reye_ok)

    return (x1, y1, x2, y2), attention


def _emotion_for_crop(crop: np.ndarray) -> tuple[str, float]:
    """Run HSEmotion on a face crop. Returns (emotion_str, confidence 0-1)."""
    if _emotion_rec is None or crop.size == 0:
        return "neutral", 0.5
    try:
        label, probs = _emotion_rec.predict_emotions(crop, logits=False)
        return HS_TO_STD.get(label, "neutral"), float(np.max(probs))
    except Exception:
        return "neutral", 0.5


def _analyze_frame(frame: np.ndarray) -> dict:
    orig_h, orig_w = frame.shape[:2]

    if _pose_model is None:
        return _degraded("Pose model not loaded")

    persons: list[dict] = []
    faces:   list[dict] = []

    try:
        results = _pose_model(frame, verbose=False, conf=0.35)[0]

        for idx in range(len(results.boxes)):
            box_xyxy = results.boxes.xyxy[idx].cpu().numpy()
            conf     = float(results.boxes.conf[idx].cpu().numpy())
            x1, y1, x2, y2 = map(int, box_xyxy)

            persons.append({
                "box": {"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1},
                "confidence": round(conf, 3),
            })

            # Face crop via keypoints
            if results.keypoints is not None and idx < len(results.keypoints.data):
                kps = results.keypoints.data[idx].cpu().numpy()  # (17, 3)
                face_box, attention = _kps_to_face_box(kps)

                if face_box is not None:
                    fx1, fy1, fx2, fy2 = face_box
                    # Clamp to frame bounds
                    fx1 = max(0, fx1); fy1 = max(0, fy1)
                    fx2 = min(orig_w, fx2); fy2 = min(orig_h, fy2)

                    if fx2 - fx1 >= 16 and fy2 - fy1 >= 16:
                        crop             = frame[fy1:fy2, fx1:fx2]
                        emotion, conf_e  = _emotion_for_crop(crop)
                        faces.append({
                            "box": {"x": fx1, "y": fy1, "w": fx2 - fx1, "h": fy2 - fy1},
                            "emotion":    emotion,
                            "attention":  attention,
                            "confidence": round(conf_e, 3),
                        })

    except Exception as exc:
        log.error("YOLO inference error: %s", exc)
        return _degraded(str(exc))

    # ── Aggregate ────────────────────────────────────────────────
    total        = len(faces)
    emotion_list = [f["emotion"] for f in faces]
    counter      = Counter(emotion_list)
    attentive    = sum(1 for f in faces if f["attention"])

    # Normalise to percentages summing to 100
    emotion_breakdown: dict[str, int] = {}
    if total > 0:
        remaining = 100
        for i, emo in enumerate(ALL_EMOTIONS):
            pct = round(counter.get(emo, 0) / total * 100)
            if i == len(ALL_EMOTIONS) - 1:
                emotion_breakdown[emo] = max(0, remaining)
            else:
                emotion_breakdown[emo] = pct
                remaining -= pct

    dominant = counter.most_common(1)[0][0] if counter else "neutral"
    attention_rate = round(attentive / total * 100) if total > 0 else None

    return {
        "face_count":      total,
        "emotions":        emotion_list,
        "attention_scores":[f["attention"] for f in faces],
        "aggregate": {
            "attention_rate":         attention_rate,
            "dominant_class_emotion": dominant,
            "emotion_breakdown":      emotion_breakdown,
            "total_faces":            total,
        },
        "faces":        faces,
        "persons":      persons,
        "frame_width":  orig_w,
        "frame_height": orig_h,
    }


def _blur_faces(frame: np.ndarray, faces: list[dict]) -> np.ndarray:
    """PDPA: Gaussian-blur face ROIs before the thumbnail reaches the frontend."""
    if not PDPA_BLUR or not faces:
        return frame
    h, w   = frame.shape[:2]
    result = frame.copy()
    for face in faces:
        b    = face.get("box", {})
        fx   = int(b.get("x", 0)); fy = int(b.get("y", 0))
        fw   = int(b.get("w", 0)); fh = int(b.get("h", 0))
        if fw < 10 or fh < 10:
            continue
        x1, y1 = max(0, fx - 8),  max(0, fy - 8)
        x2, y2 = min(w, fx + fw + 8), min(h, fy + fh + 8)
        roi = result[y1:y2, x1:x2]
        if roi.size == 0:
            continue
        ksize = max(31, (fw // 4) * 2 + 1)
        result[y1:y2, x1:x2] = cv2.GaussianBlur(roi, (ksize, ksize), 0)
    return result


def _encode_jpeg(frame: np.ndarray, max_width: int = 640, quality: int = 75) -> str:
    h, w = frame.shape[:2]
    if w > max_width:
        scale = max_width / w
        frame = cv2.resize(frame, (max_width, int(h * scale)))
    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return base64.b64encode(buf).decode("utf-8")


def _capture_rtsp_frame(rtsp_url: str) -> tuple[np.ndarray | None, str | None]:
    """Blocking RTSP frame grab. Returns (frame, error_msg)."""
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 8_000)
    cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 5_000)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        cap.release()
        return None, "Could not connect to RTSP stream — check URL and network"

    for _ in range(5):          # flush stale buffered frames
        cap.grab()

    ret, frame = cap.read()
    cap.release()

    if not ret or frame is None:
        return None, "Connected but could not read a frame"
    return frame, None


# ── Routes ──────────────────────────────────────────────────────────────────────

def _check_key(x_api_key: str | None) -> None:
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")


@app.get("/health")
async def health() -> dict:
    return {
        "status":       "ok",
        "service":      "edusphere-sidecar-v2",
        "models": {
            "pose":    _pose_model  is not None,
            "emotion": _emotion_rec is not None,
        },
        "pdpa_blur":    PDPA_BLUR,
    }


@app.post("/analyze")
async def analyze(
    request: AnalysisRequest,
    x_api_key: str | None = Header(None),
) -> dict[str, Any]:
    _check_key(x_api_key)
    try:
        raw   = base64.b64decode(request.image_b64)
        arr   = np.frombuffer(raw, np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            return _degraded("Could not decode image")
        return _analyze_frame(frame)
    except Exception as exc:
        return _degraded(str(exc))


@app.post("/analyze/rtsp")
async def analyze_rtsp(
    request: RtspRequest,
    x_api_key: str | None = Header(None),
) -> dict[str, Any]:
    """
    Capture one frame from an RTSP stream, run full analysis.
    Returns analysis + frame_b64 (unblurred, for Gemini — stays on backend)
                   + thumbnail_b64 (PDPA-blurred, safe for frontend).
    """
    _check_key(x_api_key)

    loop  = asyncio.get_event_loop()
    frame, err = await loop.run_in_executor(None, _capture_rtsp_frame, request.rtsp_url)

    if frame is None:
        result = _degraded(err or "Unknown capture error")
        result["frame_b64"]     = None
        result["thumbnail_b64"] = None
        return result

    result = _analyze_frame(frame)

    # Unblurred frame → Gemini (backend only, never forwarded to browser)
    result["frame_b64"] = _encode_jpeg(frame, max_width=640, quality=75)

    # PDPA-compliant thumbnail → frontend camera strip
    blurred = _blur_faces(frame, result.get("faces", []))
    result["thumbnail_b64"] = _encode_jpeg(blurred, max_width=320, quality=55)

    return result
