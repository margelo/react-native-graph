import { createElement, type ComponentType } from 'react';
import type {
  CanvasElementProps,
  CircleElementProps,
  GradientElementProps,
  GroupElementProps,
  NativePath,
  PathCommand,
  PathElementProps,
  ShadowElementProps,
} from './types';
import { CUBIC, LINE, MOVE } from './types';

interface TgfxModule {
  Canvas: ComponentType<
    CanvasElementProps & { composite?: 'layer' | 'texture' }
  >;
  Group: ComponentType<GroupElementProps>;
  Path: ComponentType<PathElementProps>;
  Circle: ComponentType<CircleElementProps>;
  LinearGradient: ComponentType<GradientElementProps>;
  DropShadow: ComponentType<ShadowElementProps>;
}

// Required rather than imported so Metro treats the renderer as optional: the
// default Skia backend must bundle without react-native-tgfx installed.
let mod: TgfxModule | undefined;
try {
  mod = require('react-native-tgfx') as TgfxModule;
} catch {
  mod = undefined;
}

export const available = mod != null;

// `composite="texture"` keeps the canvas inside the view hierarchy on Android,
// so the app background shows through transparent pixels the way it does under
// Skia. The default `"layer"` punches through the window instead.
export const Canvas: ComponentType<CanvasElementProps> = (props) =>
  createElement(mod!.Canvas, { composite: 'texture', ...props });

export const Group = mod?.Group as ComponentType<GroupElementProps>;
export const Path = mod?.Path as ComponentType<PathElementProps>;
export const Circle = mod?.Circle as ComponentType<CircleElementProps>;
export const LinearGradient =
  mod?.LinearGradient as ComponentType<GradientElementProps>;
export const Shadow = mod?.DropShadow as ComponentType<ShadowElementProps>;

/** One coordinate, optionally blended towards `from`, rounded to sub-pixel. */
function at(
  cmd: PathCommand,
  from: PathCommand | undefined,
  index: number,
  t: number
): number {
  'worklet';

  const value = cmd[index]!;
  if (from == null) return Math.round(value * 100) / 100;
  const other = from[index]!;
  return Math.round((other + (value - other) * t) * 100) / 100;
}

/**
 * Serialize commands to SVG path data, blending towards `from` in the same
 * pass when one is given. tgfx re-parses the string on the render thread, so
 * writing it to a shared value costs no scene re-encode.
 *
 * ponytail: string building is O(points) per animated frame; move the blend
 * native if a long transition ever shows up on the UI thread.
 */
export function cmdsToSvg(
  cmds: PathCommand[],
  from?: PathCommand[],
  t = 1
): string {
  'worklet';

  const blend = from != null && t < 1 && from.length === cmds.length;
  let data = '';
  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i]!;
    const prev = blend ? from![i] : undefined;
    switch (cmd[0]) {
      case MOVE:
        data += `M${at(cmd, prev, 1, t)} ${at(cmd, prev, 2, t)}`;
        break;
      case LINE:
        data += `L${at(cmd, prev, 1, t)} ${at(cmd, prev, 2, t)}`;
        break;
      case CUBIC:
        data +=
          `C${at(cmd, prev, 1, t)} ${at(cmd, prev, 2, t)}` +
          ` ${at(cmd, prev, 3, t)} ${at(cmd, prev, 4, t)}` +
          ` ${at(cmd, prev, 5, t)} ${at(cmd, prev, 6, t)}`;
        break;
      default:
        break;
    }
  }
  return data;
}

export function makePath(cmds: PathCommand[]): NativePath {
  return cmds;
}

export function toPathProp(path: NativePath): NativePath {
  'worklet';

  return cmdsToSvg(path as PathCommand[]);
}

export function lerpPath(
  to: NativePath,
  from: NativePath,
  t: number
): NativePath {
  'worklet';

  const target = to as PathCommand[];
  const source = from as PathCommand[];
  if (t >= 1 || target.length !== source.length) return target;

  const out: PathCommand[] = [];
  for (let i = 0; i < target.length; i++) {
    const cmd = target[i]!;
    const prev = source[i]!;
    const blended: PathCommand = [cmd[0]!];
    for (let j = 1; j < cmd.length; j++) {
      const other = prev[j]!;
      blended.push(other + (cmd[j]! - other) * t);
    }
    out.push(blended);
  }
  return out;
}

export function lerpPathProp(
  to: NativePath,
  from: NativePath,
  t: number
): NativePath {
  'worklet';

  return cmdsToSvg(to as PathCommand[], from as PathCommand[], t);
}

export function canLerp(a: NativePath, b: NativePath): boolean {
  const left = a as PathCommand[];
  const right = b as PathCommand[];
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (left[i]![0] !== right[i]![0]) return false;
  }
  return true;
}
