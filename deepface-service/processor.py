import cv2
import numpy as np

def preprocess_frame(frame):
    # Resize frame to max 640px width
    h, w = frame.shape[:2]
    if w > 640:
        ratio = 640 / w
        new_h = int(h * ratio)
        frame = cv2.resize(frame, (640, new_h))
    return frame
