"""Sync public cache files from one pinned Git revision, without calling weather APIs."""
import argparse
import hashlib
import json
import re
import urllib.request
from validate_wind import validate
from fetch_wind import publish_bundle


def sync(revision):
    if not re.fullmatch(r'[0-9a-f]{40}', revision):
        raise ValueError('use a full pinned commit SHA')
    base = 'https://raw.githubusercontent.com/cloundstory/drift/' + revision + '/wind/'
    def read(name):
        if not re.fullmatch(r'[A-Za-z0-9_-]+\.(?:json|bin)', name):
            raise ValueError('unsafe cache filename')
        with urllib.request.urlopen(base + name, timeout=30) as response:
            data = response.read(2 * 1024 * 1024 + 1)
            if len(data) > 2 * 1024 * 1024:
                raise ValueError('cache file too large')
            return data
    man = json.loads(read('index.json'))
    payloads = {t['file']: read(t['file']) for t in man['tiles']}
    validate(man, payloads.__getitem__)
    # Normalize old mutable filenames; keep the forecast bytes and times unchanged.
    immutable = {}
    for t in man['tiles']:
        data = payloads[t['file']]
        digest = hashlib.sha256(data).hexdigest()
        if not re.fullmatch(r'[A-Za-z0-9_-]+', t['id']):
            raise ValueError('invalid tile id')
        t['file'] = t['id'] + '-' + digest[:16] + '.bin'
        t['sha256'] = digest
        immutable[t['file']] = data
    result = validate(man, immutable.__getitem__)
    publish_bundle(man, immutable)
    return dict(sourceRevision=revision, externalWeatherCalls=0, validation=result)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--revision', required=True)
    print(json.dumps(sync(p.parse_args().revision), indent=2))
