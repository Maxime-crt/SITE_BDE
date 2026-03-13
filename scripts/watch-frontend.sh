#!/bin/sh
# Watch frontend config files and restart Vite when they change.
# Only config files need a restart — src/ files are handled by Vite HMR.

CONFIG_FILES="/app/frontend/vite.config.ts /app/frontend/tailwind.config.js /app/frontend/postcss.config.js /app/frontend/tsconfig.json /app/frontend/tsconfig.app.json"

get_checksums() {
  checksums=""
  for f in $CONFIG_FILES; do
    if [ -f "$f" ]; then
      checksums="$checksums$(md5sum "$f")"
    fi
  done
  echo "$checksums"
}

LAST_CHECKSUMS=""

while true; do
  CURRENT_CHECKSUMS=$(get_checksums)

  if [ "$LAST_CHECKSUMS" != "" ] && [ "$CURRENT_CHECKSUMS" != "$LAST_CHECKSUMS" ]; then
    echo "[watch-frontend] Config change detected, restarting Vite..."
    # Kill the current Vite process
    pkill -f "vite" 2>/dev/null
    sleep 1
    cd /app && npm run dev:frontend &
  fi

  LAST_CHECKSUMS="$CURRENT_CHECKSUMS"
  sleep 3
done
