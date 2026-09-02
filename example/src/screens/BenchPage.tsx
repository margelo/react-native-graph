import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  runOnJS,
  runOnUI,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { GRAPH_BACKEND, LineGraph } from 'react-native-graph';
import type { GraphPoint } from 'react-native-graph';

const WARMUP_MS = 2500;
const MEASURE_MS = 8000;
const PUSH_MS = 100;

interface Scenario {
  name: string;
  points: number;
  live: boolean;
  pulsating: boolean;
}

const SCENARIOS: Scenario[] = [
  { name: 'live-70', points: 70, live: true, pulsating: false },
  { name: 'live-300', points: 300, live: true, pulsating: false },
  { name: 'pulse-static', points: 70, live: false, pulsating: true },
];

const GRADIENT_FILL_COLORS = ['#7476df5D', '#7476df4D', '#7476df00'];

/**
 * Frame tallies live on the UI runtime, not in shared values: a shared-value
 * write per frame syncs to the JS thread and would distort what it measures.
 */
interface Tally {
  n: number;
  sum: number;
  worst: number;
  over16: number;
  over20: number;
  over33: number;
  over50: number;
}

function emptyTally(): Tally {
  'worklet';

  return { n: 0, sum: 0, worst: 0, over16: 0, over20: 0, over33: 0, over50: 0 };
}

function tally(): Tally {
  'worklet';

  const host = globalThis as unknown as { __graphBench?: Tally };
  if (host.__graphBench == null) host.__graphBench = emptyTally();
  return host.__graphBench;
}

/** Deterministic walk, so both backends measure the exact same geometry. */
function makeGenerator(seed: number): () => number {
  let state = seed;
  let value = 0;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    value += (state / 4294967296) * 20 - 10;
    return value;
  };
}

function makePoints(count: number, next: () => number): GraphPoint[] {
  const now = Date.now();
  const out: GraphPoint[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ date: new Date(now - (count - i) * 1000), value: next() });
  }
  return out;
}

interface Result {
  scenario: string;
  uiFps: number;
  meanMs: number;
  worstMs: number;
  over16: number;
  over20: number;
  over33: number;
  over50: number;
  jsFps: number;
}

export function BenchPage(): React.ReactElement {
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState('starting');
  const [results, setResults] = useState<Result[]>([]);
  const [points, setPoints] = useState<GraphPoint[]>([]);

  const scenario = SCENARIOS[index];
  const active = useSharedValue(false);
  const jsFrames = useRef(0);

  useFrameCallback((frame) => {
    'worklet';

    if (!active.value) return;
    const dt = frame.timeSincePreviousFrame;
    if (dt == null || dt <= 0) return;

    const t = tally();
    t.n += 1;
    t.sum += dt;
    if (dt > t.worst) t.worst = dt;
    if (dt > 16.7) t.over16 += 1;
    if (dt > 20) t.over20 += 1;
    if (dt > 33) t.over33 += 1;
    if (dt > 50) t.over50 += 1;
  });

  const record = useCallback((name: string, raw: Tally, jsFps: number) => {
    const n = raw.n;
    const mean = n > 0 ? raw.sum / n : 0;
    const pct = (v: number) => (n > 0 ? Math.round((v / n) * 1000) / 10 : 0);
    const result: Result = {
      scenario: name,
      uiFps: mean > 0 ? Math.round((1000 / mean) * 10) / 10 : 0,
      meanMs: Math.round(mean * 100) / 100,
      worstMs: Math.round(raw.worst),
      over16: pct(raw.over16),
      over20: pct(raw.over20),
      over33: pct(raw.over33),
      over50: pct(raw.over50),
      jsFps,
    };
    console.log(`BENCH ${GRAPH_BACKEND} ${JSON.stringify(result)}`);
    setResults((prev) => [...prev, result]);
    setIndex((i) => i + 1);
  }, []);

  useEffect(() => {
    if (scenario == null) return;

    const next = makeGenerator(12345);
    let live = makePoints(scenario.points, next);
    setPoints(live);
    setStatus(`${scenario.name}: warmup`);

    const push = scenario.live
      ? setInterval(() => {
          live = [...live.slice(1), { date: new Date(), value: next() }];
          setPoints(live);
        }, PUSH_MS)
      : undefined;

    let raf = 0;
    const tick = () => {
      jsFrames.current += 1;
      raf = requestAnimationFrame(tick);
    };

    const startMeasuring = setTimeout(() => {
      runOnUI(() => {
        'worklet';

        const host = globalThis as unknown as { __graphBench?: Tally };
        host.__graphBench = emptyTally();
      })();
      jsFrames.current = 0;
      active.value = true;
      raf = requestAnimationFrame(tick);
      setStatus(`${scenario.name}: measuring`);
    }, WARMUP_MS);

    const name = scenario.name;
    const stopMeasuring = setTimeout(() => {
      active.value = false;
      cancelAnimationFrame(raf);
      const jsFps =
        Math.round((jsFrames.current / (MEASURE_MS / 1000)) * 10) / 10;
      runOnUI(() => {
        'worklet';

        runOnJS(record)(name, tally(), jsFps);
      })();
    }, WARMUP_MS + MEASURE_MS);

    return () => {
      if (push != null) clearInterval(push);
      clearTimeout(startMeasuring);
      clearTimeout(stopMeasuring);
      cancelAnimationFrame(raf);
      active.value = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    if (scenario == null) {
      setStatus('done');
      console.log(`BENCH ${GRAPH_BACKEND} COMPLETE`);
    }
  }, [scenario]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        backend: {GRAPH_BACKEND} — {status}
      </Text>

      <LineGraph
        style={styles.graph}
        animated={true}
        color="#6a7ee7"
        points={points}
        gradientFillColors={GRADIENT_FILL_COLORS}
        enablePanGesture={false}
        enableIndicator={true}
        indicatorPulsating={scenario?.pulsating === true}
        horizontalPadding={15}
      />

      {results.map((r) => (
        <Text key={r.scenario} style={styles.row}>
          {r.scenario}: {r.uiFps} fps · mean {r.meanMs}ms · worst {r.worstMs}ms
          ·{' >20ms '}
          {r.over20}% · {'>33ms '}
          {r.over33}% · js {r.jsFps} fps
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111111',
  },
  graph: {
    width: '100%',
    aspectRatio: 1.4,
  },
  row: {
    fontSize: 12,
    marginTop: 6,
    color: '#111111',
  },
});
