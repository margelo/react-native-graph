import type { GraphEvent, GraphPoint } from '../../../src/LineGraphProps'
import gaussian from 'gaussian'

function weightedRandom(mean: number, variance: number): number {
  var distribution = gaussian(mean, variance)
  // Take a random sample using inverse transform sampling method.
  return distribution.ppf(Math.random())
}

export function generateRandomGraphPoints(length: number): GraphPoint[] {
  return Array<number>(length)
    .fill(0)
    .map((_, index) => ({
      date: new Date(
        new Date(2000, 0, 1).getTime() + 1000 * 60 * 60 * 24 * index
      ),
      value: weightedRandom(10, Math.pow(index + 1, 2)),
    }))
}

export function generateRandomGraphEvents(
  length: number,
  points: GraphPoint[]
): GraphEvent[] {
  const firstPointTimestamp = points[0]?.date.getTime()
  const lastPointTimestamp = points[points.length - 1]?.date.getTime()

  if (!firstPointTimestamp || !lastPointTimestamp) {
    return []
  }
  return Array<number>(length)
    .fill(0)
    .map((_) => ({
      date: new Date( // Get a random date between the two defined timestamps.
        Math.floor(
          Math.random() * (lastPointTimestamp - firstPointTimestamp + 1)
        ) + firstPointTimestamp
      ),
      payload: {},
    }))
}

export function generateSinusGraphData(length: number): GraphPoint[] {
  return Array<number>(length)
    .fill(0)
    .map((_, index) => ({
      date: new Date(index),
      value: Math.sin(index),
    }))
}
