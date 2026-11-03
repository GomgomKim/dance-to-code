/** A single pose landmark. x/y are in "square" units (x already multiplied by the
 * frame aspect ratio), y grows downward. Raw camera orientation (NOT mirrored). */
export interface Landmark {
  x: number
  y: number
  z?: number
  visibility?: number
}

/** MediaPipe BlazePose landmark indices we care about. */
export const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const

export const LANDMARK_COUNT = 33

/** Skeleton lines to draw (subset of MediaPipe POSE_CONNECTIONS, no face mesh). */
export const SKELETON: Array<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [24, 26], [26, 28],
  [15, 17], [15, 19], [16, 18], [16, 20],
  [27, 29], [29, 31], [28, 30], [30, 32],
]

export type TokenPoseId =
  | 'V_UP'
  | 'RIGHT_SIDE'
  | 'LEFT_SIDE'
  | 'CROSS'
  | 'HAND_ON_HEAD'
  | 'HANDS_ON_HIPS'
  | 'RUN'

/** 'NEUTRAL' = 차렷 (both arms straight down, not jumping). */
export type ClassifiedPose = TokenPoseId | 'NEUTRAL' | null

/** Baseline captured during calibration (차렷 2초). */
export interface Calibration {
  /** Mid-hip y while standing still. */
  hipY: number
  /** Distance mid-shoulder → mid-hip while standing still. */
  torso: number
  shoulderWidth: number
}
