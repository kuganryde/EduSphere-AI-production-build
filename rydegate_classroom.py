"""
RydeGate Classroom Intelligence Platform  — v3 (Upgraded Models)
Upgrades applied:
  - YOLOv11n-pose   : replaces YOLOv8n-pose — ~10% better mAP, same API
  - HSEmotion       : replaces DeepFace — EfficientNet-B2 on AffectNet-8 (450K images),
                      outputs 8 emotions + Valence/Arousal from Russell's circumplex model
  - YOLO-World      : open-vocabulary classroom object detection (phone, laptop, book, pen)
                      objects associated to nearest student → distraction/engagement signal
  - Valence-Arousal : continuous VA sentiment replaces binary Positive/Neutral/Negative
  - Posture scorer  : lean angle from skeleton keypoints → upright posture = engagement proxy
  - Multi-signal    : engagement = attention×0.30 + VA_valence×0.35 + gesture×0.20 + posture×0.15
"""

from __future__ import annotations

import ctypes
import math
import os
import queue
import sys
import threading
import time
from collections import defaultdict, deque

import cv2
import numpy as np
import streamlit as st
import yt_dlp

# ── Optional VLC binding ───────────────────────────────────────────────────────
try:
    import vlc as _vlc
    _VLC_AVAILABLE = True
except ImportError:
    _vlc = None          # type: ignore[assignment]
    _VLC_AVAILABLE = False

# VLC frame-callback ctypes signatures  (libvlc memory rendering API)
_LockCb    = ctypes.CFUNCTYPE(ctypes.c_void_p, ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p))
_UnlockCb  = ctypes.CFUNCTYPE(None, ctypes.c_void_p, ctypes.c_void_p, ctypes.POINTER(ctypes.c_void_p))
_DisplayCb = ctypes.CFUNCTYPE(None, ctypes.c_void_p, ctypes.c_void_p)

# ── Page config — must be first Streamlit call ────────────────────────────────
st.set_page_config(
    page_title="RydeGate Classroom Intelligence",
    layout="wide",
    initial_sidebar_state="expanded",
)

# =============================================================================
# 1.  ENGINE BOOTSTRAP  (cached — loads once per Streamlit server process)
# =============================================================================
@st.cache_resource(show_spinner="Loading neural cores…")
def _boot_engines() -> dict:
    eng = {
        # Pose detection
        "pose":               None,
        "pose_available":     False,
        # Open-vocabulary object detection
        "world":              None,
        "world_available":    False,
        # Emotion analysis
        "fer":                None,
        "hsemotion_available": False,
        # VLC
        "vlc_available":      _VLC_AVAILABLE,
    }

    # ── YOLOv11n-pose (upgraded from YOLOv8n-pose) ────────────────────────────
    try:
        from ultralytics import YOLO
        eng["pose"] = YOLO("yolo11n-pose.pt")
        eng["pose_available"] = True
    except Exception as e:
        sys.stderr.write(f"[engine] YOLO11 pose load failed: {e}\n")
        # Fallback to v8 if v11 weights not yet cached
        try:
            from ultralytics import YOLO
            eng["pose"] = YOLO("yolov8n-pose.pt")
            eng["pose_available"] = True
            sys.stderr.write("[engine] Fell back to YOLOv8n-pose\n")
        except Exception:
            pass

    # ── YOLO-World (open-vocabulary classroom context) ─────────────────────────
    try:
        from ultralytics import YOLOWorld
        w = YOLOWorld("yolov8s-worldv2.pt")
        w.set_classes(["mobile phone", "laptop computer", "book", "pen", "earphones"])
        eng["world"]           = w
        eng["world_available"] = True
    except Exception as e:
        sys.stderr.write(f"[engine] YOLO-World load failed: {e}\n")

    # ── HSEmotion EfficientNet-B2 (upgraded from DeepFace) ────────────────────
    try:
        from hsemotion_onnx.facial_emotions import HSEmotionRecognizer
        eng["fer"]                = HSEmotionRecognizer(model_name="enet_b2_8")
        eng["hsemotion_available"] = True
    except Exception as e:
        sys.stderr.write(f"[engine] HSEmotion load failed: {e}\n")

    return eng

ENGINES = _boot_engines()

# =============================================================================
# 2.  CONSTANTS
# =============================================================================

# ── Emotion colours (EduSphere AI palette) ────────────────────────────────────
EMOTION_HEX: dict[str, str] = {
    "happy":    "#10b981",
    "neutral":  "#3b82f6",
    "surprise": "#8b5cf6",
    "sad":      "#f59e0b",
    "angry":    "#ef4444",
    "fear":     "#ec4899",
    "disgust":  "#f97316",
}
EMOTION_BGR: dict[str, tuple] = {
    "happy":    (129, 185,  16),
    "neutral":  (246, 130,  59),
    "surprise": (246,  92, 139),
    "sad":      ( 11, 158, 245),
    "angry":    ( 68,  68, 239),
    "fear":     (153,  72, 236),
    "disgust":  ( 22, 115, 249),
}
EMOTION_ORDER     = ["happy", "neutral", "surprise", "sad", "angry", "fear", "disgust"]
POSITIVE_EMOTIONS = {"happy", "surprise", "neutral"}

# ── HSEmotion label mapping (FER+ → EduSphere labels) ────────────────────────
# HSEmotion enet_b2_8 outputs 8 FER+ emotions in this order:
HS_LABELS = ["Anger", "Contempt", "Disgust", "Fear", "Happiness", "Neutral", "Sadness", "Surprise"]

HS_TO_ES: dict[str, str] = {
    "Happiness": "happy",
    "Neutral":   "neutral",
    "Surprise":  "surprise",
    "Sadness":   "sad",
    "Anger":     "angry",
    "Fear":      "fear",
    "Disgust":   "disgust",
    "Contempt":  "disgust",   # closest match in EduSphere palette
}

# ── Russell Circumplex Model: Valence/Arousal coordinates per emotion ─────────
# Valence: -1 (negative) → +1 (positive)
# Arousal: -1 (calm/low energy) → +1 (excited/high energy)
EMOTION_VA: dict[str, tuple[float, float]] = {
    "Happiness": ( 0.85,  0.60),
    "Neutral":   ( 0.10,  0.00),
    "Surprise":  ( 0.35,  0.75),
    "Sadness":   (-0.70, -0.35),
    "Anger":     (-0.65,  0.70),
    "Fear":      (-0.60,  0.65),
    "Disgust":   (-0.70,  0.20),
    "Contempt":  (-0.50,  0.15),
}

# ── VA quadrant → classroom behavioural state ─────────────────────────────────
#  High Valence + High Arousal = Participatory
#  High Valence + Low Arousal  = Attentive
#  Low Valence  + High Arousal = Distressed
#  Low Valence  + Low Arousal  = Disengaged
VA_STATE_COLOR: dict[str, str] = {
    "Participatory": "#10b981",
    "Attentive":     "#3b82f6",
    "Distressed":    "#ef4444",
    "Disengaged":    "#f59e0b",
    "Neutral":       "#64748b",
}

# ── Gesture constants ─────────────────────────────────────────────────────────
GESTURE_HEX: dict[str, str] = {
    "raised_hand":     "#10b981",
    "looking_forward": "#3b82f6",
    "writing":         "#8b5cf6",
    "phone":           "#ef4444",
    "head_down":       "#f59e0b",
    "unknown":         "#475569",
}
GESTURE_ICON: dict[str, str] = {
    "raised_hand":     "✋",
    "looking_forward": "👁",
    "writing":         "✍",
    "phone":           "📱",
    "head_down":       "😔",
    "unknown":         "·",
}
GESTURE_VALENCE: dict[str, float] = {
    "raised_hand":      1.00,
    "looking_forward":  0.70,
    "writing":          0.80,
    "phone":           -0.60,
    "head_down":       -0.70,
    "unknown":          0.00,
}

# ── YOLO-World classroom objects ──────────────────────────────────────────────
WORLD_CLASSES       = ["mobile phone", "laptop computer", "book", "pen", "earphones"]
OBJECT_DISTRACTION  = {"mobile phone", "earphones"}
OBJECT_ENGAGEMENT   = {"book", "pen"}
OBJECT_BGR: dict[str, tuple] = {
    "mobile phone":    (68,  68, 239),   # red
    "earphones":       (68,  68, 239),
    "laptop computer": (22, 115, 249),   # orange
    "book":            (16, 185, 129),   # green
    "pen":             (16, 185, 129),
}

# ── COCO skeleton keypoint indices (YOLOv11-pose) ────────────────────────────
_NOSE             = 0
_L_SHOULDER, _R_SHOULDER = 5, 6
_L_WRIST,    _R_WRIST    = 9, 10
_L_HIP,      _R_HIP      = 11, 12

# =============================================================================
# 3.  NON-BLOCKING FRAME BUFFER  (YouTube / file / webcam)
# =============================================================================
class FrameBuffer:
    _STALE_LIMIT = 40
    _MAX_RETRY_S = 10.0

    def __init__(self, source_path: str) -> None:
        self._src    = str(source_path).strip()
        self._q: queue.Queue[np.ndarray] = queue.Queue(maxsize=2)
        self._stop   = threading.Event()
        self._status = "connecting"
        self._lock   = threading.Lock()
        self._fps    = 0.0
        self._thread = threading.Thread(target=self._run, daemon=True, name="FrameBuffer")

    def start(self) -> "FrameBuffer":
        self._thread.start()
        return self

    def stop(self) -> None:
        self._stop.set()
        self._thread.join(timeout=4)

    @property
    def status(self) -> str:
        with self._lock:
            return self._status

    @property
    def fps(self) -> float:
        return self._fps

    def read_latest(self) -> tuple[bool, np.ndarray | None]:
        try:
            return True, self._q.get_nowait()
        except queue.Empty:
            return False, None

    def _resolve(self, path: str) -> tuple[str | int, bool]:
        if os.path.isfile(path):
            return path, False
        if "youtube.com" in path or "youtu.be" in path:
            opts = {"format": "bestvideo[height<=720]+bestaudio/best", "quiet": True, "no_warnings": True}
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(path, download=False)
                return info.get("url", path), True
        if path.startswith(("rtsp://", "rtsps://", "rtmp://")):
            return path, True
        if path.isdigit():
            return int(path), True
        return path, True

    def _run(self) -> None:
        retry_delay = 1.0
        self._set_status("connecting")
        while not self._stop.is_set():
            cap = None
            try:
                url, is_live = self._resolve(self._src)
                cap = cv2.VideoCapture(url)
                if is_live:
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                if not cap.isOpened():
                    raise OSError(f"Cannot open: {self._src!r}")
                self._set_status("streaming")
                retry_delay = 1.0
                t0, count, stale = time.time(), 0, 0
                while not self._stop.is_set():
                    if is_live:
                        ok = cap.grab()
                        if not ok:
                            stale += 1
                            if stale >= self._STALE_LIMIT:
                                break
                            time.sleep(0.01)
                            continue
                        ok, frame = cap.retrieve()
                    else:
                        ok, frame = cap.read()
                    if not ok or frame is None:
                        stale += 1
                        if stale >= self._STALE_LIMIT:
                            break
                        if not is_live:
                            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                            stale = 0
                        time.sleep(0.01)
                        continue
                    stale  = 0
                    count += 1
                    elapsed = time.time() - t0
                    if elapsed >= 1.0:
                        self._fps = count / elapsed
                        count, t0 = 0, time.time()
                    if self._q.full():
                        try:
                            self._q.get_nowait()
                        except queue.Empty:
                            pass
                    self._q.put(frame)
            except Exception as err:
                sys.stderr.write(f"[FrameBuffer] {err}\n")
            finally:
                if cap is not None:
                    cap.release()
            if not self._stop.is_set():
                self._set_status("reconnecting")
                time.sleep(retry_delay)
                retry_delay = min(retry_delay * 1.5, self._MAX_RETRY_S)
                self._set_status("connecting")

    def _set_status(self, s: str) -> None:
        with self._lock:
            self._status = s


# =============================================================================
# 4.  VLC RTSP CAPTURE  (libvlc memory-callback rendering)
# =============================================================================
class VLCCapture:
    RENDER_W = 1280
    RENDER_H = 720
    _STATE_MAP = {0:"idle", 1:"opening", 2:"buffering", 3:"streaming",
                  4:"paused", 5:"stopped", 6:"ended", 7:"error"}

    def __init__(self, url: str) -> None:
        if not _VLC_AVAILABLE:
            raise RuntimeError("python-vlc not installed. Run: pip install python-vlc")
        self._url  = url
        self._lock = threading.Lock()
        self._sl   = threading.Lock()
        self._frame: np.ndarray | None = None
        self._status   = "connecting"
        self._fps_val  = 0.0
        self._fps_times: list[float] = []

        self._buf_len = self.RENDER_W * self.RENDER_H * 4
        self._buf     = (ctypes.c_ubyte * self._buf_len)()
        self._buf_ptr = ctypes.cast(self._buf, ctypes.c_void_p).value

        self._inst   = _vlc.Instance(["--no-audio", "--network-caching=400",
                                       "--clock-jitter=0", "--clock-synchro=0",
                                       "--rtsp-tcp", "--no-video-title-show",
                                       "--quiet", "--verbose=0"])
        self._player = self._inst.media_player_new()

        self._cb_lock    = _LockCb(self._on_lock)
        self._cb_unlock  = _UnlockCb(self._on_unlock)
        self._cb_display = _DisplayCb(self._on_display)

        self._player.video_set_callbacks(self._cb_lock, self._cb_unlock, self._cb_display, None)
        self._player.video_set_format("RV32", self.RENDER_W, self.RENDER_H, self.RENDER_W * 4)

        media = self._inst.media_new(url)
        self._player.set_media(media)

    def _on_lock(self, opaque, planes):
        planes[0] = self._buf_ptr
        return None

    def _on_unlock(self, opaque, picture, planes):
        pass

    def _on_display(self, opaque, picture):
        arr = np.frombuffer(self._buf, dtype=np.uint8).copy().reshape(self.RENDER_H, self.RENDER_W, 4)
        bgr = cv2.cvtColor(arr, cv2.COLOR_RGBA2BGR)
        with self._lock:
            self._frame = bgr
        now = time.monotonic()
        self._fps_times.append(now)
        self._fps_times = [t for t in self._fps_times if now - t < 1.0]
        self._fps_val   = float(len(self._fps_times))

    def start(self) -> "VLCCapture":
        self._player.play()
        self._set_status("streaming")
        return self

    def stop(self) -> None:
        self._player.stop()
        self._player.release()
        self._inst.release()

    def read_latest(self) -> tuple[bool, np.ndarray | None]:
        with self._lock:
            if self._frame is None:
                return False, None
            return True, self._frame.copy()

    @property
    def status(self) -> str:
        if _VLC_AVAILABLE and self._player:
            try:
                label = self._STATE_MAP.get(int(self._player.get_state()), "unknown")
                if label in ("streaming", "buffering", "opening"):
                    return label
                if label == "error":
                    return "error"
            except Exception:
                pass
        with self._sl:
            return self._status

    @property
    def fps(self) -> float:
        return self._fps_val

    def _set_status(self, s: str) -> None:
        with self._sl:
            self._status = s


# =============================================================================
# 4b. SOURCE FACTORY
# =============================================================================
def create_source(path: str):
    p = path.strip()
    if _VLC_AVAILABLE and p.startswith(("rtsp://", "rtsps://")):
        return VLCCapture(p).start()
    return FrameBuffer(p).start()


# =============================================================================
# 5.  ASYNC EMOTION WORKER  — HSEmotion EfficientNet-B2 + Valence/Arousal
# =============================================================================
class EmotionWorker:

    def __init__(self) -> None:
        self._lock    = threading.Lock()
        self._results: dict[int, dict] = {}
        self._busy    = False

    @property
    def is_busy(self) -> bool:
        return self._busy

    def submit(self, frame: np.ndarray, person_boxes: list[tuple]) -> None:
        if self._busy or not person_boxes or not ENGINES["hsemotion_available"]:
            return
        self._busy = True
        threading.Thread(
            target=self._work,
            args=(frame.copy(), list(person_boxes)),
            daemon=True,
        ).start()

    def latest(self) -> dict[int, dict]:
        with self._lock:
            return dict(self._results)

    def _work(self, frame: np.ndarray, boxes: list[tuple]) -> None:
        fer     = ENGINES["fer"]
        img_h, img_w = frame.shape[:2]
        out: dict[int, dict] = {}

        for idx, (x1, y1, x2, y2) in enumerate(boxes):
            # Head region = top 45 % of person bounding box
            fy1 = max(0,     y1)
            fy2 = min(img_h, y1 + int((y2 - y1) * 0.45))
            fx1 = max(0,     x1)
            fx2 = min(img_w, x2)
            if (fx2 - fx1) < 30 or (fy2 - fy1) < 30:
                continue
            crop = frame[fy1:fy2, fx1:fx2]
            if crop.size == 0:
                continue

            try:
                # HSEmotion returns (dominant_label_str, probs_array[8])
                hs_label, probs = fer.predict_emotions(crop, logits=False)

                # Build named score dict
                scores: dict[str, float] = dict(zip(HS_LABELS, probs.tolist()))

                # Map to EduSphere emotion label
                es_emotion = HS_TO_ES.get(hs_label, "neutral")

                # ── Valence / Arousal from Russell circumplex ──────────────────
                total_p = max(sum(probs), 1e-6)
                valence = sum(probs[i] * EMOTION_VA[HS_LABELS[i]][0] for i in range(8)) / total_p
                arousal = sum(probs[i] * EMOTION_VA[HS_LABELS[i]][1] for i in range(8)) / total_p

                # ── Classroom behavioural state from VA quadrant ───────────────
                state, s_color = _va_state(valence, arousal)

                # ── Sentiment 0–100 from valence (−1..+1 → 0..100) ────────────
                sentiment_score = int((valence + 1) / 2 * 100)
                sentiment_label = (
                    "Positive" if sentiment_score >= 65 else
                    ("Negative" if sentiment_score < 35 else "Neutral")
                )

                # ── Attention: face area ratio + VA state ──────────────────────
                person_area = max((x2 - x1) * (y2 - y1), 1)
                face_area   = (fx2 - fx1) * (fy2 - fy1)
                attentive   = (
                    face_area / person_area > 0.06
                    and state not in ("Distressed", "Disengaged")
                )

                out[idx] = {
                    "dominant_emotion": es_emotion,
                    "hs_label":         hs_label,
                    "emotion_scores":   scores,
                    "valence":          round(valence, 3),
                    "arousal":          round(arousal, 3),
                    "state":            state,
                    "state_color":      s_color,
                    "attentive":        attentive,
                    "sentiment_score":  sentiment_score,
                    "sentiment_label":  sentiment_label,
                }
            except Exception:
                pass

        with self._lock:
            self._results = out
        self._busy = False


# =============================================================================
# 6.  ASYNC OBJECT WORKER  — YOLO-World (phone, laptop, book, pen)
# =============================================================================
class ObjectWorker:

    def __init__(self) -> None:
        self._lock    = threading.Lock()
        self._results: list[dict] = []
        self._busy    = False

    @property
    def is_busy(self) -> bool:
        return self._busy

    def submit(self, frame: np.ndarray, conf: float = 0.28) -> None:
        if self._busy or not ENGINES["world_available"]:
            return
        self._busy = True
        threading.Thread(
            target=self._work,
            args=(frame.copy(), conf),
            daemon=True,
        ).start()

    def latest(self) -> list[dict]:
        with self._lock:
            return list(self._results)

    def _work(self, frame: np.ndarray, conf: float) -> None:
        detections: list[dict] = []
        try:
            results = ENGINES["world"](frame, conf=conf, verbose=False)
            if results and results[0].boxes is not None:
                for box in results[0].boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    cls_id  = int(box.cls[0])
                    label   = ENGINES["world"].names[cls_id]
                    score   = float(box.conf[0])
                    detections.append({
                        "bbox":  (x1, y1, x2, y2),
                        "label": label,
                        "score": score,
                    })
        except Exception as e:
            sys.stderr.write(f"[ObjectWorker] {e}\n")
        finally:
            with self._lock:
                self._results = detections
            self._busy = False


# =============================================================================
# 7.  ANALYTICS HELPERS
# =============================================================================

def _va_state(valence: float, arousal: float) -> tuple[str, str]:
    """Returns (behavioural_state, hex_color) from VA coordinates."""
    if valence >= 0.25 and arousal >= 0.20:
        state = "Participatory"
    elif valence >= 0.20 and arousal < 0.20:
        state = "Attentive"
    elif valence < -0.15 and arousal >= 0.30:
        state = "Distressed"
    elif valence < -0.15 and arousal < 0.15:
        state = "Disengaged"
    else:
        state = "Neutral"
    return state, VA_STATE_COLOR[state]


def compute_posture_score(kps: np.ndarray, conf: np.ndarray, thresh: float = 0.35) -> int:
    """
    Lean angle from shoulder-to-hip vector vs vertical axis.
    0° lean = 100 (upright/engaged), 30°+ lean = 0 (slumped/leaning back).
    """
    vis = lambda i: bool(conf[i] > thresh)

    if not (vis(_L_SHOULDER) or vis(_R_SHOULDER)):
        return 50
    sh_x = ((kps[_L_SHOULDER][0] + kps[_R_SHOULDER][0]) / 2
            if (vis(_L_SHOULDER) and vis(_R_SHOULDER))
            else kps[_L_SHOULDER if vis(_L_SHOULDER) else _R_SHOULDER][0])
    sh_y = ((kps[_L_SHOULDER][1] + kps[_R_SHOULDER][1]) / 2
            if (vis(_L_SHOULDER) and vis(_R_SHOULDER))
            else kps[_L_SHOULDER if vis(_L_SHOULDER) else _R_SHOULDER][1])

    if not (vis(_L_HIP) or vis(_R_HIP)):
        return 50
    hp_x = ((kps[_L_HIP][0] + kps[_R_HIP][0]) / 2
            if (vis(_L_HIP) and vis(_R_HIP))
            else kps[_L_HIP if vis(_L_HIP) else _R_HIP][0])
    hp_y = ((kps[_L_HIP][1] + kps[_R_HIP][1]) / 2
            if (vis(_L_HIP) and vis(_R_HIP))
            else kps[_L_HIP if vis(_L_HIP) else _R_HIP][1])

    dy = sh_y - hp_y
    dx = sh_x - hp_x
    if abs(dy) < 5:
        return 50
    lean_deg = abs(math.degrees(math.atan2(dx, abs(dy))))
    return max(0, min(100, int(100 - lean_deg * 2.8)))


def associate_objects(person_boxes: list[tuple], objects: list[dict]) -> dict[int, list[str]]:
    """Maps each detected object to the nearest person by bounding box proximity."""
    result: dict[int, list[str]] = defaultdict(list)
    for obj in objects:
        ox1, oy1, ox2, oy2 = obj["bbox"]
        ocx = (ox1 + ox2) / 2
        ocy = (oy1 + oy2) / 2
        best_i, best_d = -1, float("inf")
        for i, (px1, py1, px2, py2) in enumerate(person_boxes):
            # Prefer objects whose centre is inside the person box
            if px1 <= ocx <= px2 and py1 <= ocy <= py2:
                best_i = i
                break
            pcx = (px1 + px2) / 2
            pcy = (py1 + py2) / 2
            d = ((ocx - pcx) ** 2 + (ocy - pcy) ** 2) ** 0.5
            if d < best_d:
                best_d, best_i = d, i
        if best_i >= 0 and (best_d < 220 or best_i >= 0):
            result[best_i].append(obj["label"])
    return result


def _mog2_score(sub, frame: np.ndarray) -> tuple[int, np.ndarray]:
    fg     = sub.apply(frame)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fg     = cv2.morphologyEx(fg, cv2.MORPH_OPEN, kernel)
    score  = min(100, int(cv2.countNonZero(fg) / max(fg.shape[0] * fg.shape[1], 1) * 600))
    return score, fg


def compute_engagement(persons: list[dict], attention_rate: int) -> int:
    """
    Multi-signal engagement:
      attention    30 %  (face detected + attentive heuristic)
      VA valence   35 %  (HSEmotion continuous valence → 0-100)
      gesture      20 %  (positive gesture rate)
      posture      15 %  (lean angle score)
    """
    if not persons:
        return max(0, min(100, int(attention_rate * 0.30)))

    va_scores = [(p.get("valence", 0) + 1) / 2 * 100 for p in persons]
    avg_va    = sum(va_scores) / len(va_scores)

    pos_gestures = {"raised_hand", "looking_forward", "writing"}
    gesture_rate = sum(1 for p in persons if p.get("gesture") in pos_gestures) / len(persons) * 100

    postures     = [p.get("posture_score", 50) for p in persons]
    avg_posture  = sum(postures) / len(postures)

    score = (
        attention_rate * 0.30 +
        avg_va         * 0.35 +
        gesture_rate   * 0.20 +
        avg_posture    * 0.15
    )
    return max(0, min(100, int(score)))


def compute_va_sentiment(persons: list[dict]) -> tuple[int, str, float, float]:
    """
    Returns (sentiment_score 0-100, label, avg_valence, avg_arousal).
    Blends VA valence (60 %) + gestural valence (40 %).
    """
    scores: list[float] = []
    valences: list[float] = []
    arousals: list[float] = []

    for p in persons:
        facial_v   = p.get("valence", 0.0)
        gest_v     = GESTURE_VALENCE.get(p.get("gesture", "unknown"), 0.0)
        blended_v  = facial_v * 0.60 + gest_v * 0.40
        scores.append((blended_v + 1) / 2 * 100)
        valences.append(facial_v)
        arousals.append(p.get("arousal", 0.0))

    if not scores:
        return 50, "Neutral", 0.0, 0.0

    avg_score   = int(sum(scores) / len(scores))
    avg_valence = sum(valences) / len(valences)
    avg_arousal = sum(arousals) / len(arousals)
    label = "Positive" if avg_score >= 65 else ("Negative" if avg_score < 35 else "Neutral")
    return avg_score, label, round(avg_valence, 3), round(avg_arousal, 3)


def pedagogical_insight(state: str, attention: int, motion: int, distractors: int) -> str:
    if distractors >= 3:
        return f"{distractors} devices detected. Consider a 'devices down' prompt before continuing."
    if state == "Participatory" and attention >= 70:
        return "Class is highly engaged and participatory. Good time for debate or group problem-solving."
    if state == "Attentive":
        return "Students are calm and focused. Ideal for direct instruction or independent work."
    if state == "Distressed":
        return "Frustration or anxiety signals detected. Pause, check comprehension, reduce complexity."
    if state == "Disengaged":
        return "Students appear disengaged. A quick energiser, cold-call, or topic switch is recommended."
    if motion > 65:
        return "High physical activity. Channel it with a structured collaborative task."
    if attention < 40:
        return "Attention is low. A short quiz, poll, or direct question can reset focus quickly."
    return "Session progressing normally. Monitor for shifts in VA state or gesture patterns."


def query_color_palette(r: float, g: float, b: float) -> str:
    palette = {
        "Red": (213, 0, 0), "Green": (0, 200, 83), "Blue": (41, 121, 255),
        "White": (245, 245, 245), "Black": (33, 33, 33), "Gray": (117, 117, 117),
        "Yellow": (255, 214, 0), "Silver": (189, 189, 189),
    }
    best, dist = "Unknown", float("inf")
    for name, val in palette.items():
        d = (r - val[0]) ** 2 + (g - val[1]) ** 2 + (b - val[2]) ** 2
        if d < dist:
            dist, best = d, name
    return best


# =============================================================================
# 8.  GESTURE CLASSIFIER  (YOLOv11-pose COCO keypoints)
# =============================================================================
def classify_gesture(kps: np.ndarray, conf: np.ndarray, thresh: float = 0.35) -> str:
    vis = lambda i: bool(conf[i] > thresh)
    py  = lambda i: float(kps[i][1])
    px  = lambda i: float(kps[i][0])

    if vis(_L_SHOULDER) and vis(_R_SHOULDER):
        sh_y = (py(_L_SHOULDER) + py(_R_SHOULDER)) / 2
    elif vis(_L_SHOULDER):
        sh_y = py(_L_SHOULDER)
    elif vis(_R_SHOULDER):
        sh_y = py(_R_SHOULDER)
    else:
        return "unknown"

    hip_y  = ((py(_L_HIP) + py(_R_HIP)) / 2
              if (vis(_L_HIP) and vis(_R_HIP)) else sh_y + 120)
    body_h = max(hip_y - sh_y, 40)

    wrist_ys = [py(i) for i in (_L_WRIST, _R_WRIST) if vis(i)]
    wrist_xs = [px(i) for i in (_L_WRIST, _R_WRIST) if vis(i)]

    if wrist_ys and min(wrist_ys) < sh_y - body_h * 0.30:
        return "raised_hand"

    if vis(_NOSE) and py(_NOSE) > sh_y + body_h * 0.18:
        return "head_down"

    if wrist_ys:
        desk_top = sh_y + body_h * 0.55
        desk_bot = hip_y + body_h * 0.45
        at_desk  = [wy for wy in wrist_ys if desk_top < wy < desk_bot]
        if at_desk:
            if len(wrist_ys) == 2 and all(desk_top < wy < desk_bot for wy in wrist_ys):
                return "writing"
            if wrist_xs:
                cx = ((px(_L_SHOULDER) + px(_R_SHOULDER)) / 2
                      if (vis(_L_SHOULDER) and vis(_R_SHOULDER)) else wrist_xs[0])
                if abs(wrist_xs[0] - cx) < body_h * 0.4:
                    return "phone"

    return "looking_forward"


# =============================================================================
# 9.  HTML PANEL HELPERS
# =============================================================================
def _bar_rows(items: dict[str, tuple[int, str, str]], total: int) -> str:
    if not total:
        return "<p style='color:#475569;font-size:11px'>No data yet</p>"
    out = ""
    for label, (count, color, icon) in items.items():
        pct = min(100, round(count / max(total, 1) * 100))
        out += f"""
        <div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;
                      font-size:10px;color:#94a3b8;margin-bottom:3px">
            <span>{icon} <span style="text-transform:uppercase;letter-spacing:.07em">{label}</span></span>
            <span style="font-weight:700;color:{color}">{pct}%</span>
          </div>
          <div style="height:5px;background:#1e293b;border-radius:99px;overflow:hidden">
            <div style="height:5px;width:{pct}%;background:{color};border-radius:99px"></div>
          </div>
        </div>"""
    return out


def emotion_bars_html(counts: dict[str, int], total: int) -> str:
    return _bar_rows({e: (counts.get(e, 0), EMOTION_HEX[e], "·") for e in EMOTION_ORDER}, total)


def gesture_bars_html(counts: dict[str, int], total: int) -> str:
    order = ["raised_hand", "looking_forward", "writing", "phone", "head_down", "unknown"]
    return _bar_rows({g: (counts.get(g, 0), GESTURE_HEX[g], GESTURE_ICON[g]) for g in order}, total)


def va_panel_html(valence: float, arousal: float, state: str, color: str) -> str:
    v_pct = int((valence + 1) / 2 * 100)
    a_pct = int((arousal + 1) / 2 * 100)
    return f"""
    <div style="padding:8px 0">
      <div style="text-align:center;margin-bottom:10px">
        <div style="font-size:11px;color:#64748b;text-transform:uppercase;
                    letter-spacing:.1em;margin-bottom:5px">Classroom State</div>
        <span style="padding:4px 18px;border-radius:99px;background:{color}22;
                     border:1px solid {color}55;color:{color};font-size:12px;
                     font-weight:800;letter-spacing:.08em">{state.upper()}</span>
      </div>
      <div style="font-size:9px;color:#64748b;margin-bottom:3px">
        VALENCE &nbsp;<span style="color:{color};font-weight:700">{valence:+.2f}</span>
        &nbsp;(negative ← → positive)
      </div>
      <div style="height:6px;background:#1e293b;border-radius:99px;margin-bottom:9px">
        <div style="height:6px;width:{v_pct}%;background:{color};border-radius:99px"></div>
      </div>
      <div style="font-size:9px;color:#64748b;margin-bottom:3px">
        AROUSAL &nbsp;<span style="color:#8b5cf6;font-weight:700">{arousal:+.2f}</span>
        &nbsp;(calm ← → excited)
      </div>
      <div style="height:6px;background:#1e293b;border-radius:99px">
        <div style="height:6px;width:{a_pct}%;background:#8b5cf6;border-radius:99px"></div>
      </div>
    </div>"""


def gauge_html(value: int, label: str, color: str) -> str:
    return f"""
    <div style="text-align:center;padding:12px 0">
      <div style="font-size:34px;font-weight:800;color:{color};line-height:1">{value}%</div>
      <div style="font-size:10px;color:#64748b;text-transform:uppercase;
                  letter-spacing:.1em;margin-top:5px">{label}</div>
    </div>"""


def student_chips_html(persons: list[dict]) -> str:
    html = ""
    for i, p in enumerate(persons[:10]):
        emo   = p.get("emotion") or "—"
        state = p.get("state", "")
        gest  = p.get("gesture", "?")
        att   = p.get("attentive")
        ec    = EMOTION_HEX.get(emo, "#475569")
        sc    = VA_STATE_COLOR.get(state, "#475569")
        gi    = GESTURE_ICON.get(gest, "·")
        mark  = "✓" if att else ("✗" if att is False else "·")
        objs  = " ".join(["📱" if "phone" in o else "💻" if "laptop" in o
                          else "📖" if "book" in o else "🖊" if "pen" in o else ""
                          for o in p.get("objects", [])])
        html += f"""
        <div style="display:inline-flex;align-items:center;gap:5px;
                    margin:2px 3px;padding:4px 10px;border-radius:99px;
                    background:{ec}18;border:1px solid {ec}44;font-size:10px;color:{ec}">
          <span>{mark}</span><span>S{i+1}</span>
          <span style="opacity:.8">{emo.upper()}</span>
          <span>{gi}</span>
          {f'<span style="color:{sc};font-size:9px">{state[:4].upper()}</span>' if state else ''}
          {f'<span>{objs}</span>' if objs else ''}
        </div>"""
    return html or "<span style='color:#475569;font-size:11px'>No students in view</span>"


def objects_html(objects: list[dict]) -> str:
    if not objects:
        return "<p style='color:#475569;font-size:11px'>No objects detected</p>"
    html = ""
    for o in objects[:8]:
        lbl   = o["label"]
        score = int(o["score"] * 100)
        is_dist = lbl in OBJECT_DISTRACTION
        color   = "#ef4444" if is_dist else "#10b981"
        icon    = "📱" if "phone" in lbl else "💻" if "laptop" in lbl else "📖" if "book" in lbl else "🖊"
        tag     = "⚠ DISTRACTION" if is_dist else "✓ ENGAGEMENT"
        html += f"""
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;
                    padding:5px 8px;background:{color}12;border-radius:8px;
                    border:1px solid {color}33">
          <span style="font-size:14px">{icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;color:{color};font-weight:700">{lbl.upper()}</div>
            <div style="font-size:9px;color:#64748b">{tag} · {score}%</div>
          </div>
        </div>"""
    return html


# =============================================================================
# 10. STREAMLIT LAYOUT
# =============================================================================
st.title("🎓 RYDEGATE CLASSROOM INTELLIGENCE  v3")

with st.sidebar:
    st.header("Source Settings")

    # Engine status
    st.caption("**Neural Cores**")
    c1, c2 = st.columns(2)
    c1.metric("Pose",    "YOLOv11n ✓" if ENGINES["pose_available"] else "✗ Missing")
    c2.metric("Emotion", "HSEmotion ✓" if ENGINES["hsemotion_available"] else "✗ Missing")
    c3, c4 = st.columns(2)
    c3.metric("World",   "YOLO-W ✓" if ENGINES["world_available"] else "✗ Missing")
    c4.metric("VLC",     "VLC ✓" if ENGINES["vlc_available"] else "OpenCV")

    if not ENGINES["pose_available"]:
        st.error("Install: `pip install ultralytics`")
    if not ENGINES["hsemotion_available"]:
        st.warning("Install: `pip install hsemotion-onnx`")
    if not ENGINES["world_available"]:
        st.info("YOLO-World optional. Install: `pip install ultralytics`")

    st.markdown("---")
    src_type = st.radio("Video Input", ["RTSP / YouTube URL", "Upload Local File"])

    final_src: str | None = None
    if src_type == "RTSP / YouTube URL":
        final_src = st.text_input("Stream URL",
            value="rtsp://onwvRqXwqFHqGgIe2UfZLoMgIMkLxbxG:410ZagI9gDKFiDo9cuUH8@test.rtsp.stream/traffic")
    else:
        up = st.file_uploader("Video file", type=["mp4", "avi", "mov", "mkv"])
        if up:
            tmp = os.path.join(".", f"_tmp_{up.name}")
            with open(tmp, "wb") as f:
                f.write(up.read())
            final_src = tmp
            st.success("File buffered.")

    st.markdown("---")
    st.subheader("Detection Settings")
    conf_thresh     = st.slider("YOLO Confidence",         0.10, 1.0,  0.40, 0.05)
    emotion_every   = st.slider("Emotion Every N Frames",  10,   90,   30,   5)
    objects_every   = st.slider("Object Scan Every N Frames", 10, 60,  20,   5)
    highlight_inatt = st.checkbox("Dim Inattentive Students")

    st.markdown("---")
    st.subheader("Live Analytics")
    sb_emotion  = st.empty()
    sb_gesture  = st.empty()
    sb_va       = st.empty()
    sb_objects  = st.empty()
    sb_insight  = st.empty()
    sb_totals   = st.empty()

    st.markdown("---")
    start_engine = st.checkbox("▶ ENGAGE STREAM ENGINE")

# ── Main area ──────────────────────────────────────────────────────────────────
status_bar = st.empty()

mc = st.columns(7)
m_students   = mc[0].empty()
m_fps        = mc[1].empty()
m_engagement = mc[2].empty()
m_attention  = mc[3].empty()
m_sentiment  = mc[4].empty()
m_motion     = mc[5].empty()
m_state      = mc[6].empty()

viewport = st.empty()

st.markdown("---")
bc = st.columns(4)
b_engagement = bc[0].empty()
b_attention  = bc[1].empty()
b_va         = bc[2].empty()
b_students   = bc[3].empty()

# Objects row
st.markdown("**Detected Objects**")
b_objects = st.empty()

# =============================================================================
# 11. MAIN EXECUTION LOOP
# =============================================================================
if start_engine and final_src:
    buf     = create_source(final_src)
    emo_wrk = EmotionWorker()
    obj_wrk = ObjectWorker()
    mog2    = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=25, detectShadows=False)

    frame_count      = 0
    tracking: list[dict]      = []
    person_boxes: list[tuple] = []
    latest_emotions: dict     = {}
    latest_objects: list[dict]= []

    emo_session: dict[str, int]  = defaultdict(int)
    gest_session: dict[str, int] = defaultdict(int)
    total_emo_reads = 0
    total_gest_reads = 0

    while start_engine:
        # ── Stream status check ────────────────────────────────────────────────
        bstatus = buf.status
        if bstatus not in ("streaming", "buffering"):
            status_bar.warning(
                f"Stream {bstatus}… FPS: {buf.fps:.1f}  —  "
                + ("VLC connecting via RTSP-TCP…" if isinstance(buf, VLCCapture)
                   else "Waiting for feed…")
            )
            time.sleep(0.05)
            continue
        else:
            status_bar.empty()

        ret, frame = buf.read_latest()
        if not ret or frame is None:
            time.sleep(0.03)
            continue

        tick  = time.time()
        frame_count += 1
        img_h, img_w = frame.shape[:2]

        # ── YOLOv11-pose inference (every 3rd frame) ──────────────────────────
        if frame_count % 3 == 0 and ENGINES["pose_available"]:
            tracking     = []
            person_boxes = []

            results = ENGINES["pose"].predict(source=frame, conf=conf_thresh, verbose=False)

            if results and results[0].boxes is not None:
                boxes_t  = results[0].boxes
                has_kps  = (hasattr(results[0], "keypoints")
                            and results[0].keypoints is not None
                            and results[0].keypoints.xy is not None)
                kps_xy   = results[0].keypoints.xy.cpu().numpy()   if has_kps else None
                kps_conf = results[0].keypoints.conf.cpu().numpy() if has_kps else None

                for di, box in enumerate(boxes_t):
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    score    = float(box.conf[0])
                    cls_id   = int(box.cls[0])
                    cls_lbl  = ENGINES["pose"].names[cls_id]

                    # Dominant surface colour
                    crop      = frame[max(0,y1):min(img_h,y2), max(0,x1):min(img_w,x2)]
                    color_name = "N/A"
                    if crop.size > 0:
                        b_a, g_a, r_a = cv2.mean(crop)[:3]
                        color_name = query_color_palette(r_a, g_a, b_a)

                    # Gesture + posture from keypoints
                    gesture       = "unknown"
                    posture_score = 50
                    if has_kps and di < len(kps_xy) and kps_xy[di].shape[0] == 17:
                        gesture       = classify_gesture(kps_xy[di], kps_conf[di])
                        posture_score = compute_posture_score(kps_xy[di], kps_conf[di])

                    obj: dict = {
                        "bbox":          (x1, y1, x2, y2),
                        "label":         f"{cls_lbl.upper()} ({color_name})",
                        "score":         score,
                        "cls_id":        cls_id,
                        "gesture":       gesture,
                        "posture_score": posture_score,
                        "emotion":       None,
                        "state":         None,
                        "state_color":   "#64748b",
                        "valence":       0.0,
                        "arousal":       0.0,
                        "attentive":     None,
                        "sentiment_score": 50,
                        "sentiment_label": "Neutral",
                        "objects":       [],
                    }
                    tracking.append(obj)

                    if cls_id == 0:
                        person_boxes.append((x1, y1, x2, y2))
                        gest_session[gesture] += 1
                        total_gest_reads += 1

        # ── Submit async workers (non-blocking) ───────────────────────────────
        if frame_count % emotion_every == 0 and person_boxes:
            emo_wrk.submit(frame, person_boxes)

        if frame_count % objects_every == 0:
            obj_wrk.submit(frame)

        # ── Pull latest results ───────────────────────────────────────────────
        latest_emotions = emo_wrk.latest()
        latest_objects  = obj_wrk.latest()

        # Associate objects → persons
        obj_assoc = associate_objects(person_boxes, latest_objects)

        # ── Merge all signals into tracking entries ───────────────────────────
        person_idx = 0
        for obj in tracking:
            if obj["cls_id"] == 0:
                em = latest_emotions.get(person_idx)
                if em:
                    obj["emotion"]         = em["dominant_emotion"]
                    obj["state"]           = em["state"]
                    obj["state_color"]     = em["state_color"]
                    obj["valence"]         = em["valence"]
                    obj["arousal"]         = em["arousal"]
                    obj["attentive"]       = em["attentive"]
                    obj["sentiment_score"] = em["sentiment_score"]
                    obj["sentiment_label"] = em["sentiment_label"]
                    emo_session[em["dominant_emotion"]] += 1
                    total_emo_reads += 1
                obj["objects"] = obj_assoc.get(person_idx, [])
                person_idx += 1

        # ── Motion (MOG2) ─────────────────────────────────────────────────────
        motion_score, fg_mask = _mog2_score(mog2, frame)

        # ── Classroom-level metrics ───────────────────────────────────────────
        persons = [o for o in tracking if o["cls_id"] == 0]
        attentive_n  = sum(1 for p in persons if p.get("attentive") is True)
        attention_rt = int(attentive_n / len(persons) * 100) if persons else 0
        engagement   = compute_engagement(persons, attention_rt)
        sent_score, sent_label, avg_valence, avg_arousal = compute_va_sentiment(persons)
        classroom_state, cs_color = _va_state(avg_valence, avg_arousal)

        dom_emotion = "—"
        if persons:
            ec_f: dict[str, int] = defaultdict(int)
            for p in persons:
                if p.get("emotion"):
                    ec_f[p["emotion"]] += 1
            if ec_f:
                dom_emotion = max(ec_f, key=ec_f.get)

        distractors = sum(1 for o in latest_objects if o["label"] in OBJECT_DISTRACTION)
        fps_val     = 1.0 / max(time.time() - tick, 0.001)

        # ── Frame annotations ─────────────────────────────────────────────────
        # Motion heatmap
        if motion_score > 15:
            mv = np.zeros_like(frame)
            mv[:, :, 2] = fg_mask
            frame = cv2.addWeighted(frame, 1.0, mv, 0.12, 0)

        # Person + object bounding boxes
        for obj in tracking:
            x1, y1, x2, y2 = obj["bbox"]
            emo_key  = obj.get("emotion") or "neutral"
            box_bgr  = EMOTION_BGR.get(emo_key, (0, 220, 80))

            if highlight_inatt and obj["cls_id"] == 0 and obj.get("attentive") is False:
                box_bgr = (70, 70, 70)

            cv2.rectangle(frame, (x1, y1), (x2, y2), box_bgr, 2)
            cv2.putText(frame, obj["label"], (x1, y1 - 22),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.37, box_bgr, 1, cv2.LINE_AA)

            if obj["cls_id"] == 0:
                state_lbl = obj.get("state") or ""
                gest_icon = GESTURE_ICON.get(obj.get("gesture", "unknown"), "·")
                att_tag   = "✓" if obj.get("attentive") else ("✗" if obj.get("attentive") is False else "·")
                line2     = f"{emo_key.upper()}  {gest_icon}  {att_tag}  {state_lbl[:3].upper()}"
                cv2.putText(frame, line2, (x1, y1 - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.36, box_bgr, 1, cv2.LINE_AA)

                # Attention dot
                if obj.get("attentive") is not None:
                    dot_c = (16, 185, 129) if obj["attentive"] else (68, 68, 239)
                    cv2.circle(frame, (x2 - 8, y1 + 8), 5, dot_c, -1)

                # Posture bar (right edge of box)
                ps  = obj.get("posture_score", 50)
                bar_h = max(1, int((y2 - y1) * ps / 100))
                cv2.rectangle(frame, (x2 + 2, y2 - bar_h), (x2 + 6, y2),
                              (16, 185, 129) if ps > 65 else (246, 130, 59), -1)

                # VA sentiment badge
                sc = obj.get("sentiment_score", 50)
                sc_c = ((16,185,129) if sc>=65 else ((68,68,239) if sc<35 else (246,130,59)))
                cv2.rectangle(frame, (x2-38, y2-16), (x2, y2), sc_c, -1)
                cv2.putText(frame, f"V{obj.get('valence',0):+.1f}", (x2-36, y2-4),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.30, (255,255,255), 1, cv2.LINE_AA)

        # Draw detected objects (YOLO-World)
        for det in latest_objects:
            ox1, oy1, ox2, oy2 = det["bbox"]
            ob_bgr = OBJECT_BGR.get(det["label"], (200, 200, 200))
            cv2.rectangle(frame, (ox1, oy1), (ox2, oy2), ob_bgr, 1)
            cv2.putText(frame, det["label"].upper(), (ox1, oy1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.32, ob_bgr, 1, cv2.LINE_AA)

        # ── Update UI ──────────────────────────────────────────────────────────
        e_col  = "#10b981" if engagement   > 79 else ("#f59e0b" if engagement   > 49 else "#ef4444")
        a_col  = "#10b981" if attention_rt > 79 else ("#f59e0b" if attention_rt > 49 else "#ef4444")
        s_col  = "#10b981" if sent_label == "Positive" else ("#ef4444" if sent_label == "Negative" else "#3b82f6")

        m_students.metric("Students",       len(persons))
        m_fps.metric("FPS",                 f"{fps_val:.1f}")
        m_engagement.metric("Engagement",   f"{engagement}%")
        m_attention.metric("Attention",     f"{attention_rt}%")
        m_sentiment.metric("Sentiment",     f"{sent_score}%  {sent_label}")
        m_motion.metric("Motion",           f"{motion_score}%")
        m_state.metric("Class State",       classroom_state)

        viewport.image(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB),
                       channels="RGB", use_container_width=True)

        b_engagement.markdown(gauge_html(engagement,   "Engagement",    e_col), unsafe_allow_html=True)
        b_attention.markdown( gauge_html(attention_rt, "Attention Rate", a_col), unsafe_allow_html=True)
        b_va.markdown(        va_panel_html(avg_valence, avg_arousal, classroom_state, cs_color), unsafe_allow_html=True)
        b_students.markdown(  student_chips_html(persons),                                        unsafe_allow_html=True)
        b_objects.markdown(   objects_html(latest_objects),                                       unsafe_allow_html=True)

        sb_emotion.markdown( emotion_bars_html(emo_session, total_emo_reads),   unsafe_allow_html=True)
        sb_gesture.markdown( gesture_bars_html(gest_session, total_gest_reads), unsafe_allow_html=True)
        sb_va.markdown(      va_panel_html(avg_valence, avg_arousal, classroom_state, cs_color), unsafe_allow_html=True)
        sb_objects.markdown( objects_html(latest_objects[:4]),                  unsafe_allow_html=True)

        insight = pedagogical_insight(classroom_state, attention_rt, motion_score, distractors)
        sb_insight.markdown(
            f"""<div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:10px;
                            padding:10px 12px;margin:6px 0">
              <div style="font-size:9px;color:#3b82f6;text-transform:uppercase;
                          letter-spacing:.08em;margin-bottom:5px">💡 INSIGHT</div>
              <div style="font-size:11px;color:#94a3b8;line-height:1.6">{insight}</div>
            </div>""", unsafe_allow_html=True)

        sb_totals.markdown(
            f"""<div style="font-size:10px;color:#64748b;line-height:2">
              Frames: <b style="color:#94a3b8">{frame_count}</b> &nbsp;|&nbsp;
              Emo reads: <b style="color:#94a3b8">{total_emo_reads}</b><br>
              Gestures: <b style="color:#94a3b8">{total_gest_reads}</b> &nbsp;|&nbsp;
              Objects: <b style="color:#94a3b8">{len(latest_objects)}</b><br>
              Workers: <b style="color:#94a3b8">
                {'⚡E' if emo_wrk.is_busy else '✓E'}
                {'⚡O' if obj_wrk.is_busy else '✓O'}
              </b>
            </div>""", unsafe_allow_html=True)

    # ── Teardown ───────────────────────────────────────────────────────────────
    buf.stop()
    if (src_type == "Upload Local File" and final_src and os.path.isfile(final_src)):
        try:
            os.remove(final_src)
        except OSError:
            pass

elif start_engine and not final_src:
    st.sidebar.error("Please provide a video source before engaging.")
else:
    viewport.info(
        "Idle — configure a source in the sidebar then toggle ▶ ENGAGE STREAM ENGINE."
    )
