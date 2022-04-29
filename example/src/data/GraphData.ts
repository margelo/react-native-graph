import type { GraphPoint } from '../../../src/LineGraphProps'

function weightedRandom(max: number, numDice: number): number {
  let num = 0
  for (let i = 0; i < numDice; i++) {
    num += Math.random() * (max / numDice)
  }
  return num
}

export function generateRandomGraphData(length: number): GraphPoint[] {
  return Array<number>(length)
    .fill(0)
    .map((_, index) => ({
      date: new Date(index),
      value: weightedRandom(50, index),
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
