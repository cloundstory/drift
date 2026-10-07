"""Synthetic cache publication tests; no network calls or real wind output."""
import copy
import hashlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zlib
from datetime import datetime, timezone, timedelta
import fetch_wind as worker
from validate_wind import validate
TEST_ROOT = Path(__file__).resolve().parent / 'fixtures'


class CacheTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
        self.start = self.now - timedelta(hours=self.now.hour % 3)
        self.data = zlib.compress(bytes([10]*96 + [32]*96 + [0]*96 + [15]*96 + [61]*96 + [143]*96))
        self.tile = dict(id='fixture', file='fixture.bin', nx=2, ny=2, slices=24, nv=6,
                         la0=0, la1=1, lo0=0, lo1=1, step=1, stepH=3,
                         t0=self.start.strftime('%Y-%m-%dT%H:%M'), bytes=len(self.data),
                         sha256=hashlib.sha256(self.data).hexdigest())
        self.man = dict(v=3, issued=self.now.strftime('%Y-%m-%dT%H:%M'), tiles=[self.tile])

    def check(self, man=None, data=None, now=None):
        return validate(man or self.man, lambda _: self.data if data is None else data, now or self.now)

    def test_valid_and_legacy_checksum_optional(self):
        self.assertTrue(self.check()['passed'])
        legacy = copy.deepcopy(self.man)
        del legacy['tiles'][0]['sha256']
        self.assertTrue(self.check(legacy)['passed'])

    def test_expired_or_future(self):
        for hours in (13, 40, -2):
            with self.assertRaises(ValueError):
                self.check(now=self.now+timedelta(hours=hours))

    def test_insufficient_coverage(self):
        man = copy.deepcopy(self.man)
        man['tiles'][0]['t0'] = (self.now-timedelta(hours=40)).strftime('%Y-%m-%dT%H:%M')
        with self.assertRaisesRegex(ValueError, 'coverage'):
            self.check(man)

    def test_wrong_file_bounds_hash_and_size(self):
        for change in ({'file':'../secret.bin'}, {'nx':3}, {'sha256':'0'*64}, {'bytes':1}):
            man = copy.deepcopy(self.man)
            man['tiles'][0].update(change)
            with self.assertRaises(ValueError):
                self.check(man)

    def test_bad_payload_and_trailing_data(self):
        for raw in (bytes(575), bytes([255])*576):
            data = zlib.compress(raw)
            man = copy.deepcopy(self.man)
            man['tiles'][0].update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
            with self.assertRaises(ValueError):
                self.check(man, data)
        data = self.data+b'trailing'
        man = copy.deepcopy(self.man)
        man['tiles'][0].update(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())
        with self.assertRaises(ValueError):
            self.check(man,data)

    def test_failed_validation_leaves_previous_bundle(self):
        with tempfile.TemporaryDirectory(dir=TEST_ROOT) as out, patch.object(worker, 'OUT', out):
            self.assertTrue(Path(out).resolve().is_relative_to(TEST_ROOT))
            path = Path(out, 'index.json')
            path.write_text('previous manifest')
            with self.assertRaises(ValueError):
                worker.publish_bundle(self.man, {'fixture.bin':b'bad'})
            self.assertEqual(path.read_text(), 'previous manifest')
            self.assertEqual(len(list(Path(out).iterdir())), 1)

    def test_immutable_publish_keeps_previous_then_prunes_older(self):
        with tempfile.TemporaryDirectory(dir=TEST_ROOT) as out, patch.object(worker, 'OUT', out), patch.object(worker, 'TILES', [{'id':'fixture'}]):
            self.assertTrue(Path(out).resolve().is_relative_to(TEST_ROOT))
            names = ['fixture-'+c*16+'.bin' for c in 'abc']
            for name in names:
                man=copy.deepcopy(self.man)
                man['tiles'][0]['file']=name
                worker.publish_bundle(man,{name:self.data})
                self.assertEqual(json.loads(Path(out,'index.json').read_text())['tiles'][0]['file'],name)
            self.assertFalse(Path(out,names[0]).exists())
            self.assertTrue(Path(out,names[1]).exists())
            self.assertTrue(Path(out,names[2]).exists())

    def forecast(self):
        times=[(self.start+timedelta(hours=h)).strftime('%Y-%m-%dT%H:%M') for h in range(96)]
        return dict(hourly=dict(time=times, wind_speed_10m=[20]*96,wind_direction_10m=[180]*96,
                               precipitation=[0]*96,wind_gusts_10m=[30]*96,weather_code=[61]*96,pressure_msl=[1013]*96))

    def test_build_and_reject_missing_forecast(self):
        tile=dict(id='fixture',la0=0,la1=1,lo0=0,lo1=1,step=1)
        rows=[self.forecast() for _ in range(4)]
        with patch.object(worker,'fetch',return_value=rows), patch('sys.stdout',new=io.StringIO()):
            man,data=worker.build(tile)
        self.assertRegex(man['file'],r'^fixture-[0-9a-f]{16}\.bin$')
        validate(dict(v=3,issued=self.man['issued'],tiles=[man]),lambda _:data,self.now)
        rows[1]['hourly']['wind_gusts_10m'][3]=None
        with patch.object(worker,'fetch',return_value=rows), patch('sys.stdout',new=io.StringIO()):
            with self.assertRaisesRegex(ValueError,'missing'):
                worker.build(tile)

    def test_retries_wait_for_weighted_minute_budget(self):
        with patch.object(worker.urllib.request,'urlopen',side_effect=OSError('offline')) as calls, \
                patch.object(worker.time,'sleep') as sleep, patch('sys.stdout',new=io.StringIO()):
            with self.assertRaises(SystemExit):
                worker.fetch([(0,0)])
            self.assertEqual(calls.call_count,4)
            self.assertEqual([c.args[0] for c in sleep.call_args_list],[61,61,61])


if __name__ == '__main__':
    unittest.main(verbosity=2)
