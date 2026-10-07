"""Validate a complete weather cache before publishing. Standard library only."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import zlib
from datetime import datetime, timezone, timedelta


def utc(value):
    return datetime.strptime(value, '%Y-%m-%dT%H:%M').replace(tzinfo=timezone.utc)


def validate(man, read_tile, now=None, min_cover_h=36):
    now = now or datetime.now(timezone.utc)
    if man.get('v') != 3 or not isinstance(man.get('tiles'), list) or not man['tiles']:
        raise ValueError('unsupported or empty manifest')
    issued = utc(man['issued'])
    if issued > now + timedelta(hours=1) or now - issued > timedelta(hours=12):
        raise ValueError('cache issue time is stale or in the future')
    seen = set()
    report = []
    for t in man['tiles']:
        name = t.get('file', '')
        if not re.fullmatch(r'[A-Za-z0-9_-]+\.bin', name) or name in seen:
            raise ValueError('unsafe or duplicate tile filename')
        seen.add(name)
        for key in ('nx', 'ny', 'slices', 'nv', 'bytes'):
            if type(t.get(key)) is not int or t[key] <= 0:
                raise ValueError('invalid tile ' + key)
        for key in ('la0', 'la1', 'lo0', 'lo1', 'step', 'stepH'):
            if type(t.get(key)) not in (int, float) or not math.isfinite(t[key]):
                raise ValueError('invalid tile ' + key)
        if not (-90 <= t['la0'] <= t['la1'] <= 90 and -180 <= t['lo0'] <= t['lo1'] <= 180):
            raise ValueError('invalid geographic bounds')
        if not (0 < t['step'] <= 10 and 0 < t['stepH'] <= 24 and 2 <= t['slices'] <= 96
                and t['nv'] == 6 and t['nx'] * t['ny'] <= 20000):
            raise ValueError('invalid grid dimensions')
        for lo, hi, count in (('lo0', 'lo1', 'nx'), ('la0', 'la1', 'ny')):
            if not math.isclose(t[lo] + (t[count] - 1) * t['step'], t[hi], abs_tol=1e-6):
                raise ValueError('grid bounds do not match dimensions')
        start = utc(t['t0'])
        end = start + timedelta(hours=(t['slices'] - 1) * t['stepH'])
        if start > now + timedelta(hours=1) or end < now + timedelta(hours=min_cover_h):
            raise ValueError('insufficient forecast coverage')
        packed = read_tile(name)
        if len(packed) != t['bytes']:
            raise ValueError('compressed byte count mismatch')
        if 'sha256' in t and hashlib.sha256(packed).hexdigest() != t['sha256']:
            raise ValueError('tile checksum mismatch')
        expected = t['nv'] * t['slices'] * t['nx'] * t['ny']
        decoder = zlib.decompressobj()
        raw = decoder.decompress(packed, expected + 1)
        if len(raw) != expected or not decoder.eof or decoder.unused_data or decoder.unconsumed_tail:
            raise ValueError('invalid compressed tile or decoded size')
        plane = t['slices'] * t['nx'] * t['ny']
        if any(b >= 64 for b in raw[plane:2 * plane]) or any(b > 99 for b in raw[4 * plane:5 * plane]):
            raise ValueError('invalid wind direction or weather code')
        report.append(dict(file=name, points=t['nx'] * t['ny'], bytes=len(packed),
                           forecastEndUtc=end.isoformat(), remainingHours=round((end-now).total_seconds()/3600, 2)))
    return dict(passed=True, issued=man['issued'], tiles=report)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--manifest', type=Path, default=Path(__file__).resolve().parent.parent / 'wind/index.json')
    p.add_argument('--min-cover-h', type=float, default=36)
    args = p.parse_args()
    man = json.loads(args.manifest.read_text(encoding='utf-8'))
    result = validate(man, lambda name: (args.manifest.parent / name).read_bytes(), min_cover_h=args.min_cover_h)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
