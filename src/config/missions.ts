/**
 * 🏆 미션 모드 설정. 미션을 추가/수정하려면 여기만 고치면 됩니다.
 *
 * - palette: 이 미션에서 쓸 수 있는 "포즈 → 토큰" 목록. 화면에 이 순서대로 보여요
 *   (순서를 섞어두면 춤추는 사람이 코드 순서를 직접 맞춰야 하는 퍼즐이 됩니다).
 *   pose 에는 src/config/poses.ts 의 POSE_LIBRARY 에 있는 아무 포즈 id나 쓸 수 있어요.
 *   새 포즈가 필요하면 POSE_LIBRARY 에 rule 과 함께 추가하세요.
 * - solution: 정답 코드를 만드는 포즈 순서. 목표 코드는 이걸로 자동 생성됩니다.
 * - expected: 실행했을 때 나와야 하는 출력 (줄 단위). 출력이 같으면 클리어.
 * - 지우기/실행 포즈는 모든 미션 공통 (MISSION_CONTROLS).
 */
import type { PoseId } from '../pose/types'

export interface MissionToken {
  pose: PoseId
  text: string
}

export interface Mission {
  id: string
  title: string
  /** 1 (쉬움) ~ 5 (어려움) */
  difficulty: 1 | 2 | 3 | 4 | 5
  description: string
  palette: MissionToken[]
  solution: PoseId[]
  expected: string[]
}

export const MISSION_CONTROLS = { backspace: 'HANDS_ON_HIPS', run: 'RUN' } as const

/** 시작 전 카운트다운 (ms) */
export const MISSION_COUNTDOWN_MS = 3000

/** 미션별로 저장하는 기록 개수 */
export const MISSION_RECORDS_KEPT = 10

export const MISSIONS: Mission[] = [
  {
    id: 'hello-world',
    title: 'Hello World',
    difficulty: 1,
    description: '모든 개발자의 첫 코드. Hello World를 출력하세요.',
    palette: [
      { pose: 'V_UP', text: 'console.log(' },
      { pose: 'RIGHT_SIDE', text: '"Hello ' },
      { pose: 'LEFT_SIDE', text: 'World"' },
      { pose: 'CROSS', text: ')' },
      { pose: 'HAND_ON_HEAD', text: ';' },
    ],
    solution: ['V_UP', 'RIGHT_SIDE', 'LEFT_SIDE', 'CROSS', 'HAND_ON_HEAD'],
    expected: ['Hello World'],
  },
  {
    id: 'count-to-5',
    title: '1부터 5까지',
    difficulty: 2,
    description: 'for 반복문으로 1부터 5까지 한 줄씩 출력하세요.',
    palette: [
      { pose: 'V_UP', text: 'for (let i = 1; ' },
      { pose: 'RIGHT_SIDE', text: 'i <= 5; ' },
      { pose: 'LEFT_SIDE', text: 'i++) ' },
      { pose: 'CROSS', text: 'console.log(' },
      { pose: 'HAND_ON_HEAD', text: 'i);' },
    ],
    solution: ['V_UP', 'RIGHT_SIDE', 'LEFT_SIDE', 'CROSS', 'HAND_ON_HEAD'],
    expected: ['1', '2', '3', '4', '5'],
  },
  {
    id: 'evens',
    title: '짝수만 출력',
    difficulty: 3,
    description: '1부터 10까지 중 짝수만 출력하세요. 조건문 순서에 주의!',
    palette: [
      { pose: 'CROSS', text: 'console.log(i);' },
      { pose: 'V_UP', text: 'for (let i = 1; i <= 10; i++)\n  ' },
      { pose: 'T_POSE', text: 'i % 2 === 0' },
      { pose: 'RIGHT_SIDE', text: 'if (' },
      { pose: 'LEFT_SIDE', text: ') ' },
    ],
    solution: ['V_UP', 'RIGHT_SIDE', 'T_POSE', 'LEFT_SIDE', 'CROSS'],
    expected: ['2', '4', '6', '8', '10'],
  },
  {
    id: 'sum-1-to-10',
    title: '1부터 10까지 합',
    difficulty: 4,
    description: '변수에 1부터 10까지 더해서 합계(55)를 출력하세요. 출력은 반복문 밖에서!',
    palette: [
      { pose: 'HAND_ON_HEAD', text: 'console.log(sum);' },
      { pose: 'DISCO_RIGHT', text: 'sum += i;\n' },
      { pose: 'V_UP', text: 'let sum = 0;\n' },
      { pose: 'T_POSE', text: 'for (let i = 1; i <= 10; i++)\n  ' },
    ],
    solution: ['V_UP', 'T_POSE', 'DISCO_RIGHT', 'HAND_ON_HEAD'],
    expected: ['55'],
  },
  {
    id: 'fizzbuzz',
    title: 'FizzBuzz',
    difficulty: 5,
    description: '1~15: 3의 배수는 Fizz, 5의 배수는 Buzz, 15의 배수는 FizzBuzz. 조건 순서가 핵심!',
    palette: [
      { pose: 'DISCO_LEFT', text: 'i % 3 === 0 ? "Fizz" :\n    ' },
      { pose: 'V_UP', text: 'for (let i = 1; i <= 15; i++)\n  ' },
      { pose: 'LOW_V', text: 'i);' },
      { pose: 'DISCO_RIGHT', text: 'i % 15 === 0 ? "FizzBuzz" :\n    ' },
      { pose: 'CROSS', text: 'console.log(\n    ' },
      { pose: 'T_POSE', text: 'i % 5 === 0 ? "Buzz" :\n    ' },
    ],
    solution: ['V_UP', 'CROSS', 'DISCO_RIGHT', 'DISCO_LEFT', 'T_POSE', 'LOW_V'],
    expected: ['1', '2', 'Fizz', '4', 'Buzz', 'Fizz', '7', '8', 'Fizz', 'Buzz', '11', 'Fizz', '13', '14', 'FizzBuzz'],
  },
]
