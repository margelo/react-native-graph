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

it('preserves intermediate points with irregular timestamp spacing', () => {
  const points = [
    { date: new Date(0), value: 0 },
    { date: new Date(3), value: 100 },
    { date: new Date(10), value: 0 },
  ];

  createGraphPath({
    pointsInRange: points,
    range: {
      x: { min: points[0]!.date, max: points[2]!.date },
      y: { min: 0, max: 100 },
    },
    horizontalPadding: 0,
    verticalPadding: 0,
    canvasHeight: 100,
    canvasWidth: 10,
  });

  expect(mockPath.cubicTo).toHaveBeenCalledTimes(3);
});
