import { SkPath, SkPoint, Skia } from '@shopify/react-native-skia'
import type { GraphPoint } from './LineGraphProps'

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
}

// A Graph Point will be drawn every second "pixel"
const PIXEL_RATIO = 2

export function createGraphPath({
  points: graphData,
  graphPadding,
  canvasHeight: height,
  canvasWidth: width,
}: GraphPathConfig): SkPath {
  const innerHeight = height - 2 * graphPadding

  const maxValue = graphData.reduce(
    (prev, curr) => (curr.value > prev ? curr.value : prev),
    Number.MIN_SAFE_INTEGER
  )
  const minValue = graphData.reduce(
    (prev, curr) => (curr.value < prev ? curr.value : prev),
    Number.MAX_SAFE_INTEGER
  )

  const areValuesSame = minValue === maxValue

  const points: SkPoint[] = []

  for (let pixel = 0; pixel < width; pixel += PIXEL_RATIO) {
    const index = Math.floor((pixel / width) * graphData.length)
    const value = graphData[index]?.value ?? minValue

    const x = (pixel / width) * (width - 2 * graphPadding) + graphPadding
    const y = areValuesSame
      ? height / 2
      : height -
        ((value - minValue) / (maxValue - minValue)) * innerHeight -
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
