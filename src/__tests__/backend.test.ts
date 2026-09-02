import { canLerp, cmdsToSvg, lerpPath } from '../backend/tgfx';
import { CUBIC, MOVE } from '../backend/types';
import type { PathCommand } from '../backend/types';
import { createGraphPath } from '../CreateGraphPath';
import { getYForX } from '../GetYForX';

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
