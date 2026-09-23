#!/usr/bin/env bash
# Records a scene of the demo site on a real iOS Simulator (Safari) — native screen recording.
# Usage: scripts/record.sh <scene> "<hook text>" <seconds> [device name]
set -euo pipefail
SCENE="${1:-keepsake1}"
HOOK="${2:-}"
DUR="${3:-16}"
PREF="${4:-iPhone 16 Pro}"
PORT=8765
mkdir -p out

# --- pick a device (preferred name, else the first available iPhone)
UDID=$(xcrun simctl list devices available -j | python3 -c "
import sys, json
d = json.load(sys.stdin)['devices']
devs = [x for rt, l in d.items() if 'iOS' in rt for x in l if x['isAvailable'] and x['name'].startswith('iPhone')]
pref = [x for x in devs if x['name'] == '$PREF']
pick = (pref or devs)[0]
print(pick['udid'], file=sys.stdout)
print('device:', pick['name'], file=sys.stderr)
")
echo "UDID=$UDID"

# --- boot + clean status bar (Apple's own tool, the famous 9:41)
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl status_bar "$UDID" override --time 9:41 --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
xcrun simctl ui "$UDID" appearance light || true

# --- serve the site locally (the simulator shares the host network)
( cd site && python3 -m http.server $PORT >/dev/null 2>&1 ) &
SRV=$!
sleep 2

# --- open the scene page; it loads fully, then waits for go.json before moving
rm -f site/go.json
ENC_HOOK=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$HOOK")
URL="http://localhost:$PORT/keepsake.html?scene=$SCENE&sync=1&hook=$ENC_HOOK"
echo "URL=$URL"
xcrun simctl openurl "$UDID" "$URL"
sleep 45
xcrun simctl io "$UDID" screenshot out/warmup.png

# --- record: start the capture, then release the page
xcrun simctl io "$UDID" recordVideo --codec h264 --force "out/$SCENE.mp4" &
REC=$!
sleep 3
echo '{"go":true}' > site/go.json
sleep "$DUR"
kill -INT "$REC"
wait "$REC" || true
sleep 2
xcrun simctl io "$UDID" screenshot out/last.png
kill "$SRV" || true
ls -la out
