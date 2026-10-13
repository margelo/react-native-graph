import type { GraphPoint } from '../LineGraphProps';

/** Finds the closest timestamp in points ordered from oldest to newest. */
export function getClosestPointIndex(
  points: GraphPoint[],
  timestamp: number
): number | undefined {
  if (points.length === 0) return undefined;

  let left = 0;
  let right = points.length - 1;
  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    if (points[middle]!.date.getTime() < timestamp) {
      left = middle + 1;
    } else {
      right = middle;
    }
  }

  const previous = points[left - 1];
  if (previous == null) return left;

  const next = points[left]!;
  return timestamp - previous.date.getTime() <= next.date.getTime() - timestamp
    ? left - 1
    : left;
}
