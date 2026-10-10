"""Optional asset maintenance: requires fonttools[woff]==4.66.1.

Builds use the checked-in output and do not need Python. Keeps the existing
font outlines, metrics and shaping features; removes unused character ranges.
"""
import hashlib
import json
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[1]
output = root / 'public/fonts/optimized'
output.mkdir(exist_ok=True)
text = ''.join(p.read_text(encoding='utf-8') for p in (root/'src').rglob('*')
               if p.is_file() and p.suffix in ['.json', '.css', '.js'])
text += (root/'scripts/build.mjs').read_text(encoding='utf-8')
unicodes = (set(range(0x20, 0x250)) | set(range(0x2000, 0x2070)) |
            set(range(0x20a0, 0x20d0)) | set(range(0x2190, 0x2200)) | set(map(ord, text)))
report = []
for source in (root/'public/fonts').glob('*.woff2'):
    font = TTFont(source)
    cmap = font.getBestCmap()
    metrics = {code: font['hmtx'][glyph] for code, glyph in cmap.items() if code in unicodes}
    options = subset.Options()
    options.layout_features = ['*']
    options.notdef_glyph = True
    options.recommended_glyphs = True
    sub = subset.Subsetter(options=options)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    # The recovered files carry .woff2 names but contain raw TrueType bytes.
    # Set the actual container format, rather than just changing the suffix.
    font.flavor = 'woff2'
    temp = output / (source.stem + '.woff2')
    font.save(temp)
    data = temp.read_bytes()
    assert data[:4] == b'wOF2'
    check = TTFont(temp)
    for code, metric in metrics.items():
        assert check['hmtx'][check.getBestCmap()[code]] == metric
    filename = source.stem + '-' + hashlib.sha256(data).hexdigest()[:12] + '.woff2'
    temp.replace(output / filename)
    report.append({'original':'/fonts/'+source.name, 'optimized':'/fonts/optimized/'+filename,
                   'beforeBytes':source.stat().st_size, 'afterBytes':len(data),
                   'preservedUnicodeCount':len(metrics), 'format':'WOFF2', 'glyphMetricsVerified':True})
(root/'src/content/optimized-fonts.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(root.name, json.dumps(report))
