import * as skia from './skia';
import * as tgfx from './tgfx';
import * as thor from './thor';
import type { GraphBackend } from './types';

// Declared locally so the member expression survives for build-time inlining
// (babel-preset-expo does `EXPO_PUBLIC_*`, bare React Native needs
// babel-plugin-transform-inline-environment-variables).
declare const process: { env: Record<string, string | undefined> };

function requested(): string | undefined {
  try {
    return (
      process.env.EXPO_PUBLIC_RN_GRAPH_BACKEND ?? process.env.RN_GRAPH_BACKEND
    );
  } catch {
    return undefined;
  }
}

const wanted = requested();
const wantsTgfx = wanted === 'tgfx';
const wantsThor = wanted === 'thor';

if ((wantsTgfx && !tgfx.available) || (wantsThor && !thor.available)) {
  console.warn(
    `[react-native-graph] backend "${wanted}" was requested but its renderer is not installed. Falling back to Skia.`
  );
}

/** Whether the graph is rendering through react-native-tgfx. */
export const USE_TGFX = wantsTgfx && tgfx.available;

/** Whether the graph is rendering through react-native-nitro-thor. */
export const USE_THOR = wantsThor && thor.available;

/** Which renderer the graph resolved to. Useful for checking the flag took effect. */
export const GRAPH_BACKEND: 'skia' | 'tgfx' | 'thor' = USE_TGFX
  ? 'tgfx'
  : USE_THOR
  ? 'thor'
  : 'skia';

const impl: GraphBackend = USE_TGFX ? tgfx : USE_THOR ? thor : skia;

export const Canvas = impl.Canvas;
export const Group = impl.Group;
export const Path = impl.Path;
export const Circle = impl.Circle;
export const LinearGradient = impl.LinearGradient;
export const Shadow = impl.Shadow;

export const makePath = impl.makePath;
export const toPathProp = impl.toPathProp;
export const lerpPath = impl.lerpPath;
export const lerpPathProp = impl.lerpPathProp;
export const canLerp = impl.canLerp;

export { CUBIC, LINE, MOVE, mix, vec } from './types';
export type {
  Animatable,
  Color,
  GraphBackend,
  NativePath,
  PathCommand,
  Vector,
} from './types';
