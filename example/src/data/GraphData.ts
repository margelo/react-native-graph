import type { GraphPoint } from '../../../src/LineGraphProps'
import gaussian from 'gaussian'

function weightedRandom(mean: number, variance: number): number {
  var distribution = gaussian(mean, variance)
  // Take a random sample using inverse transform sampling method.
  return distribution.ppf(Math.random())
}

export function generateRandomGraphData(length: number): GraphPoint[] {
  return Array<number>(length)
    .fill(0)
    .map((_, index) => ({
      date: new Date(index),
      value: weightedRandom(10, Math.pow(index + 1, 2)),
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
