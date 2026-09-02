import type { ComponentType } from 'react';
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

interface SkPath {
  interpolate(ending: SkPath, weight: number): SkPath | null;
  isInterpolatable(compare: SkPath): boolean;
}

interface SkiaModule {
  Canvas: ComponentType<CanvasElementProps>;
  Group: ComponentType<GroupElementProps>;
  Path: ComponentType<PathElementProps>;
  Circle: ComponentType<CircleElementProps>;
  LinearGradient: ComponentType<GradientElementProps>;
  Shadow: ComponentType<ShadowElementProps>;
  Skia: {
    Path: {
      Make(): SkPath;
      MakeFromCmds(cmds: PathCommand[]): SkPath | null;
    };
  };
}

// Required rather than imported so Metro treats the renderer as optional: an
// app that only installs the tgfx backend must still bundle.
let mod: SkiaModule | undefined;
try {
  mod = require('@shopify/react-native-skia') as SkiaModule;
} catch {
  mod = undefined;
}

export const available = mod != null;

export const Canvas = mod?.Canvas as ComponentType<CanvasElementProps>;
export const Group = mod?.Group as ComponentType<GroupElementProps>;
export const Path = mod?.Path as ComponentType<PathElementProps>;
export const Circle = mod?.Circle as ComponentType<CircleElementProps>;
export const LinearGradient =
  mod?.LinearGradient as ComponentType<GradientElementProps>;
export const Shadow = mod?.Shadow as ComponentType<ShadowElementProps>;

export function makePath(cmds: PathCommand[]): NativePath {
  const factory = mod!.Skia.Path;
  return factory.MakeFromCmds(cmds) ?? factory.Make();
}

export function toPathProp(path: NativePath): NativePath {
  'worklet';

  return path;
}

export function lerpPath(
  to: NativePath,
  from: NativePath,
  t: number
): NativePath {
  'worklet';

  return (to as SkPath).interpolate(from as SkPath, t) ?? to;
}

export function lerpPathProp(
  to: NativePath,
  from: NativePath,
  t: number
): NativePath {
  'worklet';

  return (to as SkPath).interpolate(from as SkPath, t) ?? to;
}

export function canLerp(a: NativePath, b: NativePath): boolean {
  return (a as SkPath).isInterpolatable(b as SkPath);
}
