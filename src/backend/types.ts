import type { ComponentType, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * A colour accepted by the graph. Kept structural so the public API does not
 * depend on whichever renderer is installed.
 */
export type Color = string | number | number[] | Float32Array;

export interface Vector {
  x: number;
  y: number;
}

export function vec(x = 0, y = x): Vector {
  'worklet';

  return { x, y };
}

export const mix = (value: number, from: number, to: number): number => {
  'worklet';

  return from + (to - from) * value;
};

/** Verb encoding shared by both renderers (`Skia.Path.MakeFromCmds` reads it). */
export const MOVE = 0;
export const LINE = 1;
export const CUBIC = 4;

/** `[verb, ...coords]`. The graph's own path representation. */
export type PathCommand = number[];

/**
 * A renderer's path object. Opaque here: Skia gets an `SkPath`, tgfx keeps the
 * commands and serializes them to SVG data.
 */
export type NativePath = unknown;

/** A value that may be a plain `T` or a Reanimated shared value holding `T`. */
export type Animatable<T> = T | { value: T };

export interface PaintElementProps {
  color?: Color;
  opacity?: Animatable<number>;
  style?: 'fill' | 'stroke';
  strokeWidth?: number;
  strokeJoin?: 'miter' | 'round' | 'bevel';
  strokeCap?: 'butt' | 'round' | 'square';
  children?: ReactNode;
}

export interface CanvasElementProps {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

export interface GroupElementProps {
  children?: ReactNode;
}

export interface PathElementProps extends PaintElementProps {
  path: Animatable<NativePath>;
}

export interface CircleElementProps extends PaintElementProps {
  cx: Animatable<number>;
  cy: Animatable<number>;
  r: Animatable<number>;
}

export interface GradientElementProps {
  start: Vector;
  end: Vector;
  colors: Color[];
  positions?: unknown;
}

export interface ShadowElementProps {
  dx: number;
  dy: number;
  blur: number;
  color: string;
}

/** Everything `LineGraph` needs from a renderer. */
export interface GraphBackend {
  Canvas: ComponentType<CanvasElementProps>;
  Group: ComponentType<GroupElementProps>;
  Path: ComponentType<PathElementProps>;
  Circle: ComponentType<CircleElementProps>;
  LinearGradient: ComponentType<GradientElementProps>;
  Shadow: ComponentType<ShadowElementProps>;

  /** Turn graph commands into whatever this renderer holds on to. */
  makePath(cmds: PathCommand[]): NativePath;
  /** Turn a path into the value the `path` prop of `Path` accepts. */
  toPathProp(path: NativePath): NativePath;
  /** Weighted average of two paths, `t` of 1 being `to`. Runs on the JS thread. */
  lerpPath(to: NativePath, from: NativePath, t: number): NativePath;
  /** Same blend, but returning a `path` prop value. Runs per frame on the UI thread. */
  lerpPathProp(to: NativePath, from: NativePath, t: number): NativePath;
  /** Whether the two paths have matching verbs and can be blended at all. */
  canLerp(a: NativePath, b: NativePath): boolean;
}
