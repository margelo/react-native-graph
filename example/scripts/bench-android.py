#!/usr/bin/env python3
"""Drive the example's BenchPage on an Android device and collect, per scenario:
CPU % (whole process and top threads), PSS memory, SurfaceFlinger presented FPS,
plus the UI-thread and JS-thread FPS the page reports itself.

Install a release APK built with EXPO_PUBLIC_RN_GRAPH_BENCH=1 and
EXPO_PUBLIC_RN_GRAPH_BACKEND=<backend> first, then:

    python3 scripts/bench-android.py <backend> [device-serial] > results/<backend>.json
"""
import json
import re
import subprocess
import sys
import time

PKG = 'graph.example'
BACKEND = sys.argv[1]
ADB = ['adb'] + (['-s', sys.argv[2]] if len(sys.argv) > 2 else [])
CLK_TCK = 100


def sh(*args):
    return subprocess.run(ADB + ['shell', *args], capture_output=True, text=True).stdout


def pid():
    for _ in range(50):
        out = sh('pidof', PKG).strip()
        if out:
            return out.split()[0]
        time.sleep(0.2)
    raise SystemExit('app did not start')


def thread_ticks(p):
    """tid -> (comm, utime+stime) for every thread, plus the process total."""
    ticks = {}
    for line in sh('cat', f'/proc/{p}/task/*/stat').splitlines():
        head, _, rest = line.rpartition(')')
        tid, _, comm = head.partition(' (')
        fields = rest.split()
        ticks[tid] = (comm, int(fields[11]) + int(fields[12]))
    return ticks


def cpu_percent(before, after, seconds):
    total = 0.0
    threads = {}
    for tid, (comm, ticks) in after.items():
        delta = ticks - before.get(tid, (comm, 0))[1]
        pct = delta / CLK_TCK / seconds * 100
        total += pct
        threads[comm] = threads.get(comm, 0) + pct
    top = sorted(threads.items(), key=lambda kv: -kv[1])[:6]
    return round(total, 1), {k: round(v, 1) for k, v in top if v >= 0.5}


def pss_mb():
    out = sh('dumpsys', 'meminfo', PKG)
    m = re.search(r'TOTAL PSS:\s+(\d+)', out) or re.search(r'^\s*TOTAL\s+(\d+)', out, re.M)
    return round(int(m.group(1)) / 1024, 1) if m else None


def presented_fps():
    """Per-layer average FPS from SurfaceFlinger timestats, for this app's layers."""
    out = sh('dumpsys', 'SurfaceFlinger', '--timestats', '-dump')
    layers = {}
    name = None
    for line in out.splitlines():
        if line.startswith('layerName = '):
            name = line[len('layerName = '):].strip()
        elif name and line.startswith('averageFPS = '):
            if PKG in name:
                layers[name] = round(float(line.split('=')[1]), 1)
            name = None
    return layers


def main():
    sh('am', 'force-stop', PKG)
    sh('dumpsys', 'SurfaceFlinger', '--timestats', '-enable')
    subprocess.run(ADB + ['logcat', '-c'])
    sh('am', 'start', '-n', f'{PKG}/.MainActivity')
    p = pid()
    log = subprocess.Popen(
        ADB + ['logcat', '-v', 'raw', '-s', 'ReactNativeJS'],
        stdout=subprocess.PIPE, text=True,
    )

    results = []
    window = None
    prefix = f'BENCH {BACKEND} '
    for line in log.stdout:
        line = line.strip()
        if not line.startswith(prefix):
            if line.startswith('BENCH '):
                raise SystemExit(f'expected backend {BACKEND!r}, device says: {line}')
            continue
        body = line[len(prefix):]
        if body.startswith('START '):
            sh('dumpsys', 'SurfaceFlinger', '--timestats', '-clear')
            window = (time.time(), thread_ticks(p))
        elif body == 'COMPLETE':
            break
        elif body.startswith('{') and window:
            start, before = window
            seconds = time.time() - start
            total, threads = cpu_percent(before, thread_ticks(p), seconds)
            row = json.loads(body)
            row.update(
                backend=BACKEND,
                cpu=total,
                cpuThreads=threads,
                pssMb=pss_mb(),
                presentedFps=presented_fps(),
            )
            results.append(row)
            print(json.dumps(row), file=sys.stderr)
            window = None

    log.terminate()
    sh('am', 'force-stop', PKG)
    json.dump(results, sys.stdout, indent=2)


if __name__ == '__main__':
    main()
