import type { Vector, PathCommand } from '@shopify/react-native-skia'
import { PathVerb, vec } from '@shopify/react-native-skia'

const GET_Y_FOR_X_PRECISION = 2

// code from William Candillon
const round = (value: number, precision = 0): number => {
  'worklet'

  const p = Math.pow(10, precision)
  return Math.round(value * p) / p
}

// https://stackoverflow.com/questions/27176423/function-to-solve-cubic-equation-analytically
const cuberoot = (x: number): number => {
  'worklet'

  const y = Math.pow(Math.abs(x), 1 / 3)
  return x < 0 ? -y : y
}

const solveCubic = (a: number, b: number, c: number, d: number): number[] => {
  'worklet'

  if (Math.abs(a) < 1e-8) {
    // Quadratic case, ax^2+bx+c=0
    a = b
    b = c
    c = d
    if (Math.abs(a) < 1e-8) {
      // Linear case, ax+b=0
      a = b
      b = c
      if (Math.abs(a) < 1e-8) {
        // Degenerate case
        return []
      }
      return [-b / a]
    }

    const D = b * b - 4 * a * c
    if (Math.abs(D) < 1e-8) return [-b / (2 * a)]
    if (D > 0)
      return [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)]

    return []
  }

  // Convert to depressed cubic t^3+pt+q = 0 (subst x = t - b/3a)
  const p = (3 * a * c - b * b) / (3 * a * a)
  const q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a)
  let roots

  if (Math.abs(p) < 1e-8) {
    // p = 0 -> t^3 = -q -> t = -q^1/3
    roots = [cuberoot(-q)]
  } else if (Math.abs(q) < 1e-8) {
    // q = 0 -> t^3 + pt = 0 -> t(t^2+p)=0
    roots = [0].concat(p < 0 ? [Math.sqrt(-p), -Math.sqrt(-p)] : [])
  } else {
    const D = (q * q) / 4 + (p * p * p) / 27
    if (Math.abs(D) < 1e-8) {
      // D = 0 -> two roots
      roots = [(-1.5 * q) / p, (3 * q) / p]
    } else if (D > 0) {
      // Only one real root
      const u = cuberoot(-q / 2 - Math.sqrt(D))
      roots = [u - p / (3 * u)]
    } else {
      // D < 0, three roots, but needs to use complex numbers/trigonometric solution
      const u = 2 * Math.sqrt(-p / 3)
      const t = Math.acos((3 * q) / p / u) / 3 // D < 0 implies p < 0 and acos argument in [-1..1]
      const k = (2 * Math.PI) / 3
      roots = [u * Math.cos(t), u * Math.cos(t - k), u * Math.cos(t - 2 * k)]
    }
  }

  // Convert back from depressed cubic
  for (let i = 0; i < roots.length; i++) roots[i] -= b / (3 * a)

  return roots
}

const cubicBezier = (
  t: number,
  from: number,
  c1: number,
  c2: number,
  to: number
): number => {
  'worklet'

  const term = 1 - t
  const a = 1 * term ** 3 * t ** 0 * from
  const b = 3 * term ** 2 * t ** 1 * c1
  const c = 3 * term ** 1 * t ** 2 * c2
  const d = 1 * term ** 0 * t ** 3 * to
  return a + b + c + d
}

export const cubicBezierYForX = (
  x: number,
  a: Vector,
  b: Vector,
  c: Vector,
  d: Vector,
  precision = 2
): number => {
  'worklet'

  const pa = -a.x + 3 * b.x - 3 * c.x + d.x
  const pb = 3 * a.x - 6 * b.x + 3 * c.x
  const pc = -3 * a.x + 3 * b.x
  const pd = a.x - x
  const ts = solveCubic(pa, pb, pc, pd)
    .map((root) => round(root, precision))
    .filter((root) => root >= 0 && root <= 1)
  const t = ts[0]
  if (t == null) return 0
  return cubicBezier(t, a.y, b.y, c.y, d.y)
}

interface Cubic {
  from: Vector
  c1: Vector
  c2: Vector
  to: Vector
}

const linearInterpolation = (x: number, from: Vector, to: Vector): number => {
  // Handles vertical lines or when 'from' and 'to' have the same x-coordinate
  if (from.x === to.x) return from.y // Return the y-value of 'from' (or 'to') if the line is vertical

  // Calculate the y-coordinate for the given x using linear interpolation
  // (y - y1) / (x - x1) = (y2 - y1) / (x2 - x1)
  // This equation comes from the slope formula m = (y2 - y1) / (x2 - x1),
  // rearranged to find 'y' given 'x'.
  return from.y + ((to.y - from.y) * (x - from.x)) / (to.x - from.x)
}

export const selectSegment = (
  cmds: PathCommand[],
  x: number,
  enableSmoothing: boolean
): Cubic | { from: Vector; to: Vector } | undefined => {
  'worklet'

  // Starting point for path segments
  let from: Vector = vec(0, 0)

  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i]
    // Skip null commands, ensuring robustness
    if (cmd == null) continue

    switch (cmd[0]) {
      case PathVerb.Move:
        // Set the starting point for the next segment
        from = vec(cmd[1], cmd[2])
        break
      case PathVerb.Line:
        // Handle direct line segments
        const lineTo = vec(cmd[1], cmd[2])
        // Check if 'x' is within the horizontal span of the line segment
        if (
          x >= Math.min(from.x, lineTo.x) &&
          x <= Math.max(from.x, lineTo.x)
        ) {
          // Return the segment as a simple line
          return { from, to: lineTo }
        }
        // Update 'from' to the endpoint of the line for the next segment
        from = lineTo
        break
      case PathVerb.Cubic:
        // Handle cubic bezier curves
        const cubicTo = vec(cmd[5], cmd[6])
        if (enableSmoothing) {
          // Construct the cubic curve segment if smoothing is enabled
          const c1 = vec(cmd[1], cmd[2])
          const c2 = vec(cmd[3], cmd[4])
          if (
            x >= Math.min(from.x, cubicTo.x) &&
            x <= Math.max(from.x, cubicTo.x)
          ) {
            return { from, c1, c2, to: cubicTo }
          }
        } else {
          // Treat the cubic curve as a straight line if smoothing is disabled
          if (
            x >= Math.min(from.x, cubicTo.x) &&
            x <= Math.max(from.x, cubicTo.x)
          ) {
            return { from, to: cubicTo }
          }
        }
        // Move 'from' to the end of the cubic curve
        from = cubicTo
        break
    }
  }

  // Return undefined if no segment matches the given 'x'
  return undefined
}

export const getYForX = (
  cmds: PathCommand[],
  x: number,
  enableSmoothing: boolean
): number | undefined => {
  'worklet'

  const segment = selectSegment(cmds, x, enableSmoothing)
  if (!segment) return undefined

  if ('c1' in segment) {
    return cubicBezierYForX(
      x,
      segment.from,
      segment.c1,
      segment.c2,
      segment.to,
      GET_Y_FOR_X_PRECISION
    )
  } else {
    return linearInterpolation(x, segment.from, segment.to)
  }
}
