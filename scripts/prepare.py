#!/usr/bin/env python3
"""Turn the live demo page into a self-driving copy for the recorder.
Usage: prepare.py <raw.html> <out.html>
- removes the Canva Code SDK <script src=...> tags (no telemetry, no real RSVP writes)
- injects scripts/autodrive.js before </body>
"""
import re, sys, pathlib

raw, out = sys.argv[1], sys.argv[2]
html = pathlib.Path(raw).read_text(encoding='utf-8', errors='replace')
n0 = len(html)
html = re.sub(r'<script[^>]+src="[^"]*canvacode\.com[^"]*"[^>]*>\s*</script>', '', html)
drive = pathlib.Path(__file__).with_name('autodrive.js').read_text(encoding='utf-8')
i = html.rfind('</body>')
if i < 0:
    i = len(html)
html = html[:i] + '<script>\n' + drive + '\n</script>\n' + html[i:]
pathlib.Path(out).write_text(html, encoding='utf-8')
print('prepared', out, n0, '->', len(html), 'gate-btn' in html, 'f-name' in html)
