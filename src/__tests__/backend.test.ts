import { canLerp, cmdsToSvg, lerpPath } from '../backend/tgfx';
import { argb, flatten, parseColor } from '../backend/thor';
import { CUBIC, LINE, MOVE } from '../backend/types';
import type { PathCommand } from '../backend/types';
import { createGraphPath } from '../CreateGraphPath';
import { getYForX } from '../GetYForX';

// Only thor's pure helpers are under test; keep reanimated's ESM out of jest.
jest.mock('react-native-reanimated', () => ({}));

const points = [
  { date: new Date(0), value: 0 },
  { date: new Date(1000), value: 50 },
  { date: new Date(2000), value: 100 },
];

const range = {
  x: { min: new Date(0), max: new Date(2000) },
  y: { min: 0, max: 100 },
};

const cmds = createGraphPath({
  pointsInRange: points,
  range,
  horizontalPadding: 0,
  verticalPadding: 0,
  canvasHeight: 100,
  canvasWidth: 100,
});

describe('graph path commands', () => {
  it('opens with a move and continues with cubics', () => {
    expect(cmds[0]![0]).toBe(MOVE);
    expect(cmds.slice(1).every((cmd) => cmd[0] === CUBIC)).toBe(true);
  });

  it('still resolves a y for an x', () => {
    const y = getYForX(cmds, 50);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(100);
  });
});

describe('tgfx path serialization', () => {
  const a: PathCommand[] = [
    [MOVE, 0, 0],
    [CUBIC, 0, 0, 0, 0, 10, 10],
  ];
  const b: PathCommand[] = [
    [MOVE, 0, 0],
    [CUBIC, 0, 0, 0, 0, 20, 20],
  ];

  it('writes svg path data', () => {
    expect(cmdsToSvg(a)).toBe('M0 0C0 0 0 0 10 10');
    expect(cmdsToSvg(cmds)).toMatch(/^M[\d.-]+ [\d.-]+C/);
  });

  it('blends towards the previous path', () => {
    expect(cmdsToSvg(b, a, 0.5)).toBe('M0 0C0 0 0 0 15 15');
    expect(cmdsToSvg(b, a, 1)).toBe(cmdsToSvg(b));
    expect(lerpPath(b, a, 0)).toEqual(a);
  });

  it('only blends paths with matching verbs', () => {
    expect(canLerp(a, b)).toBe(true);
    expect(canLerp(a, [[MOVE, 0, 0]])).toBe(false);
    expect(canLerp(a, [a[0]!, [MOVE, 1, 1]])).toBe(false);
  });
});

describe('thor path flattening', () => {
  const a: PathCommand[] = [
    [MOVE, 0, 0],
    [CUBIC, 0, 0, 0, 0, 10, 10],
  ];
  const b: PathCommand[] = [
    [MOVE, 0, 0],
    [CUBIC, 0, 0, 0, 0, 20, 20],
  ];

  it('samples cubics into a polyline that ends on the anchor', () => {
    const flat = flatten(a);
    expect(flat.slice(0, 2)).toEqual([0, 0]);
    expect(flat.slice(-2)).toEqual([10, 10]);
    expect(flat.length).toBeGreaterThan(4);
    expect(
      flatten([
        [MOVE, 1, 2],
        [LINE, 3, 4],
      ])
    ).toEqual([1, 2, 3, 4]);
  });

  it('blends towards the previous path', () => {
    expect(flatten(b, a, 0.5).slice(-2)).toEqual([15, 15]);
    expect(flatten(b, a, 1)).toEqual(flatten(b));
  });

  it('converts colours to thor argb hex', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255, 1]);
    expect(parseColor('#7476df33')).toEqual([0x74, 0x76, 0xdf, 0x33 / 255]);
    expect(parseColor('rgba(0, 10, 20, 0.5)')).toEqual([0, 10, 20, 0.5]);
    expect(argb([255, 0, 0, 1], 0.5)).toBe('#80ff0000');
    expect(argb(parseColor('#7476df'), 1)).toBe('#ff7476df');
  });
});
