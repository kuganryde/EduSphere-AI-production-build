export interface Session {
  id: string;
  room_id: string;
  lecturer_name: string;
  course_code: string;
  expected_capacity: number;
  started_at: string;
  ended_at: string | null;
  status: 'active' | 'ended';
}

export interface Alert {
  id: string;
  level: 1 | 2 | 3;
  message: string;
  room_id: string;
  timestamp: string;
  dismissed_at: string | null;
}

export interface PedagogicalAnalysis {
  headcount: number;
  lecturer_present: boolean;
  engagement_score: number;
  gestures: {
    hands_raised: number;
    writing_notes: number;
    using_phone: number;
    heads_down: number;
    looking_at_board: number;
  };
  classroom_sentiment: 'focused' | 'distracted' | 'tired' | 'energetic' | 'mixed';
  alert: 'high_distraction' | 'low_attendance' | 'lecturer_absent' | null;
  pedagogical_note: string;
  confidence: number;
  timestamp: string;
  source_id: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DetectedFace {
  box: BoundingBox;
  emotion: string;
  attention: boolean;
  confidence: number;
}

export interface DetectedPerson {
  box: BoundingBox;
  confidence: number;
}

export interface DeepFaceResult {
  face_count: number;
  emotions: string[];
  attention_scores: boolean[];
  aggregate: {
    attention_rate: number | null;
    dominant_class_emotion: string;
    emotion_breakdown: Record<string, number>;
    total_faces: number;
  };
  // Bounding box data
  faces: DetectedFace[];
  persons: DetectedPerson[];
  frame_width: number;
  frame_height: number;
  degraded?: boolean;
  error?: string;
}

export interface AlertRecord {
  id: string;
  session_id: string | null;
  room_id: string;
  level: 1 | 2 | 3;
  message: string;
  alert_type: string;
  created_at: string;
  dismissed_at: string | null;
}

export interface Room {
  id: string;
  name: string;
  location: string;
  expected_capacity: number;
  camera_url: string | null;
  created_at: string;
}

export interface EngagementSnapshot {
  id: string;
  session_id: string;
  room_id: string;
  timestamp: string;
  engagement_score: number;
  headcount: number;
  lecturer_present: boolean;
  classroom_sentiment: string;
  attention_rate: number | null;
  dominant_emotion: string;
  gestures: PedagogicalAnalysis['gestures'];
  alert_level: number | null;
}

export interface AnalysisUpdate {
  engagement: number;
  headcount: number;
  sentiment: string;
  lecturerPresent: boolean;
  gestures: PedagogicalAnalysis['gestures'] | null;
  alert: string | null;
  attentionRate: number | null;
  timestamp: string;
}

export type SentimentType = 'focused' | 'distracted' | 'tired' | 'energetic' | 'mixed';
export type AlertLevel = 1 | 2 | 3;
export type ClassState = 'IDLE' | 'ACTIVE' | 'ALERT';
