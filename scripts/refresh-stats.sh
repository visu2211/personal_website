#!/bin/zsh
# Keeps the Training section fresh. Runs once a day via launchd (scripts/install-refresh-job.sh):
#  - If a newer Hevy export (~/Downloads/workouts*.csv) or Strava export (~/Downloads/export_*.zip)
#    has appeared since the last run, rebuilds assets/hevy-data.js / assets/strava-data.js,
#    commits and pushes them, then deploys vishalkanala.com with the Vercel CLI.
#  - Every 14 days, shows a reminder to export new data from both apps.
# Neither app offers free automatic downloads, so exporting stays a manual tap; everything after is automatic.
set -u
setopt null_glob
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
REPO="${0:A:h:h}"
STATE="$REPO/data/.refresh-state"
LOG="$REPO/data/refresh.log"
REMIND_EVERY_DAYS=14
cd "$REPO" || exit 1
mkdir -p data
touch "$STATE"

log() { print -r -- "$(date '+%Y-%m-%d %H:%M') $*" >> "$LOG"; }
get() { grep "^$1=" "$STATE" | tail -1 | cut -d= -f2-; }
put() { { grep -v "^$1=" "$STATE"; print -r -- "$1=$2"; } > "$STATE.tmp" && mv "$STATE.tmp" "$STATE"; }
notify() { osascript -e "display notification \"$2\" with title \"$1\"" >/dev/null 2>&1; }
mtime() { stat -f %m "$1" 2>/dev/null || print 0; }

changed=()

hevy=(~/Downloads/workouts*.csv(N.om)); hevy=${hevy[1]:-}       # newest Hevy export, or empty
if [[ -n "$hevy" && $(mtime "$hevy") -gt ${$(get hevy_mtime):-0} ]]; then
  if cp "$hevy" data/hevy-workouts.csv && node scripts/hevy-stats.mjs >> "$LOG" 2>&1; then changed+=(Hevy); put hevy_mtime "$(mtime "$hevy")"; else log "Hevy rebuild failed"; fi
fi

strava=(~/Downloads/export_*.zip(N.om)); strava=${strava[1]:-}  # newest Strava export, or empty
if [[ -n "$strava" && $(mtime "$strava") -gt ${$(get strava_mtime):-0} ]]; then
  if node scripts/strava-stats.mjs "$strava" >> "$LOG" 2>&1; then changed+=(Strava); put strava_mtime "$(mtime "$strava")"; else log "Strava rebuild failed"; fi
fi

if (( ${#changed} )) && ! git diff --quiet -- assets/hevy-data.js assets/strava-data.js; then
  git add assets/hevy-data.js assets/strava-data.js
  git commit -q -m "Refresh training stats (${(j:, :)changed})

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && git push -q >> "$LOG" 2>&1 \
    && npx --yes vercel --prod --yes >> "$LOG" 2>&1 \
    && { log "Published ${(j:, :)changed}"; notify "vishalkanala.com" "Training stats updated from ${(j: and :)changed}."; } \
    || { log "Push failed"; notify "vishalkanala.com" "Stats rebuilt but publishing failed. See data/refresh.log."; }
elif (( ${#changed} )); then
  log "New export(s) from ${(j:, :)changed}, no stat changes"
fi

now=$(date +%s)
last=${$(get last_reminder):-0}
if (( now - last >= REMIND_EVERY_DAYS * 86400 )); then
  notify "Time to refresh your site stats" "Export from Hevy (Settings › Export Workouts) and request your Strava archive. Leave both in Downloads."
  put last_reminder "$now"
  log "Reminder shown"
fi
