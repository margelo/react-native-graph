import { getClosestPointIndex } from '../utils/getClosestPointIndex';

const points = [0, 9, 10].map((timestamp) => ({
  date: new Date(timestamp),
  value: timestamp,
}));

it.each([
  [-1, 0],
  [0, 0],
  [4.5, 0],
  [8, 1],
  [9, 1],
  [9.75, 2],
  [10, 2],
  [11, 2],
])('selects the nearest date for timestamp %s', (timestamp, index) => {
  expect(getClosestPointIndex(points, timestamp)).toBe(index);
});

it('handles empty, single-point and equal-date data', () => {
  expect(getClosestPointIndex([], 0)).toBeUndefined();
  expect(getClosestPointIndex([points[1]!], 0)).toBe(0);
  expect(getClosestPointIndex([points[1]!, points[1]!], 9)).toBe(0);
});
