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
  createGraphPathWithGradient,
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

it('copies the line path for the gradient when Skia.PathBuilder is missing', () => {
  const gradientCopy = { lineTo: jest.fn() };
  mockPath.copy.mockReturnValueOnce(gradientCopy);
  const points = [
    { date: new Date('2024-01-01'), value: 10 },
    { date: new Date('2024-01-02'), value: 20 },
  ];
  const range = getGraphPathRange(points);

  const { path, gradientPath } = createGraphPathWithGradient({
    pointsInRange: getPointsInRange(points, range),
    range,
    horizontalPadding: 0,
    verticalPadding: 0,
    canvasHeight: 200,
    canvasWidth: 300,
  });

  expect(path).toBe(mockPath);
  expect(mockPath.lineTo).not.toHaveBeenCalled();
  expect(gradientPath).toBe(gradientCopy);
  expect(gradientCopy.lineTo).toHaveBeenNthCalledWith(1, 300, 200);
  expect(gradientCopy.lineTo).toHaveBeenNthCalledWith(2, 0, 200);
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

it('uses date-derived positions for every point when sampling is disabled', () => {
  const points = [
    { date: new Date(0), value: 0 },
    { date: new Date(9), value: 100 },
    { date: new Date(10), value: 0 },
  ];

  createGraphPath({
    pointsInRange: points,
    range: getGraphPathRange(points),
    horizontalPadding: 5,
    verticalPadding: 5,
    canvasHeight: 210,
    canvasWidth: 110,
    checkExactPoints: false,
  });

  expect(mockPath.moveTo).toHaveBeenCalledWith(5, 205);
  expect(mockPath.cubicTo).toHaveBeenCalledTimes(3);
  expect(mockPath.cubicTo).toHaveBeenNthCalledWith(
    2,
    35,
    415 / 3,
    65,
    215 / 3,
    490 / 6,
    430 / 6
  );
  expect(mockPath.cubicTo).toHaveBeenLastCalledWith(
    105,
    205,
    105,
    205,
    105,
    205
  );
});

it('preserves a dense spike that the default sampling skips', () => {
  const points = Array.from({ length: 11 }, (_, index) => ({
    date: new Date(index),
    value: index === 1 ? 100 : 0,
  }));
  const config = {
    pointsInRange: points,
    range: getGraphPathRange(points),
    horizontalPadding: 0,
    verticalPadding: 0,
    canvasHeight: 100,
    canvasWidth: 4,
  };

  createGraphPath(config);
  const defaultCalls = [...mockPath.cubicTo.mock.calls];
  expect(defaultCalls).toHaveLength(3);
  expect(
    defaultCalls.every(
      (call) => call[1] === 100 && call[3] === 100 && call[5] === 100
    )
  ).toBe(true);

  jest.clearAllMocks();
  createGraphPath({ ...config, checkExactPoints: true });
  expect(mockPath.cubicTo.mock.calls).toEqual(defaultCalls);

  jest.clearAllMocks();
  createGraphPath({ ...config, checkExactPoints: false });
  expect(mockPath.cubicTo).toHaveBeenCalledTimes(points.length);
  expect(
    mockPath.cubicTo.mock.calls.some(
      (call) => call[1] < 100 || call[3] < 100 || call[5] < 100
    )
  ).toBe(true);
});

it('fills the same full-point path when a gradient is requested', () => {
  const points = [
    { date: new Date(0), value: 0 },
    { date: new Date(1), value: 100 },
    { date: new Date(10), value: 0 },
  ];
  const gradientPath = { lineTo: jest.fn() };
  mockPath.copy.mockReturnValue(gradientPath);
  const config = {
    pointsInRange: points,
    range: getGraphPathRange(points),
    horizontalPadding: 5,
    verticalPadding: 5,
    canvasHeight: 210,
    canvasWidth: 110,
    checkExactPoints: false,
  };

  createGraphPath(config);
  const lineCalls = [...mockPath.cubicTo.mock.calls];
  jest.clearAllMocks();

  const result = createGraphPathWithGradient(config);
  expect(result).toEqual({ path: mockPath, gradientPath });
  expect(mockPath.cubicTo.mock.calls).toEqual(lineCalls);
  expect(mockPath.copy).toHaveBeenCalledTimes(1);
  expect(gradientPath.lineTo).toHaveBeenNthCalledWith(1, 105, 215);
  expect(gradientPath.lineTo).toHaveBeenNthCalledWith(2, 5, 215);
});

it('uses every same-date point only when sampling is explicitly disabled', () => {
  const points = Array.from({ length: 20 }, (_, index) => ({
    date: new Date(0),
    value: index % 3,
  }));

  createGraphPath({
    pointsInRange: points,
    range: getGraphPathRange(points),
    horizontalPadding: 0,
    verticalPadding: 0,
    canvasHeight: 100,
    canvasWidth: 100,
    checkExactPoints: false,
  });

  expect(mockPath.moveTo).toHaveBeenCalledWith(50, 100);
  expect(mockPath.cubicTo).toHaveBeenCalledTimes(points.length - 1);
  expect(
    mockPath.cubicTo.mock.calls.every(
      (call) =>
        call[0] === 50 &&
        call[2] === 50 &&
        call[4] === 50 &&
        call.every(Number.isFinite)
    )
  ).toBe(true);
});
