import {
  SkPath,
  Skia,
  Vector,
  cartesian2Polar,
  PathCommand,
  vec,
  PathVerb,
  SkPoint,
} from '@shopify/react-native-skia'
import type { GraphPoint } from './LineGraphProps'

export interface GraphPathRange {
  x?: {
    min: Date
    max: Date
  }
  y?: {
    min: number
    max: number
  }
}

interface GraphPathConfig {
  /**
   * Graph Points to use for the Path. Will be normalized and centered.
   */
  points: GraphPoint[]
  /**
   * Optional Padding (top, left, bottom, right) for the Graph to correctly round the Path.
   */
  graphPadding: number
  /**
   * Height of the Canvas (Measured with onLayout)
   */
  canvasHeight: number
  /**
   * Width of the Canvas (Measured with onLayout)
   */
  canvasWidth: number

  // smoothing?: number
  // strategy: 'complex' | 'bezier' | 'simple'

  range?: GraphPathRange
}

const round = (value: number, precision = 0) => {
  const p = Math.pow(10, precision)
  return Math.round(value * p) / p
}

// https://stackoverflow.com/questions/27176423
// https://stackoverflow.com/questions/51879836
const cuberoot = (x: number) => {
  const y = Math.pow(Math.abs(x), 1 / 3)
  return x < 0 ? -y : y
}

const solveCubic = (a: number, b: number, c: number, d: number) => {
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
    if (Math.abs(D) < 1e-8) {
      return [-b / (2 * a)]
    } else if (D > 0) {
      return [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)]
    }
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
  for (let i = 0; i < roots.length; i++) {
    roots[i] -= b / (3 * a)
  }

  return roots
}

export const cubicBezierYForX = (
  x: number,
  a: Vector,
  b: Vector,
  c: Vector,
  d: Vector,
  precision = 2
) => {
  const pa = -a.x + 3 * b.x - 3 * c.x + d.x
  const pb = 3 * a.x - 6 * b.x + 3 * c.x
  const pc = -3 * a.x + 3 * b.x
  const pd = a.x - x
  const t = solveCubic(pa, pb, pc, pd)
    .map((root) => round(root, precision))
    .filter((root) => root >= 0 && root <= 1)[0] as number
  return cubicBezier(t, a.y, b.y, c.y, d.y)
}

const cubicBezier = (
  t: number,
  from: number,
  c1: number,
  c2: number,
  to: number
) => {
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

export const selectCurve = (cmds: PathCommand[], x: number): Cubic | null => {
  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i]

    if (cmd == null) return null

    if (cmd[0] === PathVerb.Cubic) {
      const from = vec(cmd[1], cmd[2])
      const to = vec(cmd[7], cmd[8])
      const c1 = vec(cmd[3], cmd[4])
      const c2 = vec(cmd[5], cmd[6])
      if (x >= from.x && x <= to.x) {
        return {
          from,
          c1,
          c2,
          to,
        }
      }
    }
  }

  return null
}

export const getYForX = (cmds: PathCommand[], x: number, precision = 2) => {
  const c = selectCurve(cmds, x)
  if (c === null) {
    return null
  }
  return cubicBezierYForX(x, c.from, c.c1, c.c2, c.to, precision)
}

export const controlPoint = (
  current: GraphPoint,
  previous: GraphPoint,
  next: GraphPoint,
  reverse: boolean,
  smoothing: number
) => {
  const p = previous || current
  const n = next || current
  // Properties of the opposed-line
  const lengthX = n.date.getTime() - p.date.getTime()
  const lengthY = n.value - p.value

  const o = cartesian2Polar({ x: lengthX, y: lengthY })
  // If is end-control-point, add PI to the angle to go backward
  const angle = o.theta + (reverse ? Math.PI : 0)
  const length = o.radius * smoothing
  // The control point position is relative to the current point
  const x = current.date.getTime() + Math.cos(angle) * length
  const y = current.value + Math.sin(angle) * length
  return { x, y }
}

// export function createGraphPath({
//   points,
//   smoothing = 0,
//   range,
//   // graphPadding,
//   canvasHeight: height,
//   canvasWidth: width,
//   strategy,
// }: GraphPathConfig): SkPath {
//   const minValueX = range?.x?.min ?? points[0]?.date
//   const maxValueX = range?.x?.max ?? points[points.length - 1]?.date

//   const path = Skia.Path.Make()

//   if (minValueX == null || maxValueX == null) return path

//   const minValueY =
//     range?.y != null
//       ? range.y.min
//       : points.reduce(
//           (prev, curr) => (curr.value < prev ? curr.value : prev),
//           Number.MAX_SAFE_INTEGER
//         )

//   const maxValueY =
//     range?.y != null
//       ? range.y.max
//       : points.reduce(
//           (prev, curr) => (curr.value > prev ? curr.value : prev),
//           Number.MIN_SAFE_INTEGER
//         )

//   if (points[0] == null) return path

//   const pixelFactorX = (point: GraphPoint): number => {
//     const diff = maxValueX.getTime() - minValueX.getTime()
//     const x = point.date.getTime()

//     if (x < minValueX.getTime() || x > maxValueX.getTime()) return 0
//     return (x - minValueX.getTime()) / diff
//   }

//   const pixelFactorY = (point: GraphPoint): number => {
//     const diff = maxValueY - minValueY
//     const y = point.value

//     if (y < minValueY || y > maxValueY) return 0
//     return y / diff
//   }

//   path.moveTo(pixelFactorX(points[0]), pixelFactorY(points[0]))

//   points.forEach((point, i) => {
//     if (i === 0) {
//       return
//     }

//     const next = points[i + 1]
//     const prev = points[i - 1]

//     if (prev == null) return
//     const prevPrev = points[i - 1] ?? prev

//     const pointX = width * pixelFactorX(point)
//     const pointY = height * pixelFactorY(point)
//     const prevX = width * pixelFactorX(prev)
//     const prevY = height * pixelFactorY(prev)
//     const prevPrevX = width * pixelFactorX(prevPrev)
//     const prevPrevY = height * pixelFactorY(prevPrev)

//     const cps = controlPoint(prev, prevPrev, point, false, smoothing)
//     const cpe = controlPoint(point, prev, next ?? point, true, smoothing)

//     if (point.date < minValueX || point.date > maxValueX) return
//     if (point.value < minValueY || point.value > maxValueY) return

//     switch (strategy) {
//       case 'simple':
//         const cp = {
//           x: (cps.x + cpe.x) / 2,
//           y: (cps.y + cpe.y) / 2,
//         }
//         path.quadTo(cp.x, cp.y, pointX, pointY)
//         break
//       case 'bezier':
//         const cp1x = (2 * prevPrevX + prevX) / 3
//         const cp1y = (2 * prevPrevY + prevY) / 3
//         const cp2x = (prevPrevX + 2 * prevX) / 3
//         const cp2y = (prevPrevY + 2 * prevY) / 3
//         const cp3x = (prevPrevX + 4 * prevX + pointX) / 6
//         const cp3y = (prevPrevY + 4 * prevY + pointX) / 6
//         path.cubicTo(cp1x, cp1y, cp2x, cp2y, cp3x, cp3y)
//         if (i === points.length - 1) {
//           path.cubicTo(pointX, pointY, pointX, pointY, pointX, pointY)
//         }
//         break
//       case 'complex':
//         path.cubicTo(cps.x, cps.y, cpe.x, cpe.y, pointX, pointY)
//         break
//     }
//   })

//   return path
// }

// A Graph Point will be drawn every second "pixel"
const PIXEL_RATIO = 2

export function createGraphPath({
  points: graphData,
  range,
  graphPadding,
  canvasHeight: height,
  canvasWidth: width,
}: GraphPathConfig): SkPath {
  const minValueX = range?.x?.min ?? graphData[0]?.date
  const maxValueX = range?.x?.max ?? graphData[graphData.length - 1]?.date

  const path = Skia.Path.Make()

  if (minValueX == null || maxValueX == null) return path

  const minValueY =
    range?.y != null
      ? range.y.min
      : graphData.reduce(
          (prev, curr) => (curr.value < prev ? curr.value : prev),
          Number.MAX_SAFE_INTEGER
        )

  const maxValueY =
    range?.y != null
      ? range.y.max
      : graphData.reduce(
          (prev, curr) => (curr.value > prev ? curr.value : prev),
          Number.MIN_SAFE_INTEGER
        )

  const points: SkPoint[] = []

  let leftBoundary = 0
  let rightBoundary = width

  if (minValueX != null && maxValueX != null) {
    const timeDifference = maxValueX.getTime() - minValueX.getTime()

    const leftmostPointTime = Math.max(
      (graphData[0]?.date ?? minValueX).getTime() - minValueX.getTime(),
      0
    )

    const rightmostPointTime = Math.min(
      (graphData[graphData.length - 1]?.date ?? maxValueX).getTime() -
        minValueX.getTime(),
      timeDifference
    )

    leftBoundary = width * (leftmostPointTime / timeDifference)
    rightBoundary = width * (rightmostPointTime / timeDifference)
  }

  // const pixelFactorX = (point: GraphPoint): number | undefined => {
  //   const diff = maxValueX.getTime() - minValueX.getTime()
  //   const x = point.date.getTime()

  //   if (x < minValueX.getTime() || x > maxValueX.getTime()) return
  //   return (x - minValueX.getTime()) / diff
  // }

  // const pixelFactorY = (point: GraphPoint): number | undefined => {
  //   const diff = maxValueY - minValueY
  //   const y = point.value

  //   if (y < minValueY || y > maxValueY) return
  //   return y / diff
  // }

  // for (const point of graphData) {
  //   const px = pixelFactorX(point)
  //   const py = pixelFactorY(point)

  //   console.log('point', point.value)
  //   console.log('px', px)
  //   console.log('py', py)

  //   if (px == null || py == null) continue

  //   const x = (width - 2 * graphPadding) * px + graphPadding
  //   const y = height - ((height - 2 * graphPadding) * py + graphPadding)

  //   points.push({ x: x, y: y })
  // }

  const actualWidth = rightBoundary - leftBoundary

  for (let pixel = leftBoundary; pixel < rightBoundary; pixel += PIXEL_RATIO) {
    const index = Math.floor((pixel / actualWidth) * graphData.length)
    const value = graphData[index]!.value

    if (value < minValueY || value > maxValueY) continue
    const x =
      (pixel / actualWidth) * (actualWidth - 2 * graphPadding) + graphPadding

    const y =
      height -
      ((value - minValueY) / (maxValueY - minValueY)) *
        (height - 2 * graphPadding)
    graphPadding

    points.push({ x: x, y: y })
  }

  for (let i = 0; i < points.length; i++) {
    const point = points[i]!

    // first point needs to start the path
    if (i === 0) path.moveTo(point.x, point.y)

    const prev = points[i - 1]
    const prevPrev = points[i - 2]

    if (prev == null) continue

    const p0 = prevPrev ?? prev
    const p1 = prev
    const cp1x = (2 * p0.x + p1.x) / 3
    const cp1y = (2 * p0.y + p1.y) / 3
    const cp2x = (p0.x + 2 * p1.x) / 3
    const cp2y = (p0.y + 2 * p1.y) / 3
    const cp3x = (p0.x + 4 * p1.x + point.x) / 6
    const cp3y = (p0.y + 4 * p1.y + point.y) / 6

    path.cubicTo(cp1x, cp1y, cp2x, cp2y, cp3x, cp3y)
  }
  return path
}
