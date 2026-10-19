#!/bin/zsh
# Installs (or reinstalls) the daily stats-refresh job. Remove it with:  scripts/install-refresh-job.sh --remove
set -e
LABEL="com.vishalkanala.refresh-stats"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
REPO="${0:A:h:h}"
launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
if [[ "${1:-}" == "--remove" ]]; then rm -f "$PLIST"; echo "Removed $LABEL."; exit 0; fi
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$PLIST" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key><array><string>/bin/zsh</string><string>$REPO/scripts/refresh-stats.sh</string></array>
  <key>StartCalendarInterval</key><dict><key>Hour</key><integer>10</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardErrorPath</key><string>$REPO/data/refresh.log</string>
  <key>StandardOutPath</key><string>$REPO/data/refresh.log</string>
</dict></plist>
PL
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed $LABEL: runs daily at 10:00, reminds every 14 days."
