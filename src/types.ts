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
  degraded?: boolean;
}

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
  dismissed: boolean;
}
