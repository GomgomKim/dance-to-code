/**
 * ✨ 포즈 → 토큰 매핑은 이 파일 하나에서 관리합니다.
 * 토큰을 바꾸거나, 순서/키보드 단축키/이모지/이름을 바꾸려면 여기만 수정하세요.
 * (포즈 판별 규칙 자체는 src/pose/classifier.ts)
 */
import type { TokenPoseId } from '../pose/types'

export type PoseAction =
  | { type: 'insert'; text: string }
  | { type: 'backspace' }
  | { type: 'run' }

export interface PoseConfig {
  id: TokenPoseId
  /** 화면에 크게 표시되는 이름 */
  name: string
  emoji: string
  /** 동작 설명 (README / 범례) */
  how: string
  /** 디버그 모드 키보드 단축키 */
  key: string
  action: PoseAction
  /** 이 포즈만 유지 시간을 다르게 하고 싶을 때 (ms) */
  holdMs?: number
}

/** 포즈를 이 시간(ms) 동안 유지하면 확정 */
export const HOLD_MS = 600

/** 실행 포즈(점프)의 길이. 점프는 체공 시간이 짧아서 따로 짧게 둔다. */
export const RUN_HOLD_MS = 120

export const TOKEN_POSES: PoseConfig[] = [
  { id: 'V_UP', name: '만세 V', emoji: '🙌', how: '양팔을 위로 쭉 뻗어 V', key: '1', action: { type: 'insert', text: 'console.log(' } },
  { id: 'RIGHT_SIDE', name: '오른팔 쭉', emoji: '👉', how: '오른팔만 옆으로 수평', key: '2', action: { type: 'insert', text: '"Hello ' } },
  { id: 'LEFT_SIDE', name: '왼팔 쭉', emoji: '👈', how: '왼팔만 옆으로 수평', key: '3', action: { type: 'insert', text: 'World"' } },
  { id: 'CROSS', name: '크로스', emoji: '🙅', how: '양팔을 가슴 앞에서 X자로 교차', key: '4', action: { type: 'insert', text: ')' } },
  { id: 'HAND_ON_HEAD', name: '머리 위 한 손', emoji: '🙋', how: '한 손을 머리 위로', key: '5', action: { type: 'insert', text: ';' } },
  { id: 'HANDS_ON_HIPS', name: '허리 손', emoji: '🦸', how: '양손을 허리에 (팔꿈치는 바깥으로)', key: '6', action: { type: 'backspace' } },
  { id: 'RUN', name: '점프! 실행', emoji: '🚀', how: '양팔을 아래로 쭉 붙이고 점프', key: '7', action: { type: 'run' }, holdMs: RUN_HOLD_MS },
]

export const POSE_BY_ID = Object.fromEntries(TOKEN_POSES.map((p) => [p.id, p])) as Record<TokenPoseId, PoseConfig>

export const holdMsFor = (id: string) => POSE_BY_ID[id as TokenPoseId]?.holdMs ?? HOLD_MS

/** 수기신호 모드: 입력한 글자가 이 템플릿의 {{text}} 자리에 들어간다 */
export const SEMAPHORE_TEMPLATE = { before: 'console.log("', after: '");' }

/** 수기신호 모드에서 한 글자를 확정하는 유지 시간 */
export const SEMAPHORE_HOLD_MS = 700
