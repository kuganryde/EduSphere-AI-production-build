"""
RydeGate Classroom Intelligence Platform
Full rebuild:
  - Non-blocking RTSP/YouTube/file capture via queue-based FrameBuffer
  - YOLOv8-pose for skeleton keypoints → real gesture classification
  - Async DeepFace emotion worker (never blocks the display loop)
  - MOG2 background subtraction for accurate per-zone motion scoring
  - Blended sentiment (facial emotion × 0.60 + gestural signal × 0.40)
  - Per-student behavioral state overlay + live classroom summary panels
"""

from __future__ import annotations

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

# ── Page config MUST be first Streamlit call ──────────────────────────────────
st.set_page_config(
    page_title="RydeGate Classroom Intelligence",
    layout="wide",
    initial_sidebar_state="expanded",
)

# =============================================================================
# 1.  ENGINE BOOTSTRAP  (cached — loaded once per Streamlit server process)
# =============================================================================
@st.cache_resource(show_spinner="Loading neural cores…")
def _boot_engines() -> dict:
    eng = {
        "pose":             None,
        "pose_available":   False,
        "deepface_available": False,
    }
    try:
        from ultralytics import YOLO
        # yolov8n-pose gives per-person bounding boxes + 17 COCO skeleton keypoints
        eng["pose"] = YOLO("yolov8n-pose.pt")
        eng["pose_available"] = True
    except Exception as e:
        sys.stderr.write(f"[engine] YOLO pose load failed: {e}\n")

    try:
        from deepface import DeepFace as _df  # noqa: F401
        eng["deepface_available"] = True
    except Exception:
        pass

    return eng

ENGINES = _boot_engines()

# =============================================================================
# 2.  COLOUR CONSTANTS
# =============================================================================
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
EMOTION_ORDER   = ["happy", "neutral", "surprise", "sad", "angry", "fear", "disgust"]
POSITIVE_EMOTIONS = {"happy", "surprise", "neutral"}

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
# Gestural sentiment weight: -1 (strongly negative) … +1 (strongly positive)
GESTURE_VALENCE: dict[str, float] = {
    "raised_hand":      1.00,
    "looking_forward":  0.70,
    "writing":          0.80,
    "phone":           -0.60,
    "head_down":       -0.70,
    "unknown":          0.00,
}

# YOLOv8-pose COCO keypoint indices
_NOSE             = 0
_L_SHOULDER, _R_SHOULDER = 5, 6
_L_ELBOW,    _R_ELBOW    = 7, 8
_L_WRIST,    _R_WRIST    = 9, 10
_L_HIP,      _R_HIP      = 11, 12

# =============================================================================
# 3.  NON-BLOCKING FRAME BUFFER
#     Resolves the source URL in the background thread so Streamlit's main
#     thread never blocks on cv2.VideoCapture() or yt_dlp DNS/network calls.
# =============================================================================
class FrameBuffer:
    """
    Queue-backed, auto-reconnecting video reader.
    Always returns the newest available frame; never waits for one.
    """

    _STALE_LIMIT = 40       # consecutive failed grab() calls before reconnect
    _MAX_RETRY_S = 10.0     # cap on exponential backoff delay

    def __init__(self, source_path: str) -> None:
        self._src     = str(source_path).strip()
        self._q: queue.Queue[np.ndarray] = queue.Queue(maxsize=2)
        self._stop    = threading.Event()
        self._status  = "connecting"
        self._lock    = threading.Lock()
        self._fps     = 0.0
        self._thread  = threading.Thread(target=self._run, daemon=True, name="FrameBuffer")

    # ── Public API ─────────────────────────────────────────────────────────────
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
        """Non-blocking: returns (True, frame) or (False, None)."""
        try:
            return True, self._q.get_nowait()
        except queue.Empty:
            return False, None

    # ── URL resolver (runs inside background thread) ───────────────────────────
    def _resolve(self, path: str) -> tuple[str | int, bool]:
        """Returns (cap_arg, is_live)."""
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

    # ── Background reader loop ─────────────────────────────────────────────────
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

                t0    = time.time()
                count = 0
                stale = 0

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
                        count     = 0
                        t0        = time.time()

                    # Always keep newest frame; drop oldest if queue full
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
# 4.  ASYNC EMOTION WORKER
#     Runs DeepFace on head-crops in a daemon thread; the main loop picks up
#     results whenever they're ready — zero blocking.
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
        """Fire-and-forget. Silently skipped if a job is already running."""
        if self._busy or not person_boxes or not ENGINES["deepface_available"]:
            return
        self._busy = True
        t = threading.Thread(
            target=self._work,
            args=(frame.copy(), list(person_boxes)),
            daemon=True,
        )
        t.start()

    def latest(self) -> dict[int, dict]:
        with self._lock:
            return dict(self._results)

    def _work(self, frame: np.ndarray, boxes: list[tuple]) -> None:
        from deepface import DeepFace
        img_h, img_w = frame.shape[:2]
        out: dict[int, dict] = {}

        for idx, (x1, y1, x2, y2) in enumerate(boxes):
            # Head region = top 45 % of the person bounding box
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
                res = DeepFace.analyze(
                    crop,
                    actions=["emotion"],
                    enforce_detection=False,
                    detector_backend="opencv",
                    silent=True,
                )
                r = res[0] if isinstance(res, list) else res
                dominant = r.get("dominant_emotion", "neutral")
                scores   = r.get("emotion", {})

                # Attention: face-area ratio heuristic
                person_area = max((x2 - x1) * (y2 - y1), 1)
                face_area   = (fx2 - fx1) * (fy2 - fy1)
                attentive   = (
                    face_area / person_area > 0.06
                    and dominant not in ("angry", "disgust", "fear")
                )

                # Per-student sentiment score 0–100
                pos = scores.get("happy", 0) + scores.get("surprise", 0)
                neg = (scores.get("angry", 0) + scores.get("disgust", 0)
                       + scores.get("fear", 0) + scores.get("sad", 0))
                neu = scores.get("neutral", 0)
                total = max(pos + neg + neu, 1)
                sentiment_score = int((pos * 100 + neu * 50) / total)

                out[idx] = {
                    "dominant_emotion": dominant,
                    "emotion_scores":   scores,
                    "attentive":        attentive,
                    "sentiment_score":  sentiment_score,
                    "sentiment_label": (
                        "Positive" if sentiment_score >= 65 else
                        ("Negative" if sentiment_score < 35 else "Neutral")
                    ),
                }
            except Exception:
                pass

        with self._lock:
            self._results = out
        self._busy = False


# =============================================================================
# 5.  GESTURE CLASSIFIER  (YOLOv8-pose keypoints)
# =============================================================================
def classify_gesture(
    kps: np.ndarray,      # (17, 2)  x,y in image pixels
    conf: np.ndarray,     # (17,)    per-keypoint confidence
    thresh: float = 0.35,
) -> str:
    def vis(i: int) -> bool:
        return bool(conf[i] > thresh)

    def py(i: int) -> float:
        return float(kps[i][1])

    def px(i: int) -> float:
        return float(kps[i][0])

    # Derive reference heights
    if vis(_L_SHOULDER) and vis(_R_SHOULDER):
        sh_y = (py(_L_SHOULDER) + py(_R_SHOULDER)) / 2
    elif vis(_L_SHOULDER):
        sh_y = py(_L_SHOULDER)
    elif vis(_R_SHOULDER):
        sh_y = py(_R_SHOULDER)
    else:
        return "unknown"

    hip_y = (
        (py(_L_HIP) + py(_R_HIP)) / 2
        if (vis(_L_HIP) and vis(_R_HIP))
        else sh_y + 120
    )
    body_h = max(hip_y - sh_y, 40)

    # Gather visible wrist positions
    wrist_ys = [py(i) for i in (_L_WRIST, _R_WRIST) if vis(i)]
    wrist_xs = [px(i) for i in (_L_WRIST, _R_WRIST) if vis(i)]

    # ── Rule 1: Raised hand ────────────────────────────────────────────────────
    if wrist_ys and min(wrist_ys) < sh_y - body_h * 0.30:
        return "raised_hand"

    # ── Rule 2: Head down ──────────────────────────────────────────────────────
    if vis(_NOSE) and py(_NOSE) > sh_y + body_h * 0.18:
        return "head_down"

    # ── Rule 3: Writing / phone ────────────────────────────────────────────────
    if wrist_ys:
        desk_top = sh_y + body_h * 0.55
        desk_bot = hip_y + body_h * 0.45
        at_desk  = [wy for wy in wrist_ys if desk_top < wy < desk_bot]
        if at_desk:
            # Both hands visible at desk → writing
            if len(wrist_ys) == 2 and all(desk_top < wy < desk_bot for wy in wrist_ys):
                return "writing"
            # Single wrist near centre → phone use
            if wrist_xs:
                # Check proximity to body centreline
                cx = (px(_L_SHOULDER) + px(_R_SHOULDER)) / 2 if (vis(_L_SHOULDER) and vis(_R_SHOULDER)) else wrist_xs[0]
                if abs(wrist_xs[0] - cx) < body_h * 0.4:
                    return "phone"

    return "looking_forward"


# =============================================================================
# 6.  ANALYTICS HELPERS
# =============================================================================
def _mog2_score(subtractor: cv2.BackgroundSubtractorMOG2, frame: np.ndarray) -> tuple[int, np.ndarray]:
    """
    Returns (motion_score 0-100, foreground mask).
    MOG2 is more accurate than raw absdiff because it models dynamic backgrounds.
    """
    fg = subtractor.apply(frame)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, kernel)
    score = min(100, int((cv2.countNonZero(fg) / max(fg.shape[0] * fg.shape[1], 1)) * 600))
    return score, fg


def compute_engagement(persons: list[dict], attention_rate: int) -> int:
    with_emo = [p for p in persons if p.get("emotion")]
    if not with_emo:
        return max(0, min(100, int(attention_rate * 0.6)))
    positive_rate = sum(1 for p in with_emo if p["emotion"] in POSITIVE_EMOTIONS) / len(with_emo) * 100
    return max(0, min(100, int(attention_rate * 0.6 + positive_rate * 0.4)))


def compute_sentiment(persons: list[dict]) -> tuple[int, str]:
    """
    Blends facial sentiment (60 %) and gestural valence (40 %) into 0–100.
    """
    scores: list[float] = []
    for p in persons:
        facial   = p.get("sentiment_score", 50)
        valence  = GESTURE_VALENCE.get(p.get("gesture", "unknown"), 0.0)
        gestural = 50 + valence * 40          # map –1..1 → 10..90
        scores.append(facial * 0.60 + gestural * 0.40)

    if not scores:
        return 50, "Neutral"

    avg = int(sum(scores) / len(scores))
    label = "Positive" if avg >= 65 else ("Negative" if avg < 35 else "Neutral")
    return avg, label


def pedagogical_insight(dominant: str, attention: int, engagement: int, motion: int) -> str:
    if attention >= 80:
        return "High focus detected. Ideal time to introduce complex concepts or invite discussion."
    if dominant == "happy" and attention >= 60:
        return "Positive atmosphere. Students are receptive — good moment to introduce new material."
    if dominant in ("angry", "disgust"):
        return "Frustration signals detected. Pause, check understanding, and simplify before continuing."
    if dominant == "sad":
        return "Subdued mood in the room. A brief check-in or lighter activity may help re-energise students."
    if motion > 65:
        return "High physical activity. Consider a structured task to channel restlessness productively."
    if attention < 40:
        return "Attention is low. Cold-call, a quiz, or topic pivot can quickly reset focus."
    if 40 <= attention < 65:
        return "Moderate engagement. An interactive pair-discussion or quick poll may lift participation."
    return "Session progressing normally. Continue monitoring for shifts in sentiment or attention."


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
# 7.  HTML PANEL HELPERS
# =============================================================================
def _bar_rows(items: dict[str, tuple[int, str, str]], total: int) -> str:
    """Generic horizontal bar renderer. items = { label: (count, hex_color, icon) }"""
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
    rows = {
        e: (counts.get(e, 0), EMOTION_HEX[e], "·")
        for e in EMOTION_ORDER
    }
    return _bar_rows(rows, total)


def gesture_bars_html(counts: dict[str, int], total: int) -> str:
    order = ["raised_hand", "looking_forward", "writing", "phone", "head_down", "unknown"]
    rows  = {
        g: (counts.get(g, 0), GESTURE_HEX[g], GESTURE_ICON[g])
        for g in order
    }
    return _bar_rows(rows, total)


def gauge_html(value: int, label: str, color: str) -> str:
    return f"""
    <div style="text-align:center;padding:12px 0">
      <div style="font-size:34px;font-weight:800;color:{color};line-height:1">{value}%</div>
      <div style="font-size:10px;color:#64748b;text-transform:uppercase;
                  letter-spacing:.1em;margin-top:5px">{label}</div>
    </div>"""


def sentiment_pill_html(score: int, label: str) -> str:
    color = "#10b981" if label == "Positive" else ("#ef4444" if label == "Negative" else "#3b82f6")
    return f"""
    <div style="text-align:center;margin:10px 0">
      <div style="font-size:30px;font-weight:800;color:{color}">{score}%</div>
      <div style="display:inline-block;margin-top:6px;padding:3px 16px;
                  border-radius:99px;background:{color}22;border:1px solid {color}66;
                  color:{color};font-size:11px;font-weight:700;letter-spacing:.08em">
        {label.upper()}
      </div>
      <div style="font-size:9px;color:#64748b;margin-top:4px;text-transform:uppercase;
                  letter-spacing:.1em">Classroom Sentiment</div>
    </div>"""


def student_chips_html(persons: list[dict]) -> str:
    html = ""
    for i, p in enumerate(persons[:10]):
        emo   = p.get("emotion") or "—"
        gest  = p.get("gesture", "?")
        att   = p.get("attentive")
        ec    = EMOTION_HEX.get(emo, "#475569")
        gi    = GESTURE_ICON.get(gest, "·")
        mark  = "✓" if att else ("✗" if att is False else "·")
        html += f"""
        <div style="display:inline-flex;align-items:center;gap:5px;
                    margin:2px 3px;padding:4px 10px;border-radius:99px;
                    background:{ec}18;border:1px solid {ec}55;font-size:10px;color:{ec}">
          <span>{mark}</span>
          <span>S{i+1}</span>
          <span style="opacity:.75">{emo.upper()}</span>
          <span>{gi}</span>
        </div>"""
    if not html:
        html = "<span style='color:#475569;font-size:11px'>No students in view</span>"
    return html


# =============================================================================
# 8.  STREAMLIT LAYOUT
# =============================================================================
st.title("🎓 RYDEGATE CLASSROOM INTELLIGENCE")

# ── Sidebar ────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("Source Settings")

    if not ENGINES["pose_available"]:
        st.error("ultralytics not found. Install: `pip install ultralytics`")
    if not ENGINES["deepface_available"]:
        st.warning("deepface not found — emotion analysis disabled. Install: `pip install deepface`")

    src_type = st.radio("Video Input", ["RTSP / YouTube URL", "Upload Local File"])

    final_src: str | None = None
    if src_type == "RTSP / YouTube URL":
        final_src = st.text_input(
            "Stream URL",
            value="rtsp://onwvRqXwqFHqGgIe2UfZLoMgIMkLxbxG:410ZagI9gDKFiDo9cuUH8@test.rtsp.stream/traffic",
        )
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
    conf_thresh     = st.slider("YOLO Confidence", 0.10, 1.0,  0.40, 0.05)
    emotion_every   = st.slider("Emotion Analysis Every N Frames", 10, 90, 30, 5,
                                help="Higher = faster FPS, less frequent emotion reads.")
    highlight_inatt = st.checkbox("Dim Inattentive Students", value=False)

    st.markdown("---")
    st.subheader("Live Analytics")
    sb_emotion   = st.empty()
    sb_gesture   = st.empty()
    sb_sentiment = st.empty()
    sb_insight   = st.empty()
    sb_totals    = st.empty()

    st.markdown("---")
    start_engine = st.checkbox("▶ ENGAGE STREAM ENGINE")

# ── Main area ──────────────────────────────────────────────────────────────────
# Status + FPS bar
status_bar = st.empty()

# Metric header
mc = st.columns(7)
m_students   = mc[0].empty()
m_fps        = mc[1].empty()
m_engagement = mc[2].empty()
m_attention  = mc[3].empty()
m_sentiment  = mc[4].empty()
m_motion     = mc[5].empty()
m_stream     = mc[6].empty()

# Video viewport
viewport = st.empty()

# Bottom analytics row
st.markdown("---")
bc = st.columns(4)
b_engagement = bc[0].empty()
b_attention  = bc[1].empty()
b_sentiment  = bc[2].empty()
b_students   = bc[3].empty()

# =============================================================================
# 9.  MAIN EXECUTION LOOP
# =============================================================================
if start_engine and final_src:
    buf    = FrameBuffer(final_src).start()
    worker = EmotionWorker()
    mog2   = cv2.createBackgroundSubtractorMOG2(
        history=500, varThreshold=25, detectShadows=False
    )

    # Per-session accumulators
    frame_count    = 0
    tracking       : list[dict] = []
    person_boxes   : list[tuple]= []
    latest_emotions: dict       = {}

    emo_session_counts : dict[str, int] = defaultdict(int)
    gest_session_counts: dict[str, int] = defaultdict(int)
    total_emo_reads    = 0
    total_gest_reads   = 0

    attention_history: deque[int] = deque(maxlen=60)

    while start_engine:
        # ── Status banner ──────────────────────────────────────────────────────
        bstatus = buf.status
        if bstatus != "streaming":
            status_bar.warning(
                f"Stream {bstatus}… FPS: {buf.fps:.1f}  —  Detection paused until feed stabilises."
            )
            time.sleep(0.05)
            continue
        else:
            status_bar.empty()

        ret, frame = buf.read_latest()
        if not ret or frame is None:
            time.sleep(0.03)
            continue

        tick = time.time()
        frame_count += 1
        img_h, img_w = frame.shape[:2]

        # ── YOLO Pose Inference (every 3rd frame) ──────────────────────────────
        if frame_count % 3 == 0 and ENGINES["pose_available"]:
            tracking     = []
            person_boxes = []

            results = ENGINES["pose"].predict(
                source=frame, conf=conf_thresh, verbose=False
            )

            if results and results[0].boxes is not None:
                boxes_data = results[0].boxes
                has_kps    = (
                    hasattr(results[0], "keypoints")
                    and results[0].keypoints is not None
                    and results[0].keypoints.xy is not None
                )
                kps_xy    = results[0].keypoints.xy.cpu().numpy()   if has_kps else None
                kps_conf  = results[0].keypoints.conf.cpu().numpy() if has_kps else None

                for det_i, box in enumerate(boxes_data):
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    score   = float(box.conf[0])
                    cls_id  = int(box.cls[0])
                    cls_lbl = ENGINES["pose"].names[cls_id]

                    # Dominant surface colour
                    crop = frame[max(0,y1):min(img_h,y2), max(0,x1):min(img_w,x2)]
                    color_name = "N/A"
                    if crop.size > 0:
                        b_a, g_a, r_a = cv2.mean(crop)[:3]
                        color_name = query_color_palette(r_a, g_a, b_a)

                    # Gesture from skeleton
                    gesture = "unknown"
                    if (
                        has_kps
                        and det_i < len(kps_xy)
                        and kps_xy[det_i].shape[0] == 17
                    ):
                        gesture = classify_gesture(kps_xy[det_i], kps_conf[det_i])

                    obj: dict = {
                        "bbox":     (x1, y1, x2, y2),
                        "label":    f"{cls_lbl.upper()} ({color_name})",
                        "score":    score,
                        "cls_id":   cls_id,
                        "gesture":  gesture,
                        "emotion":  None,
                        "attentive":        None,
                        "sentiment_score":  50,
                        "sentiment_label":  "Neutral",
                    }
                    tracking.append(obj)

                    # Collect person boxes for emotion worker
                    if cls_id == 0:  # class 0 = person in pose model
                        person_boxes.append((x1, y1, x2, y2))
                        gest_session_counts[gesture] += 1
                        total_gest_reads += 1

        # ── Submit async emotion job (never blocks) ────────────────────────────
        if frame_count % emotion_every == 0 and person_boxes:
            worker.submit(frame, person_boxes)

        # ── Pull latest emotion results ────────────────────────────────────────
        latest_emotions = worker.latest()

        # ── Merge emotions + gestures into tracking entries ────────────────────
        person_idx = 0
        for obj in tracking:
            if obj["cls_id"] == 0:
                em = latest_emotions.get(person_idx)
                if em:
                    obj["emotion"]         = em["dominant_emotion"]
                    obj["attentive"]       = em["attentive"]
                    obj["sentiment_score"] = em["sentiment_score"]
                    obj["sentiment_label"] = em["sentiment_label"]
                    emo_session_counts[em["dominant_emotion"]] += 1
                    total_emo_reads += 1
                person_idx += 1

        # ── Motion via MOG2 ────────────────────────────────────────────────────
        motion_score, fg_mask = _mog2_score(mog2, frame)

        # ── Classroom-level metrics ────────────────────────────────────────────
        persons = [o for o in tracking if o["cls_id"] == 0]
        attentive_n  = sum(1 for p in persons if p.get("attentive") is True)
        attention_rt = int(attentive_n / len(persons) * 100) if persons else 0
        attention_history.append(attention_rt)
        engagement    = compute_engagement(persons, attention_rt)
        sent_score, sent_label = compute_sentiment(persons)

        dom_emotion = "—"
        if persons:
            ec_frame: dict[str, int] = defaultdict(int)
            for p in persons:
                if p.get("emotion"):
                    ec_frame[p["emotion"]] += 1
            if ec_frame:
                dom_emotion = max(ec_frame, key=ec_frame.get)

        fps_val = 1.0 / max(time.time() - tick, 0.001)

        # ── Draw Frame Annotations ─────────────────────────────────────────────
        # Subtle motion heatmap overlay
        if motion_score > 15:
            motion_vis = np.zeros_like(frame)
            motion_vis[:, :, 2] = fg_mask
            frame = cv2.addWeighted(frame, 1.0, motion_vis, 0.12, 0)

        for obj in tracking:
            x1, y1, x2, y2 = obj["bbox"]
            emo_key = obj.get("emotion") or "neutral"
            box_bgr = EMOTION_BGR.get(emo_key, (0, 220, 80))

            if highlight_inatt and obj["cls_id"] == 0 and obj.get("attentive") is False:
                box_bgr = (70, 70, 70)

            cv2.rectangle(frame, (x1, y1), (x2, y2), box_bgr, 2)

            # Line 1: class + colour
            cv2.putText(frame, obj["label"],
                        (x1, y1 - 22), cv2.FONT_HERSHEY_SIMPLEX,
                        0.38, box_bgr, 1, cv2.LINE_AA)

            # Line 2 (persons only): emotion + gesture + attention
            if obj["cls_id"] == 0:
                g_icon  = GESTURE_ICON.get(obj.get("gesture", "unknown"), "·")
                att_tag = "✓" if obj.get("attentive") else ("✗" if obj.get("attentive") is False else "·")
                label2  = f"{emo_key.upper()}  {g_icon}  {att_tag}"
                cv2.putText(frame, label2,
                            (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX,
                            0.37, box_bgr, 1, cv2.LINE_AA)

                # Skeleton keypoint dots (minimal — wrist/shoulder only for clarity)
                # Note: tracking_cache doesn't store raw kps; drawn via YOLO's built-in
                # render if desired. Keeping overlay clean here.

                # Attention dot
                if obj.get("attentive") is not None:
                    dot_c = (16, 185, 129) if obj["attentive"] else (68, 68, 239)
                    cv2.circle(frame, (x2 - 8, y1 + 8), 5, dot_c, -1)

                # Sentiment micro-badge on bottom-right of box
                sc = obj.get("sentiment_score", 50)
                sc_c = (
                    (16, 185, 129) if sc >= 65 else
                    ((68, 68, 239) if sc < 35 else (246, 130, 59))
                )
                cv2.rectangle(frame, (x2 - 36, y2 - 16), (x2, y2), sc_c, -1)
                cv2.putText(frame, f"{sc}%",
                            (x2 - 34, y2 - 4), cv2.FONT_HERSHEY_SIMPLEX,
                            0.32, (255, 255, 255), 1, cv2.LINE_AA)

        # ── Update UI ──────────────────────────────────────────────────────────
        # Metric header
        m_students.metric("Students",    len(persons))
        m_fps.metric("FPS",              f"{fps_val:.1f}")
        m_engagement.metric("Engagement",f"{engagement}%")
        m_attention.metric("Attention",  f"{attention_rt}%")
        m_sentiment.metric("Sentiment",  f"{sent_score}% {sent_label}")
        m_motion.metric("Motion",        f"{motion_score}%")
        m_stream.metric("Worker",        "⚡ Analysing" if worker.is_busy else "✓ Ready")

        # Video
        viewport.image(
            cv2.cvtColor(frame, cv2.COLOR_BGR2RGB),
            channels="RGB",
            use_container_width=True,
        )

        # Bottom gauges
        e_col = "#10b981" if engagement > 79 else ("#f59e0b" if engagement > 49 else "#ef4444")
        a_col = "#10b981" if attention_rt > 79 else ("#f59e0b" if attention_rt > 49 else "#ef4444")
        s_col = "#10b981" if sent_label == "Positive" else ("#ef4444" if sent_label == "Negative" else "#3b82f6")

        b_engagement.markdown(gauge_html(engagement,   "Engagement",         e_col), unsafe_allow_html=True)
        b_attention.markdown( gauge_html(attention_rt, "Attention Rate",      a_col), unsafe_allow_html=True)
        b_sentiment.markdown( sentiment_pill_html(sent_score, sent_label),           unsafe_allow_html=True)
        b_students.markdown(  student_chips_html(persons),                           unsafe_allow_html=True)

        # Sidebar analytics
        sb_emotion.markdown(
            emotion_bars_html(emo_session_counts, total_emo_reads), unsafe_allow_html=True
        )
        sb_gesture.markdown(
            gesture_bars_html(gest_session_counts, total_gest_reads), unsafe_allow_html=True
        )

        dom_col = EMOTION_HEX.get(dom_emotion, "#475569")
        sb_sentiment.markdown(
            f"""<div style="text-align:center;margin:10px 0">
              <div style="font-size:22px;font-weight:800;color:{s_col}">{sent_score}%</div>
              <span style="padding:3px 14px;border-radius:99px;
                           background:{dom_col}22;border:1px solid {dom_col}55;
                           color:{dom_col};font-size:11px;font-weight:700">
                ◉ {dom_emotion.upper()}
              </span>
            </div>""",
            unsafe_allow_html=True,
        )

        insight = pedagogical_insight(dom_emotion, attention_rt, engagement, motion_score)
        sb_insight.markdown(
            f"""<div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:10px;
                            padding:10px 12px;margin:6px 0">
              <div style="font-size:9px;color:#3b82f6;text-transform:uppercase;
                          letter-spacing:.08em;margin-bottom:5px">💡 INSIGHT</div>
              <div style="font-size:11px;color:#94a3b8;line-height:1.6">{insight}</div>
            </div>""",
            unsafe_allow_html=True,
        )

        sb_totals.markdown(
            f"""<div style="font-size:10px;color:#64748b;line-height:2">
              Frames: <b style="color:#94a3b8">{frame_count}</b> &nbsp;|&nbsp;
              Emotion reads: <b style="color:#94a3b8">{total_emo_reads}</b><br>
              Gesture reads: <b style="color:#94a3b8">{total_gest_reads}</b>
            </div>""",
            unsafe_allow_html=True,
        )

    # ── Teardown ───────────────────────────────────────────────────────────────
    buf.stop()
    if (
        src_type == "Upload Local File"
        and final_src
        and os.path.isfile(final_src)
    ):
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
