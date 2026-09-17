const mockPath = {
  copy: jest.fn(),
  cubicTo: jest.fn(),
  lineTo: jest.fn(),
  moveTo: jest.fn(),
};

jest.mock('@shopify/react-native-skia', () => ({
  Skia: {
    Path: {
      Make: () => mockPath,
    },
  },
}));

import {
  createGraphPath,
  getGraphPathRange,
  getPointsInRange,
} from '../CreateGraphPath';

beforeEach(() => jest.clearAllMocks());

it('creates a finite path when every graph point maps to the same pixel', () => {
  const points = [
    { date: new Date(2024, 1, 1), value: 10 },
    { date: new Date(2024, 2, 1), value: 100 },
  ];

  expect(() =>
    createGraphPath({
      pointsInRange: points,
      range: {
        x: {
          min: new Date(2024, 1, 1),
          max: new Date(2070, 2, 1),
        },
        y: { min: 0, max: 100 },
      },
      horizontalPadding: 0,
      verticalPadding: 0,
      canvasHeight: 200,
      canvasWidth: 300,
    })
  ).not.toThrow();

  expect(mockPath.moveTo).toHaveBeenCalledTimes(1);
  expect(mockPath.moveTo.mock.calls[0]?.every(Number.isFinite)).toBe(true);
});

it('creates a visible path when graph points share the same date', () => {
  const date = new Date('2023-01-01');
  const points = [
    { date, value: 1 },
    { date, value: 2 },
  ];
  const range = getGraphPathRange(points);
  const pointsInRange = getPointsInRange(points, range);

  createGraphPath({
    pointsInRange,
    range,
    horizontalPadding: 0,
    verticalPadding: 0,
    canvasHeight: 200,
    canvasWidth: 300,
  });

  expect(pointsInRange).toEqual(points);
  expect(mockPath.moveTo).toHaveBeenCalledTimes(1);
  expect(mockPath.cubicTo).toHaveBeenCalled();
  expect(
    [...mockPath.moveTo.mock.calls, ...mockPath.cubicTo.mock.calls]
      .flat()
      .every(Number.isFinite)
  ).toBe(true);
});

it('keeps a large same-date path bounded without losing its value range', () => {
  const date = new Date('2023-01-01');
  const points = Array.from({ length: 10_000 }, (_, index) => ({
    date,
    value: index === 2_500 ? 0 : index === 7_500 ? 100 : 50,
  }));
  const range = getGraphPathRange(points);

  createGraphPath({
    pointsInRange: getPointsInRange(points, range),
    range,
    horizontalPadding: 0,
    verticalPadding: 0,
    canvasHeight: 200,
    canvasWidth: 300,
  });

  expect(mockPath.moveTo).toHaveBeenCalledWith(150, 100);
  expect(mockPath.cubicTo).toHaveBeenCalledTimes(3);
  expect(mockPath.cubicTo).toHaveBeenNthCalledWith(
    1,
    150,
    200,
    150,
    200,
    150,
    200
  );
  expect(mockPath.cubicTo).toHaveBeenNthCalledWith(2, 150, 0, 150, 0, 150, 0);
  expect(mockPath.cubicTo).toHaveBeenNthCalledWith(
    3,
    150,
    100,
    150,
    100,
    150,
    100
  );
});

it('filters different dates from a zero-duration range', () => {
  const date = new Date('2023-01-01');
  const points = [
    { date: new Date('2022-12-31'), value: 1 },
    { date, value: 2 },
    { date: new Date('2023-01-02'), value: 3 },
  ];

  expect(
    getPointsInRange(points, {
      x: { min: date, max: date },
      y: { min: 1, max: 3 },
    })
  ).toEqual([points[1]]);
});
