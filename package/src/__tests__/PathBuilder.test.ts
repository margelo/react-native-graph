// Mirrors the react-native-skia v3 API: SkPath is immutable (no moveTo,
// cubicTo or lineTo) and paths are created with Skia.PathBuilder.
interface MockBuilder {
  from: object | undefined;
  moveTo: jest.Mock;
  lineTo: jest.Mock;
  cubicTo: jest.Mock;
  build: jest.Mock;
}

const mockBuiltPaths: object[] = [];
const mockBuilders: MockBuilder[] = [];

function mockMakeBuilder(from?: object): MockBuilder {
  const builder: MockBuilder = {
    from,
    moveTo: jest.fn(() => builder),
    lineTo: jest.fn(() => builder),
    cubicTo: jest.fn(() => builder),
    build: jest.fn(() => {
      const path = {};
      mockBuiltPaths.push(path);
      return path;
    }),
  };
  mockBuilders.push(builder);
  return builder;
}

jest.mock('@shopify/react-native-skia', () => ({
  Skia: {
    Path: {
      Make: () => {
        throw new Error('Skia.Path.Make() should not be used with v3');
      },
    },
    PathBuilder: {
      Make: () => mockMakeBuilder(),
      MakeFromPath: (path: object) => mockMakeBuilder(path),
    },
  },
}));

import {
  createGraphPath,
  createGraphPathWithGradient,
  getGraphPathRange,
  getPointsInRange,
} from '../CreateGraphPath';

beforeEach(() => {
  mockBuiltPaths.length = 0;
  mockBuilders.length = 0;
});

const points = [
  { date: new Date('2024-01-01'), value: 10 },
  { date: new Date('2024-01-02'), value: 30 },
  { date: new Date('2024-01-03'), value: 20 },
];
const range = getGraphPathRange(points);
const config = {
  pointsInRange: getPointsInRange(points, range),
  range,
  horizontalPadding: 0,
  verticalPadding: 0,
  canvasHeight: 200,
  canvasWidth: 300,
};

it('builds the graph path with Skia.PathBuilder', () => {
  const path = createGraphPath(config);

  expect(mockBuilders).toHaveLength(1);
  const builder = mockBuilders[0]!;
  expect(builder.moveTo).toHaveBeenCalledTimes(1);
  expect(builder.cubicTo).toHaveBeenCalled();
  expect(builder.build).toHaveBeenCalledTimes(1);
  expect(path).toBe(mockBuiltPaths[0]);
});

it('builds the gradient path from the line path without mutating it', () => {
  const { path, gradientPath } = createGraphPathWithGradient(config);

  expect(mockBuilders).toHaveLength(2);
  const [lineBuilder, gradientBuilder] = mockBuilders;
  expect(lineBuilder!.lineTo).not.toHaveBeenCalled();
  expect(gradientBuilder!.from).toBe(path);
  expect(gradientBuilder!.lineTo).toHaveBeenNthCalledWith(1, 300, 200);
  expect(gradientBuilder!.lineTo).toHaveBeenNthCalledWith(2, 0, 200);
  expect(gradientPath).not.toBe(path);
  expect(gradientPath).toBe(mockBuiltPaths[1]);
});

it('returns an empty built path when there are no points', () => {
  const path = createGraphPath({ ...config, pointsInRange: [] });

  expect(mockBuilders[0]!.moveTo).not.toHaveBeenCalled();
  expect(path).toBe(mockBuiltPaths[0]);
});
