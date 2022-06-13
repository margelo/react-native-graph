import { add, Vector } from '@shopify/react-native-skia'

const mul = (v: Vector, f: number): Vector => ({ x: v.x * f, y: v.y * f })

export type SplineFunction = (t: number) => Vector | undefined

export const createSplineFunction = (
  p0: Vector,
  p1: Vector,
  p2: Vector,
  p3: Vector
): SplineFunction => {
  return (t: number) => {
    if (t > 1 || t < 0) return

    const p0Formula = mul(p0, Math.pow(1 - t, 3))
    const p1Formula = mul(p1, 3 * Math.pow(1 - t, 2) * t)
    const p2Formula = mul(p2, 3 * (1 - t) * Math.pow(t, 2))
    const p3Formula = mul(p3, Math.pow(t, 3))

    return add(add(p0Formula, p1Formula), add(p2Formula, p3Formula))
  }
}
