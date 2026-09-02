# -*- coding: utf-8 -*-
"""สำรวจสีทั้งไฟล์ก่อนยกเป็นระบบ — อ่านอย่างเดียว ไม่แก้อะไร"""
import io, re, sys, collections
sys.stdout.reconfigure(encoding='utf-8')

s = io.open('index.html', encoding='utf-8').read()
styles = ''.join(re.findall(r'<style>(.*?)</style>', s, re.S))
scripts = ''.join(re.findall(r'<script>(.*?)</script>', s, re.S))

pat = re.compile(r'rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[.\d]+\s*)?\)|#[0-9a-fA-F]{6}\b')


def norm(c):
    """รวม rgba ที่ต่างกันแค่ alpha — สีฐานเดียวกันควรเป็น token เดียว"""
    m = re.match(r'rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)', c)
    if m:
        return 'rgb(%s,%s,%s)' % tuple(int(float(x)) for x in m.groups())
    return c.lower()


for label, txt in [('CSS', styles), ('canvas/JS', scripts)]:
    found = pat.findall(txt)
    bases = collections.Counter(norm(c) for c in found)
    print('=' * 62)
    print('%s — %d จุด · %d สีเต็ม · %d สีฐาน (ไม่นับ alpha)'
          % (label, len(found), len(set(c.lower() for c in found)), len(bases)))
    for base, n in bases.most_common():
        alphas = sorted({(re.search(r',\s*([.\d]+)\s*\)$', c).group(1) if re.search(r',\s*([.\d]+)\s*\)$', c) else '1')
                         for c in found if norm(c) == base})
        print('  %-18s ×%-3d  alpha: %s' % (base, n, ' '.join(alphas[:9]) + (' …' if len(alphas) > 9 else '')))
