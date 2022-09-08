import {
  SkPath,
  Skia,
  Vector,
  cartesian2Polar,
} from '@shopify/react-native-skia'
import type { GraphPoint, GraphRange } from './LineGraphProps'
import { createSplineFunction } from './Maths'

export interface GraphXRange {
  min: Date
  max: Date
}

export interface GraphYRange {
  min: number
  max: number
}

export interface GraphPathRange {
  x: GraphXRange
  y: GraphYRange
}

type GraphPathConfig = {
  /**
   * Graph Points to use for the Path. Will be normalized and centered.
   */
  points: GraphPoint[]
  /**
   * Optional Padding (left, right) for the Graph to correctly round the Path.
   */
  horizontalPadding: number
  /**
   * Optional Padding (top, bottom) for the Graph to correctly round the Path.
   */
  verticalPadding: number
  /**
   * Height of the Canvas (Measured with onLayout)
   */
  canvasHeight: number
  /**
   * Width of the Canvas (Measured with onLayout)
   */
  canvasWidth: number
  /**
   * Smoothing of the graph path (usually between 0.2 and 0.5)
   */
  smoothing?: number
  /**
   * Range of the graph's x and y-axis
   */
  range: GraphPathRange
}

type GraphPathConfigWithGradient = GraphPathConfig & {
  shouldFillGradient: true
}
type GraphPathConfigWithoutGradient = GraphPathConfig & {
  shouldFillGradient: false
}

export const controlPoint = (
  reverse: boolean,
  smoothing: number,
  current: Vector,
  previous: Vector,
  next: Vector
): Vector => {
  const p = previous
  const n = next
  // Properties of the opposed-line
  const lengthX = n.x - p.x
  const lengthY = n.y - p.y

  const o = cartesian2Polar({ x: lengthX, y: lengthY })
  // If is end-control-point, add PI to the angle to go backward
  const angle = o.theta + (reverse ? Math.PI : 0)
  const length = o.radius * smoothing
  // The control point position is relative to the current point
  const x = current.x + Math.cos(angle) * length
  const y = current.y + Math.sin(angle) * length
  return { x, y }
}

export function getGraphPathRange(
  points: GraphPoint[],
  range?: GraphRange
): GraphPathRange {
  const minValueX = range?.x?.min ?? points[0]!.date
  const maxValueX = range?.x?.max ?? points[points.length - 1]!.date

  const minValueY =
    range?.y?.min ??
    points.reduce(
      (prev, curr) => (curr.value < prev ? curr.value : prev),
      Number.MAX_SAFE_INTEGER
    )
  const maxValueY =
    range?.y?.max ??
    points.reduce(
      (prev, curr) => (curr.value > prev ? curr.value : prev),
      Number.MIN_SAFE_INTEGER
    )

  return {
    x: { min: minValueX, max: maxValueX },
    y: { min: minValueY, max: maxValueY },
  }
}

export const pixelFactorX = (
  date: Date,
  minValue: Date,
  maxValue: Date
): number => {
  const diff = maxValue.getTime() - minValue.getTime()
  const x = date.getTime()

  if (x < minValue.getTime() || x > maxValue.getTime()) return 0
  return (x - minValue.getTime()) / diff
}

export const pixelFactorY = (
  value: number,
  minValue: number,
  maxValue: number
): number => {
  const diff = maxValue - minValue
  const y = value

  if (y < minValue || y > maxValue) return 0
  return (y - minValue) / diff
}

// A Graph Point will be drawn every second "pixel"
const PIXEL_RATIO = 2

type GraphPathWithGradient = { path: SkPath; gradientPath: SkPath }

function createGraphPathBase(
  props: GraphPathConfigWithGradient
): GraphPathWithGradient
function createGraphPathBase(props: GraphPathConfigWithoutGradient): SkPath

function createGraphPathBase({
  points,
  smoothing = 0.2,
  range,
  horizontalPadding,
  verticalPadding,
  canvasHeight: height,
  canvasWidth: width,
  shouldFillGradient,
}: GraphPathConfigWithGradient | GraphPathConfigWithoutGradient):
  | SkPath
  | GraphPathWithGradient {
  const path = Skia.Path.Make()

  const actualWidth = width - 2 * horizontalPadding
  const actualHeight = height - 2 * verticalPadding

  const getGraphPoint = (point: GraphPoint): Vector => {
    const x =
      actualWidth * pixelFactorX(point.date, range.x.min, range.x.max) +
      horizontalPadding
    const y =
      actualHeight -
      actualHeight * pixelFactorY(point.value, range.y.min, range.y.max) +
      verticalPadding

    return { x: x, y: y }
  }

  if (points[0] == null) return path

  const firstPoint = getGraphPoint(points[0])
  path.moveTo(firstPoint.x, firstPoint.y)

  points.forEach((point, i) => {
    if (i === 0) {
      return
    }

    if (point.date < range.x.min || point.date > range.x.max) return

    const prev = points[i - 1]

    if (prev == null) return
    const prevPrev = points[i - 2] ?? prev
    const next = points[i + 1] ?? point

    const currentPoint = getGraphPoint(point)
    const prevPoint = getGraphPoint(prev)
    const prevPrevPoint = getGraphPoint(prevPrev)
    const nextPoint = getGraphPoint(next)

    const cps = controlPoint(
      false,
      smoothing,
      prevPoint,
      prevPrevPoint,
      currentPoint
    )
    const cpe = controlPoint(
      true,
      smoothing,
      currentPoint,
      prevPoint,
      nextPoint
    )

    const splineFunction = createSplineFunction(
      prevPoint,
      cps,
      cpe,
      currentPoint
    )

    // Calculates how many points between two points must be
    // calculated and drawn onto the canvas
    const drawingFactor = pixelFactorX(
      new Date(point.date.getTime() - prev.date.getTime()),
      range.x.min,
      range.x.max
    )
    const drawingPixels = actualWidth * drawingFactor + horizontalPadding
    const numberOfDrawingPoints = Math.floor(drawingPixels / PIXEL_RATIO)

    for (let i2 = 0; i2 <= numberOfDrawingPoints; i2++) {
      const p = splineFunction(i2 / numberOfDrawingPoints)

      if (p == null) return
      path.cubicTo(p.x, p.y, p.x, p.y, p.x, p.y)
    }
  })

  if (!shouldFillGradient) return path

  const gradientPath = path.copy()

  const lastPointX = pixelFactorX(
    points[points.length - 1]!.date,
    range.x.min,
    range.x.max
  )

  gradientPath.lineTo(
    actualWidth * lastPointX + horizontalPadding,
    height + verticalPadding
  )
  gradientPath.lineTo(0 + horizontalPadding, height + verticalPadding)

  return { path: path, gradientPath: gradientPath }
}

export function createGraphPath(props: GraphPathConfig): SkPath {
  return createGraphPathBase({ ...props, shouldFillGradient: false })
}

export function createGraphPathWithGradient(
  props: GraphPathConfig
): GraphPathWithGradient {
  return createGraphPathBase({
    ...props,
    shouldFillGradient: true,
  })
}
