import { SkPath, SkPoint, Skia } from '@shopify/react-native-skia'
import type { GraphPoint } from './LineGraphProps'

export interface GraphPathRange {
  x?: {
    min: number
    max: number
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

  range?: GraphPathRange
}

// A Graph Point will be drawn every second "pixel"
const PIXEL_RATIO = 2

export function createGraphPath({
  points: graphData,
  graphPadding,
  canvasHeight: height,
  canvasWidth: width,
  range,
}: GraphPathConfig): SkPath {
  const innerHeight = height - 2 * graphPadding

  const minValueX = range?.x != null && range.x.min >= 0 ? range.x.min : 0
  const maxValueX = range?.x != null ? range.x.max : width

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

  const graphDataOffset = graphData.findIndex(
    (point) => point.value >= minValueY
  )
  const graphDataLength =
    graphData.findIndex((point) => point.value <= maxValueY) - graphDataOffset

  const firstValue = graphData[graphDataOffset]?.date.getTime() ?? 0
  const lastValue =
    graphData[graphDataOffset + graphDataLength]?.date.getTime() ?? maxValueX

  const pixelOffset = firstValue - minValueX
  const pixelLength = lastValue * (maxValueX / width)

  for (let pixel = pixelOffset; pixel < pixelLength; pixel += PIXEL_RATIO) {
    const index =
      Math.floor(((pixel - pixelOffset) / pixelLength) * graphDataLength) +
      graphDataOffset
    const value = graphData[index]?.value ?? 0

    const x =
      (pixel / maxValueX) * (maxValueX - 2 * graphPadding) +
      graphPadding -
      minValueX
    const y =
      height -
      ((value - minValueY) / (maxValueY - minValueY)) * innerHeight -
      graphPadding

    points.push({ x: x, y: y })
  }

  const path = Skia.Path.Make()

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
