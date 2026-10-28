"""Local-only process sampler. No arguments, environment values or network credentials recorded."""
import json, os, subprocess, sys, time
from pathlib import Path
out = Path('artifacts/p12a-r2')
out.mkdir(parents=True, exist_ok=True)
log = out / ('process-' + sys.argv[1] + '.jsonl')
command = sys.argv[2:]
with (out / (sys.argv[1] + '.log')).open('w') as stream:
    child = subprocess.Popen(command, stdout=stream, stderr=subprocess.STDOUT)
    with log.open('w') as samples:
        while child.poll() is None:
            raw = subprocess.check_output(['ps', '-Ao', 'pid,ppid,pcpu,rss,comm'], text=True)
            rows = []
            for line in raw.splitlines()[1:]:
                parts = line.strip().split(None, 4)
                if len(parts) != 5:
                    continue
                rows.append({'pid': int(parts[0]), 'ppid': int(parts[1]), 'cpu': float(parts[2]), 'rssKiB': int(parts[3]), 'name': os.path.basename(parts[4])})
            owned = {child.pid}
            for _ in range(8):
                owned.update(r['pid'] for r in rows if r['ppid'] in owned)
            samples.write(json.dumps({'at': time.time(), 'owned': [r for r in rows if r['pid'] in owned], 'externalTopCpu': sorted([r for r in rows if r['pid'] not in owned], key=lambda r: r['cpu'], reverse=True)[:8]}) + '\n')
            samples.flush()
            time.sleep(2)
    result = child.wait()
print(json.dumps({'label': sys.argv[1], 'exitCode': result}))
raise SystemExit(result)
