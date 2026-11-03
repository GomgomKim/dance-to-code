/**
 * ✨ 포즈 설정은 이 파일에서 관리합니다.
 *  - POSE_LIBRARY: 모든 포즈의 이름/이모지/설명. 새 포즈는 `rule`(팔 각도 규칙)만 적어서 추가할 수 있어요.
 *  - TOKEN_POSES: 토큰 모드(기본)의 포즈 → 토큰 매핑
 *  - 미션별 매핑은 src/config/missions.ts
 * (기본 포즈의 판별 규칙은 src/pose/classifier.ts)
 */
import type { PoseRule } from '../pose/customPoses'
import type { PoseId, TokenPoseId } from '../pose/types'

export type PoseAction =
  | { type: 'insert'; text: string }
  | { type: 'backspace' }
  | { type: 'run' }

export interface PoseInfo {
  id: PoseId
  /** 화면에 크게 표시되는 이름 */
  name: string
  emoji: string
  /** 동작 설명 (README / 범례) */
  how: string
  /**
   * 커스텀 포즈만: 팔 각도 규칙.
   * theta = 어깨→손목 방향 (0 아래, 90 옆으로 수평, 180 위, 음수는 몸 안쪽으로 교차).
   * 기본 포즈(규칙 없음)가 먼저 판정되고, 어디에도 안 걸리면 커스텀 규칙을 위에서부터 검사합니다.
   */
  rule?: PoseRule
}

/** 포즈를 이 시간(ms) 동안 유지하면 확정 */
export const HOLD_MS = 600

/** 실행 포즈(점프)의 길이. 점프는 체공 시간이 짧아서 따로 짧게 둔다. */
export const RUN_HOLD_MS = 120

export const POSE_LIBRARY: PoseInfo[] = [
  // ---- 기본 포즈 (classifier.ts에 규칙이 있음) ----
  { id: 'V_UP', name: '만세 V', emoji: '🙌', how: '양팔을 위로 쭉 뻗어 V' },
  { id: 'RIGHT_SIDE', name: '오른팔 쭉', emoji: '👉', how: '오른팔만 옆으로 수평' },
  { id: 'LEFT_SIDE', name: '왼팔 쭉', emoji: '👈', how: '왼팔만 옆으로 수평' },
  { id: 'CROSS', name: '크로스', emoji: '🙅', how: '양팔을 가슴 앞에서 X자로 교차' },
  { id: 'HAND_ON_HEAD', name: '머리 위 한 손', emoji: '🙋', how: '한 손을 머리 위로' },
  { id: 'HANDS_ON_HIPS', name: '허리 손', emoji: '🦸', how: '양손을 허리에 (팔꿈치는 바깥으로)' },
  { id: 'RUN', name: '점프! 실행', emoji: '🚀', how: '양팔을 아래로 쭉 붙이고 점프' },

  // ---- 커스텀 포즈: 규칙만 적으면 추가됩니다 ----
  {
    id: 'T_POSE', name: '비행기 T', emoji: '✈️', how: '양팔을 옆으로 쭉 펴서 T자',
    rule: { right: { theta: [65, 115], minElbow: 140 }, left: { theta: [65, 115], minElbow: 140 } },
  },
  {
    id: 'DISCO_RIGHT', name: '디스코 오른손', emoji: '🕺', how: '오른팔은 대각선 위, 왼팔은 대각선 아래',
    rule: { right: { theta: [125, 170], minElbow: 140 }, left: { theta: [20, 65] } },
  },
  {
    id: 'DISCO_LEFT', name: '디스코 왼손', emoji: '💃', how: '왼팔은 대각선 위, 오른팔은 대각선 아래',
    rule: { left: { theta: [125, 170], minElbow: 140 }, right: { theta: [20, 65] } },
  },
  {
    id: 'LOW_V', name: '아래 V', emoji: '🙆', how: '양팔을 대각선 아래로 쭉 (ㅅ자)',
    rule: { right: { theta: [35, 60], minElbow: 150 }, left: { theta: [35, 60], minElbow: 150 } },
  },
]

export const POSE_INFO = Object.fromEntries(POSE_LIBRARY.map((p) => [p.id, p])) as Record<PoseId, PoseInfo>

/** 규칙이 있는 커스텀 포즈 (분류기에 넘김) */
export const CUSTOM_POSES = POSE_LIBRARY.filter((p): p is PoseInfo & { rule: PoseRule } => !!p.rule)
  .map((p) => ({ id: p.id, rule: p.rule }))

export interface TokenPoseConfig {
  id: TokenPoseId
  /** 디버그 모드 키보드 단축키 */
  key: string
  action: PoseAction
  /** 이 포즈만 유지 시간을 다르게 하고 싶을 때 (ms) */
  holdMs?: number
}

/** 토큰 모드 매핑 */
export const TOKEN_POSES: TokenPoseConfig[] = [
  { id: 'V_UP', key: '1', action: { type: 'insert', text: 'console.log(' } },
  { id: 'RIGHT_SIDE', key: '2', action: { type: 'insert', text: '"Hello ' } },
  { id: 'LEFT_SIDE', key: '3', action: { type: 'insert', text: 'World"' } },
  { id: 'CROSS', key: '4', action: { type: 'insert', text: ')' } },
  { id: 'HAND_ON_HEAD', key: '5', action: { type: 'insert', text: ';' } },
  { id: 'HANDS_ON_HIPS', key: '6', action: { type: 'backspace' } },
  { id: 'RUN', key: '7', action: { type: 'run' }, holdMs: RUN_HOLD_MS },
]

export const TOKEN_POSE_BY_ID = Object.fromEntries(TOKEN_POSES.map((p) => [p.id, p])) as Record<TokenPoseId, TokenPoseConfig>

export const holdMsFor = (id: string) => (id === 'RUN' ? RUN_HOLD_MS : HOLD_MS)

/** 수기신호 모드: 입력한 글자가 before와 after 사이에 들어간다 */
export const SEMAPHORE_TEMPLATE = { before: 'console.log("', after: '");' }

/** 수기신호 모드에서 한 글자를 확정하는 유지 시간 */
export const SEMAPHORE_HOLD_MS = 700
