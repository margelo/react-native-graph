import { SkPath, Skia, SkPoint } from '@shopify/react-native-skia'
import type { GraphPoint, GraphRange } from './LineGraphProps'

const PIXEL_RATIO = 2

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
  pointsInRange: GraphPoint[]
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

export function getGraphPathRange(
  points: GraphPoint[],
  range?: GraphRange
): GraphPathRange {
  const minValueX = range?.x?.min ?? points[0]?.date ?? new Date()
  const maxValueX =
    range?.x?.max ?? points[points.length - 1]?.date ?? new Date()

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

export const getXPositionInRange = (
  date: Date,
  xRange: GraphXRange
): number => {
  const diff = xRange.max.getTime() - xRange.min.getTime()
  const x = date.getTime()

  return (x - xRange.min.getTime()) / diff
}

export const getXInRange = (
  width: number,
  date: Date,
  xRange: GraphXRange
): number => {
  return Math.floor(width * getXPositionInRange(date, xRange))
}

export const getYPositionInRange = (
  value: number,
  yRange: GraphYRange
): number => {
  const diff = yRange.max - yRange.min
  const y = value

  return (y - yRange.min) / diff
}

export const getYInRange = (
  height: number,
  value: number,
  yRange: GraphYRange
): number => {
  return Math.floor(height * getYPositionInRange(value, yRange))
}

export const getPointsInRange = (
  allPoints: GraphPoint[],
  range: GraphPathRange
) => {
  return allPoints.filter((point) => {
    const portionFactorX = getXPositionInRange(point.date, range.x)
    return portionFactorX <= 1 && portionFactorX >= 0
  })
}

type GraphPathWithGradient = { path: SkPath; gradientPath: SkPath }

function createGraphPathBase(
  props: GraphPathConfigWithGradient
): GraphPathWithGradient
function createGraphPathBase(props: GraphPathConfigWithoutGradient): SkPath

function createGraphPathBase({
  pointsInRange: graphData,
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

  // Canvas width substracted by the horizontal padding => Actual drawing width
  const drawingWidth = width - 2 * horizontalPadding
  // Canvas height substracted by the vertical padding => Actual drawing height
  const drawingHeight = height - 2 * verticalPadding

  if (graphData[0] == null) return path

  const points: SkPoint[] = []

  const startX =
    getXInRange(drawingWidth, graphData[0]!.date, range.x) + horizontalPadding
  const endX =
    getXInRange(drawingWidth, graphData[graphData.length - 1]!.date, range.x) +
    horizontalPadding

  const getGraphDataIndex = (pixel: number) =>
    Math.round(((pixel - startX) / (endX - startX)) * (graphData.length - 1))

  const getNextPixelValue = (pixel: number) => {
    if (pixel === endX || pixel + PIXEL_RATIO < endX) return pixel + PIXEL_RATIO
    return endX
  }

  for (
    let pixel = startX;
    startX <= pixel && pixel <= endX;
    pixel = getNextPixelValue(pixel)
  ) {
    const index = getGraphDataIndex(pixel)

    // Draw first point only on the very first pixel
    if (index === 0 && pixel !== startX) continue
    // Draw last point only on the very last pixel

    if (index === graphData.length - 1 && pixel !== endX) continue

    if (index !== 0 && index !== graphData.length - 1) {
      // Only draw point, when the point is exact
      const exactPointX =
        getXInRange(drawingWidth, graphData[index]!.date, range.x) +
        horizontalPadding

      const isExactPointInsidePixelRatio = Array(PIXEL_RATIO)
        .fill(0)
        .some((_value, additionalPixel) => {
          return pixel + additionalPixel === exactPointX
        })

      if (!isExactPointInsidePixelRatio) continue
    }

    const value = graphData[index]!.value
    const y =
      drawingHeight -
      getYInRange(drawingHeight, value, range.y) +
      verticalPadding

    points.push({ x: pixel, y: y })
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

    if (i === points.length - 1) {
      path.cubicTo(point.x, point.y, point.x, point.y, point.x, point.y)
    }
  }

  if (!shouldFillGradient) return path

  const gradientPath = path.copy()

  gradientPath.lineTo(endX, height + verticalPadding)
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
