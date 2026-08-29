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

import { createGraphPath } from '../CreateGraphPath';

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

it('connects measured samples directly when curve is linear', () => {
  const result = createGraphPath({
    pointsInRange: [
      { date: new Date(0), value: 10 },
      { date: new Date(1_000), value: 20 },
      { date: new Date(10_000), value: 15 },
    ],
    range: {
      x: { min: new Date(0), max: new Date(10_000) },
      y: { min: 10, max: 20 },
    },
    curve: 'linear',
    horizontalPadding: 0,
    verticalPadding: 0,
    canvasHeight: 100,
    canvasWidth: 100,
  });

  expect(result).toBe(mockPath);
  expect(mockPath.moveTo).toHaveBeenCalledWith(0, 100);
  expect(mockPath.lineTo).toHaveBeenNthCalledWith(1, 10, 0);
  expect(mockPath.lineTo).toHaveBeenNthCalledWith(2, 100, 50);
  expect(mockPath.cubicTo).not.toHaveBeenCalled();
});
