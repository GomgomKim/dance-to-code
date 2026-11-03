/**
 * Declarative pose rules, so new poses can be added from config without touching
 * the classifier. A rule constrains each arm's direction (theta) and straightness.
 */
import type { ArmMetrics } from './classifier'

export interface ArmRule {
  /** Allowed shoulder→wrist direction, degrees. 0 = down, 90 = out to the side,
   *  180 = up, negative = across the body. Ranges may cross ±180 (e.g. [150, 210]). */
  theta?: [number, number]
  /** Minimum elbow angle (180 = straight). */
  minElbow?: number
  /** Maximum elbow angle (use for bent-arm poses). */
  maxElbow?: number
}

export interface PoseRule {
  right?: ArmRule
  left?: ArmRule
}

export interface CustomPoseDef {
  id: string
  rule: PoseRule
}

export function inAngleRange(t: number, [min, max]: [number, number]): boolean {
  return [t, t + 360, t - 360].some((v) => v >= min && v <= max)
}

export function armMatches(arm: ArmMetrics, rule: ArmRule | undefined): boolean {
  if (!rule) return true
  if (rule.theta && !inAngleRange(arm.theta, rule.theta)) return false
  if (rule.minElbow !== undefined && arm.elbowAngle < rule.minElbow) return false
  if (rule.maxElbow !== undefined && arm.elbowAngle > rule.maxElbow) return false
  return true
}

/** First custom pose whose rule matches both arms, or null. */
export function matchCustomPose(left: ArmMetrics, right: ArmMetrics, defs: readonly CustomPoseDef[]): string | null {
  for (const d of defs) {
    if (armMatches(left, d.rule.left) && armMatches(right, d.rule.right)) return d.id
  }
  return null
}

/** Representative theta for an arm rule (middle of its range) — used to synthesize fixtures. */
export function ruleTheta(rule: ArmRule | undefined): number {
  if (!rule?.theta) return 0
  return (rule.theta[0] + rule.theta[1]) / 2
}
