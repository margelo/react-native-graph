import {
  Children,
  createContext,
  createElement,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
import type {
  Animatable,
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

export { canLerp, lerpPath, makePath } from './tgfx';

interface ThorShape {
  type: 'circle' | 'polygon';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cx?: number;
  cy?: number;
  radius?: number;
  points?: number[];
  closed?: boolean;
}

interface ThorView {
  drawShapes(shapes: ThorShape[]): void;
}

interface ThorModule {
  ThorCanvasNative: ComponentType<
    CanvasElementProps & {
      shapes: ThorShape[];
      backend?: 'cpu' | 'gpu';
      hybridRef: unknown;
    }
  >;
}

interface NitroModule {
  callback<T>(f: T): unknown;
}

// Required rather than imported so Metro treats the renderer as optional: the
// default Skia backend must bundle without react-native-nitro-thor installed.
let mod: ThorModule | undefined;
let nitro: NitroModule | undefined;
try {
  mod = require('react-native-nitro-thor') as ThorModule;
  nitro = require('react-native-nitro-modules') as NitroModule;
} catch {
  mod = undefined;
}

export const available = mod != null;

/**
 * What a shape shim registers with its canvas. Animatable fields are read on
 * the UI thread every time one of them changes, so the scene is redrawn
 * through thor's imperative `drawShapes` without touching React.
 */
interface Shape {
  order: number;
  type: ThorShape['type'];
  rgba: number[];
  opacity?: Animatable<number>;
  stroke: boolean;
  strokeWidth?: number;
  cx?: Animatable<number>;
  cy?: Animatable<number>;
  radius?: Animatable<number>;
  points?: Animatable<number[]>;
  closed?: boolean;
}

interface Registry {
  add(id: string, shape: Shape): void;
  remove(id: string): void;
}

const RegistryContext = createContext<Registry>({
  add: () => {},
  remove: () => {},
});

const NO_SHAPES: ThorShape[] = [];
let nextOrder = 0;

declare const process: { env: Record<string, string | undefined> };

/** Thor rasterizes on the CPU unless the build asks for its GL engine (Android). */
function thorBackend(): 'gpu' | undefined {
  try {
    return process.env.EXPO_PUBLIC_RN_GRAPH_THOR_GPU === '1'
      ? 'gpu'
      : undefined;
  } catch {
    return undefined;
  }
}

/** `#rgb`, `#rrggbb`, `#rrggbbaa` or `rgb[a](…)` to `[r, g, b, a]`. */
export function parseColor(color: string): number[] {
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
    const byte = (i: number) => parseInt(hex.slice(i, i + 2), 16);
    return [byte(0), byte(2), byte(4), hex.length === 8 ? byte(6) / 255 : 1];
  }
  const parts = color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0];
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
}

/** Thor wants `#aarrggbb`. Opacity multiplies the colour's own alpha. */
export function argb(rgba: number[], opacity: number): string {
  'worklet';

  const hex = (v: number) => (Math.round(v) + 0x100).toString(16).slice(1);
  return `#${hex(rgba[3]! * opacity * 255)}${hex(rgba[0]!)}${hex(
    rgba[1]!
  )}${hex(rgba[2]!)}`;
}

function get<T>(value: Animatable<T> | undefined): T | undefined {
  'worklet';

  if (value != null && typeof value === 'object' && 'value' in value)
    return (value as { value: T }).value;
  return value as T | undefined;
}

function resolve(shape: Shape): ThorShape {
  'worklet';

  const color = argb(shape.rgba, get(shape.opacity) ?? 1);
  return {
    type: shape.type,
    fill: shape.stroke ? undefined : color,
    stroke: shape.stroke ? color : undefined,
    strokeWidth: shape.strokeWidth,
    cx: get(shape.cx),
    cy: get(shape.cy),
    radius: get(shape.radius),
    points: get(shape.points),
    closed: shape.closed,
  };
}

export const Canvas: ComponentType<CanvasElementProps> = ({
  style,
  children,
}) => {
  const view = useSharedValue<ThorView | null>(null);
  const [registry, setRegistry] = useState<Map<string, Shape>>(new Map());

  const context = useMemo<Registry>(
    () => ({
      add: (id, shape) => setRegistry((m) => new Map(m).set(id, shape)),
      remove: (id) =>
        setRegistry((m) => {
          const next = new Map(m);
          next.delete(id);
          return next;
        }),
    }),
    []
  );

  const shapes = useMemo(
    () => [...registry.values()].sort((a, b) => a.order - b.order),
    [registry]
  );

  useAnimatedReaction(
    () => (view.value == null ? null : shapes.map(resolve)),
    (scene) => {
      if (scene != null) view.value?.drawShapes(scene);
    },
    [shapes]
  );

  const onRef = useCallback(
    (ref: ThorView) => {
      view.value = ref;
    },
    [view]
  );

  return createElement(
    RegistryContext.Provider,
    { value: context },
    createElement(mod!.ThorCanvasNative, {
      style,
      backend: thorBackend(),
      shapes: NO_SHAPES,
      hybridRef: nitro!.callback(onRef),
    }),
    children
  );
};

function useShape(shape: Omit<Shape, 'order'>): void {
  const id = useId();
  const order = useRef<number | null>(null);
  if (order.current == null) order.current = nextOrder++;
  const { add, remove } = useContext(RegistryContext);
  const {
    type,
    rgba,
    opacity,
    stroke,
    strokeWidth,
    cx,
    cy,
    radius,
    points,
    closed,
  } = shape;

  useLayoutEffect(() => {
    add(id, {
      order: order.current!,
      type,
      rgba,
      opacity,
      stroke,
      strokeWidth,
      cx,
      cy,
      radius,
      points,
      closed,
    });
    return () => remove(id);
  }, [
    add,
    remove,
    id,
    type,
    rgba,
    opacity,
    stroke,
    strokeWidth,
    cx,
    cy,
    radius,
    points,
    closed,
  ]);
}

/** Thor has no gradients; the middle stop stands in for the whole ramp. */
function gradientColor(children: PathElementProps['children']): string {
  const gradient = Children.toArray(children).find(
    (child) => isValidElement(child) && child.type === LinearGradient
  );
  const colors = (gradient as { props?: GradientElementProps } | undefined)
    ?.props?.colors;
  return String(colors?.[Math.floor(colors.length / 2)] ?? '#000000');
}

export const Group: ComponentType<GroupElementProps> = ({ children }) =>
  children;

export const LinearGradient: ComponentType<GradientElementProps> = () => null;

export const Shadow: ComponentType<ShadowElementProps> = () => null;

export const Path: ComponentType<PathElementProps> = (props) => {
  const color =
    props.color != null ? String(props.color) : gradientColor(props.children);
  const rgba = useMemo(() => parseColor(color), [color]);
  const stroke = props.style === 'stroke';
  useShape({
    type: 'polygon',
    rgba,
    opacity: props.opacity,
    stroke,
    strokeWidth: props.strokeWidth,
    points: props.path as Animatable<number[]>,
    closed: !stroke,
  });
  return null;
};

export const Circle: ComponentType<CircleElementProps> = (props) => {
  const color = String(props.color ?? '#000000');
  const rgba = useMemo(() => parseColor(color), [color]);
  useShape({
    type: 'circle',
    rgba,
    opacity: props.opacity,
    stroke: props.style === 'stroke',
    strokeWidth: props.strokeWidth,
    cx: props.cx,
    cy: props.cy,
    radius: props.r,
  });
  return null;
};

function at(cmd: PathCommand, prev: PathCommand, index: number, t: number) {
  'worklet';

  const other = prev[index]!;
  return other + (cmd[index]! - other) * t;
}

/**
 * Flatten commands to a `[x0, y0, x1, y1, …]` polyline, blending towards
 * `from` in the same pass when one is given. Thor only draws straight
 * segments, so each cubic is sampled about every four points of arc.
 */
export function flatten(
  cmds: PathCommand[],
  from?: PathCommand[],
  t = 1
): number[] {
  'worklet';

  const blend = from != null && t < 1 && from.length === cmds.length;
  const points: number[] = [];
  let x0 = 0;
  let y0 = 0;
  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i]!;
    const prev = blend ? from![i]! : cmd;
    const k = blend ? t : 1;
    switch (cmd[0]) {
      case MOVE:
      case LINE:
        x0 = at(cmd, prev, 1, k);
        y0 = at(cmd, prev, 2, k);
        points.push(x0, y0);
        break;
      case CUBIC: {
        const x1 = at(cmd, prev, 1, k);
        const y1 = at(cmd, prev, 2, k);
        const x2 = at(cmd, prev, 3, k);
        const y2 = at(cmd, prev, 4, k);
        const x3 = at(cmd, prev, 5, k);
        const y3 = at(cmd, prev, 6, k);
        const n = Math.min(
          16,
          Math.max(1, Math.ceil((Math.abs(x3 - x0) + Math.abs(y3 - y0)) / 4))
        );
        for (let step = 1; step <= n; step++) {
          const s = step / n;
          const u = 1 - s;
          const a = u * u * u;
          const b = 3 * u * u * s;
          const c = 3 * u * s * s;
          const d = s * s * s;
          points.push(
            a * x0 + b * x1 + c * x2 + d * x3,
            a * y0 + b * y1 + c * y2 + d * y3
          );
        }
        x0 = x3;
        y0 = y3;
        break;
      }
      default:
        break;
    }
  }
  return points;
}

export function toPathProp(path: NativePath): NativePath {
  'worklet';

  return flatten(path as PathCommand[]);
}

export function lerpPathProp(
  to: NativePath,
  from: NativePath,
  t: number
): NativePath {
  'worklet';

  return flatten(to as PathCommand[], from as PathCommand[], t);
}
