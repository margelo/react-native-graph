import type { Vector, PathCommand } from '@shopify/react-native-skia'
import { PathVerb, vec } from '@shopify/react-native-skia'

// code from William Candillon

const round = (value: number, precision = 0): number => {
  const p = Math.pow(10, precision)
  return Math.round(value * p) / p
}

// https://stackoverflow.com/questions/27176423/function-to-solve-cubic-equation-analytically
const cuberoot = (x: number): number => {
  const y = Math.pow(Math.abs(x), 1 / 3)
  return x < 0 ? -y : y
}

const solveCubic = (a: number, b: number, c: number, d: number): number[] => {
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
    else if (D > 0)
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

export const cubicBezierYForX = (
  x: number,
  a: Vector,
  b: Vector,
  c: Vector,
  d: Vector,
  precision = 2
): number => {
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

const cubicBezier = (
  t: number,
  from: number,
  c1: number,
  c2: number,
  to: number
): number => {
  const term = 1 - t
  const a = 1 * term ** 3 * t ** 0 * from
  const b = 3 * term ** 2 * t ** 1 * c1
  const c = 3 * term ** 1 * t ** 2 * c2
  const d = 1 * term ** 0 * t ** 3 * to
  return a + b + c + d
}

interface Cubic {
  from: Vector
  c1: Vector
  c2: Vector
  to: Vector
}

export const selectCurve = (
  cmds: PathCommand[],
  x: number
): Cubic | undefined => {
  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i]
    if (cmd == null) return undefined

    if (cmd[0] === PathVerb.Cubic) {
      const to = vec(cmd[1], cmd[2])
      const from = vec(cmd[7], cmd[8])
      if (x <= from.x && x >= to.x) {
        return {
          from: from,
          c1: vec(cmd[3], cmd[4]),
          c2: vec(cmd[5], cmd[6]),
          to: to,
        }
      }
    }
  }
  return undefined
}

export const getYForX = (
  cmds: PathCommand[],
  x: number,
  precision = 2
): number | undefined => {
  const c = selectCurve(cmds, x)
  if (c == null) return undefined

  return cubicBezierYForX(x, c.from, c.c1, c.c2, c.to, precision)
}
